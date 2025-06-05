using System.Collections.Concurrent;
using Backend.DTO;
using Backend.Services;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

// Роли пользователей в комнате
public enum ERoomRole
{
    Master,    // Создатель/владелец комнаты
    Member,    // Участник комнаты
    Invited    // Приглашенный, но еще не принявший приглашение
}

// Модель комнаты
public class Room
{
    public string RoomId { get; set; } = null!;
    public int MasterId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<RoomParticipant> Participants { get; set; } = new();
}

// Модель участника комнаты
public class RoomParticipant
{
    public int UserId { get; set; }
    public ERoomRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public HashSet<string> ConnectionIds { get; set; } = new();
}

public class EchoHub : Hub
{
    // Хранилище статусов онлайн пользователей
    private static readonly ConcurrentDictionary<int, EUserOnlineStatus> UserStatus = new();
    
    // Соединения пользователей: userId -> set<ConnectionId>
    private static readonly ConcurrentDictionary<int, HashSet<string>> UserConnections = new();
    
    // Комнаты: roomId -> Room
    private static readonly ConcurrentDictionary<string, Room> Rooms = new();

    // МЕТОДЫ ДЛЯ РАБОТЫ С ОНЛАЙН СТАТУСАМИ
    
    // Получить статус пользователя
    public static EUserOnlineStatus GetUserStatus(int userId)
    {
        return UserStatus.GetValueOrDefault(userId, EUserOnlineStatus.Offline);
    }

    // МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ КОМНАТАМИ
    
    // Создать новую комнату
    public async Task<string> CreateRoom()
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }

        // Используем GUID для уникальных ID комнат (можно заменить на более короткий ID)
        var roomId = Guid.NewGuid().ToString("N");
        
        var room = new Room
        {
            RoomId = roomId,
            MasterId = userId,
            CreatedAt = DateTime.UtcNow
        };
        
        // Добавляем создателя как мастера комнаты
        var master = new RoomParticipant
        {
            UserId = userId,
            Role = ERoomRole.Master,
            JoinedAt = DateTime.UtcNow,
            ConnectionIds = new HashSet<string> { Context.ConnectionId }
        };
        
        room.Participants.Add(master);
        Rooms[roomId] = room;
        
        // Добавляем соединение в группу SignalR
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        
        // Уведомляем пользователя об успешном создании комнаты
        await Clients.Caller.SendAsync("RoomCreated", roomId);
        
        return roomId;
    }
    
    // Пригласить пользователя в комнату
    public async Task InviteToRoom(string roomId, int targetUserId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Проверяем права - приглашать могут только участники комнаты
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null)
        {
            throw new HubException("You are not a member of this room");
        }
        
        // Проверяем, не приглашен ли пользователь уже
        if (room.Participants.Any(p => p.UserId == targetUserId))
        {
            throw new HubException("User is already in the room or invited");
        }
        
        // Добавляем пользователя как приглашенного
        var invite = new RoomParticipant
        {
            UserId = targetUserId,
            Role = ERoomRole.Invited,
            JoinedAt = DateTime.UtcNow
        };
        
        room.Participants.Add(invite);
        
        // Уведомляем пользователя о приглашении, если он в сети
        if (UserConnections.TryGetValue(targetUserId, out var connections))
        {
            foreach (var connectionId in connections)
            {
                await Clients.Client(connectionId).SendAsync("RoomInviteReceived", roomId, userId);
            }
        }
    }
    
    // Принять приглашение в комнату
    public async Task AcceptInvite(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Находим приглашение
        var invite = room.Participants.FirstOrDefault(p => p.UserId == userId && p.Role == ERoomRole.Invited);
        if (invite == null)
        {
            throw new HubException("Invite not found");
        }
        
        // Обновляем роль
        invite.Role = ERoomRole.Member;
        invite.ConnectionIds.Add(Context.ConnectionId);
        
        // Добавляем соединение в группу SignalR
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        
        // Уведомляем всех участников комнаты
        await Clients.Group(roomId).SendAsync("UserJoinedRoom", userId);
        
        // Отправляем присоединившемуся список участников
        await Clients.Caller.SendAsync("RoomJoined", roomId, room.MasterId, 
            room.Participants.Select(p => new { UserId = p.UserId, Role = p.Role }).ToList());
    }
    
    // Отклонить приглашение в комнату
    public async Task DeclineInvite(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Удаляем приглашение
        var invite = room.Participants.FirstOrDefault(p => p.UserId == userId && p.Role == ERoomRole.Invited);
        if (invite != null)
        {
            room.Participants.Remove(invite);
            
            // Уведомляем мастера комнаты
            if (UserConnections.TryGetValue(room.MasterId, out var masterConnections))
            {
                foreach (var connectionId in masterConnections)
                {
                    await Clients.Client(connectionId).SendAsync("InviteDeclined", roomId, userId);
                }
            }
        }
    }
    
    // Выгнать пользователя из комнаты (только для владельца комнаты)
    public async Task KickUser(string roomId, int targetUserId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Проверяем, что запрос от владельца комнаты
        if (room.MasterId != userId)
        {
            throw new HubException("Only the room owner can kick users");
        }
        
        // Находим участника для исключения
        var targetParticipant = room.Participants.FirstOrDefault(p => p.UserId == targetUserId);
        if (targetParticipant == null)
        {
            throw new HubException("User is not in the room");
        }
        
        // Нельзя выгнать самого себя (владельца)
        if (targetUserId == userId)
        {
            throw new HubException("You cannot kick yourself from the room");
        }
        
        // Удаляем участника из комнаты
        room.Participants.Remove(targetParticipant);
        
        // Удаляем все соединения участника из группы
        foreach (var connectionId in targetParticipant.ConnectionIds)
        {
            await Groups.RemoveFromGroupAsync(connectionId, roomId);
        }
        
        // Уведомляем всех оставшихся участников
        await Clients.Group(roomId).SendAsync("UserKicked", roomId, targetUserId);
        
        // Уведомляем выгнанного пользователя
        if (UserConnections.TryGetValue(targetUserId, out var connections))
        {
            foreach (var connectionId in connections)
            {
                await Clients.Client(connectionId).SendAsync("YouWereKicked", roomId);
            }
        }
    }
    
    // Покинуть комнату
    public async Task LeaveRoom(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            return; // Комната не найдена, ничего не делаем
        }
        
        // Находим участника
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null)
        {
            return; // Пользователь не в комнате, ничего не делаем
        }
        
        // Удаляем соединение из группы
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        
        // Если это мастер комнаты
        if (participant.Role == ERoomRole.Master)
        {
            if (Rooms.TryRemove(roomId, out _))
            {
                // Уведомляем всех участников
                await Clients.Group(roomId).SendAsync("RoomClosed", roomId);
            }
        }
        else
        {
            // Просто удаляем участника
            room.Participants.Remove(participant);
            
            // Уведомляем остальных участников
            await Clients.Group(roomId).SendAsync("UserLeftRoom", roomId, userId);
        }
    }
    
    // Получить список участников комнаты
    public Task<List<object>> GetRoomParticipants(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            return Task.FromResult(new List<object>());
        }
        
        // Проверяем, что пользователь имеет доступ к комнате
        if (!room.Participants.Any(p => p.UserId == userId && (p.Role == ERoomRole.Master || p.Role == ERoomRole.Member)))
        {
            throw new HubException("You don't have access to this room");
        }
        
        // Возвращаем список участников с их ролями
        var participants = room.Participants.Select(p => new
        {
            UserId = p.UserId,
            Role = p.Role,
            JoinedAt = p.JoinedAt
        }).ToList<object>();
        
        return Task.FromResult(participants);
    }
    
    // Удалить комнату (только мастер)
    public async Task DeleteRoom(string roomId)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Проверяем, что запрос от мастера
        if (room.MasterId != userId)
        {
            throw new HubException("Only the room master can delete the room");
        }
        
        // Удаляем комнату
        if (Rooms.TryRemove(roomId, out _))
        {
            // Уведомляем всех участников
            await Clients.Group(roomId).SendAsync("RoomDeleted", roomId);
        }
    }

    // МЕТОДЫ ДЛЯ СИНХРОНИЗАЦИИ ПРОСМОТРА
    
    // Синхронизация события (пауза/воспроизведение)
    public async Task SyncPlayerEvent(string roomId, string action, double time)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Проверяем, что пользователь в комнате
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null || (participant.Role != ERoomRole.Master && participant.Role != ERoomRole.Member))
        {
            throw new HubException("You are not a member of this room");
        }
        
        // Отправляем всем участникам, кроме отправителя
        await Clients.OthersInGroup(roomId).SendAsync("ReceivePlayerEvent", action, time, userId);
    }
    
    // Синхронизация времени воспроизведения
    public async Task SyncPlayerTime(string roomId, double currentTime)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Проверяем, что пользователь в комнате
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null || (participant.Role != ERoomRole.Master && participant.Role != ERoomRole.Member))
        {
            throw new HubException("You are not a member of this room");
        }
        
        // Отправляем всем участникам, кроме отправителя
        await Clients.OthersInGroup(roomId).SendAsync("ReceiveTimeSync", currentTime, userId);
    }

    // МЕТОДЫ ЖИЗНЕННОГО ЦИКЛА СОЕДИНЕНИЯ
    
    // При подключении пользователя
    public override async Task OnConnectedAsync()
    {
        if (JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            Console.WriteLine($"User {userId} connected with connection ID {Context.ConnectionId}");
            
            // Добавляем соединение к списку пользователя
            UserConnections.AddOrUpdate(userId,
                _ => new HashSet<string> { Context.ConnectionId },
                (_, connections) =>
                {
                    connections.Add(Context.ConnectionId);
                    return connections;
                });
            
            // Обновляем статус онлайн
            UserStatus[userId] = EUserOnlineStatus.Online;
            
            // Проверяем, есть ли комнаты, в которых пользователь уже участвует
            foreach (var room in Rooms.Values)
            {
                var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
                if (participant != null && (participant.Role == ERoomRole.Master || participant.Role == ERoomRole.Member))
                {
                    // Добавляем соединение к комнате
                    participant.ConnectionIds.Add(Context.ConnectionId);
                    await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomId);
                }
            }
            
            await Clients.Others.SendAsync("UserOnline", userId);
        }
        await base.OnConnectedAsync();
    }
    
    // При отключении пользователя
    public override async Task OnDisconnectedAsync(Exception exception)
    {
        // Находим пользователя по ConnectionId
        var userKvp = UserConnections.FirstOrDefault(kvp => kvp.Value.Contains(Context.ConnectionId));
        if (userKvp.Key != 0) // 0 означает, что пользователь не найден (int default)
        {
            int userId = userKvp.Key;
            var connections = userKvp.Value;
            
            // Удаляем текущее соединение
            connections.Remove(Context.ConnectionId);
            
            // Если это последнее соединение пользователя
            if (connections.Count == 0)
            {
                UserConnections.TryRemove(userId, out _);
                UserStatus[userId] = EUserOnlineStatus.Offline;
                
                await Clients.Others.SendAsync("UserOffline", userId);
            }
            
            // Обрабатываем комнаты
            foreach (var room in Rooms.Values)
            {
                var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
                if (participant != null)
                {
                    // Удаляем соединение из списка соединений участника
                    participant.ConnectionIds.Remove(Context.ConnectionId);
                    
                    // Если это последнее соединение для этого участника в комнате
                    if (participant.ConnectionIds.Count == 0 && participant.Role == ERoomRole.Master)
                    {
                        // Это последнее соединение мастера
                        // Находим нового мастера среди членов комнаты
                        var newMaster = room.Participants
                            .FirstOrDefault(p => p.UserId != userId && p.Role == ERoomRole.Member 
                                              && p.ConnectionIds.Count > 0);
                        
                        if (newMaster != null)
                        {
                            // Назначаем нового мастера
                            newMaster.Role = ERoomRole.Master;
                            room.MasterId = newMaster.UserId;
                            
                            // Уведомляем всех о смене мастера
                            await Clients.Group(room.RoomId).SendAsync("NewRoomMaster", room.RoomId, newMaster.UserId);
                        }
                        else
                        {
                            // Некого назначать мастером - сохраняем комнату без активных соединений
                            // Комнату можно удалить или оставить для последующего подключения
                        }
                    }
                }
            }
        }
        
        await base.OnDisconnectedAsync(exception);
    }
    
    // Отправить сообщение в чат комнаты
    public async Task SendRoomMessage(string roomId, string message)
    {
        if (!JwtService.GetUserIdFromHubContext(Context, out var userId))
        {
            throw new HubException("Unauthorized");
        }
        
        // Проверяем, что комната существует
        if (!Rooms.TryGetValue(roomId, out var room))
        {
            throw new HubException("Room not found");
        }
        
        // Проверяем, что пользователь в комнате
        var participant = room.Participants.FirstOrDefault(p => p.UserId == userId);
        if (participant == null || (participant.Role != ERoomRole.Master && participant.Role != ERoomRole.Member))
        {
            throw new HubException("You are not a member of this room");
        }
        
        // Отправляем сообщение всем участникам комнаты
        await Clients.Group(roomId).SendAsync("RoomMessage", roomId, userId, message, DateTime.UtcNow);
    }
}