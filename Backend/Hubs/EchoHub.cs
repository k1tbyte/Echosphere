using System.Collections.Concurrent;
using Backend.DTO;
using Backend.Services;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;


public enum ERoomRole
{
    Master,    
    Member
}


public class Room
{
    public string RoomId { get; set; } = null!;
    public int MasterId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<RoomParticipant> Participants { get; set; } = new();
}


public class RoomParticipant
{
    public int UserId { get; set; }
    public ERoomRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public HashSet<string> ConnectionIds { get; set; } = new();
}

public class EchoHub : Hub
{
    // User status storage
    private static readonly ConcurrentDictionary<int, EUserOnlineStatus> UserStatus = new();
    
    // UserConnections: userId -> set<ConnectionId>
    private static readonly ConcurrentDictionary<int, HashSet<string>> UserConnections = new();
    
    // Rooms: roomId -> Room
    private static readonly ConcurrentDictionary<string, Room> Rooms = new();
    
    
    public static EUserOnlineStatus GetUserStatus(int userId)
    {
        return UserStatus.GetValueOrDefault(userId, EUserOnlineStatus.Offline);
    }

    public static int GetUserRoomMasterId(int userId)
    {
        if(UserStatus.GetValueOrDefault(userId, EUserOnlineStatus.Offline)!=EUserOnlineStatus.InWatchParty)
            return -1;
        foreach (var room in Rooms.Values)
        {
            foreach (var t in room.Participants)
            {
                if (t.UserId == userId)
                {
                    return room.MasterId;
                }
            }
        }
        return -1;
    }
    
    public async Task<string> CreateRoom()
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        var roomId = Guid.NewGuid().ToString("N");
        
        var room = new Room
        {
            RoomId = roomId,
            MasterId = userId,
            CreatedAt = DateTime.UtcNow
        };
        
        var master = new RoomParticipant
        {
            UserId = userId,
            Role = ERoomRole.Master,
            JoinedAt = DateTime.UtcNow,
            ConnectionIds = new HashSet<string> { Context.ConnectionId }
        };
        
        room.Participants.Add(master);
        Rooms[roomId] = room;
        
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        
        await Clients.Caller.SendAsync("RoomCreated", roomId);
        
        return roomId;
    }
    

    public async Task InviteToRoom(string roomId, int targetUserId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null)
        {
            throw new HubException("You are not a member of this room");
        }
        
        if (room.Participants.Any(p => p.UserId == targetUserId))
        {
            throw new HubException("User is already in the room");
        }
        
        if (UserConnections.TryGetValue(targetUserId, out var connections))
        {
            foreach (var connectionId in connections)
            {
                await Clients.Client(connectionId).SendAsync("RoomInviteReceived", roomId, userId);
            }
        }
    }
    
    public async Task AcceptInvite(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }

        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // check if the user is already in the room
        foreach (var userRoom in Rooms.Values)
        {
            if (userRoom.Participants.Any(p => p.UserId == userId))
            {
                // remove the user from the previous room
                await _leaveRoom(userId, userRoom.RoomId).ConfigureAwait(false);
            }
        }
        
        var invite = new RoomParticipant
        {
            UserId = userId,
            Role = ERoomRole.Member,
            JoinedAt = DateTime.UtcNow
        };
        
        room.Participants.Add(invite);
        invite.ConnectionIds.Add(Context.ConnectionId);
        UserStatus[userId] = EUserOnlineStatus.InWatchParty;
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        
        await Clients.Group(roomId).SendAsync("UserJoinedRoom", roomId, userId);
        
        /*
        await Clients.Caller.SendAsync("RoomJoined", roomId, room.MasterId, 
            room.Participants.Select(p => new { UserId = p.UserId, Role = p.Role }).ToList());*/
    }
    
    public async Task KickFromRoom(string roomId, int targetUserId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        if (room.MasterId != userId)
        {
            throw new HubException("Only the room owner can kick users");
        }
        
        var targetParticipant = room.Participants.FirstOrDefault(p => p.UserId == targetUserId);
        if (targetParticipant == null)
        {
            throw new HubException("User is not in the room");
        }
        
        if (targetUserId == userId)
        {
            throw new HubException("You cannot kick yourself from the room");
        }
        
        await Clients.Group(roomId).SendAsync("RoomUserKicked", roomId, targetUserId);
        UserStatus[userId] = EUserOnlineStatus.Online;
        room.Participants.Remove(targetParticipant);
        
        foreach (var connectionId in targetParticipant.ConnectionIds)
        {
            await Groups.RemoveFromGroupAsync(connectionId, roomId);
        }
    }
    
    public async Task LeaveRoom(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        await _leaveRoom(userId, roomId).ConfigureAwait(false);
    }

    private async Task _leaveRoom(int userId, string roomId)
    {
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            return; 
        }
        
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null)
        {
            return; 
        }
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        
        if (participant.Role == ERoomRole.Master)
        {
            if (Rooms.TryRemove(roomId, out _))
            {
                await Clients.Group(roomId).SendAsync("RoomClosed", roomId);
            }
        }
        else
        {
            room.Participants.Remove(participant);
            
            await Clients.Group(roomId).SendAsync("UserLeftRoom", roomId, userId);
        }
        UserStatus[userId] = EUserOnlineStatus.Online;
    }
    
    public Task<List<object>> GetRoomParticipants(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            return Task.FromResult(new List<object>());
        }
        
        if (!room.Participants.Any(p => p.UserId == userId && (p.Role == ERoomRole.Master || p.Role == ERoomRole.Member)))
        {
            throw new HubException("You don't have access to this room");
        }
        
        var participants = room.Participants.Select(p => new
        {
            UserId = p.UserId,
            Role = p.Role,
            JoinedAt = p.JoinedAt
        }).ToList<object>();
        
        return Task.FromResult(participants);
    }
    
    public async Task DeleteRoom(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        if (room.MasterId != userId)
        {
            throw new HubException("Only the room master can delete the room");
        }
        
        if (Rooms.TryRemove(roomId, out var deletedRoom))
        {
            foreach (var t in deletedRoom.Participants)
            {
                UserStatus[t.UserId] = EUserOnlineStatus.Online;
            }

            await Clients.Group(roomId).SendAsync("RoomDeleted", roomId);
        }
    }

    // WATCH SYNC METHODS
    public async Task SyncPlayerEvent(string roomId, string action, double time)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }

        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null || (participant.Role != ERoomRole.Master && participant.Role != ERoomRole.Member))
        {
            throw new HubException("You are not a member of this room");
        }
        

        await Clients.OthersInGroup(roomId).SendAsync("ReceivePlayerEvent", action, time, userId);
    }
    

    public async Task SyncPlayerTime(string roomId, double currentTime)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null || (participant.Role != ERoomRole.Master && participant.Role != ERoomRole.Member))
        {
            throw new HubException("You are not a member of this room");
        }
        
        await Clients.OthersInGroup(roomId).SendAsync("ReceiveTimeSync", currentTime, userId);
    }

    public async Task SendEvent(int userId, string action)
    {
        if (UserConnections.TryGetValue(userId, out var connections))
        {
            foreach (var connectionId in connections.Where(s => !string.IsNullOrEmpty(s)))
            {
                await Clients.Client(connectionId).SendAsync("ReceiveEvent", action);
            }
        }
    }
    
    // CONNECTION LIFETIME METHODS
    
    public override async Task OnConnectedAsync()
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            Console.WriteLine($"User {userId} connected with connection ID {Context.ConnectionId}");
            
            UserConnections.AddOrUpdate(userId,
                _ => new HashSet<string> { Context.ConnectionId },
                (_, connections) =>
                {
                    connections.Add(Context.ConnectionId);
                    return connections;
                });
            
            UserStatus[userId] = EUserOnlineStatus.Online;
            
            foreach (var room in Rooms.Values)
            {
                var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
                if (participant != null && (participant.Role == ERoomRole.Master || participant.Role == ERoomRole.Member))
                {
                    participant.ConnectionIds.Add(Context.ConnectionId);
                    await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomId);
                }
            }
            
            await Clients.Others.SendAsync("UserOnline", userId);
        }
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var userKvp = UserConnections.FirstOrDefault(kvp => kvp.Value.Contains(Context.ConnectionId));
        if (userKvp.Key != 0) 
        {
            int userId = userKvp.Key;
            var connections = userKvp.Value;

            connections.Remove(Context.ConnectionId);
            
            if (connections.Count == 0)
            {
                UserConnections.TryRemove(userId, out _);
                UserStatus[userId] = EUserOnlineStatus.Offline;
                
                await Clients.Others.SendAsync("UserOffline", userId);
            }
            
            foreach (var room in Rooms.Values)
            {
                var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
                if (participant == null) continue;
                
                participant.ConnectionIds.Remove(Context.ConnectionId);
                    
                if (participant.Role == ERoomRole.Master)
                {
                    // If the master disconnects, remove the room
                    if (Rooms.TryRemove(room.RoomId, out _))
                    {
                        await Clients.Group(room.RoomId).SendAsync("RoomClosed", room.RoomId);
                    }

                    break;
                }
                
                if (participant.ConnectionIds.Count == 0)
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, room.RoomId);
                    room.Participants.Remove(participant);
                    // If a member disconnects, notify others in the room
                    await Clients.Group(room.RoomId).SendAsync("UserLeftRoom", room.RoomId, userId);
                }
            }
        }
        
        await base.OnDisconnectedAsync(exception);
    }
    
    public async Task SendRoomEvent(string roomId, string type, object param)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null || (participant.Role != ERoomRole.Master && participant.Role != ERoomRole.Member))
        {
            throw new HubException("You are not a member of this room");
        }
        
        foreach (var p in room.Participants)
        {
            if (p.UserId == userId)
            {
                continue; // skip self
            }

            foreach (var connectionId in p.ConnectionIds.Where(connectionId => !string.IsNullOrEmpty(connectionId)))
            {
                await Clients.Client(connectionId).SendAsync("RoomEvent", type, param);
            }
        }
    }
}