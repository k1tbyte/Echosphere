using Backend.Data.Entities;

namespace Backend.DTO;

public class FriendshipRequestDTO
{
    public int UserId { get; set; }
    public int FriendId { get; set; }
}
public class RoleUpdateRequestDTO
{
    public int UserId { get; set; }
    public EUserRole NewRole { get; set; }
}

public class PlaylistVideoKeypairDTO
{
    public int PlaylistId { get; set; }
    public Guid VideoId { get; set; }
}