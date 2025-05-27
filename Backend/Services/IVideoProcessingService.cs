namespace Backend.Services;

public interface IVideoProcessingService
{
    public Task ProcessVideoSingleQualityAsync(string inputFilePath, string bucketName, string outputPrefix);
    public Task ProcessVideoMultiQualityAsync(string inputFilePath, string bucketName, string outputPrefix);
}