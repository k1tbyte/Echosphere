using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data.Entities;

[Table("refresh_session")]
public class RefreshSession
{
    [Key]
    [Column("refresh_token")]
    public required Guid Token { get; init; }
        
    [Column("expires_in")]
    public required long ExpiresIn { get; init; }
        
    [Column("user_id")]
    public required long UserId { get; init; } 
}