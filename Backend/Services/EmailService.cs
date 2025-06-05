using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MimeKit.Text;


namespace Backend.Services;

public class EmailService
{
    private readonly IConfigurationSection _config;

    public EmailService(IConfiguration configuration)
    {
        _config = configuration.GetSection("SMTPEmailServer");
    }

    public async Task<bool> SendMailAsync(string mailAddress,string subject, string content)
    {
        try
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(_config["Name"],_config["Username"]));
            email.To.Add(MailboxAddress.Parse(mailAddress));
            email.Subject = subject;
            email.Body    = new TextPart(TextFormat.Html) { Text = content };

            using var smtp = new SmtpClient();
        
            await smtp.ConnectAsync(
                _config["Host"],
                _config.GetValue<int>("Port"),
                _config.GetValue<bool>("EnableSSL") ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.Auto
            );
        
            await smtp.AuthenticateAsync(_config["Username"], _config["Password"]);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
            return true;
        }
        catch
        {
            return false;
        }
    }
}