using System.Text.RegularExpressions;

namespace Backend;

public static partial class Constants
{
    [GeneratedRegex(@"\$\{(\w+)\}")]
    public static partial Regex ConfigEnvPlaceholderRegex();
    
    public const string DefaultRoutePattern = "api/v2/[controller]/[action]";
}