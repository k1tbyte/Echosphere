using AutoMapper;
using Backend.Controllers.Abstraction;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Infrastructure;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;
[Route(Constants.DefaultRoutePattern)]
public class UserController(IAccountRepository accountRepository, IS3FileService fileService,IMapper mapper): BaseFileController(fileService)
{
    private readonly IS3FileService _fileService = fileService;

    [HttpPatch]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Update([FromBody] UserUpdateDTO entity)
    {
        JwtService.GetUserRoleFromContext(HttpContext, out var role);
        JwtService.GetUserIdFromHttpContext(HttpContext, out var id);
        if(role < EUserRole.Moder && id != entity.Id)
        {
            return Forbid();
        }

        var user = await accountRepository.Get(entity.Id);

        if (user == null)
        {
            return NotFound("User not found");
        }
        
        if (entity.Password != null)
        {
            if (entity.Password.Length < 6)
            {
                return BadRequest("New password must be at least 6 characters long");
            }
            
            if (PasswordManager.CheckPassword(entity.Password, user.PasswordSalt, user.Password))
            {
                return BadRequest("New password cannot be the same as the old one");
            }
            
            if (role < EUserRole.Moder && 
                (string.IsNullOrWhiteSpace(entity.OldPassword) || !PasswordManager.CheckPassword(entity.OldPassword, user.PasswordSalt, user.Password)))
            {
                return BadRequest("Old password is incorrect");
            }
            
            user.Password = PasswordManager.HashPassword(entity.Password, out var salt);
            user.PasswordSalt = salt;
            accountRepository.RevokeSessionsAsync(user);
        }

        user.Username = entity.Username ?? user.Username;
        if (role >= EUserRole.Moder)
        {
            user.Email = entity.Email ?? user.Email;
            user.Role = entity.Role ?? user.Role;
        }

        await accountRepository.WithAutoSave().Update(user);
        return NoContent();
    }
    
    [HttpGet("{id}")]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(User),StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<User>> Get(int id)
    {
        var result = await accountRepository.Get(id);
        if (result == null)
            return NotFound();
        JwtService.GetUserRoleFromContext(HttpContext, out var role);
        if (role == EUserRole.Admin)
        {
            var userDto = mapper.Map<UserSimplifiedExtendedDTO>(result);
            return Ok(userDto);
        }
        else
        {
            var userDto = mapper.Map<UserSimplifiedDTO>(result);
            return Ok(userDto);
        }
    }
    [HttpDelete]
#if !DEBUG
        [RequireRole(EUserRole.Admin)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await accountRepository.DeleteById(id);
        if (!success)
            return NotFound();
        return NoContent();
    }
    
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SendFriendship([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.SendFriendshipRequestAsync(dto.UserId, dto.FriendId);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Internal server error." });
        }
        
    }
    
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> AcceptFriendship([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.AcceptFriendshipAsync(dto.UserId, dto.FriendId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Internal server error." });
        }
        
    }
    
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RejectFriendship([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.DeleteFriendshipAsync(dto.UserId, dto.FriendId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Internal server error." });
        }
    }
    
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteFriend([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.DeleteFriendshipAsync(dto.UserId, dto.FriendId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Internal server error." });
        }
        
    }
    
    [HttpGet]
#if !DEBUG
    [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(IEnumerable<UserSimplifiedExtendedDTO>),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<Video>> GetUsers(string? filter = null, 
        bool desc=false,
        int offset = 0 ,
        int limit = 20,
        string sortBy="Username")
    {
        try
        {
            JwtService.GetUserRoleFromContext(HttpContext, out var userRole);
            JwtService.GetUserIdFromHttpContext(HttpContext, out var userId);

            var users = await accountRepository.GetAllAsync(
                filter: q =>
                {
                    var filtered = (userRole >= EUserRole.Admin )
                        ? q
                        : q.Where(u => u.Role > EUserRole.Banned);
                    if (!string.IsNullOrWhiteSpace(filter))
                    {
                        filtered= filtered.Where(u => EF.Functions.ILike(u.Username, $"%{filter}%"));
                    }
                    return filtered.Where(o => o.Id != userId);
                },
                sortBy: sortBy,          
                sortDescending: desc,
                offset: offset,
                limit: limit
            );
          
            if (userRole == EUserRole.Admin)
            {
                var usersDto= users.Select(mapper.Map<UserSimplifiedExtendedDTO>).ToList();
                return Ok(usersDto);
            }
            else
            {
                var usersDto= users.Select(mapper.Map<UserSimplifiedDTO>).ToList();
                return Ok(usersDto);
            }
        }
        catch (ArgumentException e)
        {
            return BadRequest(e.Message);
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, e.Message);
        }
    }
    
    [HttpPatch]
#if !DEBUG
        [RequireRole(EUserRole.Admin)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateUserRole([FromBody] RoleUpdateRequestDTO dto)
    {
        var user = await accountRepository.Get(dto.UserId);
        if (user == null)
        {
            return NotFound();
        }
        if (!Enum.IsDefined(typeof(EUserRole), dto.NewRole))
        {
            return BadRequest("Invalid role specified.");
        }
        if (user.Role == dto.NewRole)
        {
            return NoContent();
        }
        user.Role = dto.NewRole;
        await accountRepository.Update(user);
        return NoContent();
    }
    
    
    [HttpGet]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<List<UserSimplifiedDTO>> GetPendingFriends(int userId, bool fromYou = false)
    {
        return await accountRepository.GetPendingFriends(userId, fromYou);
    }
    
    [HttpGet]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFriends(int userId,bool includeSentRequests, bool includeReceivedRequests, int offset=0, int limit=50)
    {
        var friends = await accountRepository.GetFriends(userId, offset, limit);

        if (includeSentRequests && includeReceivedRequests)
        {
            var sent = await accountRepository.GetPendingFriends(userId, true);
            var received = await accountRepository.GetPendingFriends(userId, false);
            return Ok(new
            {
                friends,
                sentRequests = sent,
                receivedRequests = received
            });
        }
        if (includeSentRequests)
        {
            var sent = await accountRepository.GetPendingFriends(userId, true);
            return Ok(new
            {
                friends,
                sentRequests = sent
            });
        }
        if (includeReceivedRequests )
        {
            var received = await accountRepository.GetPendingFriends(userId, false);
            return Ok(new
            {
                friends,
                receivedRequests = received
            });
        }
        return Ok(new
        {
            friends
        });
    }
    
    [HttpGet]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string) ,StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Avatar([FromQuery] int userId)
    {
        try
        {
            var user = await accountRepository.Get(userId);
            if (user == null) return NotFound();
            return await DownloadFromBucket("avatars", user.Avatar);
        }
        catch (Exception e)
        {
            return StatusCode(500, $"Error during download: {e.Message}");
        }

    }
    
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType( StatusCodes.Status200OK)]
    [ProducesResponseType( StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadAvatar(){
        try
        {
            if(Request.ContentLength is null or <= 0)
            {
                return BadRequest(new { error = "No file uploaded or file is empty." });
            }
            var objName = Guid.NewGuid().ToString();
            JwtService.GetUserIdFromHttpContext(HttpContext, out var userId);
            var user= await accountRepository.Get(userId);
            if(user == null)
                return NotFound();
            if (!String.IsNullOrWhiteSpace(user.Avatar))
            {
                var info= await _fileService.TryGetObjectInfoAsync("avatars", user.Avatar);
                if (info != null)
                {
                    await _fileService.DeleteObjectOrFolderAsync("avatars", user.Avatar);
                }
            }
            await _fileService.PutObjectAsync(Request.Body, "avatars", objName, (int)Request.ContentLength.Value);
            user.Avatar = objName;
            await accountRepository.Update(user);
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }
}

