using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Services;

public interface INotificationService
{
    Task SendNotificationAsync(int userId, string title, string message, NotificationType type = NotificationType.Info, int? applicationId = null);
    Task SendToRoleAsync(UserRole role, string title, string message, NotificationType type = NotificationType.Info, int? applicationId = null);
    Task<List<UserNotification>> GetNotificationsAsync(int userId, int limit = 30);
    Task<int> GetUnreadCountAsync(int userId);
    Task MarkAsReadAsync(int notificationId, int userId);
    Task MarkAllAsReadAsync(int userId);
}

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string recipientName, string subject, string templateType, string htmlBody, int? applicationId = null);
    Task<List<EmailLog>> GetRecentEmailsAsync(int? applicationId = null, int limit = 50);
    Task<List<EmailLog>> GetEmailsForUserAsync(int userId, string userEmail, string userRole, int? applicationId = null, int limit = 50);

    // Hazır Yaşamdöngüsü E-postaları
    Task SendApplicationSubmittedEmailAsync(InternshipApplication app);
    Task SendCommissionDecisionEmailAsync(InternshipApplication app, string action, string? reason = null);
    Task SendInsuranceStartedEmailAsync(InternshipApplication app);
    Task SendAdvisorInvitationEmailAsync(InternshipApplication app);
    Task SendAdvisorApprovedDiaryEmailAsync(InternshipApplication app);
    Task SendFinalAcademicEvaluationEmailAsync(InternshipApplication app);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task SendNotificationAsync(int userId, string title, string message, NotificationType type = NotificationType.Info, int? applicationId = null)
    {
        var notification = new UserNotification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            RelatedApplicationId = applicationId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.UserNotifications.Add(notification);
        await _context.SaveChangesAsync();
    }

    public async Task SendToRoleAsync(UserRole role, string title, string message, NotificationType type = NotificationType.Info, int? applicationId = null)
    {
        var users = await _context.Users.Where(u => u.Role == role && u.IsActive).ToListAsync();
        foreach (var user in users)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = user.Id,
                Title = title,
                Message = message,
                Type = type,
                RelatedApplicationId = applicationId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();
    }

    public async Task<List<UserNotification>> GetNotificationsAsync(int userId, int limit = 30)
    {
        return await _context.UserNotifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        return await _context.UserNotifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
    }

    public async Task MarkAsReadAsync(int notificationId, int userId)
    {
        var item = await _context.UserNotifications.FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
        if (item != null && !item.IsRead)
        {
            item.IsRead = true;
            item.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var unread = await _context.UserNotifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var item in unread)
        {
            item.IsRead = true;
            item.ReadAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
    }
}

public class EmailService : IEmailService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(AppDbContext context, IConfiguration configuration, ILogger<EmailService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string recipientName, string subject, string templateType, string htmlBody, int? applicationId = null)
    {
        var status = "Sent";

        try
        {
            var host = Environment.GetEnvironmentVariable("SMTP_HOST") 
                       ?? _configuration["Smtp:Host"];
            var portStr = Environment.GetEnvironmentVariable("SMTP_PORT") 
                          ?? _configuration["Smtp:Port"];
            var enableSslStr = Environment.GetEnvironmentVariable("SMTP_ENABLE_SSL") 
                               ?? _configuration["Smtp:EnableSsl"];
            var userName = Environment.GetEnvironmentVariable("SMTP_USER") 
                           ?? _configuration["Smtp:UserName"];
            var password = Environment.GetEnvironmentVariable("SMTP_PASS") 
                           ?? _configuration["Smtp:Password"];
            var senderEmail = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") 
                              ?? _configuration["Smtp:SenderEmail"] 
                              ?? "staj@selcuk.edu.tr";
            var senderName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME") 
                             ?? _configuration["Smtp:SenderName"] 
                             ?? "Selçuk Üniversitesi Staj Bilgi Sistemi";

            if (!string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(toEmail) && toEmail.Contains("@"))
            {
                int port = int.TryParse(portStr, out var p) ? p : 587;
                bool enableSsl = !bool.TryParse(enableSslStr, out var ssl) || ssl;

                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName, Encoding.UTF8),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true,
                    SubjectEncoding = Encoding.UTF8,
                    BodyEncoding = Encoding.UTF8
                };
                mailMessage.To.Add(new MailAddress(toEmail, recipientName, Encoding.UTF8));

                using var smtpClient = new SmtpClient(host, port)
                {
                    EnableSsl = enableSsl,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 8000
                };

                if (!string.IsNullOrWhiteSpace(userName) && !string.IsNullOrWhiteSpace(password))
                {
                    smtpClient.Credentials = new NetworkCredential(userName, password);
                }

                await smtpClient.SendMailAsync(mailMessage);
                _logger.LogInformation("Resmî e-posta başarıyla iletildi: {ToEmail} ({Subject})", toEmail, subject);
                status = "Delivered";
            }
            else
            {
                _logger.LogInformation("SMTP ayarları yapılandırılmadığı için e-posta kaydı işlendi: {ToEmail} ({Subject})", toEmail, subject);
                status = "Queued";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "E-posta gönderiminde uyarı ({ToEmail}): {Message}", toEmail, ex.Message);
            status = $"Failed: {ex.Message}";
        }

        var log = new EmailLog
        {
            ToEmail = toEmail,
            RecipientName = recipientName,
            Subject = subject,
            TemplateType = templateType,
            BodyHtml = htmlBody,
            RelatedApplicationId = applicationId,
            Status = status,
            SentAt = DateTime.UtcNow
        };

        _context.EmailLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<List<EmailLog>> GetRecentEmailsAsync(int? applicationId = null, int limit = 50)
    {
        var query = _context.EmailLogs.AsQueryable();
        if (applicationId.HasValue)
        {
            query = query.Where(e => e.RelatedApplicationId == applicationId.Value);
        }

        return await query.OrderByDescending(e => e.SentAt).Take(limit).ToListAsync();
    }

    public async Task<List<EmailLog>> GetEmailsForUserAsync(int userId, string userEmail, string userRole, int? applicationId = null, int limit = 50)
    {
        var query = _context.EmailLogs.AsQueryable();

        if (userRole == "Student")
        {
            // Öğrencinin sahip olduğu tüm başvuru ID'lerini al
            var studentAppIds = await _context.InternshipApplications
                .Where(a => a.StudentId == userId)
                .Select(a => a.Id)
                .ToListAsync();

            if (applicationId.HasValue)
            {
                // Öğrenci sadece kendisine ait bir başvurunun e-postalarını inceleyebilir
                if (!studentAppIds.Contains(applicationId.Value))
                {
                    return new List<EmailLog>();
                }
                query = query.Where(e => e.RelatedApplicationId == applicationId.Value);
            }
            else
            {
                var lowerEmail = (userEmail ?? "").ToLower();
                // Öğrencinin kendi e-postasına gidenler VEYA kendi başvurusu için işyeri eğitici personeline giden davet e-postaları
                query = query.Where(e => e.ToEmail.ToLower() == lowerEmail ||
                                         (e.RelatedApplicationId != null && studentAppIds.Contains(e.RelatedApplicationId.Value)));
            }
        }
        else if (userRole == "CommissionMember" || userRole == "CommissionChair" || userRole == "SystemAdmin")
        {
            // Fakülte Staj Komisyonu ve Sistem Yöneticisi: İstenen başvuru veya üniversite geneli e-posta günlüğü
            if (applicationId.HasValue)
            {
                query = query.Where(e => e.RelatedApplicationId == applicationId.Value);
            }
        }
        else if (userRole == "KPTOOfficer")
        {
            // KPTO Memuru: Sigorta bildirimleri veya ilgili başvuru
            if (applicationId.HasValue)
            {
                query = query.Where(e => e.RelatedApplicationId == applicationId.Value);
            }
            else
            {
                query = query.Where(e => e.TemplateType == "InsuranceStarted");
            }
        }
        else
        {
            var lowerEmail = (userEmail ?? "").ToLower();
            query = query.Where(e => e.ToEmail.ToLower() == lowerEmail);
        }

        return await query.OrderByDescending(e => e.SentAt).Take(limit).ToListAsync();
    }

    // 1. Başvuru Gönderildiğinde Öğrenciye Bilgilendirme
    public async Task SendApplicationSubmittedEmailAsync(InternshipApplication app)
    {
        var studentName = app.Student?.FullName ?? "Öğrencimiz";
        var studentEmail = app.Student?.Email ?? "";
        var periodName = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
        var workplaceName = app.Workplace?.Name ?? "İlgili Kurum";

        var body = WrapSelcukTemplate(
            title: $"{periodName} Başvurunuz Alındı",
            subtitle: "Başvurunuz Staj Komisyonu Ön İncelemesine İletilmiştir",
            content: $@"
                <p>Sayın <strong>{studentName}</strong>,</p>
                <p><strong>{periodName}</strong> kapsamında <strong>{workplaceName}</strong> bünyesinde yapmayı planladığınız staj başvurunuz ve yüklediğiniz belgeler (Form 2 ve SPAS Müstehaklık Belgesi) başarıyla sistemimize kaydedilmiştir.</p>
                <div style='background: #f8fafc; border-left: 4px solid #1c458b; padding: 14px 18px; margin: 20px 0;'>
                    <p style='margin: 0 0 6px 0;'><strong>Staj Konusu:</strong> {app.Subject}</p>
                    <p style='margin: 0 0 6px 0;'><strong>Başlangıç - Bitiş Tarihi:</strong> {app.StartDate:dd.MM.yyyy} - {app.CurrentEndDate:dd.MM.yyyy}</p>
                    <p style='margin: 0;'><strong>Süre:</strong> {app.RequiredWorkDays} İş Günü</p>
                </div>
                <p>Başvurunuz Staj Komisyonu tarafından incelendikten sonra tarafınıza e-posta ve sistem üzerinden anlık bildirim gönderilecektir.</p>
            "
        );

        await SendEmailAsync(studentEmail, studentName, $"[Selçuk Staj] {periodName} Başvurunuz Alındı", "ApplicationSubmitted", body, app.Id);
    }

    // 2. Komisyon Kararı Bildirimi (Onay / Revizyon / Red)
    public async Task SendCommissionDecisionEmailAsync(InternshipApplication app, string action, string? reason = null)
    {
        var studentName = app.Student?.FullName ?? "Öğrencimiz";
        var studentEmail = app.Student?.Email ?? "";
        var periodName = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";

        string title, subtitle, content, alertColor;

        if (action == "Approve")
        {
            title = $"{periodName} Başvurunuz ONAYLANDI";
            subtitle = "Staj Komisyonu Onayı Başarıyla Tamamlandı";
            alertColor = "#16a34a"; // Green
            content = $@"
                <p>Sayın <strong>{studentName}</strong>,</p>
                <p style='color: #16a34a; font-weight: 600; font-size: 16px;'>Tebrikler! Staj başvurunuz ve teslim ettiğiniz evraklar Staj Komisyonu tarafından incelenmiş ve UYGUN bulunarak ONAYLANMIŞTIR.</p>
                <div style='background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0;'>
                    <p style='margin: 0 0 6px 0;'><strong>Staj Dönemi:</strong> {periodName}</p>
                    <p style='margin: 0 0 6px 0;'><strong>Kabul Edilen Kurum:</strong> {app.Workplace?.Name}</p>
                    <p style='margin: 0 0 6px 0;'><strong>Tarih Aralığı:</strong> {app.StartDate:dd.MM.yyyy} - {app.CurrentEndDate:dd.MM.yyyy}</p>
                    <p style='margin: 0;'><strong>Sıradaki Aşama:</strong> Kariyer Planlama ve Uygulama Merkezi (KPTO) tarafından 5510 Sayılı Kanun 5/b kapsamında SGK işe giriş bildirgenizin düzenlenmesi.</p>
                </div>
                <p>İşyeri Sorumlu Mühendisinize staj defteri değerlendirme bağlantısı otomatik olarak iletilecektir.</p>
            ";
        }
        else if (action == "RequestRevision")
        {
            title = $"{periodName} Başvurunuzda Düzeltme İstendi";
            subtitle = "Eksik / Hatalı Evrak veya Bilgi Güncellemesi Gerekmektedir";
            alertColor = "#d97706"; // Amber
            content = $@"
                <p>Sayın <strong>{studentName}</strong>,</p>
                <p style='color: #b45309;'>Staj Komisyonu başvurunuzu incelemiş ve aşağıdaki gerekçeyle düzeltme / evrak yenileme talep etmiştir:</p>
                <div style='background: #fffbeb; border-left: 4px solid #d97706; padding: 14px 18px; margin: 20px 0; color: #78350f;'>
                    <strong>Komisyon Düzeltme Gerekçesi:</strong><br/>
                    {reason ?? "Belgelerdeki eksiklikleri gidererek başvurunuzu güncelleyiniz."}
                </div>
                <p>Lütfen sisteme giriş yaparak başvurunuzu güncelleyiniz ve gerekli evrakları yeniden yükleyerek tekrar onaya gönderiniz.</p>
            ";
        }
        else
        {
            title = $"{periodName} Başvurunuz Reddedildi";
            subtitle = "Staj Başvurunuz Komisyon Kriterlerini Karşılamamaktadır";
            alertColor = "#dc2626"; // Red
            content = $@"
                <p>Sayın <strong>{studentName}</strong>,</p>
                <p style='color: #dc2626;'>Staj Komisyonu tarafından yapılan inceleme neticesinde başvurunuz reddedilmiştir.</p>
                <div style='background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 18px; margin: 20px 0; color: #991b1b;'>
                    <strong>Red Gerekçesi:</strong><br/>
                    {reason ?? "Staj yeri veya evraklar yönergeye uygun değildir."}
                </div>
                <p>Yeni bir başvuru taslağı oluşturmak için portala giriş yapabilirsiniz.</p>
            ";
        }

        var body = WrapSelcukTemplate(title, subtitle, content, alertColor);
        await SendEmailAsync(studentEmail, studentName, $"[Selçuk Staj] {title}", "CommissionDecision", body, app.Id);
    }

    // 3. Sigorta Başlatıldı Bildirimi
    public async Task SendInsuranceStartedEmailAsync(InternshipApplication app)
    {
        var studentName = app.Student?.FullName ?? "Öğrencimiz";
        var studentEmail = app.Student?.Email ?? "";
        var periodName = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
        var regNo = app.InsuranceRecord?.SgkDocumentRegistrationNo ?? "Tescil Edildi";

        var body = WrapSelcukTemplate(
            title: "SGK Staj Sigorta Girişiniz Yapıldı",
            subtitle: "5510 Sayılı Kanun 5/b Kapsamında Prim Tescili Tamamlandı",
            content: $@"
                <p>Sayın <strong>{studentName}</strong>,</p>
                <p>Selçuk Üniversitesi Kariyer Planlama ve Uygulama Merkezi (KPTO) tarafından {periodName} dönemi için zorunlu staj sigortanız (İş Kazası ve Meslek Hastalığı Sigortası) başarıyla başlatılmıştır.</p>
                <div style='background: #eff6ff; border-left: 4px solid #1c458b; padding: 14px 18px; margin: 20px 0;'>
                    <p style='margin: 0 0 6px 0;'><strong>SGK Belge Tescil / Takip No:</strong> {regNo}</p>
                    <p style='margin: 0 0 6px 0;'><strong>Sigorta Başlangıç Tarihi:</strong> {app.InsuranceRecord?.SgkEntryDate:dd.MM.yyyy}</p>
                    <p style='margin: 0 0 6px 0;'><strong>Sigorta Bitiş Tarihi:</strong> {app.InsuranceRecord?.SgkExitDate:dd.MM.yyyy}</p>
                    <p style='margin: 0;'><strong>İşe Giriş Bildirgesi:</strong> e-Devlet kapısı (4A İşe Giriş Bildirgesi) üzerinden sorgulanabilir durumdadır.</p>
                </div>
                <p>Belirtilen başlangıç tarihinde stajınıza başlayabilir ve sistem üzerinden günlük Sanal Staj Defteri kayıtlarınızı oluşturmaya başlayabilirsiniz.</p>
            ",
            headerColor: "#1c458b"
        );

        await SendEmailAsync(studentEmail, studentName, "[Selçuk Staj] SGK Staj Sigorta Girişiniz Yapıldı", "InsuranceStarted", body, app.Id);
    }

    // 4. İşyeri Eğitici Personeli (Mühendis) Davet E-postası
    public async Task SendAdvisorInvitationEmailAsync(InternshipApplication app)
    {
        if (app.Advisor == null || string.IsNullOrWhiteSpace(app.Advisor.Email)) return;

        var advisorName = app.Advisor.FullName;
        var advisorEmail = app.Advisor.Email;
        var studentName = app.Student?.FullName ?? "Öğrenci";
        var studentNumber = app.Student?.StudentProfile?.StudentNumber ?? "";
        var periodName = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
        var token = app.Advisor.AccessToken;
        var portalLink = $"http://localhost:8080/advisor/review?token={token}";

        var body = WrapSelcukTemplate(
            title: "Selçuk Üniversitesi Staj Danışmanlığı Bilgilendirmesi",
            subtitle: "Öğrenci Sanal Staj Defteri Onay ve Değerlendirme Sistemi",
            content: $@"
                <p>Sayın <strong>{advisorName}</strong> ({app.Advisor.TitleOrPosition}),</p>
                <p>Selçuk Üniversitesi Bilgisayar Mühendisliği Bölümü öğrencimiz <strong>{studentName}</strong> ({studentNumber}), kurumunuz bünyesinde <strong>{app.StartDate:dd.MM.yyyy} - {app.CurrentEndDate:dd.MM.yyyy}</strong> tarihleri arasında <strong>{app.RequiredWorkDays} iş günü</strong> sürecek zorunlu {periodName} çalışmasına başlayacaktır.</p>
                <p>Staj süresince öğrencinin sisteme gireceği günlük çalışma raporları (Sanal Staj Defteri), staj bitiminde tarafınızca online olarak onaylanacaktır.</p>
                <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;'>
                    <p style='margin: 0 0 12px 0; font-size: 15px; color: #334155;'>Defteri incelemek ve dijital imza ile onaylamak için size özel doğrudan erişim bağlantısı:</p>
                    <a href='{portalLink}' style='background: #1c458b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>Sanal Staj Defterini İncele ve Onayla</a>
                    <p style='margin: 12px 0 0 0; font-size: 12px; color: #64748b;'>Erişim Kodu (Token): <code style='background: #f1f5f9; padding: 3px 6px; border-radius: 4px; font-weight: bold;'>{token}</code></p>
                </div>
                <p style='font-size: 13px; color: #64748b;'>Öğrencimizin eğitimine ve mesleki gelişimine sunduğunuz değerli katkılar için teşekkür ederiz.</p>
            ",
            headerColor: "#1c458b"
        );

        await SendEmailAsync(advisorEmail, advisorName, $"[Selçuk Üniversitesi] Staj Eğitici Personel Bilgilendirmesi - {studentName}", "AdvisorInvitation", body, app.Id);
    }

    // 5. İşyeri Defteri Onayladığında Öğrenciye Bilgilendirme
    public async Task SendAdvisorApprovedDiaryEmailAsync(InternshipApplication app)
    {
        var studentName = app.Student?.FullName ?? "Öğrencimiz";
        var studentEmail = app.Student?.Email ?? "";
        var periodName = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
        var advisorName = app.Advisor?.FullName ?? "İşyeri Mühendisi";

        var body = WrapSelcukTemplate(
            title: "Sanal Staj Defteriniz İşyeri Tarafından Onaylandı",
            subtitle: "Staj Defteri Değerlendirme Aşaması Başarıyla Tamamlandı",
            content: $@"
                <p>Sayın <strong>{studentName}</strong>,</p>
                <p><strong>{periodName}</strong> kapsamında doldurduğunuz Sanal Staj Defteriniz, işyeri sorumlu personeli <strong>{advisorName}</strong> tarafından dijital olarak incelenmiş ve <strong>ONAYLANMIŞTIR</strong>.</p>
                <div style='background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0;'>
                    <p style='margin: 0 0 6px 0;'><strong>Onaylayan:</strong> {advisorName}</p>
                    <p style='margin: 0 0 6px 0;'><strong>Onay Tarihi:</strong> {DateTime.Now:dd.MM.yyyy HH:mm}</p>
                    <p style='margin: 0;'><strong>Sıradaki Aşama:</strong> Staj Komisyonu tarafından nihai akademik not değerlendirmesinin yapılması.</p>
                </div>
            ",
            headerColor: "#16a34a"
        );

        await SendEmailAsync(studentEmail, studentName, "[Selçuk Staj] Staj Defteriniz İşyeri Tarafından Onaylandı", "AdvisorApprovedDiary", body, app.Id);
    }

    // 6. Nihai Akademik Değerlendirme Sonucu
    public async Task SendFinalAcademicEvaluationEmailAsync(InternshipApplication app)
    {
        var studentName = app.Student?.FullName ?? "Öğrencimiz";
        var studentEmail = app.Student?.Email ?? "";
        var periodName = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";

        var resultText = app.AcademicResult switch
        {
            AcademicResultType.Successful => "BAŞARILI (Tam Kabul)",
            AcademicResultType.PartiallySuccessful => "KISMEN BAŞARILI",
            _ => "BAŞARISIZ"
        };

        var resultColor = app.AcademicResult == AcademicResultType.Successful ? "#16a34a" : "#dc2626";

        var body = WrapSelcukTemplate(
            title: "Staj Nihai Değerlendirme Sonucunuz Açıklandı",
            subtitle: "Staj Komisyonu Akademik Değerlendirmesi Sonuçlandı",
            content: $@"
                <p>Sayın <strong>{studentName}</strong>,</p>
                <p><strong>{periodName}</strong> dönemi staj çalışmalarınız, staj defteriniz ve işyeri değerlendirmeniz Staj Komisyonu tarafından incelenmiş ve staj süreciniz sonuçlandırılmıştır.</p>
                <div style='background: #f8fafc; border-left: 4px solid {resultColor}; padding: 16px 20px; margin: 20px 0;'>
                    <p style='margin: 0 0 8px 0; font-size: 17px; font-weight: bold; color: {resultColor};'>Akademik Sonuç: {resultText}</p>
                    <p style='margin: 0 0 6px 0;'><strong>Kabul Edilen İş Günü:</strong> {app.AcceptedDaysCount} / {app.RequiredWorkDays} Gün</p>
                    {(string.IsNullOrWhiteSpace(app.AcademicNotes) ? "" : $"<p style='margin: 0 0 6px 0;'><strong>Komisyon Notu:</strong> {app.AcademicNotes}</p>")}
                    <p style='margin: 0;'><strong>Karar Tarihi:</strong> {DateTime.Now:dd.MM.yyyy}</p>
                </div>
                <p>Stajınız öğrenci işleri otomasyon sistemine (OBS) işlenmek üzere kayıt altına alınmıştır. Tebrik eder, başarılar dileriz.</p>
            ",
            headerColor: resultColor
        );

        await SendEmailAsync(studentEmail, studentName, $"[Selçuk Staj] {periodName} Değerlendirme Sonucunuz Açıklandı", "FinalAcademicEvaluation", body, app.Id);
    }

    public static string WrapSelcukTemplate(string title, string subtitle, string content, string headerColor = "#1c458b")
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'/>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; }}
        .wrapper {{ max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }}
        .header {{ background: {headerColor}; color: #ffffff; padding: 26px 30px; border-bottom: 4px solid #c5a880; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }}
        .header p {{ margin: 5px 0 0 0; font-size: 13px; color: #e2e8f0; }}
        .crest-bar {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }}
        .content {{ padding: 30px; font-size: 14px; line-height: 1.65; color: #334155; }}
        .footer {{ background: #f8fafc; padding: 20px 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }}
        .btn {{ background: #1c458b; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-weight: 600; display: inline-block; }}
    </style>
</head>
<body>
    <div class='wrapper'>
        <div class='header'>
            <div style='font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #c5a880; font-weight: 700; margin-bottom: 6px;'>
                T.C. SELÇUK ÜNİVERSİTESİ • STAJ BİLGİ SİSTEMİ
            </div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </div>
        <div class='content'>
            {content}
        </div>
        <div class='footer'>
            <p style='margin: 0 0 6px 0; font-weight: 600; color: #475569;'>Selçuk Üniversitesi Staj ve Uygulama Eğitimi Komisyonu</p>
            <p style='margin: 0;'>Alaeddin Keykubat Kampüsü, 42130 Selçuklu / KONYA • Bu e-posta sistem tarafından otomatik olarak üretilmiştir.</p>
        </div>
    </div>
</body>
</html>";
    }
}
