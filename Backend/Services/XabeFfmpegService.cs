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
        private async Task GenerateSpriteAndVttAsync(
        string inputFile,
        string workingDir,
        VideoSettingsConfig config,
        int maxThumbsPerSprite = 50,
        int thumbHeight = 360)
    {
        var mediaInfo = await FFmpeg.GetMediaInfo(inputFile);
        var duration = mediaInfo.Duration;

        int interval = config.ThumbnailsCaptureInterval;
        int thumbWidth = (int)Math.Round(thumbHeight * (16.0 / 9.0));
        int totalThumbs = (int)Math.Ceiling(duration.TotalSeconds / interval);
        int spriteCount = (int)Math.Ceiling((double)totalThumbs / maxThumbsPerSprite);

        string tempThumbsDir = Path.Combine(Path.GetDirectoryName(inputFile)!, "temp_thumbnails");
        string vttPath = Path.Combine(workingDir, "thumbnails.vtt");

        try
        {
            Directory.CreateDirectory(tempThumbsDir);

            // Step 1: Extract all thumbnails
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{inputFile}\"")
                .AddParameter($"-vf \"fps=1/{interval},scale={thumbWidth}:{thumbHeight}\"")
                .AddParameter("-q:v 5")
                .SetOutput(Path.Combine(tempThumbsDir, "_%04d.jpg"))
                .Start();

            int thumbIndex = 0;

            // Step 2: Prepare VTT writer
            await using var vttWriter = new StreamWriter(vttPath, false);
            await vttWriter.WriteLineAsync("WEBVTT");
            await vttWriter.WriteLineAsync();

            // Step 3: Process sprites in batches
            for (int spriteIdx = 0; spriteIdx < spriteCount; spriteIdx++)
            {
                int thumbsInThisSprite = Math.Min(maxThumbsPerSprite, totalThumbs - thumbIndex);
                int columns = (int)Math.Ceiling(Math.Sqrt(thumbsInThisSprite));
                int rows = (int)Math.Ceiling((double)thumbsInThisSprite / columns);

                string spriteName = $"thumbnails_{spriteIdx + 1}.jpg";
                string spritePath = Path.Combine(workingDir, spriteName);

                // Create sprite image
                await FFmpeg.Conversions.New()
                    .AddParameter($"-pattern_type glob -i \"{tempThumbsDir}/_{(thumbIndex + 1):D4}*.jpg\"")
                    .AddParameter($"-vf tile={columns}x{rows}")
                    .AddParameter($"-frames:v 1")
                    .AddParameter("-q:v 5")
                    .SetOutput(spritePath)
                    .Start();

                // Write VTT entries for this sprite
                for (int i = 0; i < thumbsInThisSprite; i++)
                {
                    int globalIndex = thumbIndex + i;
                    int x = (i % columns) * thumbWidth;
                    int y = (i / columns) * thumbHeight;

                    TimeSpan startTime = TimeSpan.FromSeconds(globalIndex * interval);
                    TimeSpan endTime = TimeSpan.FromSeconds((globalIndex + 1) * interval);

                    await vttWriter.WriteLineAsync($"{globalIndex + 1}");
                    await vttWriter.WriteLineAsync($"{FormatTimeSpan(startTime)} --> {FormatTimeSpan(endTime)}");
                    await vttWriter.WriteLineAsync($"{spriteName}#xywh={x},{y},{thumbWidth},{thumbHeight}");
                    await vttWriter.WriteLineAsync();
                }

                thumbIndex += thumbsInThisSprite;
            }
        }
        finally
        {
            if (Directory.Exists(tempThumbsDir))
            {
                Directory.Delete(tempThumbsDir, true);
            }
        }
    }
    /*private async Task GenerateSpriteAndVttAsync(
        string inputFile, 
        string workingDir, 
        VideoSettingsConfig config, 
        int maxThumbsPerSprite = 50, 
        int thumbHeight = 360)
    {
        string spritePath = Path.Combine(workingDir, "thumbnails.jpg");
        string vttPath = Path.Combine(workingDir, "thumbnails.vtt");

        var mediaInfo = await FFmpeg.GetMediaInfo(inputFile);
        var duration = mediaInfo.Duration;

        int interval = config.ThumbnailsCaptureInterval; // e.g., 1 thumb per X sec

        // Calculate width proportional to height, assuming 16:9 aspect ratio
        int thumbWidth = (int)Math.Round(thumbHeight * (16.0 / 9.0));

        // Calculate total number of thumbs
        int totalThumbs = (int)Math.Ceiling(duration.TotalSeconds / interval);

        // Limit thumbs per sprite
        int thumbsInThisSprite = Math.Min(totalThumbs, maxThumbsPerSprite);

        int columns = (int)Math.Ceiling(Math.Sqrt(thumbsInThisSprite));
        int rows = (int)Math.Ceiling((double)thumbsInThisSprite / columns);

        string tempThumbsDir = Path.Combine(Path.GetDirectoryName(inputFile)!, "temp_thumbnails");

        try
        {
            Directory.CreateDirectory(tempThumbsDir);

            // Step 1: Extract thumbnails
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{inputFile}\"")
                .AddParameter($"-vf \"fps=1/{interval},scale={thumbWidth}:{thumbHeight}\"")
                .AddParameter("-q:v 5")
                .SetOutput(Path.Combine(tempThumbsDir, "_%04d.jpg"))
                .Start();

            // Step 2: Create sprite (only up to maxThumbsPerSprite images)
            var tileFilter = $"tile={columns}x{rows}";
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{Path.Combine(tempThumbsDir, "_%04d.jpg")}\"")
                .AddParameter($"-vf \"{tileFilter}\"")
                .AddParameter("-frames:v 1") // take only one sprite image
                .AddParameter("-q:v 5")
                .SetOutput(spritePath)
                .Start();

            // Step 3: Generate VTT
            await GenerateVttFileAsync(vttPath, thumbsInThisSprite, columns, rows, thumbWidth, thumbHeight, interval);
        }
        finally
        {
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
    }*/
    
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