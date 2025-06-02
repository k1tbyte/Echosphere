using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;

namespace Backend;

public static partial class Constants
{
    [GeneratedRegex(@"\$\{(\w+)\}")]
    public static partial Regex ConfigEnvPlaceholderRegex();

    public const string VideoSettingsSchemaFileName = "videoSettingsSchema.json";
    public const string DefaultRoutePattern = "api/v2/[controller]/[action]";
    public const string UploadsFolderName = "UploadsTemp";
    public static readonly string UploadsFolderPath;
    public static readonly string CacheFolderPath;

    public static readonly JsonSerializerOptions DefaultJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
    
    static Constants()
    {
        UploadsFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, UploadsFolderName);
        if(!Directory.Exists(UploadsFolderPath))
        {
            Directory.CreateDirectory(UploadsFolderPath);
        }
        CacheFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Cache");
        if(!Directory.Exists(CacheFolderPath))
        {
            Directory.CreateDirectory(CacheFolderPath);
        }
    }
}