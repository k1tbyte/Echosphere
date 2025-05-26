using System.Runtime.InteropServices;
using System.Text;
using Minio;
using Minio.DataModel.Args;
using Xabe.FFmpeg;

namespace Backend.Services;

public class XabeFfmpegService : IVideoProcessingService
{
    private readonly IS3FileService _s3FileService;

    public XabeFfmpegService(IS3FileService s3FileService, IConfiguration configuration)
    {
        _s3FileService = s3FileService;
        string? ffmpegPath = configuration["ffmpeg:Path"];
        if (string.IsNullOrEmpty(ffmpegPath))
        {
            ffmpegPath = System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                ? "C:\\ffmpeg\\bin"
                : "/usr/bin";
        }
        FFmpeg.SetExecutablesPath(ffmpegPath);
    }

    public async Task ProcessFullVideoPipelineAsync(string inputFilePath, string bucketName, string outputPrefix)
    {
        string tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        // Generate sprite and VTT for preview thumbnails
        string spritePath = Path.Combine(tempDir, "sprite.jpg");
        string vttPath = Path.Combine(tempDir, "thumbnails.vtt");
        await GenerateSpriteAndVttAsync(inputFilePath, spritePath, vttPath);
        Directory.CreateDirectory(tempDir);
        
        await GenerateAdaptiveHlsAsync(inputFilePath, tempDir);
        
        string posterPath = Path.Combine(tempDir, "poster.jpg");
        await GeneratePosterAsync(inputFilePath, posterPath);
        
        
        foreach (var file in Directory.GetFiles(tempDir, "*", SearchOption.AllDirectories))
        {
            string relativePath = Path.GetRelativePath(tempDir, file).Replace("\\", "/");
            string objectName = $"{outputPrefix}/{relativePath}";

            using var stream = File.OpenRead(file);
            await _s3FileService.PutObjectAsync(bucketName, objectName, stream);
        }

        Directory.Delete(tempDir, true);
    }

    private async Task GenerateAdaptiveHlsAsync(string inputFile, string outputDir)
    {
        // Create master playlist path
        string masterPlaylist = Path.Combine(outputDir, "master.m3u8");
    
        var conversion = FFmpeg.Conversions.New()
            .AddParameter($"-i \"{inputFile}\"")
            // Video codec settings
            .AddParameter("-c:v h264_nvenc")
            // Use a faster preset for better performance
            /*.AddParameter("-preset fast") */ // TODO optional
            // Create multiple quality renditions
            // 1080p - high quality
            .AddParameter("-map 0:v:0 -map 0:a:0")
            .AddParameter("-filter:v:0 scale=1920:1080")
            .AddParameter("-b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k")
            // 720p - medium quality
            .AddParameter("-map 0:v:0 -map 0:a:0")
            .AddParameter("-filter:v:1 scale=1280:720")
            .AddParameter("-b:v:1 2800k -maxrate:v:1 3000k -bufsize:v:1 4200k")
            // 480p - low quality
            .AddParameter("-map 0:v:0 -map 0:a:0")
            .AddParameter("-filter:v:2 scale=854:480")
            .AddParameter("-b:v:2 1400k -maxrate:v:2 1498k -bufsize:v:2 2100k")
            // 360p - very low quality
            .AddParameter("-map 0:v:0 -map 0:a:0")
            .AddParameter("-filter:v:3 scale=640:360")
            .AddParameter("-b:v:3 800k -maxrate:v:3 856k -bufsize:v:3 1200k")
            // Audio settings
            .AddParameter("-c:a aac -ar 48000")
            .AddParameter("-b:a:0 192k -b:a:1 128k -b:a:2 96k -b:a:3 64k")
            // General HLS settings
            .AddParameter("-var_stream_map \"v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3\"")
            .AddParameter("-master_pl_name master.m3u8")
            .AddParameter("-f hls")
            .AddParameter("-hls_time 6")
            .AddParameter("-hls_playlist_type vod")
            .AddParameter("-hls_list_size 0")
            .AddParameter("-hls_segment_filename \"" + Path.Combine(outputDir, "v%v/segment_%03d.ts") + "\"")
            .SetOutput(Path.Combine(outputDir, "v%v/playlist.m3u8"));

        await conversion.Start();
    }
    
    private async Task GeneratePosterAsync(string inputFile, string outputImage)
    {
        await FFmpeg.Conversions.New()
            .AddParameter($"-ss 00:00:05 -i \"{inputFile}\" -frames:v 1 -q:v 2 \"{outputImage}\"")
            .Start();
    }
    
    /// <summary>
    /// Generate a thumbnail sprite image and corresponding WebVTT file for video previews
    /// </summary>
    /// <param name="inputFile">Path to the input video file</param>
    /// <param name="spriteOutputPath">Path where the sprite image will be saved</param>
    /// <param name="vttOutputPath">Path where the VTT file will be saved</param>
    private async Task GenerateSpriteAndVttAsync(string inputFile, string spriteOutputPath, string vttOutputPath)
    {
        // First, get video duration to calculate number of thumbnails
        var mediaInfo = await FFmpeg.GetMediaInfo(inputFile);
        var duration = mediaInfo.Duration;
        
        // Settings for sprite generation
        const int thumbWidth = 178;
        const int thumbHeight = 100;
        const int columns = 6;
        const int interval = 1; // One thumbnail per second
        
        // Calculate how many thumbnails we'll generate based on video duration
        int totalThumbs = (int)Math.Ceiling(duration.TotalSeconds);
        int rows = (int)Math.Ceiling((double)totalThumbs / columns);
        
        // Create temporary directory for individual thumbnails
        string tempThumbsDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(tempThumbsDir);
        
        try
        {
            // Step 1: Extract thumbnails at regular intervals
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{inputFile}\"")
                .AddParameter($"-vf \"fps=1/{interval},scale={thumbWidth}:{thumbHeight}\"")
                .AddParameter("-q:v 5") // Quality level, lower is better (1-31)
                .SetOutput(Path.Combine(tempThumbsDir, "thumb_%04d.jpg"))
                .Start();
            
            // Step 2: Create the sprite by montaging the thumbnails
            var tileFilter = $"tile={columns}x{rows}";
            
            await FFmpeg.Conversions.New()
                .AddParameter($"-i \"{Path.Combine(tempThumbsDir, "thumb_%04d.jpg")}\"")
                .AddParameter($"-vf \"{tileFilter}\"")
                .AddParameter("-q:v 5")
                .SetOutput(spriteOutputPath)
                .Start();
            
            // Step 3: Generate the WebVTT file
            await GenerateVttFileAsync(vttOutputPath, totalThumbs, columns, rows, thumbWidth, thumbHeight, interval);
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
    
    /// <summary>
    /// Generate WebVTT file for the sprite image
    /// </summary>
    private async Task GenerateVttFileAsync(string vttPath, int totalThumbs, int columns, int rows, 
        int thumbWidth, int thumbHeight, int interval)
    {
        StringBuilder vttBuilder = new StringBuilder();
        vttBuilder.AppendLine("WEBVTT");
        vttBuilder.AppendLine();
        
        string spriteName = Path.GetFileName(vttPath).Replace(".vtt", ".jpg");
        
        for (int i = 0; i < totalThumbs; i++)
        {
            int x = (i % columns) * thumbWidth;
            int y = (i / columns) * thumbHeight;
            
            TimeSpan startTime = TimeSpan.FromSeconds(i * interval);
            TimeSpan endTime = TimeSpan.FromSeconds((i + 1) * interval);
            
            vttBuilder.AppendLine($"{i + 1}");
            vttBuilder.AppendLine($"{FormatTimeSpan(startTime)} --> {FormatTimeSpan(endTime)}");
            vttBuilder.AppendLine($"{spriteName}#xywh={x},{y},{thumbWidth},{thumbHeight}");
            vttBuilder.AppendLine();
        }
        
        await File.WriteAllTextAsync(vttPath, vttBuilder.ToString());
    }
    
    /// <summary>
    /// Format TimeSpan to WebVTT format (HH:MM:SS.mmm)
    /// </summary>
    private string FormatTimeSpan(TimeSpan time)
    {
        return $"{(int)time.TotalHours:00}:{time.Minutes:00}:{time.Seconds:00}.{time.Milliseconds:000}";
    }
    
    public async Task ProcessAndUploadHlsAsync(string inputFilePath, string bucketName, string outputPrefix)
    {
        string outputDirectory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(outputDirectory);

        await ConvertToHlsAsync(inputFilePath, outputDirectory);
        
        // Upload generated HLS files
        foreach (var file in Directory.GetFiles(outputDirectory))
        {
            var objectName = $"{outputPrefix}/{Path.GetFileName(file)}";

            using var fileStream = File.OpenRead(file);
            
            await _s3FileService.PutObjectAsync("videos", objectName, fileStream);
        }

        Directory.Delete(outputDirectory, true);
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