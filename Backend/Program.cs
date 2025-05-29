using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.HttpOverrides;
using System.Text;
using System.Text.Json;
using Backend.Repositories;
using Backend.Repositories.Abstraction;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.IdentityModel.Tokens;
using Minio;

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
        builder.Services.Configure<RouteOptions>(o => o.LowercaseUrls = true);
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddDbContext<AppDbContext>();
        builder.Services.AddScoped<JwtService>();
        builder.Services.AddScoped<IAccountRepository,AccountRepository>();
        builder.Services.AddScoped<IVideoRepository,VideoRepository>();
        builder.Services.AddSingleton<EmailService>();
        builder.Services.Configure<KestrelServerOptions>(options => {
            options.ConfigureHttpsDefaults(httpsOptions =>
            {
                httpsOptions.SslProtocols = System.Security.Authentication.SslProtocols.Tls12 |
                                            System.Security.Authentication.SslProtocols.Tls13;
            });
    
            options.ConfigureEndpointDefaults(listenOptions => {
                listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
            });
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
        builder.Services.AddScoped<IVideoProcessingService, XabeFfmpegService>();
        
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                var frontendUrl = builder.Configuration["Frontend:URL"];
                if (!string.IsNullOrEmpty(frontendUrl))
                {
                    policy.WithOrigins(frontendUrl)
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                }
            });

            options.AddPolicy("AllowAll", policy =>
            {
                policy.AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });
        
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();
        ConfigureAuthentication(builder);
        _app = builder.Build();

// Configure the HTTP request pipeline.
        if (_app.Environment.IsDevelopment())
        {
            _app.MapOpenApi();
            _app.UseSwagger();
            _app.UseSwaggerUI();
        }

        _app.UseHttpsRedirection();

        _app.UseRouting();
        _app.UseAuthorization();
        #if DEBUG
        _app.UseCors("AllowAll");
        #else
        _app.UseCors("AllowFrontend");
        #endif
        _app.MapControllers();
        
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
        var path = CheckEnvPaths(".env.development.local", ".env.local", ".env");

        if (string.IsNullOrEmpty(path))
        {
            return;
        }
        
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var text = File.ReadAllText(path);
        var parts = text
            .Split('\n')
            .Where(o => !string.IsNullOrEmpty(o));
        
        foreach (var part in parts)
        {
            var keyValueIndex = part.IndexOf('=');
            if (keyValueIndex == -1)
                continue;
            
            var key = part[..keyValueIndex].Trim();
            var value = part[(keyValueIndex + 1)..].Trim();
            if (value.StartsWith('\"'))
            {
                value = value[1..];
            }
            if (value.EndsWith('\"'))
            {
                value = value[..^1];
            }
            dict[key] = value;
        }

        foreach (var keyValue in configuration.AsEnumerable())
        {
            if(keyValue.Value == null)
                continue;
            
            Constants.ConfigEnvPlaceholderRegex().Replace(keyValue.Value, match =>
            {
                if (dict.TryGetValue(match.Groups[1].Value, out var value))
                {
                    configuration[keyValue.Key] = value;
                }
                    
                return value!;
            });
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
        });
    }
    private static void ConfigureAuthStrategy()
    {
        // TODO: Implement authentication strategy
    }
}