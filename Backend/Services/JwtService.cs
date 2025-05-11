using System.Security.Claims;
using System.Text;
using Backend.Data;
using Backend.Data.Entities;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

public sealed class JwtService
{
    private const int RefreshTokenExtendedLifetime = 7; //days
    private const int RefreshTokenLifetime = 30;//minutes
    private const int AccessTokenLifetime = 1; //minutes
    private const int MaxSessionsAmount = 5;
    private readonly IConfiguration _config;
    private readonly AppDbContext _dbContext;
    private readonly HttpContext _httpContext;
    public JwtService(IConfiguration configuration, AppDbContext dbContext,
        IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(httpContextAccessor.HttpContext);
        
        _config      = configuration;
        _dbContext   = dbContext;
        _httpContext = httpContextAccessor.HttpContext;
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

    private void _createSession(string accessToken, long userId, bool extended)
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
        
        _httpContext.Response.Cookies.Append("refresh_token",refreshToken.ToString(),
            new CookieOptions { HttpOnly = true, Expires = expires });
        
        _httpContext.Response.Cookies.Append("access_token",accessToken,
            new CookieOptions { HttpOnly = true });
    }


    public void CreateNewSession(User user,bool extended)
    {
        var accessToken = GenerateAccessToken(new List<Claim>
        {
            new("userid",user.Id.ToString()),
            new ("display_name", user.Username),
            new("role", user.Role.ToString()),
            new("remember", "")
        });
        
        _createSession(accessToken, user.Id, extended);
    }
    

    private void DeleteCookie()
    {
        _httpContext.Response.Cookies.Delete("refresh_token");
        _httpContext.Response.Cookies.Delete("access_token");
    }

    public void CloseSession()
    {
        var cookie = _httpContext.Request.Cookies["refresh_token"];
        if (cookie == null || !Guid.TryParse(cookie, out var token))
            return;
        
        DeleteCookie();

        var session = _dbContext.Sessions.FirstOrDefault(o => o.Token == token);
        if (session == null)
            return;
        
        _dbContext.Sessions.Remove(session);
    }

    public bool RefreshSession(JwtPayload payload, string? rawRefreshToken)
    {
        DeleteCookie();

        if (!long.TryParse(payload["userid"].ToString(), out var userId) ||
            !Guid.TryParse(rawRefreshToken, out var refreshToken))
            return false;
        
        var session = _dbContext.Sessions
            .FirstOrDefault(o => o.Token == refreshToken && o.UserId == userId);

        //Invalid token
        if (session == null)
            return false;
        
        _dbContext.Sessions.Remove(session);
        
        //Expired
        if (session.ExpiresIn <= DateTimeOffset.UtcNow.ToUnixTimeSeconds())
        {
            _dbContext.SaveChanges();
            return false;
        }
        
        var accessToken = GenerateAccessToken(new List<Claim>
        {
            new("userid",userId.ToString()),
            new ("display_name", payload["display_name"].ToString()!),
            new("role", payload["role"].ToString()!),
        });

        _createSession(accessToken, userId, payload.ContainsKey("remember"));
        _dbContext.SaveChanges();

        return true;
    }
}