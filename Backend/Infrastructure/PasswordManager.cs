using System.Security.Cryptography;
using System.Text;

namespace Backend.Infrastructure;

public class PasswordManager
{
    private const int SaltBytesLimit = 16;
    
    public static string HashPassword(string password, out string salt)
    {
        salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(SaltBytesLimit));

        return Convert.ToHexString(
            SHA512.HashData(Encoding.UTF8.GetBytes(salt + password))
        );
    }

    public static bool CheckPassword(string password,string salt, string passwordHashed)
    {
        var hash = Convert.ToHexString(
            SHA512.HashData(Encoding.UTF8.GetBytes(salt + password))
        );
        
        return hash == passwordHashed;
    }
}