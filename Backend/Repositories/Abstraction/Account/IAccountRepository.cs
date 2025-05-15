using System.Collections.ObjectModel;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Services;

namespace Backend.Repositories.Abstraction.Account;

public interface IAccountRepository :IAsyncCrudRepository<User>
{
    public bool Autosave { get; set; }
    public Task LogOutAsync(string? refreshToken);
    public Task<Tokens?> AuthenticateAsync(string email,string password,bool isRemember);
    public Task<string?> GetSignupToken(User user);
    public Task<Tokens?> SignupAsync(Guid token);
    public Task<bool> SendFriendshipRequestAsync(int userId, int friendId);
    public Task AcceptFriendshipAsync(int userId, int friendId);
    public Task DeleteFriendshipAsync(int userId, int friendId);
    public Task<List<UserSimplified>> GetFriends(int userId, int page, int pageSize); 
    public Task<List<UserSimplified>> GetPendingFriends(int userId, bool pendingFromYou); 
}