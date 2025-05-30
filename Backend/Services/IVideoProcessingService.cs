namespace Backend.Services;


class VideoSettingsConfig
{
    class VideoQualityProps
    {
        
    }
    public Dictionary<short, string> Qualities { get; set; } = new();
}

public interface IVideoProcessingService
{
    public Task ProcessVideoSingleQualityAsync(string inputFilePath, string bucketName, string outputPrefix);
    public Task ProcessVideoMultiQualityAsync(string inputFilePath, string bucketName, string outputPrefix);
}