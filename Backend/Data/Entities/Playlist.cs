using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Data.Entities;

[Table("playlist")]
public class Playlist
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("playlist_id")]
    public int Id { get; set; }
    
    [Column("title")]
    public required string Title { get; set; }
    
    [Column("video_amount")]
    public int VideoAmount { get; set; }

    [Column("owner_id")]
    public int OwnerId { get; set; }    
    [Column("is_public")]
    public bool IsPublic { get; set; }
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; }  
    
    [Column("preview_url")]
    public string? PreviewUrl { get; set; } 
    
    [JsonIgnore]
    public ICollection<PlaylistVideo> PlaylistVideos { get; set; } = new List<PlaylistVideo>();
}