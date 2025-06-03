using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class WatchPartyHub : Hub
{
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
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}