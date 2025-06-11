using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Data.Entities;

public enum EUserRole
{
    None,
    Banned,
    User,
    Moder,
    Admin
}

[Table("user")]
public sealed class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("user_id")]
    public int Id { get; set; }
    
    [Column("email")]
    public required string Email { get; set; }
    
    [Column("username")]
    public required string Username { get; set; }

    [Column("avatar")] 
    public string? Avatar { get; set; }
     
    [JsonIgnore]
    [Column("password")]
    public string Password { get; set; }
    
    [JsonIgnore]
    [Column("password_salt")]
    public string PasswordSalt { get; set; }
    
    [Column("role")] 
    public EUserRole Role { get; set; } = EUserRole.User;
    
    [Column("joined_at")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    
    [JsonIgnore]
    public ICollection<Friendship> SentFriendRequests { get; set; }
    [JsonIgnore]
    public ICollection<Friendship> ReceivedFriendRequests { get; set; }
    [JsonIgnore]
    public ICollection<Video> Videos { get; set; } = new List<Video>();
}