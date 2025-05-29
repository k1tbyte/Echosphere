using System.Text.RegularExpressions;

namespace Backend;

public static partial class Constants
{
    [GeneratedRegex(@"\$\{(\w+)\}")]
    public static partial Regex ConfigEnvPlaceholderRegex();
    
    public const string DefaultRoutePattern = "api/v2/[controller]/[action]";
    public const string UploadsFolderName = "UploadsTemp";
    public static readonly string UploadsFolderPath;
    
    static Constants()
    {
        UploadsFolderPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, UploadsFolderName);
        if(!Directory.Exists(UploadsFolderPath))
        {
            Directory.CreateDirectory(UploadsFolderPath);
        }
    }
}