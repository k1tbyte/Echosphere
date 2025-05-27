namespace Backend.Services;

public interface IS3FileService
{
    Task<string> UploadFileStreamAsync(Stream stream, string bucketName = "avatars", string contentType = "application/octet-stream");
    Task<(Stream Stream, string ContentType, string FileName)> DownloadFileStreamAsync(string bucketName, string objectName);
    Task PutObjectAsync(Stream stream, string bucketName, string objName, 
        string contentType = "application/octet-stream");
}