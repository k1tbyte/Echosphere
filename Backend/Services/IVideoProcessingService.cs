namespace Backend.Services;

public interface IVideoProcessingService
{
    public Task ProcessAndUploadHlsAsync(string inputFilePath, string bucketName, string outputPrefix);
    public Task ProcessFullVideoPipelineAsync(string inputFilePath, string bucketName, string outputPrefix,int previewTimecode=5);
}