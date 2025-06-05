using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DTO;

public enum EUserOnlineStatus{
    Offline,
    Online,
    InWatchParty
}

[Keyless]
public class UserSimplifiedDTO
{
    [Column("user_id")]
    public int Id { get; set; }

    [Column("username")]
    public required string Username { get; init; }

    [Column("avatar")]
    public string? Avatar { get; init; }
    
    [NotMapped]
    public DateTime JoinedAt { get; set; }
    
    [NotMapped]
    public EUserOnlineStatus OnlineStatus { get; set; }
}