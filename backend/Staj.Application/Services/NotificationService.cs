using Microsoft.EntityFrameworkCore;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Services;

/// <summary>
/// Sistem içi bildirim, e-posta ve denetim logu üretimini tek noktada toplar.
/// Not: Bildirimler DbContext'e eklenir, kaydetme (SaveChanges) çağıran servisin sorumluluğundadır.
/// </summary>
public class NotificationService
{
    private readonly IAppDbContext _db;
    private readonly IEmailService _email;
    private readonly ICurrentUser _currentUser;

    /// <summary>
    /// Yeni bir bildirim servisi oluşturur.
    /// </summary>
    public NotificationService(IAppDbContext db, IEmailService email, ICurrentUser currentUser)
    {
        _db = db;
        _email = email;
        _currentUser = currentUser;
    }

    /// <summary>Belirli bir kullanıcıya bildirim ekler.</summary>
    public void ToUser(Guid userId, string title, string message, NotificationType type = NotificationType.Info, Guid? internshipId = null) =>
        _db.Notifications.Add(new Notification { UserId = userId, Title = title, Message = message, Type = type, InternshipId = internshipId });

    /// <summary>Bir roldeki tüm kullanıcılara (örn. KPTO) bildirim ekler.</summary>
    public void ToRole(UserRole role, string title, string message, NotificationType type = NotificationType.Info, Guid? internshipId = null) =>
        _db.Notifications.Add(new Notification { TargetRole = role, Title = title, Message = message, Type = type, InternshipId = internshipId });

    /// <summary>Denetim logu ekler.</summary>
    public void Audit(string action, string entityName, Guid? entityId, string? details = null) =>
        _db.AuditLogs.Add(new AuditLog
        {
            UserId = _currentUser.IsAuthenticated ? _currentUser.UserId : null,
            Action = action, EntityName = entityName, EntityId = entityId, Details = details
        });

    /// <summary>E-posta gönderir ve içeriğini HTML e-posta geçmişine (EmailLogs) kaydeder; gönderim hatasında ana akışı bozmaz.</summary>
    public async Task TryEmailAsync(string to, string subject, string html, CancellationToken ct = default, Guid? internshipId = null)
    {
        var ok = true;
        string? error = null;
        try
        {
            await _email.SendAsync(to, subject, html, ct);
        }
        catch (Exception ex)
        {
            ok = false;
            error = ex.Message;
        }

        _db.EmailLogs.Add(new EmailLog
        {
            InternshipId = internshipId,
            ToEmail = to,
            Subject = subject,
            HtmlBody = html,
            IsSuccess = ok,
            ErrorMessage = error,
            SentAt = DateTime.UtcNow
        });

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch
        {
            // E-posta loglama hatası ana akışı bozmasın
        }
    }

    /// <summary>Gönderilen HTML e-posta geçmişini (isteğe bağlı staj kimliğine göre filtrelenmiş) döner.</summary>
    public async Task<List<EmailLogDto>> GetEmailLogsAsync(Guid? internshipId = null, CancellationToken ct = default)
    {
        var q = _db.EmailLogs.AsQueryable();
        if (internshipId.HasValue)
            q = q.Where(x => x.InternshipId == internshipId.Value);
        var list = await q.OrderByDescending(x => x.SentAt).Take(100).ToListAsync(ct);
        return list.Select(x => x.ToDto()).ToList();
    }

    /// <summary>Oturumdaki kullanıcının (kişisel + rol) bildirimlerini döner.</summary>
    public async Task<List<NotificationDto>> GetMineAsync(bool unreadOnly, CancellationToken ct = default)
    {
        var uid = _currentUser.UserId;
        var role = _currentUser.Role;
        var q = _db.Notifications.Where(n => n.UserId == uid || n.TargetRole == role);
        if (role == UserRole.DepartmentHead) // Bölüm başkanı komisyon bildirimlerini de görür.
            q = _db.Notifications.Where(n => n.UserId == uid || n.TargetRole == role || n.TargetRole == UserRole.CommitteeMember);
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        var list = await q.OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync(ct);
        return list.Select(n => n.ToDto()).ToList();
    }

    /// <summary>Bildirimi okundu olarak işaretler.</summary>
    public async Task MarkReadAsync(Guid id, CancellationToken ct = default)
    {
        var n = await _db.Notifications.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("Bildirim");
        n.IsRead = true;
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Tüm bildirimleri okundu olarak işaretler.</summary>
    public async Task MarkAllReadAsync(CancellationToken ct = default)
    {
        var uid = _currentUser.UserId;
        var role = _currentUser.Role;
        var list = await _db.Notifications.Where(n => (n.UserId == uid || n.TargetRole == role) && !n.IsRead).ToListAsync(ct);
        foreach (var n in list) n.IsRead = true;
        await _db.SaveChangesAsync(ct);
    }
}
