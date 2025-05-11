using Backend.Data;
using Microsoft.AspNetCore.HttpOverrides;

namespace Backend;

internal static class Program
{
    private static WebApplication _app = null!;
    
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        MapEnvToConfig(builder.Configuration);
        
        builder.Services.AddControllers().AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
            options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });
        
        builder.Services.Configure<RouteOptions>(o => o.LowercaseUrls = true);
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddDbContext<AppDbContext>();
        
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();
        _app = builder.Build();

// Configure the HTTP request pipeline.
        if (_app.Environment.IsDevelopment())
        {
            _app.MapOpenApi();
        }

        _app.UseHttpsRedirection();

        _app.UseAuthorization();
        _app.MapControllers();
        
        // For reverse proxy support
        _app.UseForwardedHeaders(new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor |
                               ForwardedHeaders.XForwardedProto
        });

        _app.Run();
    }
    
    private static void MapEnvToConfig(ConfigurationManager configuration)
    {
        var path = File.Exists(".env") ? ".env" 
#if DEBUG
            : File.Exists("../../../.env") ? "../../../.env" 
#endif
            : null;

        if (path == null)
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

    private static void ConfigureAuthStrategy()
    {
        // TODO: Implement authentication strategy
    }
}