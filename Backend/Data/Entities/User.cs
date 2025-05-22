using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data.Entities;

public enum EUserRole
{
    None,
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
    public required string Email { get; init; }
    
    [Column("username")]
    public required string Username { get; set; }

    [Column("avatar")] 
    public string? Avatar { get; set; }
     
    [Column("password")]
    public required string Password { get; set; }
    
    [Column("password_salt")]
    public required string PasswordSalt { get; set; }
    
    [Column("role")] 
    public EUserRole Role { get; set; } = EUserRole.None;
    public ICollection<Friendship> SentFriendRequests { get; set; }
    public ICollection<Friendship> ReceivedFriendRequests { get; set; }
}