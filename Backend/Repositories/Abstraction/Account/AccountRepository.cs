using Backend.Data;
using Backend.Data.Entities;
using Backend.Infrastructure;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Repositories.Abstraction.Account;

public class AccountRepository(AppDbContext context, JwtService jwtAuth, IMemoryCache signupCache) : IAccountRepository
{
    private static readonly TimeSpan CacheExpireTime = TimeSpan.FromHours(24);
    public bool Autosave { get; set; } = true;
    public async Task<User> Add(User entity)
    {
        var entry = await context.Users.AddAsync(entity);
        await SaveAsync();
        return entry.Entity;
    }

    public async Task<User?> Get(long id)
    {
        return await context.Users.FindAsync(id);
    }

    public async Task Update(User entity)
    {
        context.Users.Update(entity);
        await SaveAsync();
    }

    public async Task<bool> DeleteById(long id)
    {
        var entity = await context.Users.FindAsync(id);
        return await Delete(entity);
    }

    public async Task<bool> Delete(User? entity)
    {
        if (entity == null)
            return false;

        context.Users.Remove(entity);
        await SaveAsync();
        return true;
    }


    public async Task LogOutAsync()
    {
        jwtAuth.CloseSession();
        await SaveAsync();
    }

    public async Task<string?> GetSignupToken(User user)
    {
        if (await context.Users.AnyAsync(o => o.Email == user.Email))
            return null;

        var confirmationToken = Guid.NewGuid().ToString();
        signupCache.Set(confirmationToken, user, CacheExpireTime);
        return confirmationToken;
    }
    

    public async Task<bool> AuthenticateAsync(string email, string password,bool remember)
    {
        var user = await context.Users.FirstOrDefaultAsync(o => o.Email == email);
        
        if (user == null || !PasswordManager.CheckPassword(password, user.PasswordSalt, user.Password))
            return false;
        
        jwtAuth.CreateNewSession(user,remember);
        await context.SaveChangesAsync().ConfigureAwait(false);
        return true;
    }

    public async Task<bool> SignupAsync(Guid id)
    {
        var token = id.ToString();
        if (!signupCache.TryGetValue(token, out var value) || value is not User user ||
            await context.Users.AnyAsync(o => o.Email == user.Email))
            return false;
        
        var addedUser = await context.Users.AddAsync(user).ConfigureAwait(false);
        //We need to save to get the ID
        await context.SaveChangesAsync().ConfigureAwait(false);
        
        jwtAuth.CreateNewSession(addedUser.Entity,false);
        await SaveAsync().ConfigureAwait(false);
        
        signupCache.Remove(token);
        return true;
    }
    public async Task SaveAsync()
    {
        if (!Autosave)
            return;
        
        await context.SaveChangesAsync().ConfigureAwait(false);
    }
}