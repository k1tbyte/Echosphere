namespace Backend.Services;

public interface IS3FileService
{
    Task<(Stream Stream, string ContentType, string FileName)> DownloadFileStreamAsync(string bucketName, string objectName);
    Task PutObjectAsync(Stream stream, string bucketName, string objName, int size = -1);
}