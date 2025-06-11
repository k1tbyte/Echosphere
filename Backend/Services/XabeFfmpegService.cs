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
        //disabled preview auto generation
        var mediaInfo = await FFmpeg.GetMediaInfo(inputFilePath);
        await GeneratePreviewAsync(mediaInfo, TimeSpan.FromSeconds(10));
        
        
        if (config?.ThumbnailsCaptureInterval > 0)
        {
            await GenerateSpriteAndVttAsync(mediaInfo, workingDir, config);
        }


        await GenerateAdaptiveHlsAsync(mediaInfo, workingDir, config);
        
            
        foreach (var file in Directory.GetFiles(workingDir, "*", SearchOption.AllDirectories))
        {
            var relativePath = Path.GetRelativePath(workingDir, file).Replace("\\", "/");
            var objectName = $"{outputPrefix}/{relativePath}";

            await using var stream = File.OpenRead(file);
            await s3FileService.PutObjectAsync(stream, BucketName, objectName);
        }
    }

    private async Task GeneratePreviewAsync(IMediaInfo info, TimeSpan previewTime)
    {
        var workingDir = Path.GetDirectoryName(info.Path)!;
        string outputImage = Path.Combine(workingDir, "preview");
        if (File.Exists(outputImage))
        {
            return;
        }

        var videoTime = info.Duration;
        if(previewTime > videoTime)
        {
            previewTime = videoTime / 2;
        }
        
        string timeArg = previewTime.ToString(@"hh\:mm\:ss");
        
        await FFmpeg.Conversions.New()
            .AddParameter($"-ss {timeArg} -i \"{info.Path}\" -frames:v 1 -vf \"scale='min(1600,iw)':'min(900,ih)':force_original_aspect_ratio=decrease\" -q:v 2 -f image2 \"{outputImage}\"")
            .Start();
    }

    private async Task GenerateAdaptiveHlsAsync(IMediaInfo mediaInfo, string outputDir, VideoSettingsConfig config = null)
    {
        // Get media info to check available streams
        var hasAudio = mediaInfo.AudioStreams.Any();

        var configQualities = config.Adaptive!.Qualities;
        List<ProcessingQuality> unordered = [];

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
                AudioBitrate =
                    $"{(quality.AudioBitrate == null ? config.Adaptive!.Audio.DefaultBitrate : quality.AudioBitrate)}k"
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

        // Build var_stream_map based on available streams
        var varStreamMap = hasAudio
            ? string.Join(" ", qualities.Select(q => $"v:{q.Index},a:{q.Index},name:{q.Name}"))
            : string.Join(" ", qualities.Select(q => $"v:{q.Index},name:{q.Name}"));

        var conversion = FFmpeg.Conversions.New()
            .AddParameter($"-i \"{mediaInfo.Path}\"")
            .AddParameter($"-c:v {config.Adaptive!.Video.Codec}")
            .AddParameter($"-preset {config.Adaptive!.Video.Preset}");

        // Map streams based on availability
        conversion.AddParameter(hasAudio
            ? string.Join(" ", qualities.Select(q => $"-map 0:v:0 -map 0:a:0"))
            : string.Join(" ", qualities.Select(q => $"-map 0:v:0")));

        // Video filters
        conversion
            .AddParameter(string.Join(" ", qualities.Select((q, i) => $"-filter:v:{i} scale={q.Width}:{q.Height}")))
            .AddParameter(string.Join(" ",
                qualities.Select((q, i) =>
                    $"-b:v:{i} {q.VideoBitrate} -maxrate:v:{i} {q.MaxBitrate} -bufsize:v:{i} {q.BufferSize}")));

        // Audio settings only if audio exists
        if (hasAudio)
        {
            conversion.AddParameter("-c:a aac -ar 48000")
                .AddParameter(string.Join(" ", qualities.Select((q, i) => $"-b:a:{i} {q.AudioBitrate}")));
        }

        // HLS settings
        conversion.AddParameter($"-var_stream_map \"{varStreamMap}\"")
            .AddParameter("-master_pl_name master.m3u8")
            .AddParameter("-f hls")
            .AddParameter("-hls_time 6")
            .AddParameter("-hls_playlist_type vod")
            .AddParameter("-hls_list_size 0")
            .AddParameter("-hls_segment_filename \"" + Path.Combine(outputDir, "%v/segment_%03d.ts") + "\"")
            .SetOutput(Path.Combine(outputDir, "%v/playlist.m3u8"));

        await conversion.Start();
    }

    private async Task GenerateSpriteAndVttAsync(IMediaInfo mediaInfo, string workingDir, VideoSettingsConfig config,
        int maxThumbsPerSprite = 50,
        int thumbHeight = 180)
    {
        var duration = mediaInfo.Duration;

        var interval = config.ThumbnailsCaptureInterval;
        var thumbWidth = (int)Math.Round(thumbHeight * (16.0 / 9.0));
        var totalThumbs = (int)Math.Ceiling(duration.TotalSeconds / interval);
        var spriteCount = (int)Math.Ceiling((double)totalThumbs / maxThumbsPerSprite);

        var tempThumbsDir = Path.Combine(Path.GetDirectoryName(mediaInfo.Path)!, "temp_thumbnails");
        var vttPath = Path.Combine(workingDir, "thumbnails.vtt");

        try
        {
            Directory.CreateDirectory(tempThumbsDir);

            // Step 1: Extract all thumbnails
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{mediaInfo.Path}\"")
                .AddParameter($"-vf \"fps=1/{interval},scale={thumbWidth}:{thumbHeight}\"")
                .AddParameter("-q:v 5")
                .SetOutput(Path.Combine(tempThumbsDir, "_%04d.jpg"))
                .Start();

            var thumbIndex = 0;

            // Step 2: Prepare VTT writer
            await using var vttWriter = new StreamWriter(vttPath, false);
            await vttWriter.WriteLineAsync("WEBVTT");
            await vttWriter.WriteLineAsync();

            // Step 3: Process sprites in batches
            for (var spriteIdx = 0; spriteIdx < spriteCount; spriteIdx++)
            {
                var thumbsInThisSprite = Math.Min(maxThumbsPerSprite, totalThumbs - thumbIndex);
                var columns = (int)Math.Ceiling(Math.Sqrt(thumbsInThisSprite));
                var rows = (int)Math.Ceiling((double)thumbsInThisSprite / columns);

                var spriteName = $"thumbnails_{spriteIdx + 1}.jpg";
                var spritePath = Path.Combine(workingDir, spriteName);

                // Create a text file with a list of images for concatenation
                var fileListPath = Path.Combine(tempThumbsDir, $"filelist_{spriteIdx}.txt");
                await using (var fileListWriter = new StreamWriter(fileListPath))
                {
                    for (var i = 0; i < thumbsInThisSprite; i++)
                    {
                        var thumbFile = Path.Combine(tempThumbsDir, $"_{thumbIndex + i + 1:D4}.jpg");
                        if (File.Exists(thumbFile))
                            await fileListWriter.WriteLineAsync($"file '{thumbFile.Replace("\\", "/")}'");
                    }
                }

                try
                {
                    // Вариант 1: Использование concat demuxer с tile filter
                    await FFmpeg.Conversions.New()
                        .AddParameter($"-f concat -safe 0 -i \"{fileListPath}\"")
                        .AddParameter($"-vf tile={columns}x{rows}")
                        .AddParameter("-frames:v 1")
                        .AddParameter("-q:v 5")
                        .SetOutput(spritePath)
                        .Start();
                }
                catch
                {
                    //If concat doesn't work, use direct file specification
                    var inputFiles = new List<string>();
                    for (var i = 0; i < thumbsInThisSprite; i++)
                    {
                        var thumbFile = Path.Combine(tempThumbsDir, $"_{thumbIndex + i + 1:D4}.jpg");
                        if (File.Exists(thumbFile)) inputFiles.Add($"-i \"{thumbFile}\"");
                    }

                    if (inputFiles.Count > 0)
                    {
                        var conversion = FFmpeg.Conversions.New();

                        foreach (var inputParam in inputFiles) conversion.AddParameter(inputParam);

                        var filterComplex = "";
                        for (var i = 0; i < inputFiles.Count; i++) filterComplex += $"[{i}:v]";
                        filterComplex += $"tile={columns}x{rows}[out]";

                        conversion.AddParameter($"-filter_complex \"{filterComplex}\"")
                            .AddParameter("-map [out]")
                            .AddParameter("-frames:v 1")
                            .AddParameter("-q:v 5")
                            .SetOutput(spritePath);

                        await conversion.Start();
                    }
                }

                if (File.Exists(fileListPath)) File.Delete(fileListPath);

                // Write VTT entries for this sprite
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
        finally
        {
            if (Directory.Exists(tempThumbsDir)) Directory.Delete(tempThumbsDir, true);
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
        var mediaInfo = await FFmpeg.GetMediaInfo(inputFilePath);
        
        string spritePath = Path.Combine(tempDir, "sprite.jpg");
        string vttPath = Path.Combine(tempDir, "thumbnails.vtt");
        
        await GenerateSpriteAndVttAsync(mediaInfo, spritePath, config);
        await ConvertToHlsAsync(inputFilePath, tempDir);
        
        // Upload generated HLS files
        foreach (var file in Directory.GetFiles(tempDir))
        {
            var objectName = $"{outputPrefix}/{Path.GetFileName(file)}";

            await using var fileStream = File.OpenRead(file);
            
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