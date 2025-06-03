using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Data.Entities;

[Table("playlist_video")]
public class PlaylistVideo
{
    [Column("playlist_id")]
    public int PlaylistId { get; set; }

    [Column("video_id")]
    public Guid VideoId { get; set; }
    
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } 
    
    [JsonIgnore]
    public Playlist Playlist { get; set; } = null!;
    [JsonIgnore]
    public Video Video { get; set; } = null!;
}