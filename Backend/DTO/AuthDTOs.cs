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
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
}
public class LoginRequestDTO
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required bool Remember { get; set; }
}

public class LogOutDTO
{
    public required string RefreshToken { get; set; } 
}