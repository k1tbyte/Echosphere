using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Infrastructure;
using Backend.Repositories.Abstraction;
using Backend.Requests;
using Backend.Services;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;

[Route(Constants.DefaultRoutePattern)]
public class AuthController(IAccountRepository accountRepository, EmailService emailService,JwtService jwtService, IHttpContextAccessor accessor): ControllerBase
{
    [HttpPost]
    //[TypeFilter(typeof(CaptchaRequired))]
    [ProducesResponseType(typeof(AuthTokensDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDTO? dto)
    {
        if (dto == null) {
            return BadRequest();
        }
        
        var tokens = await accountRepository.AuthenticateAsync(dto.Email, dto.Password, dto.Remember).ConfigureAwait(false);
        if(tokens==null)
            return Unauthorized("Please check your password and email and try again");
        
        return Ok(tokens);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SignupResultDTO), StatusCodes.Status200OK)] // Замените SomeResultDTO на реальный тип
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfirmEmail([FromBody] TokenDTO dto)
    {
        // read request body string
        var s = await new StreamReader(Request.Body).ReadToEndAsync();
        var result = await accountRepository.SignupAsync(dto.Token);
        return result == null ? BadRequest("Unavailable confirmation token") : Ok(result);
    }
    

    
    [HttpPost]
    [ProducesResponseType(typeof(AuthTokensDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string), StatusCodes.Status401Unauthorized)]
    public IActionResult RefreshSession([FromBody] AuthTokensDTO dto)
    {
        var tokens = jwtService.RefreshSession(dto);
        if (tokens == null)
            return Unauthorized("Invalid refresh token or session expired.");
        return Ok(tokens);
    }


    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Signup([FromBody] SignUpRequest user)
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

        return Ok(new {
            confirmationToken = token,
        });
    }
    [HttpPost]
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> LogOut([FromBody] LogOutDTO dto)
    {
        if (User.Identity?.IsAuthenticated != false)
        {
            await accountRepository.LogOutAsync(dto.RefreshToken).ConfigureAwait(false);
        }
        
        return Ok();
    }
}