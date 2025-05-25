using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Backend.Services;

public class MinioFileService(IMinioClient minioClient) : IS3FileService
{
    public async Task<string> UploadFileStreamAsync(Stream stream, string filename, string bucketName = "avatars")
    {
        if (string.IsNullOrWhiteSpace(filename))
            throw new ArgumentException("Filename must be provided", nameof(filename));

        var objName = $"{Guid.NewGuid()}_{filename}";

        // Проверяем есть ли бакет, если нет - создаём
        var bucketExists = await minioClient.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(bucketName));

        if (!bucketExists)
        {
            await minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucketName));
        }

        // Для stream.Length лучше передавать, но если неизвестна - можно убрать с миньо 8+ версии
        long objectSize = stream.CanSeek ? stream.Length : -1;

        // Загружаем объект
        await minioClient.PutObjectAsync(new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objName)
            .WithStreamData(stream)
            .WithObjectSize(objectSize)
            .WithContentType("application/octet-stream"));

        return objName;
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> DownloadFileStreamAsync(string bucketName, string objectName)
    {
        var bucketExists = await minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucketName));
        if (!bucketExists)
            throw new Exception("Bucket not found.");

        MemoryStream ms = new MemoryStream();

        await minioClient.GetObjectAsync(new GetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithCallbackStream(stream =>
            {
                stream.CopyTo(ms);
                ms.Position = 0;
            }));

        var stat = await minioClient.StatObjectAsync(new StatObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName));

        return (ms, stat.ContentType ?? "application/octet-stream", objectName);
    }
}