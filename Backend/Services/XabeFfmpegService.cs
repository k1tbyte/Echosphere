using System.Runtime.InteropServices;
using System.Text;
using Backend.Utils;
using Minio;
using Minio.DataModel.Args;
using Xabe.FFmpeg;

namespace Backend.Services;

public class XabeFfmpegService(IS3FileService s3FileService) : IVideoProcessingService
{
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

    private const string BucketName = "videos";

    public async Task ProcessVideoMultiQualityAsync(string inputFilePath, string outputPrefix, VideoSettingsConfig? config)
    {
        var workingDir =  Path.GetDirectoryName(inputFilePath) ?? throw new ArgumentException("Input file path is invalid.");
        await GenerateSpriteAndVttAsync(inputFilePath, workingDir, config);

        await GenerateAdaptiveHlsAsync(inputFilePath, workingDir, config);
        
        //disabled preview auto generation
        /*string previewPath = Path.Combine(tempDir, "preview.jpg");

        await GeneratePreviewAsync(inputFilePath, previewPath,TimeSpan.FromSeconds(previewTimecode));*/
            
        foreach (var file in Directory.GetFiles(workingDir, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(workingDir, file).Replace("\\", "/");
            var objectName = $"{outputPrefix}/{relativePath}";

            await using var stream = File.OpenRead(file);
            await s3FileService.PutObjectAsync(stream, BucketName, objectName);
        }
    }

    private async Task GenerateAdaptiveHlsAsync(string inputFile, string outputDir, VideoSettingsConfig config = null)
    {
        var configQualities = config.Adaptive!.Qualities;
        List<ProcessingQuality> unordered = new List<ProcessingQuality>();
        
        foreach (var quality in configQualities)
        {
            var resolution = FFmpegTools.Resolutions[quality.Key];
            unordered.Add(new ProcessingQuality
            {
                Name = quality.Key.ToString(),
                Width = resolution.Width,
                Height = quality.Key,
                VideoBitrate = $"{quality.Value.VideoBitrate}k",
                MaxBitrate = $"{Math.Round(quality.Value.VideoBitrate * 1.05)}k",
                BufferSize = $"{Math.Round(quality.Value.VideoBitrate * 1.5)}k",
                AudioBitrate = $"{(quality.Value.AudioBitrate == null ? config.Adaptive!.Audio.DefaultBitrate : quality.Value.AudioBitrate)}k"
            });
        }

        var qualities = unordered.OrderByDescending(x => x.Height).ToList();
        for (var i = 0; i < qualities.Count; i++)
        {
            qualities[i].Index = i;
        }
        
        foreach (var quality in qualities)
        {
            Directory.CreateDirectory(Path.Combine(outputDir, quality.Name));
        }
        
        var varStreamMap = string.Join(" ", qualities.Select(q => $"v:{q.Index},a:{q.Index},name:{q.Name}"));
        
        var conversion = FFmpeg.Conversions.New()
            .AddParameter($"-i \"{inputFile}\"")
            // Video codec settings
            .AddParameter($"-c:v {config.Adaptive!.Video.Codec}")
            // Use a faster preset for better performance
            .AddParameter($"-preset {config.Adaptive!.Video.Preset}")

            // Добавляем параметры для каждого качества
            .AddParameter(string.Join(" ", qualities.Select(q => $"-map 0:v:0 -map 0:a:0")))
            .AddParameter(string.Join(" ", qualities.Select((q, i) => $"-filter:v:{i} scale={q.Width}:{q.Height}")))
            .AddParameter(string.Join(" ",
                qualities.Select((q, i) =>
                    $"-b:v:{i} {q.VideoBitrate} -maxrate:v:{i} {q.MaxBitrate} -bufsize:v:{i} {q.BufferSize}")))

            // Audio settings
            .AddParameter("-c:a aac -ar 48000")
            .AddParameter(string.Join(" ", qualities.Select((q, i) => $"-b:a:{i} {q.AudioBitrate}")))

            // General HLS settings
            .AddParameter($"-var_stream_map \"{varStreamMap}\"")
            .AddParameter("-master_pl_name master.m3u8")
            .AddParameter("-f hls")
            .AddParameter("-hls_time 6")
            .AddParameter("-hls_playlist_type vod")
            .AddParameter("-hls_list_size 0")
            .AddParameter("-hls_segment_filename \"" + Path.Combine(outputDir, "%v/segment_%03d.ts") + "\"")
            .SetOutput(Path.Combine(outputDir, "%v/playlist.m3u8"));
        
        await conversion.Start();
    }
    
    private async Task GeneratePreviewAsync(string inputFile, string outputImage, TimeSpan previewTime)
    {
        string timeArg = previewTime.ToString(@"hh\:mm\:ss");

        await FFmpeg.Conversions.New()
            .AddParameter($"-ss {timeArg} -i \"{inputFile}\" -frames:v 1 -q:v 2 \"{outputImage}\"")
            .Start();
    }
    
    private async Task GenerateSpriteAndVttAsync(string inputFile, string workingDir, VideoSettingsConfig config)
    {
        // Generate sprite and VTT for preview thumbnails
        string spritePath = Path.Combine(workingDir, "thumbnails.jpg");
        string vttPath = Path.Combine(workingDir, "thumbnails.vtt");
        // First, get video duration to calculate number of thumbnails
        var mediaInfo = await FFmpeg.GetMediaInfo(inputFile);
        var duration = mediaInfo.Duration;
        
        
        // Settings for sprite generation
        const int thumbWidth = 178;
        const int thumbHeight = 100;
        const int columns = 6;
        int interval = config.ThumbnailsCaptureInterval; // One thumbnail per second
        
        // Calculate how many thumbnails we'll generate based on video duration
        int totalThumbs = (int)Math.Ceiling(duration.TotalSeconds / interval);
        int rows = (int)Math.Ceiling((double)totalThumbs / columns);
        
        // Create temporary directory for individual thumbnails
        string tempThumbsDir = Path.Combine(Path.GetDirectoryName(inputFile)!, "temp_thumbnails");
        
        try
        {
            Directory.CreateDirectory(tempThumbsDir);
            // Step 1: Extract thumbnails at regular intervals
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{inputFile}\"")
                .AddParameter($"-vf \"fps=1/{interval},scale={thumbWidth}:{thumbHeight}\"")
                .AddParameter("-q:v 5") // Quality level, lower is better (1-31)
                .SetOutput(Path.Combine(tempThumbsDir, "_%04d.jpg"))
                .Start();
            
            // Step 2: Create the sprite by montaging the thumbnails
            var tileFilter = $"tile={columns}x{rows}";
            
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{Path.Combine(tempThumbsDir, "_%04d.jpg")}\"")
                .AddParameter($"-vf \"{tileFilter}\"")
                .AddParameter("-q:v 5")
                .SetOutput(spritePath)
                .Start();
            
            // Step 3: Generate the WebVTT file
            await GenerateVttFileAsync(vttPath, totalThumbs, columns, rows, thumbWidth, thumbHeight, interval);
        }
        finally
        {
            // Clean up temp files
            if (Directory.Exists(tempThumbsDir))
            {
                Directory.Delete(tempThumbsDir, true);
            }
        }
    }
    

    private async Task GenerateVttFileAsync(string vttPath, int totalThumbs, int columns, int rows, 
        int thumbWidth, int thumbHeight, int interval)
    {
        await using var writer = new StreamWriter(vttPath, false); 
        
        await writer.WriteLineAsync("WEBVTT");
        await writer.WriteLineAsync();
    
        string spriteName = Path.GetFileName(vttPath).Replace(".vtt", ".jpg");
        
        for (int i = 0; i < totalThumbs; i++)
        {
            int x = (i % columns) * thumbWidth;
            int y = (i / columns) * thumbHeight;
        
            TimeSpan startTime = TimeSpan.FromSeconds(i * interval);
            TimeSpan endTime = TimeSpan.FromSeconds((i + 1) * interval);
        
            await writer.WriteLineAsync($"{i + 1}");
            await writer.WriteLineAsync($"{FormatTimeSpan(startTime)} --> {FormatTimeSpan(endTime)}");
            await writer.WriteLineAsync($"{spriteName}#xywh={x},{y},{thumbWidth},{thumbHeight}");
            await writer.WriteLineAsync();
        }
    }
    
    private string FormatTimeSpan(TimeSpan time)
    {
        return $"{(int)time.TotalHours:00}:{time.Minutes:00}:{time.Seconds:00}.{time.Milliseconds:000}";
    }
    
    public async Task ProcessVideoSingleQualityAsync(string inputFilePath, string outputPrefix, VideoSettingsConfig? config)
    {
        string tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempDir);
        string spritePath = Path.Combine(tempDir, "sprite.jpg");
        string vttPath = Path.Combine(tempDir, "thumbnails.vtt");
        await GenerateSpriteAndVttAsync(inputFilePath, spritePath, config);
        await ConvertToHlsAsync(inputFilePath, tempDir);
        
        // Upload generated HLS files
        foreach (var file in Directory.GetFiles(tempDir))
        {
            var objectName = $"{outputPrefix}/{Path.GetFileName(file)}";

            using var fileStream = File.OpenRead(file);
            
            await s3FileService.PutObjectAsync(fileStream, "videos", objectName);
        }

        Directory.Delete(tempDir, true);
    }
    
    private async Task ConvertToHlsAsync(string inputFile, string outputDirectory)
    {
        string outputPath = Path.Combine(outputDirectory, "master.m3u8");

        var conversion = FFmpeg.Conversions.New()
            .AddParameter($"-i \"{inputFile}\"")
            .AddParameter("-codec: copy")
            .AddParameter("-start_number 0")
            .AddParameter("-hls_time 10")
            .AddParameter("-hls_list_size 0")
            .AddParameter("-f hls")
            .SetOutput(outputPath);

        await conversion.Start();
    }
}