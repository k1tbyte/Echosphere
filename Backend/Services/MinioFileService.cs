using Microsoft.AspNetCore.Mvc;
using Minio;
using Minio.DataModel.Args;

namespace Backend.Services;

public class MinioFileService(IMinioClient minioClient) : IS3FileService
{
    public async Task<string> UploadFileStreamAsync(Stream stream, string bucketName)
    {
        /*if (string.IsNullOrWhiteSpace(filename))
            throw new ArgumentException("Filename must be provided", nameof(filename));*/

        var objName = $"{Guid.NewGuid()}";
        

        await PutObjectAsync(stream ,bucketName,objName+"_raw");

        return objName;
    }

    public async Task PutObjectAsync(Stream stream,string bucketName, string objName)
    {
        stream.Seek(0, SeekOrigin.Begin);
        var bucketExists = await minioClient.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(bucketName));

        if (!bucketExists)
        {
            await minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucketName));
        }

        await minioClient.PutObjectAsync(new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objName)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length)
            .WithContentType("application/octet-stream"));
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
        var extension = GetExtensionFromContentType(stat.ContentType);
        if ( extension!= null)
        {
            objectName += extension;
        }
        
        return (ms, stat.ContentType ?? "application/octet-stream", objectName);
    }
    
    
    private static string? GetExtensionFromContentType(string contentType)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "image/jpeg", ".jpg" },
            { "image/png", ".png" },
            { "image/gif", ".gif" },
            { "image/bmp", ".bmp" },
            { "image/webp", ".webp" },
            { "image/svg+xml", ".svg" },
            { "image/tiff", ".tiff" },
            { "image/x-icon", ".ico" },

            { "video/mp4", ".mp4" },
            { "video/quicktime", ".mov" },
            { "video/x-msvideo", ".avi" },
            { "video/x-ms-wmv", ".wmv" },
            { "video/x-matroska", ".mkv" },
            { "video/webm", ".webm" },
            { "video/x-flv", ".flv" },
            { "video/mpeg", ".mpeg" },
            { "video/3gpp", ".3gp" },
            { "video/x-m4v", ".m4v" }
        };
        return map.TryGetValue(contentType, out var extension) ? extension : null;
    }
}