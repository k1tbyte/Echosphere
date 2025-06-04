using System.Collections.Concurrent;
using Backend.DTO;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class EchoHub : Hub
{
    private static readonly ConcurrentDictionary<int,EUserOnlineStatus> UserStatus = new ();
    private static readonly ConcurrentDictionary<int, HashSet<string>> UserConnections = new();
    public static EUserOnlineStatus? GetUserStatus(int userId)
    {
        return UserStatus.GetValueOrDefault(userId, EUserOnlineStatus.Offline);
    }
    
    public async Task SendMessage(string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", message);
    }


    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
    }
    
    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }
    
    public async Task SyncEvent(string roomId, string action, double time)
    {
        await Clients.OthersInGroup(roomId).SendAsync("ReceiveSync", action, time);
    }
    public async Task SyncTime(string roomId, double currentTime)
    {
        await Clients.OthersInGroup(roomId).SendAsync("ReceiveTimeSync", currentTime);
    }
    

    public override async Task OnConnectedAsync()
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            Console.WriteLine($"User {userId} connected to EchoHub");
            UserConnections.AddOrUpdate(userId,
                _ => new HashSet<string> { Context.ConnectionId },
                (_, set) => { set.Add(Context.ConnectionId); return set; });

            UserStatus[userId] = EUserOnlineStatus.Online;
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        foreach (var kvp in UserConnections)
        {
            if (kvp.Value.Remove(Context.ConnectionId))
            {
                if (kvp.Value.Count == 0)
                {
                    UserConnections.TryRemove(kvp.Key, out _);
                    UserStatus[kvp.Key] = EUserOnlineStatus.Offline;
                }
                break;
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}