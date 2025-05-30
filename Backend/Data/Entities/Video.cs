using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

// ReSharper disable EntityFramework.ModelValidation.UnlimitedStringLength

namespace Backend.Data.Entities;

public enum EVideoStatus
{
    Failed = 0,
    Pending,
    Queued,
    Processing,
    Ready,
    Blocked
}

public enum EVideoProvider
{
    Local = 0,
    YouTube,
    Vimeo
}

[Table("video")]
public class Video
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }    
    
    [Column("owner_id")]
    public int OwnerId { get; set; }     
    
    [Column("title")]
    public required string Title { get; set; }
    
    [Column("size")]
    public long? Size { get; set; }
    
    [Column("upload_size")]
    public long? UploadSize { get; set; } // Size of the video during upload, if applicable
    
    [Column("duration")]
    public float? Duration { get; set; }
    
    [Column("video_url")]
    public string? VideoUrl { get; set; } // URL to the video if it is uploaded to a third-party service
    
    [Column("status")]
    public EVideoStatus Status { get; set; } = EVideoStatus.Failed;
    
    [Column("provider")]
    public EVideoProvider Provider { get; set; } = EVideoProvider.Local;
    
    [Column("description")]
    public string? Description { get; set; }   
    
    [Column("preview_url")]
    public string? PreviewUrl { get; set; }    
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }  
    
    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }  
    
    [Column("is_public")]
    public bool IsPublic { get; set; }
    
    [JsonIgnore]
    public User Owner { get; set; }
}