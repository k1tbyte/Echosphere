using Minio.DataModel;

namespace Backend.Services;

public interface IS3FileService
{
    Task<(Stream Stream, string ContentType, string FileName)> DownloadFileStreamAsync(string bucketName, string objectName);
    Task PutObjectAsync(Stream stream, string bucketName, string objName, int size = -1);
    public Task<ObjectStat?> TryGetObjectInfoAsync(string bucketName, string objectName);
    public  Task DeleteObjectAsync(string bucketName, string objectName);
}