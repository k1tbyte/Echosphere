namespace Backend.Services;

public interface IS3FileService
{
    Task<string> UploadFileStreamAsync(Stream stream, string filename, string bucketName = "avatars");
    Task<(Stream Stream, string ContentType, string FileName)> DownloadFileStreamAsync(string bucketName, string objectName);
}