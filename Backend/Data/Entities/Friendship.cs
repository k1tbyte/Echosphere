using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data.Entities;

public enum EFriendshipStatus
{
    Pending,
    Accepted
}


[Table("friendship")]
public class Friendship
{
    [Column("requester_id")]
    public int RequesterId { get; set; }
    [Column("addressee_id")]
    public int AddresseeId { get; set; }
    
    public User Requester { get; set; }

    public User Addressee { get; set; }

    [Required]
    [Column("status")]
    public EFriendshipStatus Status { get; set; }
}