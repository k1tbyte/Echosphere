using System.Security.Cryptography;
using System.Text;

namespace Backend.Utils;

public class PasswordTools
{
    public static string HashPassword(string password, out string salt, int saltLength)
    {
        salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(saltLength));

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