using Backend.Data.Entities;

namespace Backend.DTO;

public class SignupResultDTO
{
    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; } 
    public required string Email { get; set; } 
}

public class TokenDTO
{
    public required Guid Token { get; set; }
}


public class AuthTokensDTO
{
    public required string AccessToken { get; set; }
    public required string RefreshToken { get; set; }
}
public class LoginRequestDTO
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required bool Remember { get; set; }
}

public class UserUpdateDTO
{
    public int Id { get; set; }
    public string? OldPassword { get; set; }
    public string? Password { get; set; }
    public string? Username { get; set; }
    public EUserRole? Role { get; set; }
    public string? Email { get; set; }
}

public class LogOutDTO
{
    public required string RefreshToken { get; set; } 
}