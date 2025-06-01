using Backend.Controllers.Abstraction;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;
[Route(Constants.DefaultRoutePattern)]
public class UserController(IAccountRepository accountRepository, IS3FileService fileService): BaseFileController(fileService)
{
    private readonly IS3FileService _fileService = fileService;

    [HttpPatch]
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SelfUpdate([FromBody] User? entity)
    {
        if (entity != null && JwtService.GetUserIdFromContext(HttpContext, out var id) && id == entity.Id)
        {
            await accountRepository.Update(entity);
            return NoContent();
        }
        return Forbid();
    }
    [HttpPatch]
    [RequireRole(EUserRole.Moder)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Update([FromBody] User entity)
    {
        await accountRepository.Update(entity);
        return NoContent();
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(User),StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<User>> Get(int id)
    {
        var result = await accountRepository.Get(id);
        if (result == null)
            return NotFound();
        return Ok(result);
    }
    [HttpDelete]
    [RequireRole(EUserRole.Admin)]
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
    [RequireRole(EUserRole.User)]
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
    [RequireRole(EUserRole.User)]
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
    [RequireRole(EUserRole.User)]
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
    [RequireRole(EUserRole.User)]
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
    [ProducesResponseType(typeof(IEnumerable<Video>),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<Video>> GetUsers(string filterString,bool desc=false,int page=1,int pageSize=20,string sortBy="Username")
    {
        try
        {
            JwtService.GetUserRoleFromContext(HttpContext, out var userRole);

            var users = await accountRepository.GetAllAsync(
                filter: q =>
                {
                    var filtered = (userRole >= EUserRole.Admin )
                        ? q
                        : q.Where(u => u.Role!=EUserRole.Banned);
                    if (!string.IsNullOrWhiteSpace(filterString))
                    {
                        filtered= filtered.Where(u => EF.Functions.ILike(u.Username, $"%{filterString}%"));
                    }
                    return filtered;
                },
                sortBy: sortBy,          
                sortDescending: desc,
                page: page,
                pageSize: pageSize
            );
            return Ok(users);
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
    [RequireRole(EUserRole.Admin)]
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
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFriends(int userId,bool includeSentRequests, bool includeReceivedRequests, int page=1, int pageSize=50)
    {
        var friends = await accountRepository.GetFriends(userId,page,pageSize);

        if (includeSentRequests && includeReceivedRequests)
        {
            var sent = await accountRepository.GetPendingFriends(userId, true);
            var received = await accountRepository.GetPendingFriends(userId, false);
            return Ok(new
            {
                friends,
                yourRequests = sent,
                requestsToAccept = received
            });
        }
        if (includeSentRequests)
        {
            var sent = await accountRepository.GetPendingFriends(userId, true);
            return Ok(new
            {
                friends,
                yourRequests = sent
            });
        }
        if (includeReceivedRequests )
        {
            var received = await accountRepository.GetPendingFriends(userId, false);
            return Ok(new
            {
                friends,
                requestsToAccept = received
            });
        }
        return Ok(new
        {
            friends
        });
    }
    
    [HttpGet]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string) ,StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DownloadAvatar([FromQuery] int userId)
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
    [RequireRole(EUserRole.User)]
    [ProducesResponseType( StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadAvatar(){
        try
        {
            var objName =
                await _fileService.UploadFileStreamAsync(Request.Body, "avatars");
            var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == JwtService.UserIdClaimType)?.Value;
            await accountRepository.SetAvatar(userId, objName);
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }
    
    

    
}

