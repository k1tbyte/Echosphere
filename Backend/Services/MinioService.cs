using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace Backend.Services;

public class MinioService(IAmazonS3 s3Client)
{

    public async Task UploadFileAsync(string key, Stream fileStream, string contentType, string bucketName="videos")
    {
        var request = new PutObjectRequest
        {
            BucketName = bucketName,
            Key = key,
            InputStream = fileStream,
            ContentType = contentType
        };

        await s3Client.PutObjectAsync(request);
    }

    public string GetPresignedUrl(string key, TimeSpan expiresIn, string bucketName="videos")
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = bucketName,
            Key = key,
            Expires = DateTime.UtcNow.Add(expiresIn)
        };

        return s3Client.GetPreSignedURL(request);
    }

    public async Task DeleteFileAsync(string key, string bucketName="videos")
    {
        await s3Client.DeleteObjectAsync(bucketName, key);
    }
}