using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Backend.Utils;
using Microsoft.Extensions.Logging;

namespace Backend.Services;

public class FFmpegProcessingService : IVideoProcessingService
{
    private readonly IS3FileService _s3FileService;
    private readonly ILogger<FFmpegProcessingService> _logger;

    private static string _ffmpegPath = "/usr/bin/ffmpeg";
    private static string _ffprobePath = "/usr/bin/ffprobe";
    public static string ExecutablesPath { get; private set; }

    private const string BucketName = "videos";

    public static void SetExecutablesPath(string directory, string ffmpegExecutable = "ffmpeg", string ffprobeExecutable = "ffprobe")
    {
        if (string.IsNullOrEmpty(directory) || !Directory.Exists(directory))
        {
            throw new ArgumentException("Invalid directory for FFmpeg executables.");
        }

        var ffmpegPath = Path.Combine(directory, ffmpegExecutable  + (RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? ".exe" : ""));
        var ffprobePath = Path.Combine(directory, ffprobeExecutable + (RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? ".exe" : ""));

        if (!File.Exists(ffmpegPath) || !File.Exists(ffprobePath))
        {
            throw new FileNotFoundException("FFmpeg or FFprobe executable not found in the specified directory.");
        }

        _ffmpegPath = ffmpegPath;
        _ffprobePath = ffprobePath;
        ExecutablesPath = directory;
    }
    
    private class MediaInfo
    {
        public string Path { get; set; }
        public TimeSpan Duration { get; set; }
        public List<AudioStream> AudioStreams { get; set; } = new();
        public List<VideoStream> VideoStreams { get; set; } = new();

        public class AudioStream
        {
            public string Index { get; set; }
            public string Codec { get; set; }
            public string SampleRate { get; set; }
            public string Channels { get; set; }
        }

        public class VideoStream
        {
            public string Index { get; set; }
            public int Width { get; set; }
            public int Height { get; set; }
            public string Codec { get; set; }
            public double FrameRate { get; set; }
        }
    }

    private class ProcessingQuality
    {
        public int Index { get; set; }
        public required string Name { get; set; }
        public required int Width { get; set; }
        public required int Height { get; set; }
        public required string VideoBitrate { get; set; } // Kbps
        public required string MaxBitrate { get; set; } // Kbps
        public required string BufferSize { get; set; } // Kbps
        public required string AudioBitrate { get; set; } // Kbps
    }

    public FFmpegProcessingService(IS3FileService s3FileService, ILogger<FFmpegProcessingService> logger)
    {
        _s3FileService = s3FileService;
        _logger = logger;
        
        if (!File.Exists(_ffmpegPath))
        {
            _logger.LogWarning($"FFmpeg not found at {_ffmpegPath}, trying to locate it");
            var ffmpegLocation = GetFFmpegPath();
            if (!string.IsNullOrEmpty(ffmpegLocation))
            {
                _ffmpegPath = ffmpegLocation;
                _logger.LogInformation($"Found ffmpeg at: {_ffmpegPath}");
            }
            else
            {
                _logger.LogError("FFmpeg not found in system!");
            }
        }
        
        if (!File.Exists(_ffprobePath))
        {
            _logger.LogWarning($"FFprobe not found at {_ffprobePath}, trying to locate it");
            var ffprobeLocation = GetFFprobePath();
            if (!string.IsNullOrEmpty(ffprobeLocation))
            {
                _ffprobePath = ffprobeLocation;
                _logger.LogInformation($"Found ffprobe at: {_ffprobePath}");
            }
            else
            {
                _logger.LogError("FFprobe not found in system!");
            }
        }
    }

    private string GetFFmpegPath()
    {
        try
        {
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "which",
                    Arguments = "ffmpeg",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            process.Start();
            string output = process.StandardOutput.ReadToEnd().Trim();
            process.WaitForExit();
                
            if (!string.IsNullOrEmpty(output) && File.Exists(output))
            {
                return output;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error finding ffmpeg: {ex.Message}");
        }
        
        string[] commonPaths = { "/bin/ffmpeg", "/usr/local/bin/ffmpeg" };
        foreach (var path in commonPaths)
        {
            if (File.Exists(path))
            {
                return path;
            }
        }
            
        return null;
    }

    private string GetFFprobePath()
    {
        try
        {
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "which",
                    Arguments = "ffprobe",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            process.Start();
            string output = process.StandardOutput.ReadToEnd().Trim();
            process.WaitForExit();
                
            if (!string.IsNullOrEmpty(output) && File.Exists(output))
            {
                return output;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error finding ffprobe: {ex.Message}");
        }
        
        string[] commonPaths = { "/bin/ffprobe", "/usr/local/bin/ffprobe" };
        foreach (var path in commonPaths)
        {
            if (File.Exists(path))
            {
                return path;
            }
        }
            
        return null;
    }
    
    private async Task<bool> ExecuteFFmpegAsync(string arguments)
    {
        _logger.LogInformation($"Executing ffmpeg command: {arguments}");
            
        var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = _ffmpegPath,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true, 
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        var outputBuilder = new StringBuilder();
        var errorBuilder = new StringBuilder();

        process.OutputDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                outputBuilder.AppendLine(e.Data);
            }
        };

        process.ErrorDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                // FFmpeg пишет прогресс в stderr
                if (e.Data.Contains("frame=") || e.Data.Contains("size="))
                {
                    // Логируем прогресс выполнения, не каждую строку
                    if (e.Data.Contains("time=") && e.Data.Length > 10)
                    {
                        _logger.LogDebug($"FFmpeg progress: {e.Data}");
                    }
                }
                else if (e.Data.Contains("Error") || e.Data.Contains("error") || e.Data.Contains("failed"))
                {
                    _logger.LogError($"FFmpeg error: {e.Data}");
                    errorBuilder.AppendLine(e.Data);
                }
                else
                {
                    errorBuilder.AppendLine(e.Data);
                }
            }
        };

        try
        {
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError($"FFmpeg exited with code {process.ExitCode}");
                _logger.LogError($"Error output: {errorBuilder}");
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Exception executing ffmpeg: {ex.Message}");
            return false;
        }
    }
    
    private async Task<MediaInfo> GetMediaInfoAsync(string filePath)
    {
        var mediaInfo = new MediaInfo { Path = filePath };
        
        var formatArgs = $"-v quiet -print_format json -show_format \"{filePath}\"";
        var formatProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = _ffprobePath,
                Arguments = formatArgs,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        try
        {
            formatProcess.Start();
            var formatOutput = await formatProcess.StandardOutput.ReadToEndAsync();
            await formatProcess.WaitForExitAsync();

            if (formatProcess.ExitCode == 0 && !string.IsNullOrEmpty(formatOutput))
            {
                var formatJson = JsonDocument.Parse(formatOutput);
                if (formatJson.RootElement.TryGetProperty("format", out var format) &&
                    format.TryGetProperty("duration", out var duration))
                {
                    if (double.TryParse(duration.GetString(), out var durationSeconds))
                    {
                        mediaInfo.Duration = TimeSpan.FromSeconds(durationSeconds);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting format info: {ex.Message}");
        }
        
        var streamsArgs = $"-v quiet -print_format json -show_streams \"{filePath}\"";
        var streamsProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = _ffprobePath,
                Arguments = streamsArgs,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        try
        {
            streamsProcess.Start();
            var streamsOutput = await streamsProcess.StandardOutput.ReadToEndAsync();
            await streamsProcess.WaitForExitAsync();

            if (streamsProcess.ExitCode == 0 && !string.IsNullOrEmpty(streamsOutput))
            {
                var streamsJson = JsonDocument.Parse(streamsOutput);
                if (streamsJson.RootElement.TryGetProperty("streams", out var streams))
                {
                    foreach (var stream in streams.EnumerateArray())
                    {
                        if (stream.TryGetProperty("codec_type", out var codecType))
                        {
                            var codecName = stream.TryGetProperty("codec_name", out var codec) ? codec.GetString() : "";
                            var indexStr = stream.TryGetProperty("index", out var index) ? index.GetInt32().ToString() : "0";
                                
                            if (codecType.GetString() == "video")
                            {
                                var width = stream.TryGetProperty("width", out var w) ? w.GetInt32() : 0;
                                var height = stream.TryGetProperty("height", out var h) ? h.GetInt32() : 0;
                                double frameRate = 0;
                                    
                                if (stream.TryGetProperty("r_frame_rate", out var rFrameRate))
                                {
                                    var fpsStr = rFrameRate.GetString();
                                    if (fpsStr.Contains("/"))
                                    {
                                        var fpsParts = fpsStr.Split('/');
                                        if (double.TryParse(fpsParts[0], out var num) && 
                                            double.TryParse(fpsParts[1], out var den) && den > 0)
                                        {
                                            frameRate = num / den;
                                        }
                                    }
                                }
                                    
                                mediaInfo.VideoStreams.Add(new MediaInfo.VideoStream
                                {
                                    Index = indexStr,
                                    Width = width,
                                    Height = height,
                                    Codec = codecName,
                                    FrameRate = frameRate
                                });
                            }
                            else if (codecType.GetString() == "audio")
                            {
                                var sampleRate = stream.TryGetProperty("sample_rate", out var sr) ? sr.GetString() : "";
                                var channels = stream.TryGetProperty("channels", out var ch) ? ch.GetInt32().ToString() : "";
                                    
                                mediaInfo.AudioStreams.Add(new MediaInfo.AudioStream
                                {
                                    Index = indexStr,
                                    Codec = codecName,
                                    SampleRate = sampleRate,
                                    Channels = channels
                                });
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting streams info: {ex.Message}");
        }

        return mediaInfo;
    }

    public async Task ProcessVideoMultiQualityAsync(string inputFilePath, string outputPrefix, VideoSettingsConfig? config)
    {
        var workingDir = Path.GetDirectoryName(inputFilePath) ?? throw new ArgumentException("Input file path is invalid.");

        _logger.LogInformation($"Getting media info for {inputFilePath}");
        var mediaInfo = await GetMediaInfoAsync(inputFilePath);
        _logger.LogInformation($"Video duration: {mediaInfo.Duration}, video streams: {mediaInfo.VideoStreams.Count}, audio streams: {mediaInfo.AudioStreams.Count}");

        await GeneratePreviewAsync(mediaInfo, TimeSpan.FromSeconds(10));

        if (config?.ThumbnailsCaptureInterval > 0)
        {
            await GenerateSpriteAndVttAsync(mediaInfo, workingDir, config);
        }
        
        await GenerateAdaptiveHlsAsync(mediaInfo, workingDir, config);
        
        _logger.LogInformation($"Uploading processed files to S3 bucket {BucketName}");
        foreach (var file in Directory.GetFiles(workingDir, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(workingDir, file).Replace("\\", "/");
            var objectName = $"{outputPrefix}/{relativePath}";

            await using var stream = File.OpenRead(file);
            await _s3FileService.PutObjectAsync(stream, BucketName, objectName);
            _logger.LogInformation($"Uploaded {file} to {objectName}");
        }
    }

    private async Task GeneratePreviewAsync(MediaInfo info, TimeSpan previewTime)
    {
        var workingDir = Path.GetDirectoryName(info.Path)!;
        string outputImage = Path.Combine(workingDir, "preview");
        if (File.Exists(outputImage))
        {
            _logger.LogInformation("Preview already exists, skipping generation");
            return;
        }

        var videoTime = info.Duration;
        if (previewTime > videoTime)
        {
            previewTime = videoTime / 2;
        }
            
        string timeArg = previewTime.ToString(@"hh\:mm\:ss");
        _logger.LogInformation($"Generating preview at {timeArg}");
            
        var args = $"-ss {timeArg} -i \"{info.Path}\" -frames:v 1 -vf \"scale='min(1600,iw)':'min(900,ih)':force_original_aspect_ratio=decrease\" -q:v 2 -f image2 \"{outputImage}\"";
        await ExecuteFFmpegAsync(args);
    }

    private async Task GenerateAdaptiveHlsAsync(MediaInfo mediaInfo, string outputDir, VideoSettingsConfig config = null)
    {
        _logger.LogInformation("Generating adaptive HLS streams");
        
        var hasAudio = mediaInfo.AudioStreams.Any();
        _logger.LogInformation($"Media has audio: {hasAudio}");

        var configQualities = config?.Adaptive?.Qualities;
        if (configQualities == null || !configQualities.Any())
        {
            _logger.LogWarning("No quality settings found in config, using defaults");
            return;
        }

        List<ProcessingQuality> unordered = new List<ProcessingQuality>();

        foreach (var quality in configQualities)
        {
            var resolution = FFmpegTools.Resolutions[quality.Height];
            unordered.Add(new ProcessingQuality
            {
                Name = quality.Height.ToString(),
                Width = resolution.Width,
                Height = quality.Height,
                VideoBitrate = $"{quality.VideoBitrate}k",
                MaxBitrate = $"{Math.Round(quality.VideoBitrate * 1.05)}k",
                BufferSize = $"{Math.Round(quality.VideoBitrate * 1.5)}k",
                AudioBitrate = $"{(quality.AudioBitrate == null ? config.Adaptive?.Audio?.DefaultBitrate : quality.AudioBitrate)}k"
            });
        }

        var qualities = unordered.OrderByDescending(x => x.Height).ToList();
        for (var i = 0; i < qualities.Count; i++)
        {
            qualities[i].Index = i;
        }

        _logger.LogInformation($"Configured {qualities.Count} quality variants");
        
        foreach (var quality in qualities)
        {
            var qualityDir = Path.Combine(outputDir, quality.Name);
            Directory.CreateDirectory(qualityDir);
            _logger.LogInformation($"Created directory for quality {quality.Name}: {qualityDir}");
        }
        
        var varStreamMap = hasAudio
            ? string.Join(" ", qualities.Select(q => $"v:{q.Index},a:{q.Index},name:{q.Name}"))
            : string.Join(" ", qualities.Select(q => $"v:{q.Index},name:{q.Name}"));
        
        var commandBuilder = new StringBuilder();
        
        commandBuilder.Append($"-i \"{mediaInfo.Path}\"");
        
        commandBuilder.Append($" -c:v {config?.Adaptive?.Video?.Codec ?? "libx264"}");
        commandBuilder.Append($" -preset {config?.Adaptive?.Video?.Preset ?? "medium"}");
        
        if (hasAudio)
        {
            commandBuilder.Append($" {string.Join(" ", qualities.Select(q => $"-map 0:v:0 -map 0:a:0"))}");
        }
        else
        {
            commandBuilder.Append($" {string.Join(" ", qualities.Select(q => $"-map 0:v:0"))}");
        }
        
        commandBuilder.Append($" {string.Join(" ", qualities.Select((q, i) => $"-filter:v:{i} scale={q.Width}:{q.Height}"))}");
        
        commandBuilder.Append($" {string.Join(" ", qualities.Select((q, i) => 
            $"-b:v:{i} {q.VideoBitrate} -maxrate:v:{i} {q.MaxBitrate} -bufsize:v:{i} {q.BufferSize}"))}");
        
        if (hasAudio)
        {
            commandBuilder.Append(" -c:a aac -ar 48000");
            commandBuilder.Append($" {string.Join(" ", qualities.Select((q, i) => $"-b:a:{i} {q.AudioBitrate}"))}");
        }
        
        commandBuilder.Append($" -var_stream_map \"{varStreamMap}\"");
        commandBuilder.Append(" -master_pl_name master.m3u8");
        commandBuilder.Append(" -f hls");
        commandBuilder.Append(" -hls_time 6");
        commandBuilder.Append(" -hls_playlist_type vod");
        commandBuilder.Append(" -hls_list_size 0");
        commandBuilder.Append($" -hls_segment_filename \"{Path.Combine(outputDir, "%v/segment_%03d.ts")}\"");
        commandBuilder.Append($" \"{Path.Combine(outputDir, "%v/playlist.m3u8")}\"");
            
        _logger.LogInformation("Executing adaptive HLS generation");
        await ExecuteFFmpegAsync(commandBuilder.ToString());
    }

    private async Task GenerateSpriteAndVttAsync(MediaInfo mediaInfo, string workingDir, VideoSettingsConfig config,
        int maxThumbsPerSprite = 50,
        int thumbHeight = 180)
    {
        _logger.LogInformation("Generating thumbnails sprite and VTT file");
            
        var duration = mediaInfo.Duration;
        var interval = config.ThumbnailsCaptureInterval;
        var thumbWidth = (int)Math.Round(thumbHeight * (16.0 / 9.0));
        var totalThumbs = (int)Math.Ceiling(duration.TotalSeconds / interval);
        var spriteCount = (int)Math.Ceiling((double)totalThumbs / maxThumbsPerSprite);

        _logger.LogInformation($"Video duration: {duration}, interval: {interval}s, total thumbnails: {totalThumbs}, sprite count: {spriteCount}");

        var tempThumbsDir = Path.Combine(Path.GetDirectoryName(mediaInfo.Path)!, "temp_thumbnails");
        var vttPath = Path.Combine(workingDir, "thumbnails.vtt");

        try
        {
            Directory.CreateDirectory(tempThumbsDir);
            
            _logger.LogInformation("Extracting thumbnails");
            var thumbnailArgs = $"-i \"{mediaInfo.Path}\" -vf \"fps=1/{interval},scale={thumbWidth}:{thumbHeight}\" -q:v 5 \"{Path.Combine(tempThumbsDir, "_%04d.jpg")}\"";
            await ExecuteFFmpegAsync(thumbnailArgs);

            var thumbIndex = 0;
            
            _logger.LogInformation("Creating VTT file");
            await using var vttWriter = new StreamWriter(vttPath, false);
            await vttWriter.WriteLineAsync("WEBVTT");
            await vttWriter.WriteLineAsync();
            
            for (var spriteIdx = 0; spriteIdx < spriteCount; spriteIdx++)
            {
                var thumbsInThisSprite = Math.Min(maxThumbsPerSprite, totalThumbs - thumbIndex);
                var columns = (int)Math.Ceiling(Math.Sqrt(thumbsInThisSprite));
                var rows = (int)Math.Ceiling((double)thumbsInThisSprite / columns);

                _logger.LogInformation($"Processing sprite {spriteIdx+1}/{spriteCount} with {thumbsInThisSprite} thumbnails ({columns}x{rows})");
                    
                var spriteName = $"thumbnails_{spriteIdx + 1}.jpg";
                var spritePath = Path.Combine(workingDir, spriteName);
                
                var fileListPath = Path.Combine(tempThumbsDir, $"filelist_{spriteIdx}.txt");
                await using (var fileListWriter = new StreamWriter(fileListPath))
                {
                    for (var i = 0; i < thumbsInThisSprite; i++)
                    {
                        var thumbFile = Path.Combine(tempThumbsDir, $"_{thumbIndex + i + 1:D4}.jpg");
                        if (File.Exists(thumbFile))
                        {
                            await fileListWriter.WriteLineAsync($"file '{thumbFile.Replace("\\", "/")}'");
                        }
                    }
                }

                try
                {
                    _logger.LogInformation("Attempting to create sprite with concat demuxer");
                    var concatArgs = $"-f concat -safe 0 -i \"{fileListPath}\" -vf \"tile={columns}x{rows}\" -frames:v 1 -q:v 5 \"{spritePath}\"";
                    var concatSuccess = await ExecuteFFmpegAsync(concatArgs);
                    
                    if (!concatSuccess)
                    {
                        _logger.LogWarning("Concat demuxer failed, trying alternative approach");
                        var inputFiles = new List<string>();
                        var inputArgs = new StringBuilder();
                            
                        for (var i = 0; i < thumbsInThisSprite; i++)
                        {
                            var thumbFile = Path.Combine(tempThumbsDir, $"_{thumbIndex + i + 1:D4}.jpg");
                            if (File.Exists(thumbFile)) 
                            {
                                inputArgs.Append($" -i \"{thumbFile}\"");
                                inputFiles.Add(thumbFile);
                            }
                        }

                        if (inputFiles.Count > 0)
                        {
                            var filterComplex = new StringBuilder();
                            for (var i = 0; i < inputFiles.Count; i++) 
                            {
                                filterComplex.Append($"[{i}:v]");
                            }
                            filterComplex.Append($"tile={columns}x{rows}[out]");

                            var directArgs = $"{inputArgs} -filter_complex \"{filterComplex}\" -map \"[out]\" -frames:v 1 -q:v 5 \"{spritePath}\"";
                            await ExecuteFFmpegAsync(directArgs);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Error creating sprite: {ex.Message}");
                }
                
                if (File.Exists(fileListPath)) 
                {
                    File.Delete(fileListPath);
                }
                
                for (var i = 0; i < thumbsInThisSprite; i++)
                {
                    var globalIndex = thumbIndex + i;
                    var x = i % columns * thumbWidth;
                    var y = i / columns * thumbHeight;

                    var startTime = TimeSpan.FromSeconds(globalIndex * interval);
                    var endTime = TimeSpan.FromSeconds((globalIndex + 1) * interval);

                    await vttWriter.WriteLineAsync($"{globalIndex + 1}");
                    await vttWriter.WriteLineAsync($"{FormatTimeSpan(startTime)} --> {FormatTimeSpan(endTime)}");
                    await vttWriter.WriteLineAsync($"{spriteName}#xywh={x},{y},{thumbWidth},{thumbHeight}");
                    await vttWriter.WriteLineAsync();
                }

                thumbIndex += thumbsInThisSprite;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error generating sprites and VTT: {ex.Message}");
        }
        finally
        {
            if (Directory.Exists(tempThumbsDir))
            {
                Directory.Delete(tempThumbsDir, true);
                _logger.LogInformation("Cleaned up temporary thumbnail directory");
            }
        }
    }

    private string FormatTimeSpan(TimeSpan time)
    {
        return $"{(int)time.TotalHours:00}:{time.Minutes:00}:{time.Seconds:00}.{time.Milliseconds:000}";
    }
    
    public async Task ProcessVideoSingleQualityAsync(string inputFilePath, string outputPrefix, VideoSettingsConfig? config)
    {
        _logger.LogInformation($"Processing video in single quality: {inputFilePath}");
            
        string tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
            
        var mediaInfo = await GetMediaInfoAsync(inputFilePath);
        
        string vttPath = Path.Combine(tempDir, "thumbnails.vtt");
        
        await GenerateSpriteAndVttAsync(mediaInfo, tempDir, config);
        
        await ConvertToHlsAsync(inputFilePath, tempDir);
        
        _logger.LogInformation("Uploading processed single-quality files to S3");
        foreach (var file in Directory.GetFiles(tempDir))
        {
            var objectName = $"{outputPrefix}/{Path.GetFileName(file)}";
            await using var fileStream = File.OpenRead(file);
            await _s3FileService.PutObjectAsync(fileStream, "videos", objectName);
            _logger.LogInformation($"Uploaded {file} to {objectName}");
        }
        
        Directory.Delete(tempDir, true);
        _logger.LogInformation("Cleaned up temporary directory");
    }
        
    private async Task ConvertToHlsAsync(string inputFile, string outputDirectory)
    {
        _logger.LogInformation($"Converting {inputFile} to HLS in {outputDirectory}");
            
        string outputPath = Path.Combine(outputDirectory, "master.m3u8");
            
        var args = $"-i \"{inputFile}\" -codec: copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls \"{outputPath}\"";
        await ExecuteFFmpegAsync(args);
    }
}