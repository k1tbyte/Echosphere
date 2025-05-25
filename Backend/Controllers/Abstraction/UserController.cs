using Backend.Data.Entities;
using Backend.DTO;
using Backend.Repositories.Abstraction;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;
[Route(Constants.DefaultRoutePattern)]
public class UserController(IAccountRepository accountRepository): ControllerBase
{
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
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Avatar(){
        var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
        if (!int.TryParse(userId, out int id)) return NotFound();
        var user = await accountRepository.Get(id);
        if (user == null) return NotFound();
        return Ok(user.Avatar);
    }
}

