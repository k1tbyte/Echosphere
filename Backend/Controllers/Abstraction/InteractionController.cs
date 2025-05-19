using Backend.Data.Entities;
using Backend.DTO;
using Backend.Repositories.Abstraction;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;
[Route(Constants.DefaultRoutePattern)]
public class InteractionController(IAccountRepository accountRepository): ControllerBase
{
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> SendFriendship([FromBody] FriendshipRequestDTO dto)
    {
        await accountRepository.SendFriendshipRequestAsync(dto.UserId, dto.FriendId);
        return Ok();
    }
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> AcceptFriendship([FromBody] FriendshipRequestDTO dto)
    {
        await accountRepository.AcceptFriendshipAsync(dto.UserId, dto.FriendId);
        return Ok();
    }
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> RejectFriendship([FromBody] FriendshipRequestDTO dto)
    {
        await accountRepository.DeleteFriendshipAsync(dto.UserId, dto.FriendId);
        return Ok();
    }
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> DeleteFriend([FromBody] FriendshipRequestDTO dto)
    {
        await accountRepository.DeleteFriendshipAsync(dto.UserId, dto.FriendId);
        return Ok();
    }
    [HttpGet]
    [RequireRole(EUserRole.User)]
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
   
    
    
    
}

