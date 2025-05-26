using System.Runtime.InteropServices;
using Minio;
using Minio.DataModel.Args;
using Xabe.FFmpeg;

namespace Backend.Services;

public class XabeFfmpegService : IVideoProcessingService
{
    private readonly IS3FileService _s3FileService;

    public XabeFfmpegService(IS3FileService s3FileService,IConfiguration configuration)
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
        Directory.CreateDirectory(tempDir);
        await GenerateAdaptiveHlsAsync(inputFilePath, tempDir);
        
        string posterPath = Path.Combine(tempDir, "poster.jpg");
        await GeneratePosterAsync(inputFilePath, posterPath);
        
        string thumbsDir = Path.Combine(tempDir, "thumbs");
        Directory.CreateDirectory(thumbsDir);
        await GenerateThumbnailsAsync(inputFilePath, thumbsDir);
        
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
        var conversion = FFmpeg.Conversions.New()
 
            .SetOutput(Path.Combine(outputDir, "v%v/playlist.m3u8"));

        await conversion.Start();
    }
    private async Task GeneratePosterAsync(string inputFile, string outputImage)
    {
        await FFmpeg.Conversions.New()
            .AddParameter($"-ss 00:00:05 -i \"{inputFile}\" -frames:v 1 -q:v 2 \"{outputImage}\"")
            .Start();
    }
    private async Task GenerateThumbnailsAsync(string inputFile, string outputDir)
    {
        await FFmpeg.Conversions.New()
            .AddParameter($"-i \"{inputFile}\" -vf fps=1/10 \"{Path.Combine(outputDir, "thumb_%04d.jpg")}\"")
            .Start();
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