using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Backend.Data.Entities;
using Backend.Services;

namespace Backend.Utils;


public enum ECodecType
{
    Video,
    Audio,
    Subtitle,
    Other
}

public enum HardwareProvider
{
    None,
    NVIDIA,
    IntelQuickSync,
    AMD,
    VAAPILinux,
    MediaFoundation,
    AppleVideoToolbox
}

public enum EAudioCodec
{
    AAC,
    MP3,
//    Opus
}

public enum EAudioBitrate
{
    Low = 64,    // 64 Kbps
    Medium = 128, // 128 Kbps
    High = 192,   // 192 Kbps
    VeryHigh = 256, // 256 Kbps
    Lossless = 320 // 320 Kbps
}

public class CodecInfo
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool DecodingSupported { get; set; }
    public bool EncodingSupported { get; set; }
    public ECodecType Type { get; set; }
    public bool HasHardwareAcceleration { get; set; }
    public HardwareProvider Provider { get; set; } = HardwareProvider.None;
    public string Presets { get; set; }
    public EUserRole EnabledFromRole { get; set; } = EUserRole.User; // Role that can use this codec
    public double BitrateMultiplier { get; set; } = 1.0; // Multiplier for bitrate, relative to the base bitrate for this codec
}

public class CodecPreset
{
    public bool IsDefault { get; set; } // Indicates if this is the default preset for the codec
    public string Description { get; set; }
    public double SpeedFactor { get; set; } // Relative speed (1.0 = standard)
    public double QualityFactor { get; set; } // Relative quality (1.0 = standard)
}

public class BitrateInfo
{
    public int MinBitrate { get; set; }    // Минимальный битрейт в Kbps
    public int OptimalBitrate { get; set; } // Оптимальный битрейт в Kbps
    public int MaxBitrate { get; set; }     // Максимальный битрейт в Kbps
    public required int Width { get; set; } // Width in pixels, 0 if not applicable
    public EAudioBitrate AudioBitrate { get; set; } = EAudioBitrate.Medium; // Default audio bitrate
}

public sealed class VideoSettingsSchema
{
    public required  Dictionary<string,Dictionary<string,CodecPreset>> CodecPresets { get; set; }
    public required List<CodecInfo> Codecs { get; set; }
    public required Dictionary<int, BitrateInfo> VideoBitrates { get; set; }

    public Dictionary<string, EAudioCodec> AudioCodecs { get; set; } = Enum.GetValues<EAudioCodec>()
        .ToDictionary(codec => codec.ToString(), codec => codec);
    
    public Dictionary<string, EAudioBitrate> AudioBitrates { get; set; } = Enum.GetValues<EAudioBitrate>()
        .ToDictionary(bitrate => bitrate.ToString(), bitrate => bitrate);
    
    public EAudioBitrate DefaultAudioBitrate { get; set; } = EAudioBitrate.Medium;
    
    public object ThumbnailsCaptureInterval { get; set; } = new
    {
        Default = 5, // Default interval in seconds
        Min = 1,     // Minimum interval in seconds
        Max = 30     // Maximum interval in seconds
    };
}

public static partial class FFmpegTools
{
    public static VideoSettingsSchema? Schema { get; private set; }
    public static string? SchemaJson { get; private set; }
    
    [GeneratedRegex(@"\(encoders:([^)]+)\)")]
    private static partial Regex EncodersRegex();
    [GeneratedRegex(@"\(decoders:([^)]+)\)")]
    private static partial Regex DecodersRegex();
    [GeneratedRegex(@"^\s*([D\.])([E\.])([VAS])([I\.])([L\.])([S\.])\s+([^\s]+)\s+(.*)$")]
    private static partial Regex CodecEntryRegex();
    
    // 0. 144p -> 256x144
    // 1. 240p -> 426x240
    // 2. 360p -> 640x360
    // 3. 480p -> 854x480
    // 4. 720p -> 1280x720
    // 5. 1080p -> 1920x1080
    // 6. 1440p -> 2560x1440
    // 7. 2160p -> 3840x2160
    // 8. 4320p -> 7680x4320
    public static readonly Dictionary<int, BitrateInfo> Resolutions = new()
    {
        { 144, new BitrateInfo { Width = 256, MinBitrate = 150, OptimalBitrate = 300, MaxBitrate = 1000, AudioBitrate = EAudioBitrate.Low } },
        { 240, new BitrateInfo { Width = 426, MinBitrate = 250, OptimalBitrate = 500, MaxBitrate = 2000, AudioBitrate = EAudioBitrate.Low } },
        { 360, new BitrateInfo { Width = 640, MinBitrate = 400, OptimalBitrate = 800, MaxBitrate = 3000, AudioBitrate = EAudioBitrate.Medium } },
        { 480, new BitrateInfo { Width = 854, MinBitrate = 700, OptimalBitrate = 1400, MaxBitrate = 6000, AudioBitrate = EAudioBitrate.Medium } },
        { 720, new BitrateInfo { Width = 1280, MinBitrate = 1500, OptimalBitrate = 2800, MaxBitrate = 12000, AudioBitrate = EAudioBitrate.Medium } },
        { 1080, new BitrateInfo { Width = 1920, MinBitrate = 2500, OptimalBitrate = 5000, MaxBitrate = 20000, AudioBitrate = EAudioBitrate.High } },
        { 1440, new BitrateInfo { Width = 2560, MinBitrate = 5000, OptimalBitrate = 14000, MaxBitrate = 30000, AudioBitrate = EAudioBitrate.High } },
        { 2160, new BitrateInfo { Width = 3840, MinBitrate = 8000, OptimalBitrate = 25000, MaxBitrate = 60000, AudioBitrate = EAudioBitrate.VeryHigh } },
        { 4320, new BitrateInfo { Width = 7680, MinBitrate = 20000, OptimalBitrate = 60000, MaxBitrate = 120000 , AudioBitrate= EAudioBitrate.VeryHigh} }
    };
    
    private static readonly Dictionary<string, CodecPreset> DefaultPreset = new()
    {
        { "ultrafast", new CodecPreset { Description = "Maximum speed, minimum quality", SpeedFactor = 8.0, QualityFactor = 0.5 } },
        { "superfast", new CodecPreset { Description = "Very high speed", SpeedFactor = 6.0, QualityFactor = 0.6 } },
        { "veryfast", new CodecPreset { Description = "Fast encoding", SpeedFactor = 4.0, QualityFactor = 0.7, IsDefault = true } },
        { "faster", new CodecPreset { Description = "Faster than average", SpeedFactor = 3.0, QualityFactor = 0.8 } },
        { "fast", new CodecPreset { Description = "Good speed/quality balance", SpeedFactor = 2.0, QualityFactor = 0.9 } },
        { "medium", new CodecPreset { Description = "Standard quality (default)", SpeedFactor = 1.0, QualityFactor = 1.0 } },
        { "slow", new CodecPreset { Description = "Improved quality", SpeedFactor = 0.5, QualityFactor = 1.1 } },
        { "slower", new CodecPreset { Description = "High quality", SpeedFactor = 0.25, QualityFactor = 1.2 } },
        { "veryslow", new CodecPreset { Description = "Very high quality", SpeedFactor = 0.1, QualityFactor = 1.3 } }
    };
    
    private static readonly Dictionary<string, CodecPreset> NvencPreset = new()
    {
        { "p1", new CodecPreset { Description = "Maximum quality", SpeedFactor = 0.8, QualityFactor = 1.1 } },
        { "p2", new CodecPreset { Description = "High quality", SpeedFactor = 0.9, QualityFactor = 1.0 } },
        { "p3", new CodecPreset { Description = "High performance", SpeedFactor = 1.0, QualityFactor = 0.95 } },
        { "p4", new CodecPreset { Description = "Maximum performance", SpeedFactor = 1.2, QualityFactor = 0.9, IsDefault = true } },
        { "p5", new CodecPreset { Description = "Low latency", SpeedFactor = 1.5, QualityFactor = 0.85 } },
        { "p6", new CodecPreset { Description = "Very low latency", SpeedFactor = 1.7, QualityFactor = 0.8 } },
        { "p7", new CodecPreset { Description = "Streaming", SpeedFactor = 2.0, QualityFactor = 0.75 } }
    };
    
    
    private static readonly Dictionary<string, CodecPreset> QsvPreset = new()
    {
        { "veryfast", new CodecPreset { Description = "Very high speed", SpeedFactor = 4.0, QualityFactor = 0.7 } },
        { "faster", new CodecPreset { Description = "Faster than average", SpeedFactor = 3.0, QualityFactor = 0.8 } },
        { "fast", new CodecPreset { Description = "Good speed/quality balance", SpeedFactor = 2.0, QualityFactor = 0.9 } },
        { "medium", new CodecPreset { Description = "Standard quality", SpeedFactor = 1.0, QualityFactor = 1.0, IsDefault = true} },
        { "slow", new CodecPreset {  Description = "Improved quality", SpeedFactor = 0.7, QualityFactor = 1.1 } },
        { "slower", new CodecPreset { Description = "High quality", SpeedFactor = 0.5, QualityFactor = 1.2 } }
    };
    
    private static readonly Dictionary<string, CodecPreset> AmfPreset = new()
    {
        { "quality", new CodecPreset { Description = "High quality", SpeedFactor = 0.8, QualityFactor = 1.1 } },
        { "balanced", new CodecPreset { Description = "Balance of speed and quality", SpeedFactor = 1.0, QualityFactor = 1.0, IsDefault = true } },
        { "speed", new CodecPreset { Description = "High speed", SpeedFactor = 1.5, QualityFactor = 0.9 } }
    };
    
    private static readonly Dictionary<string, (double, string)> CodecEfficiencyMultipliers = new()
    {
        // The base value for H.264 is 1.0
        { "libx264", (1.0, nameof(DefaultPreset).ToCamelCase()) },
        { "h264_nvenc", (1.0, nameof(NvencPreset).ToCamelCase()) },
        { "h264_qsv", (1.0, nameof(QsvPreset).ToCamelCase()) },
        { "h264_amf", (1.0, nameof(AmfPreset).ToCamelCase()) },
        { "h264_vaapi", (1.0, nameof(DefaultPreset).ToCamelCase()) },
        
        // HEVC/H.265 is about 40-50% more efficient
        { "libx265", (0.6, nameof(DefaultPreset).ToCamelCase()) },
        { "hevc_nvenc", (0.6, nameof(NvencPreset).ToCamelCase()) },
        { "hevc_qsv", (0.6, nameof(QsvPreset).ToCamelCase()) },
        { "hevc_amf", (0.6, nameof(AmfPreset).ToCamelCase()) },
        { "hevc_vaapi", (0.6, nameof(DefaultPreset).ToCamelCase()) },
        
        // AV1 is about 20-30% more efficient than HEVC
        { "libaom-av1", (0.6, nameof(DefaultPreset).ToCamelCase()) },
        { "libsvtav1", (0.6, nameof(DefaultPreset).ToCamelCase()) },
        { "av1_nvenc", (0.6, nameof(NvencPreset).ToCamelCase()) },
        { "av1_qsv", (0.6, nameof(QsvPreset).ToCamelCase()) },
        { "av1_vaapi", (0.5, nameof(DefaultPreset).ToCamelCase()) },
        
        // VP9 is about the same as HEVC
        { "libvpx-vp9", (0.65, nameof(DefaultPreset).ToCamelCase()) }
    };

    private static readonly Dictionary<string, Dictionary<string, CodecPreset>> CodecPresets = new()
    {
        { nameof(DefaultPreset).ToCamelCase(), DefaultPreset },
        { nameof(NvencPreset).ToCamelCase(), NvencPreset },
        { nameof(QsvPreset).ToCamelCase(), QsvPreset },
        { nameof(AmfPreset).ToCamelCase(), AmfPreset }
    };

    
    public static async Task<Dictionary<string, CodecInfo>> GetCodecsAsync()
    {
        var result = new Dictionary<string, CodecInfo>();
        var output = await RunFFmpegCommandAsync("-codecs");

        // Ищем строку с началом списка кодеков
        var lines = output.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries);
        bool foundCodecsStart = false;

        foreach (var line in lines)
        {
            if (!foundCodecsStart)
            {
                if (line.Contains("-----") || line.Contains(" Codecs:"))
                {
                    foundCodecsStart = true;
                }

                continue;
            }

            var codecMatch = CodecEntryRegex().Match(line);

            if (!codecMatch.Success)
            {
                continue;
            }

            string codecName = codecMatch.Groups[7].Value;
            string description = codecMatch.Groups[8].Value.Trim();

            var codecInfo = new CodecInfo
            {
                Name = codecName,
                Description = Regex.Replace(description, @"\((?:encoders|decoders):[^)]+\)", "").Trim(),
                DecodingSupported = codecMatch.Groups[1].Value == "D",
                EncodingSupported = codecMatch.Groups[2].Value == "E",
                HasHardwareAcceleration = false,
                Type = codecMatch.Groups[3].Value switch
                {
                    "V" => ECodecType.Video,
                    "A" => ECodecType.Audio,
                    "S" => ECodecType.Subtitle,
                    _ => ECodecType.Other
                }
            };

            result[codecName] = codecInfo;

            var decodersMatch = DecodersRegex().Match(description);
            if (decodersMatch.Success)
            {
                var decoders = decodersMatch.Groups[1]
                    .Value.Split([' '], StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim())
                    .Where(s => !string.IsNullOrWhiteSpace(s));

                foreach (var decoder in decoders)
                {
                    // Создаем или обновляем запись для конкретного декодера
                    if (!result.ContainsKey(decoder))
                    {
                        var decoderInfo = new CodecInfo
                        {
                            Name = decoder,
                            Description = codecName,
                            DecodingSupported = true,
                            EncodingSupported = false,
                            Type = codecInfo.Type
                        };

                        _setHardwareProvider(decoderInfo);

                        result[decoder] = decoderInfo;
                    }
                }
            }

            var encodersMatch = EncodersRegex().Match(description);
            if (!encodersMatch.Success)
            {
                continue;
            }

            var encoders = encodersMatch.Groups[1]
                .Value.Split([' '], StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s));

            foreach (var encoder in encoders)
            {
                // Create or update a record for a specific encoder
                if (!result.TryGetValue(encoder, out var value))
                {
                    var encoderInfo = new CodecInfo
                    {
                        Name = encoder,
                        Description = codecName,
                        DecodingSupported = false,
                        EncodingSupported = true,
                        Type = codecInfo.Type
                    };

                    _setHardwareProvider(encoderInfo);

                    result[encoder] = encoderInfo;
                }
                else
                {
                    // If the record already exists (e.g. same name for encoder and decoder)
                    value.EncodingSupported = true;
                }
            }
        }

        return result;
    }
    public static async Task<bool> TestVideoCodec(string codecName)
    {
        string extraParams = "";

        if (codecName.Contains("_nvenc"))
        {
            extraParams = "-preset p1 -rc constqp -qp 23";
        }
        else if (codecName.Contains("_qsv"))
        {
            extraParams = "-global_quality 23";
        }
        else if (codecName.Contains("_amf"))
        {
            extraParams = "-quality balanced";
        }
        else if (codecName.Contains("_vaapi"))
        {
            // VAAPI requires device initialization
            try
            {
                var devicePaths = new[] { "/dev/dri/renderD128", "/dev/dri/card0" };
                string? devicePath = devicePaths.FirstOrDefault(File.Exists);

                if (devicePath == null)
                {
                    return false;
                }

                extraParams = $"-init_hw_device vaapi=va:{devicePath} -filter_hw_device va";
            }
            catch
            {
                return false;
            }
        }

        var arg =
            $"-loglevel error -f lavfi -i color=black:s=256x144 -vframes 1 -an -c:v {codecName} {extraParams} -f null -";

        try
        {
            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = FFmpegProcessingService.ExecutablesPath + "/ffmpeg",
                Arguments = arg,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            process.Start();

            if (await Task.Run(() => process.WaitForExit(5000)))
            {
                return process.ExitCode == 0;
            }

            process.Kill();
            return false;
        }
        catch
        {
            // In case of exception we consider that the codec does not work
            return false;
        }
    }

    /// <summary>
    /// Returns a list of supported video codecs with encoding support from best to worst
    /// </summary>
    public static async Task<List<CodecInfo>> GetSupportedVideoCodecsAsync()
    {
        var allCodecs = await GetCodecsAsync();
        var result = new List<CodecInfo>();

        // Group video codecs by providers with encoding support
        var videoEncoders = allCodecs.Values.Where(c => c.Type == ECodecType.Video && c.EncodingSupported).ToList();

        var priorityOrder = Enum.GetValues<HardwareProvider>().Skip(1);

        // List of codecs to check, in order of priority
        var codecFormats = new[] { "h264", "h265", "hevc", "av1", "vp9" };

        // first add hardware-accelerated codecs in priority order
        foreach (var provider in priorityOrder)
        {
            foreach (var format in codecFormats)
            {
                var hardwareCodecs = videoEncoders.Where(c =>
                    c.HasHardwareAcceleration && c.Provider == provider && c.Name.Contains(format));

                // Add only codecs that passed the test
                foreach (var codec in hardwareCodecs)
                {
                    if (await TestVideoCodec(codec.Name))
                    {
                        result.Add(codec);
                    }
                }
            }
        }

        // Add program codecs at the end
        var softwareCodecsToCheck = new List<string>
        {
            "libx264",
            "libx265",
            "libsvtav1",
            "libaom-av1",
            "libvpx-vp9"
        };

        foreach (var codec in softwareCodecsToCheck)
        {
            // Check if this codec is in the list of available codecs
            if (allCodecs.TryGetValue(codec, out var value) && value.EncodingSupported)
            {
                if (await TestVideoCodec(codec))
                {
                    result.Add(value);
                }
            }
        }

        foreach (var codec in result)
        {
            if (CodecEfficiencyMultipliers.TryGetValue(codec.Name, out var efficiencyMultiplier))
            {
                codec.BitrateMultiplier = efficiencyMultiplier.Item1;
                codec.Presets = efficiencyMultiplier.Item2;
                continue;
            }

            codec.Presets = nameof(DefaultPreset).ToCamelCase();
        }

        return result;
    }

    public static async Task<VideoSettingsSchema> GetSettingsSchemaAsync(bool forceUpdate = false)
    {
        var cachePath = Path.Combine(Constants.CacheFolderPath, "video_settings_schema.json");
        
        if (forceUpdate)
        {
            Schema = null;
            SchemaJson = null;
            if( File.Exists(cachePath))
            {
                File.Delete(cachePath);
            }
        }
        
        if (Schema != null)
        {
            return Schema;
        }

        if (File.Exists(cachePath))
        {
            SchemaJson = await File.ReadAllTextAsync(cachePath);
            Schema = JsonSerializer.Deserialize<VideoSettingsSchema>(SchemaJson, JsonSerializerOptions.Web) ?? 
                     throw new InvalidOperationException("Failed to deserialize video settings schema from cache");
            return Schema;
        }
        
        var codecs = await GetSupportedVideoCodecsAsync();
        var result = new VideoSettingsSchema
        {
            CodecPresets = CodecPresets,
            VideoBitrates = Resolutions,
            Codecs = codecs,
        };
        Schema = result;
        SchemaJson = JsonSerializer.Serialize(result,  JsonSerializerOptions.Web);
        await File.WriteAllTextAsync(cachePath, SchemaJson);
        return result;
    }
    
    /// <summary>
    /// Executes the FFmpeg command and returns the output
    /// </summary>
    public static async Task<string> RunFFmpegCommandAsync(string arguments)
    {
        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = FFmpegProcessingService.ExecutablesPath + "/ffmpeg",
            Arguments = arguments,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        process.Start();

        var standardOutput = await process.StandardOutput.ReadToEndAsync();

        await process.WaitForExitAsync();
        return standardOutput;
    }
    
    private static void _setHardwareProvider(CodecInfo codecInfo)
    {
        var name = codecInfo.Name.ToLowerInvariant();

        if (name.Contains("_nvenc") || name.Contains("_cuvid"))
        {
            codecInfo.HasHardwareAcceleration = true;
            codecInfo.Provider = HardwareProvider.NVIDIA;
        }
        else if (name.Contains("_qsv"))
        {
            codecInfo.HasHardwareAcceleration = true;
            codecInfo.Provider = HardwareProvider.IntelQuickSync;
        }
        else if (name.Contains("_amf"))
        {
            codecInfo.HasHardwareAcceleration = true;
            codecInfo.Provider = HardwareProvider.AMD;
        }
        else if (name.Contains("_vaapi"))
        {
            codecInfo.HasHardwareAcceleration = true;
            codecInfo.Provider = HardwareProvider.VAAPILinux;
        }
        else if (name.Contains("_mf"))
        {
            codecInfo.HasHardwareAcceleration = true;
            codecInfo.Provider = HardwareProvider.MediaFoundation;
        }
        else if (name.Contains("_videotoolbox"))
        {
            codecInfo.HasHardwareAcceleration = true;
            codecInfo.Provider = HardwareProvider.AppleVideoToolbox;
        }
    }
}
