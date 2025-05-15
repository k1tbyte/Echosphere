using Backend.Data.Entities;
using Backend.Repositories.Abstraction.Account;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;
[Route(Constants.DefaultRoutePattern)]
public class InteractionController(IAccountRepository accountRepository): ControllerBase
{
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> SendFriendship(int userId, int friendId)
    {
        await accountRepository.SendFriendshipRequestAsync(userId, friendId);
        //var user = await accountRepository.Get(3);
        return Ok();
    }
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> AcceptFriendship(int userId, int friendId)
    {
        await accountRepository.AcceptFriendshipAsync(userId, friendId);
        return Ok();
    }
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> RejectFriendship(int userId, int friendId)
    {
        await accountRepository.DeleteFriendshipAsync(userId, friendId);
        return Ok();
    }
    [HttpPost]
    [RequireRole(EUserRole.User)]
    public async Task<IActionResult> DeleteFriend(int userId, int friendId)
    {
        await accountRepository.DeleteFriendshipAsync(userId, friendId);
        return Ok();
    }
    [HttpPost]
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

