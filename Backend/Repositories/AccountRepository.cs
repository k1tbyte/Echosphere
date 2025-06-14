﻿using Backend.Data;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Hubs;
using Backend.Infrastructure;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Backend.Services.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Repositories;

public class AccountRepository(AppDbContext context, JwtService jwtAuth, IMemoryCache signupCache) : 
    BaseAsyncCrudRepository<User, IAccountRepository>(context,context.Users), IAccountRepository
{
    private static readonly TimeSpan CacheExpireTime = TimeSpan.FromHours(24);

    public async Task LogOutAsync(string? refreshToken)
    {
        jwtAuth.CloseSession(refreshToken);
        await SaveAsync();
    }

    public void RevokeSessionsAsync(User user)
    {
        context.Sessions.RemoveRange(jwtAuth.GetUserSessions(user.Id));
    }

    public async Task<string?> GetSignupToken(User user)
    {
        if (await context.Users.AnyAsync(o => o.Email == user.Email))
            return null;

        var confirmationToken = Guid.NewGuid().ToString();
        signupCache.Set(confirmationToken, user, CacheExpireTime);
        return confirmationToken;
    }
    

    public async Task<AuthTokensDTO?> AuthenticateAsync(string email, string password,bool remember)
    {
        var user = await context.Users.FirstOrDefaultAsync(o => o.Email == email);
        
        if (user == null || !PasswordManager.CheckPassword(password, user.PasswordSalt, user.Password))
            return null;
        
        var tokens=jwtAuth.CreateNewSession(user,remember);
        await SaveAsync();
        return tokens;
    }

    public async Task<SignupResultDTO?> SignupAsync(Guid id)
    {
        var token = id.ToString();
        if (!signupCache.TryGetValue(token, out var value) || value is not User user ||
            await context.Users.AnyAsync(o => o.Email == user.Email))
            return null;
        
        
        var addedUser = await Set.AddAsync(new User()
        {
            Email = user.Email,
            Username = user.Username,
            Password = user.Password,
            JoinedAt = user.JoinedAt,
            PasswordSalt = user.PasswordSalt,
            Role = user.Id == 1 ? EUserRole.Admin : EUserRole.User
        }).ConfigureAwait(false);
        //We need to save to get the ID
        await context.SaveChangesAsync().ConfigureAwait(false);
        
        var tokens = jwtAuth.CreateNewSession(addedUser.Entity,false);
        await SaveAsync();
        
        signupCache.Remove(token);
        return new SignupResultDTO
        {
            RefreshToken = tokens.RefreshToken!,
            AccessToken = tokens.AccessToken!,
            Email = user.Email
        };
    }

    public async Task SendFriendshipRequestAsync(int userId, int friendId)
    {
        if (userId == friendId)
            throw new ArgumentException("User cannot send a friendship request to themselves.");

        bool exists = await context.Friendships.AnyAsync(f =>
            (f.RequesterId == userId && f.AddresseeId == friendId) ||
            (f.RequesterId == friendId && f.AddresseeId == userId));

        if (exists)
            throw new InvalidOperationException("Friendship request already exists or users are already friends.");

        var requester = await context.Users
            .Include(u => u.SentFriendRequests)
            .FirstOrDefaultAsync(u => u.Id == userId);

        var addressee = await context.Users
            .Include(u => u.ReceivedFriendRequests)
            .FirstOrDefaultAsync(u => u.Id == friendId);

        if (requester == null)
            throw new KeyNotFoundException($"User with ID {userId} not found.");

        if (addressee == null)
            throw new KeyNotFoundException($"User with ID {friendId} not found.");

        var friendship = new Friendship
        {
            RequesterId = userId,
            AddresseeId = friendId,
            Status = EFriendshipStatus.Pending
        };

        requester.SentFriendRequests.Add(friendship);
        addressee.ReceivedFriendRequests.Add(friendship);

        await context.SaveChangesAsync();
    }

    public async Task AcceptFriendshipAsync(int userId, int friendId)
    {
        var friendship = await context.Friendships
            .FirstOrDefaultAsync(f => (f.RequesterId == friendId && f.AddresseeId == userId)||
                                      (f.RequesterId == userId && f.AddresseeId == friendId));

        if (friendship == null)
            throw new InvalidOperationException("Friendship not found.");

        if (friendship.Status != EFriendshipStatus.Pending)
            throw new InvalidOperationException("Friendship is already accepted.");

        friendship.Status = EFriendshipStatus.Accepted;
        await context.SaveChangesAsync();
    }

    public async Task DeleteFriendshipAsync(int userId, int friendId)
    {
        var friendship = await context.Friendships
            .FirstOrDefaultAsync(f => (f.RequesterId == friendId && f.AddresseeId == userId)||
                                      (f.RequesterId == userId && f.AddresseeId == friendId));

    if (friendship == null)
            throw new InvalidOperationException("Friendship not found.");
    
        context.Friendships.Remove(friendship);
        await SaveAsync();
    }

    public async Task<List<UserSimplifiedDTO>> GetFriends(int userId, int offset, int limit)
    {
        var result = await context.UserSimplified
            .FromSqlRaw("""
                        
                                    SELECT 
                                        u.user_id, 
                                        u.username, 
                                        u.avatar
                                    FROM friendship f
                                    JOIN "user" u ON 
                                        (f.requester_id = {0} AND f.addressee_id = u.user_id) OR
                                        (f.addressee_id = {0} AND f.requester_id = u.user_id)
                                    WHERE f.status = 1
                                    ORDER BY u.username
                                    OFFSET {1} ROWS FETCH NEXT {2} ROWS ONLY
                                
                        """, userId, offset, limit)
            .ToListAsync();

        foreach (var user in result)
        {
            user.OnlineStatus = EchoHub.GetUserStatus(user.Id);
        }

        return result;
    }
    
    public async Task<List<UserSimplifiedDTO>> GetPendingFriends(int userId, bool pendingFromYou = false)
    {
        var user = await context.Users
            .Include(u => u.SentFriendRequests)
            .ThenInclude(f => f.Addressee)
            .Include(u => u.ReceivedFriendRequests)
            .ThenInclude(f => f.Requester)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            throw new InvalidOperationException("User not found.");

        List<UserSimplifiedDTO> pendingList = new List<UserSimplifiedDTO>();
        if (pendingFromYou)
        {
            foreach (var f in user.SentFriendRequests.Where(f => f.Status == EFriendshipStatus.Pending))
            {
                var friend = f.Addressee;
                pendingList.Add(new UserSimplifiedDTO
                {
                    Id = friend.Id,
                    Username = friend.Username,
                    Avatar = friend.Avatar
                });
            }
            return pendingList;
        }
        foreach (var f in user.ReceivedFriendRequests.Where(f => f.Status == EFriendshipStatus.Pending))
        {
            var friend = f.Requester;
            pendingList.Add(new UserSimplifiedDTO
            {
                Id = friend.Id,
                Username = friend.Username,
                Avatar = friend.Avatar
            });
        }

        return pendingList;
    }
    
    public async Task<EUserRole> GetUserRoleAsync(int userId)
    {
        var role = await context.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Role)
            .FirstOrDefaultAsync();
        return role;
    }
}