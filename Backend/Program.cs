using System.Collections;
using System.Runtime.InteropServices;
using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.HttpOverrides;
using System.Text;
using System.Text.Json;
using Backend.Data.Entities;
using Backend.Hubs;
using Backend.Repositories;
using Backend.Repositories.Abstraction;
using Backend.Utils;
using Backend.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.IdentityModel.Tokens;
using Minio;
using Xabe.FFmpeg;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Backend;

public class Program
{
    private static WebApplication _app = null!;
    
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        MapEnvToConfig(builder.Configuration);
        
        builder.Services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
        builder.Services.AddMemoryCache();
        builder.Services.AddSignalR();
        builder.Services.Configure<RouteOptions>(o => o.LowercaseUrls = true);
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddDbContext<AppDbContext>();
        builder.Services.AddScoped<JwtService>();
        builder.Services.AddScoped<NotificationsService>();
        builder.Services.AddScoped<IAccountRepository,AccountRepository>();
        builder.Services.AddScoped<IVideoRepository,VideoRepository>();
        builder.Services.AddScoped<IPlaylistRepository,PlaylistRepository>();
        builder.Services.AddScoped<IPlaylistVideoRepository,PlaylistVideoRepository>();
        /*builder.Services.AddSingleton<EmailService>();*/
        builder.Services.AddAutoMapper(typeof(MappingProfile));
        /*builder.Services.AddSingleton<VideoProcessingWorker>();
        builder.Services.AddHostedService(provider => provider.GetRequiredService<VideoProcessingWorker>());*/
        builder.Services.AddHostedService<VideoProcessingWorker>();
        builder.Services.Configure<KestrelServerOptions>(options => {
            options.Limits.KeepAliveTimeout = TimeSpan.FromHours(10);
            /*options.Limits.MaxRequestBodySize = 5 * 1024 * 1024; // 5 GB*/
            options.ConfigureHttpsDefaults(httpsOptions =>
            {
                httpsOptions.SslProtocols = System.Security.Authentication.SslProtocols.Tls12 |
                                            System.Security.Authentication.SslProtocols.Tls13;
            });
    
            options.ConfigureEndpointDefaults(listenOptions => {
                listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
            });
            
            options.AllowSynchronousIO = true;
        });


        builder.Services.AddSingleton<IMinioClient>(sp =>
        {
            var config = builder.Configuration.GetSection("Minio");
            return new MinioClient()
                .WithEndpoint(config["Endpoint"].Replace("https://", "").Replace("http://", ""))
                .WithCredentials(config["Username"], config["Password"])
                .WithSSL(bool.Parse(config["WithSSL"]))
                .Build();
        });
        builder.Services.AddScoped<IS3FileService, MinioFileService>();
        builder.Services.AddScoped<IVideoProcessingService, FFmpegProcessingService>();
        
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                var frontendUrl = builder.Configuration["Frontend:URL"];
                if (!string.IsNullOrEmpty(frontendUrl))
                {
                    policy.WithOrigins(frontendUrl)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
                }
            });

            /*
            options.AddPolicy("AllowAll", policy =>
            {
                policy.AllowAnyHeader()
                    .AllowAnyMethod().AllowCredentials();
            });*/
        });
        
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();
        ConfigureAuthentication(builder);
        ConfigureFFmpeg(builder.Configuration);
        _app = builder.Build();
        
        #if !DEBUG
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.Migrate();
        }
        #endif

// Configure the HTTP request pipeline.
        if (_app.Environment.IsDevelopment())
        {
            _app.MapOpenApi();
            _app.UseSwagger();
            _app.UseSwaggerUI();
        }

        #if DEBUG
        _app.UseHttpsRedirection();
        #endif
        _app.UseRouting();
        _app.UseCors("AllowFrontend");
        _app.UseAuthentication();
        _app.UseAuthorization();
        _app.MapControllers();
        _app.MapHub<EchoHub>("/hubs/echo")
            .RequireAuthorization();
        
        // For reverse proxy support
        _app.UseForwardedHeaders(new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor |
                               ForwardedHeaders.XForwardedProto
        });

        _app.Run();
    }
    
    private static string CheckEnvPaths(params string[] paths)
    {
        foreach (var path in paths)
        {
            if (File.Exists(path))
            {
                return path;
            }
            #if DEBUG
            if (File.Exists(Path.Combine("../../../", path)))
            {
                return Path.Combine("../../../", path);
            }
            #endif
        }
        return string.Empty;
    }
    
    
    private static void MapEnvToConfig(ConfigurationManager configuration)
    {
        var envDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        
        LoadEnvFromFile(envDict);
        
        LoadEnvFromEnvironment(envDict);
        
        ApplyEnvToConfiguration(configuration, envDict);
    }

    private static void LoadEnvFromFile(Dictionary<string, string> envDict)
    {
        var path = CheckEnvPaths(".env.development.local", ".env.local", ".env");
        
        if (string.IsNullOrEmpty(path))
        {
            return;
        }
        
        try
        {
            var text = File.ReadAllText(path);
            var lines = text
                .Split('\n')
                .Where(line => !string.IsNullOrWhiteSpace(line) && !line.TrimStart().StartsWith('#'));
            
            foreach (var line in lines)
            {
                var keyValueIndex = line.IndexOf('=');
                if (keyValueIndex == -1)
                    continue;
                
                var key = line[..keyValueIndex].Trim();
                var value = line[(keyValueIndex + 1)..].Trim();
                
                if (value.StartsWith('"') && value.EndsWith('"') && value.Length > 1)
                {
                    value = value[1..^1];
                }
                else if (value.StartsWith('\'') && value.EndsWith('\'') && value.Length > 1)
                {
                    value = value[1..^1];
                }
                
                envDict[key] = value;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not read .env file at {path}: {ex.Message}");
        }
    }

    private static void LoadEnvFromEnvironment(Dictionary<string, string> envDict)
    {
        var environmentVariables = Environment.GetEnvironmentVariables();
        
        foreach (DictionaryEntry envVar in environmentVariables)
        {
            var key = envVar.Key?.ToString();
            var value = envVar.Value?.ToString();
            
            if (!string.IsNullOrEmpty(key) && value != null)
            {
                envDict[key] = value;
            }
        }
    }

    private static void ApplyEnvToConfiguration(ConfigurationManager configuration, Dictionary<string, string> envDict)
    {
        foreach (var keyValue in configuration.AsEnumerable())
        {
            if (keyValue.Value == null)
                continue;
            
            var newValue = Constants.ConfigEnvPlaceholderRegex().Replace(keyValue.Value, match =>
            {
                var placeholderKey = match.Groups[1].Value;
                
                if (envDict.TryGetValue(placeholderKey, out var envValue))
                {
                    return envValue;
                }
                
                return match.Value;
            });
            
            if (newValue != keyValue.Value)
            {
                configuration[keyValue.Key] = newValue;
            }
        }
    }

    private static void ConfigureAuthentication(WebApplicationBuilder builder)
    {
        builder.Services.AddAuthentication(o =>
        {
            o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            o.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
            o.DefaultScheme             = JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer(o =>
        {
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidIssuer              = _app.Configuration["JwtSettings:Issuer"],
                IssuerSigningKey         = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(_app.Configuration["JwtSettings:Key"]!)),
                ValidateIssuer           = true,
                ValidateAudience = false,
                ValidateIssuerSigningKey = true,
                ValidateLifetime         = false,
            };
            
            o.Events = new JwtBearerEvents
            {
                OnMessageReceived = (context) =>
                {
                    var path = context.HttpContext.Request.Path;
                    if (!path.StartsWithSegments("/hubs"))
                    {
                        return Task.CompletedTask; 
                    }

                    context.Token = context.Request.Query["access_token"];
                    
                    if (string.IsNullOrEmpty(context.Token))
                    {
                        var authHeader = context.Request.Headers.Authorization.ToString();
                        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
                        {
                            context.Token = authHeader.Substring("Bearer ".Length);
                        }
                    }
                    
                    return Task.CompletedTask;
                }
            };
        });
    }

    private static void ConfigureFFmpeg(ConfigurationManager configuration)
    {
        string? ffmpegPath = configuration["ffmpeg:Path"];
        if (string.IsNullOrEmpty(ffmpegPath))
        {
            ffmpegPath = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                ? "C:\\ffmpeg\\bin"
                : "/usr/bin";
        }
        FFmpegProcessingService.SetExecutablesPath(ffmpegPath, "ffmpeg");
    }
}