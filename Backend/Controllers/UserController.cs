using Backend.Data.Entities;
using Backend.DTO;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;
[Route(Constants.DefaultRoutePattern)]
public class UserController(IAccountRepository accountRepository, IS3FileService fileService): BaseFileController(fileService)
{
    [HttpPatch]
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SelfUpdate([FromBody] User? entity)
    {
        var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
        if (entity != null && int.TryParse(userId, out int id) && id == entity.Id)
        {
            await accountRepository.Update(entity);
            return Ok();
        }
        return Forbid();
    }
    [HttpPatch]
    [RequireRole(EUserRole.Moder)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromBody] User entity)
    {
        await accountRepository.Update(entity);
        return Ok();
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
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await accountRepository.DeleteById(id);
        if (!success)
            return NotFound();
        return Ok();
    }









    [HttpPost]
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SendFriendship([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.SendFriendshipRequestAsync(dto.UserId, dto.FriendId);
            return Ok();
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
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptFriendship([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.AcceptFriendshipAsync(dto.UserId, dto.FriendId);
            return Ok();
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
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RejectFriendship([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.DeleteFriendshipAsync(dto.UserId, dto.FriendId);
            return Ok();
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
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteFriend([FromBody] FriendshipRequestDTO dto)
    {
        try
        {
            await accountRepository.DeleteFriendshipAsync(dto.UserId, dto.FriendId);
            return Ok();
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
                await fileService.UploadFileStreamAsync(Request.Body, "avatars", Request.ContentType ?? "image/jpeg");
            var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
            await accountRepository.SetAvatar(userId, objName);
            return Ok();
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }
    
    

    
}

