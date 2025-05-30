using System.Diagnostics;
using System.Text.RegularExpressions;
using Xabe.FFmpeg;

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

public class CodecInfo
{
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool DecodingSupported { get; set; }
    public bool EncodingSupported { get; set; }
    public ECodecType Type { get; set; }
    public bool HasHardwareAcceleration { get; set; }
    public HardwareProvider Provider { get; set; } = HardwareProvider.None;
}

public static partial class FFmpegTools
{
    [GeneratedRegex(@"\(encoders:([^)]+)\)")]
    private static partial Regex EncodersRegex();
    [GeneratedRegex(@"\(decoders:([^)]+)\)")]
    private static partial Regex DecodersRegex();
    [GeneratedRegex(@"^\s*([D\.])([E\.])([VAS])([I\.])([L\.])([S\.])\s+([^\s]+)\s+(.*)$")]
    private static partial Regex CodecEntryRegex();
    
    
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
                FileName = FFmpeg.ExecutablesPath + "/ffmpeg",
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
            FileName = FFmpeg.ExecutablesPath + "/ffmpeg",
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