using Backend.Data;
using Microsoft.AspNetCore.HttpOverrides;

namespace Backend;

internal static class Program
{
    private static WebApplication _app = null!;
    
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
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

    private static void ConfigureAuthStrategy()
    {
        // TODO: Implement authentication strategy
    }
}