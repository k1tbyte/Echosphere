using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DTO;

[Keyless]
public class UserSimplifiedDTO
{
    [Column("user_id")]
    public int Id { get; set; }

    [Column("username")]
    public required string Username { get; init; }

    [Column("avatar")]
    public required string Avatar { get; init; }
}