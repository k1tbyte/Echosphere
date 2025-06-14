using Backend.DTO;
using Backend.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Services;

public class NotificationsService(IHubContext<EchoHub> hub) 
{
    public async Task SendEvent(int userId, string eventName, object data)
    {
        if (EchoHub.UserConnections.TryGetValue(userId, out var connections))
        {
            foreach (var connectionId in connections.Where(s => !string.IsNullOrEmpty(s)))
            {
                await hub.Clients.Client(connectionId).SendAsync("ReceiveEvent", eventName, data);
            }
        }
    }
}