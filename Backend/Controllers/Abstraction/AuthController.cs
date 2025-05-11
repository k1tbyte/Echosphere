using System.ComponentModel.DataAnnotations;
using Backend.Data.Entities;
using Backend.Infrastructure;
using Backend.Repositories.Abstraction.Account;
using Backend.Requests;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;

[ApiController]
public class AuthController(IAccountRepository accountRepository, EmailService emailService): ControllerBase
{
    [HttpPost]
    //[TypeFilter(typeof(CaptchaRequired))]
    public async Task<IActionResult> Login(string email, string password,string remember)
    {
        if(!await accountRepository.AuthenticateAsync(email, password, remember == "on").ConfigureAwait(false))
            return BadRequest("Please check your password and email and try again");
        
        return Ok();
    }


    public async Task<IActionResult> ConfirmEmail(Guid token)
    {
        if (!await accountRepository.SignupAsync(token))
        {
            return BadRequest("Unavailable confirmation token");
        }

        return RedirectToAction("Profile");
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

        var uri = $"{Request.Scheme}://{Request.Host}/account/confirmEmail?token={token}";
        if (!await emailService.SendMailAsync(user.Email, 
                "Email confirmation", 
                $"<a href=\"{uri}\">Click to confirm email</a>")
            )
        {
            return BadRequest("Unable to send confirmation email");
        }

        return Ok();
    }
    
    public async Task<IActionResult> LogOut()
    {
        if (User.Identity?.IsAuthenticated != false)
        {
            await accountRepository.LogOutAsync().ConfigureAwait(false);
        }
        
        return RedirectToAction("Index","Home");
    }
}