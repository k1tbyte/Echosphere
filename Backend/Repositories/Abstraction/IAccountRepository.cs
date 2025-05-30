using Backend.Data.Entities;
using Backend.DTO;
using Backend.Services;

namespace Backend.Repositories.Abstraction;

public interface IAccountRepository :IAsyncCrudRepository<User, IAccountRepository>
{
    public Task LogOutAsync(string? refreshToken);
    public Task<AuthTokensDTO?> AuthenticateAsync(string email,string password,bool isRemember);
    public Task<string?> GetSignupToken(User user);
    public Task<SignupResultDTO?> SignupAsync(Guid token);
    public Task SendFriendshipRequestAsync(int userId, int friendId);
    public Task AcceptFriendshipAsync(int userId, int friendId);
    public Task DeleteFriendshipAsync(int userId, int friendId);
    public Task<List<UserSimplifiedDTO>> GetFriends(int userId, int page, int pageSize);
    public Task<List<UserSimplifiedDTO>> GetPendingFriends(int userId, bool pendingFromYou);
    public Task SetAvatar(string? userId, string objName);
    public Task<bool> CheckPrivateVideoAccess(string? userId, int ownerId);
}