using Backend.Data.Entities;

namespace Backend.DTO;

public class UserSimplifiedExtendedDTO : UserSimplifiedDTO
{
    public required string Email { get; set; }
    public EUserRole Role { get; set; } = EUserRole.User;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}