using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DTO;

[Keyless]
public class UserSimplified
{
    [Column("user_id")]
    public int Id { get; set; }

    [Column("username")]
    public string Username { get; init; }

    [Column("avatar")]
    public string Avatar { get; init; }
}