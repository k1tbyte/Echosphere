using System.Security.Claims;
using System.Text;
using Backend.Data;
using Backend.Data.Entities;
using System.IdentityModel.Tokens.Jwt;
using Backend.DTO;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;



public sealed class JwtService
{
    private const int RefreshTokenExtendedLifetime = 7; //days
    private const int RefreshTokenLifetime = 30;//minutes
    #if DEBUG
    private const int AccessTokenLifetime = 200; //minutes
    #else
    private const int AccessTokenLifetime = 1; //minutes
    #endif
    private const int MaxSessionsAmount = 5;
    private readonly IConfiguration _config;
    private readonly AppDbContext _dbContext;
    public const string UserIdClaimType = "userid";
    public const string UserRoleClaimType = "access_role";
        
    public JwtService(IConfiguration configuration, AppDbContext dbContext)
    {
        _config      = configuration;
        _dbContext   = dbContext;
    }
    
    private string GenerateAccessToken(List<Claim> claims)
    {
        var lifeTime = TimeSpan.FromMinutes(AccessTokenLifetime);
        
        var key = Encoding.UTF8.GetBytes(_config["JwtSettings:Key"]!);

        var token = new JwtSecurityToken(
            claims: claims,
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            expires: DateTime.UtcNow.Add(lifeTime),
            notBefore: DateTime.UtcNow,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private AuthTokensDTO _createSession(string accessToken, long userId, bool extended)
    {
        var refreshToken = Guid.NewGuid();
        var expires= extended ? DateTimeOffset.UtcNow.AddDays(RefreshTokenExtendedLifetime) :
            DateTimeOffset.UtcNow.AddMinutes(RefreshTokenLifetime);

        var sessions = _dbContext.Sessions
            .Where(o => o.UserId == userId)
            .OrderBy(o => o.ExpiresIn);
        
        if (sessions.Count() >= MaxSessionsAmount)
        {
            _dbContext.Sessions.Remove(sessions.First());
        }
        
        _dbContext.Sessions.Add(new RefreshSession()
        {
            ExpiresIn = expires.ToUnixTimeSeconds(),
            Token     = refreshToken,
            UserId    = userId,
        });
        
        return new AuthTokensDTO
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.ToString(),
        };
    }


    public AuthTokensDTO CreateNewSession(User user,bool extended)
    {
        var accessToken = GenerateAccessToken(new List<Claim>
        {
            new("userid",user.Id.ToString()),
            new ("display_name", user.Username),
            new("access_role", user.Role.ToString()),
            new("email", user.Email),
            new("remember", extended.ToString())
        });
        
        return _createSession(accessToken, user.Id, extended);
    }
    

    public void CloseSession(string? refreshToken)
    {
        if (refreshToken == null || !Guid.TryParse(refreshToken, out var token))
            return;
        
        var session = _dbContext.Sessions.FirstOrDefault(o => o.Token == token);
        if (session == null)
            return;
        
        _dbContext.Sessions.Remove(session);
    }
    
    public static bool GetUserIdFromContext(HttpContext context, out int userId)
    {
        userId = 0;
        var userIdClaim = context.User.Claims.FirstOrDefault(o => o.Type == UserIdClaimType);
        return userIdClaim != null && int.TryParse(userIdClaim.Value, out userId);
    }
    public static bool GetUserRoleFromContext(HttpContext context, out EUserRole userRole)
    {
        userRole = EUserRole.None;
        var roleClaim = context.User.Claims.FirstOrDefault(o => o.Type == UserRoleClaimType);
        if (roleClaim != null && Enum.TryParse<EUserRole>(roleClaim.Value, out var parsedRole))
        {
            userRole = parsedRole;
            return true;
        }
        return false;
    }

    public AuthTokensDTO? RefreshSession(AuthTokensDTO dto)
    {
        var handler = new JwtSecurityTokenHandler();
        JwtSecurityToken jwtToken;
        try
        {
            jwtToken = handler.ReadJwtToken(dto.AccessToken);
        }
        catch
        {
            return null;
        }
        var payload = jwtToken.Payload;
        if (!long.TryParse(payload["userid"].ToString(), out var userId) ||
            !Guid.TryParse(dto.RefreshToken, out var refreshToken))
            return null;
        
        var session = _dbContext.Sessions
            .FirstOrDefault(o => o.Token == refreshToken && o.UserId == userId);

        //Invalid token
        if (session == null)
            return null;
        
        _dbContext.Sessions.Remove(session);
        
        //Expired
        if (session.ExpiresIn <= DateTimeOffset.UtcNow.ToUnixTimeSeconds())
        {
            _dbContext.SaveChanges();
            Console.WriteLine($"Session expired for user {userId}");
            return null;
        }
        
        var newAccessToken = GenerateAccessToken(new List<Claim>
        {
            new(UserIdClaimType,userId.ToString()),
            new ("display_name", payload["display_name"].ToString()!),
            new("access_role", payload["access_role"].ToString()!),
            new("email", payload["email"].ToString()!),
            new("remember", payload["remember"].ToString()!)
        });
        var tokens = _createSession(newAccessToken, userId, payload.ContainsKey("remember"));
        _dbContext.SaveChanges();

        return tokens;
    }
}