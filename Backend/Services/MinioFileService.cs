﻿using Microsoft.AspNetCore.Mvc;
using Minio;
using Minio.DataModel;
using Minio.DataModel.Args;

namespace Backend.Services;

public class MinioFileService(IMinioClient minioClient) : IS3FileService
{
    public async Task PutObjectAsync(Stream stream, string bucketName, string objName, int size = -1)
    {
        if (stream.CanSeek)
        {
            stream.Seek(0, SeekOrigin.Begin);
        }

        var bucketExists = await minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucketName));

        if (!bucketExists)
        {
            await minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucketName));
        }

        await minioClient.PutObjectAsync(new PutObjectArgs().WithBucket(bucketName)
            .WithObject(objName)
            .WithStreamData(stream)
            .WithObjectSize(size == -1 ? stream.Length : size)
            .WithContentType("application/octet-stream"));
    }

    public async Task DeleteObjectOrFolderAsync(string bucketName, string objectName)
    {
        bool isFolder = objectName.EndsWith('/');

        if (!isFolder)
        {
            try
            {
                await minioClient.StatObjectAsync(new StatObjectArgs().WithBucket(bucketName).WithObject(objectName));

                await minioClient.RemoveObjectAsync(
                    new RemoveObjectArgs().WithBucket(bucketName).WithObject(objectName));

                return;
            }
            catch (Exception)
            {
                // If the object is not found, it may be a folder without an ending slash.
                isFolder = true;
            }
        }

        if (isFolder)
        {
            if (!objectName.EndsWith('/'))
            {
                objectName += "/";
            }

            var objectsToDelete = new List<string>();

            var listArgs = new ListObjectsArgs().WithBucket(bucketName).WithPrefix(objectName).WithRecursive(true);

            var objectsEnumerable = minioClient.ListObjectsEnumAsync(listArgs);
            await foreach (var item in objectsEnumerable)
            {
                objectsToDelete.Add(item.Key);
            }

            if (objectsToDelete.Count > 0)
            {
                foreach (var batch in BatchObjects(objectsToDelete, 1000))
                {
                    var removeArgs = new RemoveObjectsArgs().WithBucket(bucketName).WithObjects(batch);

                    await minioClient.RemoveObjectsAsync(removeArgs);
                }
            }
        }
    }

    private IEnumerable<List<string>> BatchObjects(List<string> objects, int batchSize)
    {
        for (int i = 0; i < objects.Count; i += batchSize)
        {
            yield return objects.GetRange(i, Math.Min(batchSize, objects.Count - i));
        }
    }

    public async Task<ObjectStat?> TryGetObjectInfoAsync(string bucketName, string objectName)
    {
        try
        {
            var args = new StatObjectArgs().WithBucket(bucketName).WithObject(objectName);
            return await minioClient.StatObjectAsync(args);
        }
        catch
        {
            return null;
        }
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> DownloadFileStreamAsync(string bucketName,
        string objectName)
    {
        var bucketExists = await minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucketName));
        if (!bucketExists) throw new Exception("Bucket not found.");

        MemoryStream ms = new MemoryStream();

        await minioClient.GetObjectAsync(new GetObjectArgs().WithBucket(bucketName)
            .WithObject(objectName)
            .WithCallbackStream(stream =>
            {
                stream.CopyTo(ms);
                ms.Position = 0;
            }));

        var stat = await minioClient.StatObjectAsync(new StatObjectArgs().WithBucket(bucketName)
            .WithObject(objectName));
        var extension = GetExtensionFromContentType(stat.ContentType);
        if (extension != null)
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