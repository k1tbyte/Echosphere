using Backend.Data.Entities;

namespace Backend.Repositories.Abstraction.Account;

public interface IAccountRepository :IAsyncCrudRepository<User>
{
    public bool Autosave { get; set; }
    public Task LogOutAsync();
    public Task<bool> AuthenticateAsync(string email,string password,bool isRemember);
    public Task<string?> GetSignupToken(User user);
    public Task<bool> SignupAsync(Guid token);
}