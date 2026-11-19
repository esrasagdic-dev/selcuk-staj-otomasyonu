using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Staj.Application.Common;

namespace Staj.Infrastructure.Services;

/// <summary>
/// SMTP ayarları (appsettings.json → "Smtp" bölümü; Gmail/Outlook gerçek SMTP veya geliştirmede MailHog).
/// </summary>
public class SmtpOptions
{
    /// <summary>SMTP sunucu adresi (Örn: smtp.gmail.com veya localhost).</summary>
    public string Host { get; set; } = "smtp.gmail.com";
    /// <summary>SMTP port numarası (Gmail TLS için 587, MailHog için 1025).</summary>
    public int Port { get; set; } = 587;
    /// <summary>SMTP kimlik doğrulama kullanıcı adı (Örn: gonderici@gmail.com).</summary>
    public string? Username { get; set; }
    /// <summary>SMTP kimlik doğrulama şifresi / Gmail 16 haneli Uygulama Şifresi (App Password).</summary>
    public string? Password { get; set; }
    /// <summary>STARTTLS / SSL kullanılsın mı?</summary>
    public bool UseSsl { get; set; } = true;
    /// <summary>Gönderici e-posta adresi.</summary>
    public string SenderEmail { get; set; } = "staj@selcuk.edu.tr";
    /// <summary>Gönderici görünen adı.</summary>
    public string SenderName { get; set; } = "Selçuk Üniversitesi Staj Komisyonu";
}

/// <summary>
/// MailKit kullanarak gerçek SMTP (Gmail / Kurumsal SMTP) veya MailHog üzerinden HTML e-posta gönderir.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;

    /// <summary>
    /// Yeni bir e-posta servisi oluşturur.
    /// </summary>
    public SmtpEmailService(IOptions<SmtpOptions> options, ILogger<SmtpEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
    {
        var msg = new MimeMessage();
        var fromEmail = !string.IsNullOrWhiteSpace(_options.Username) && _options.Username.Contains('@')
            ? _options.Username
            : _options.SenderEmail;
        msg.From.Add(new MailboxAddress(_options.SenderName, fromEmail));
        msg.To.Add(MailboxAddress.Parse(to));
        msg.Subject = subject;
        msg.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            var secureOption = _options.Port == 587
                ? SecureSocketOptions.StartTls
                : _options.Port == 465
                ? SecureSocketOptions.SslOnConnect
                : _options.UseSsl
                ? SecureSocketOptions.StartTlsWhenAvailable
                : SecureSocketOptions.None;

            await client.ConnectAsync(_options.Host, _options.Port, secureOption, ct);

            if (!string.IsNullOrWhiteSpace(_options.Username) && !string.IsNullOrWhiteSpace(_options.Password))
            {
                await client.AuthenticateAsync(_options.Username.Trim(), _options.Password.Replace(" ", ""), ct);
            }

            await client.SendAsync(msg, ct);
            await client.DisconnectAsync(true, ct);
            _logger.LogInformation("Gerçek e-posta gönderildi -> {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SMTP sunucusuna ({Host}:{Port}) gönderim yapılamadı. E-posta içeriği: To={To}, Subject={Subject}",
                _options.Host, _options.Port, to, subject);
            throw;
        }
    }
}
