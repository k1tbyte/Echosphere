using Backend.Data.Entities;

namespace Backend.Requests;


public class UploadVideoRequest
{
    public required string Title { get; init; } 
    public long? SizeBytes { get; init; }
    public EVideoProvider? Provider { get; init; }
    public float? Duration { get; init; }
    public string? Id { get; init; } // Id of the video if it is uploaded to a third-party service
    public string? Description { get; init; } 
    public float? ThumbnailsCaptureInterval { get; init; }
    public int[]? VideoQualities { get; init; }
    public string? PreviewUrl { get; init; } 
    public long? PreviewSizeBytes { get; init; } 
}