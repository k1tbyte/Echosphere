using System.Collections.Concurrent;
using Backend.DTO;
using Backend.Services;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public enum ERoomInviteStatus
{
    Pending,
    Accepted,
    Master
}

public class RoomInvite:RoomMember
{
    public string RoomId { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class RoomMember
{
    public int UserId { get; set; }
    public ERoomInviteStatus Status { get; set; }
}


public class EchoHub : Hub
{
    private static readonly ConcurrentDictionary<int,EUserOnlineStatus> UserStatus = new ();
    private static readonly ConcurrentDictionary<int, HashSet<string>> UserConnections = new();
    //private static readonly ConcurrentDictionary<(string RoomId, int UserId), ERoomInviteStatus> RoomInvites = new();
    private static readonly ConcurrentDictionary<(string RoomId, int UserId), RoomInvite> RoomInvites = new();
    
    public static EUserOnlineStatus? GetUserStatus(int userId)
    {
        return UserStatus.GetValueOrDefault(userId, EUserOnlineStatus.Offline);
    }
    
    public async Task SendMessage(string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", message);
    }


    public async Task CreateRoom()
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            var roomId = userId.ToString();
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            RoomInvites[(roomId, userId)] = new RoomInvite
            {
                RoomId = roomId,
                UserId = userId,
                Status = ERoomInviteStatus.Master,
                CreatedAt = DateTime.UtcNow
            };
        }
    }
    
    public async Task InviteUserToRoom(string roomId, int userId)
    {
        var key = (roomId, userId);

        RoomInvites[key] = new RoomInvite
        {
            UserId = userId,
            Status = ERoomInviteStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        if (UserConnections.TryGetValue(userId, out var connections))
        {
            foreach (var connId in connections)
            {
                await Clients.Client(connId).SendAsync("RoomInviteReceived", roomId);
            }
        }
    }
    public async Task AcceptInviteToRoom(string roomId)
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            var key = (roomId, userId);
            if (RoomInvites.TryGetValue(key, out var invite) && invite.Status == ERoomInviteStatus.Pending)
            {
                invite.Status = ERoomInviteStatus.Accepted;
                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
                await Clients.Group(roomId).SendAsync("UserJoinedRoom", userId);
            }
        }
    }
    public async Task DeclineInviteToRoom(string roomId)
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            RoomInvites.TryRemove((roomId, userId), out _);
            await Clients.Caller.SendAsync("RoomInviteDeclined", roomId);
        }
    }
    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            RoomInvites.TryRemove((roomId, userId), out _);
            await Clients.Group(roomId).SendAsync("UserLeftRoom", userId);
        }
    }
    public Task<List<RoomMember>> GetRoomMembers(string roomId)
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            var members = RoomInvites.Values
                .Where(i => i.RoomId == roomId)
                .OrderByDescending(i => i.Status) 
                .Select(i => new RoomMember
                {
                    UserId = i.UserId,
                    Status = i.Status
                })
                .ToList();

            return Task.FromResult(members);
        }

        return Task.FromResult(new List<RoomMember>());
    }
    
    public async Task DeleteRoom(string roomId)
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId) && roomId == userId.ToString())
        {
            var keysToRemove = RoomInvites.Keys
                .Where(k => k.RoomId == roomId)
                .ToList();

            foreach (var key in keysToRemove)
                RoomInvites.TryRemove(key, out _);

            await Clients.Group(roomId).SendAsync("RoomDeleted", roomId);
        }
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