using Backend.Data.Entities;
using Backend.Services;

namespace Backend.Repositories.Abstraction.Account;

public interface IAccountRepository :IAsyncCrudRepository<User>
{
    public bool Autosave { get; set; }
    public Task LogOutAsync(string refreshToken);
    public Task<Tokens?> AuthenticateAsync(string email,string password,bool isRemember);
    public Task<string?> GetSignupToken(User user);
    public Task<bool> SignupAsync(Guid token);
    public Task SendFriendshipRequestAsync(Guid userId, Guid friendshipId);
    public Task AcceptFriendshipRequestAsync(Guid userId, Guid friendshipId);
    public Task RejectFriendshipRequestAsync(Guid userId, Guid friendshipId);
    public Task DeleteFriendAsync(Guid userId, Guid friendshipId);
}