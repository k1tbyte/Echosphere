namespace Backend.Services;

public interface IS3FileService
{
    Task<string> UploadFileStreamAsync(Stream stream, string bucketName);
    Task<(Stream Stream, string ContentType, string FileName)> DownloadFileStreamAsync(string bucketName, string objectName);
    Task PutObjectAsync(Stream stream, string bucketName, string objName);
}