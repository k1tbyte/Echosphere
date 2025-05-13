using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Data.Entities;

public enum EFriendshipStatus
{
    Pending,
    Accepted,
    Rejected
}


[Table("friendship")]
public class Friendship
{
    [Column("requester_id")]
    public int RequesterId { get; set; }
    [Column("adressee_id")]
    public int AddresseeId { get; set; }

    [ForeignKey("RequesterId")]
    public User Requester { get; set; }

    [ForeignKey("AddresseeId")]
    public User Addressee { get; set; }

    [Required]
    [Column("status")]
    public EFriendshipStatus Status { get; set; }
}