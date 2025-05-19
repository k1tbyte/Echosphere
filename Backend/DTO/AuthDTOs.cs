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