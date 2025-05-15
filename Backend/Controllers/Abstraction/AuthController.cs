using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using Backend.Data.Entities;
using Backend.Infrastructure;
using Backend.Repositories.Abstraction.Account;
using Backend.Requests;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;

[Route(Constants.DefaultRoutePattern)]
public class AuthController(IAccountRepository accountRepository, EmailService emailService,JwtService jwtService): ControllerBase
{
    [HttpPost]
    //[TypeFilter(typeof(CaptchaRequired))]
    public async Task<IActionResult> Login(string email, string password,string remember)
    {
        var tokens = await accountRepository.AuthenticateAsync(email, password, remember == "on").ConfigureAwait(false);
        if(tokens==null)
            return BadRequest("Please check your password and email and try again");
        
        return Ok(tokens);
    }

    [HttpPost]
    public async Task<IActionResult> ConfirmEmail(Guid token)
    {
        var tokens = await accountRepository.SignupAsync(token);
        if (tokens==null)
        {
            return BadRequest("Unavailable confirmation token");
        }

        return Ok(tokens);
    }
    

    
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> RefreshSession(string accessToken,string refreshToken)
    {
        if (string.IsNullOrEmpty(accessToken) || string.IsNullOrEmpty(refreshToken))
            return BadRequest("Both tokens are required.");
        var handler = new JwtSecurityTokenHandler();
        JwtSecurityToken jwtToken;
        try
        {
            jwtToken = handler.ReadJwtToken(accessToken);
            if ((jwtToken.ValidTo - DateTime.UtcNow) > TimeSpan.FromMinutes(1))
            {
                return BadRequest("Token is still valid. Refresh is not needed yet.");
            }
        }
        catch
        {
            return Unauthorized("Invalid access token format.");
        }
        var payload = jwtToken.Payload;
        var tokens = jwtService.RefreshSession(payload, refreshToken);

        if (tokens == null)
            return Unauthorized("Invalid refresh token or session expired.");
        return Ok(tokens);
    }


    [HttpPost]
    //[TypeFilter(typeof(CaptchaRequired))]
    public async Task<IActionResult> Signup(SignUpRequest user)
    {
        var context = new ValidationContext(user);
        var results = new List<ValidationResult>();
        if (!Validator.TryValidateObject(user, context, results, true))
        {
            return ValidationProblem("Invalid form data");
        }
        
        var token = await accountRepository.GetSignupToken(new User()
        {
            Email        = user.Email,
            Password     = PasswordManager.HashPassword(user.Password, out string salt),
            PasswordSalt = salt,
            Username    = user.Username,
        }).ConfigureAwait(false);
        
        if(token == null)
        {
            return Conflict("A user with this email is already registered");
        }

        /*var uri = $"{Request.Scheme}://{Request.Host}/account/confirmEmail?token={token}";
        if (!await emailService.SendMailAsync(user.Email, 
                "Email confirmation", 
                $"<a href=\"{uri}\">Click to confirm email</a>")
            )
        {
            return BadRequest("Unable to send confirmation email");
        }*/

        return Ok(token);
    }
    [HttpPost]
    public async Task<IActionResult> LogOut(string? refreshToken)
    {
        if (User.Identity?.IsAuthenticated != false)
        {
            await accountRepository.LogOutAsync(refreshToken).ConfigureAwait(false);
        }
        
        return Ok();
    }
}