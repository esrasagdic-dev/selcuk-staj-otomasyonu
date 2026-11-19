using Staj.Domain.Enums;

namespace Staj.Domain.Entities;

/// <summary>
/// Sistem içi bildirimi temsil eder. Belirli bir kullanıcıya (UserId) veya bir role (TargetRole, örn. tüm KPTO memurları) gönderilebilir.
/// </summary>
public class Notification
{
    /// <summary>
    /// Benzersiz bildirim kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Bildirimin gönderildiği kullanıcı (kişiye özel bildirimlerde).
    /// </summary>
    public Guid? UserId { get; set; }

    /// <summary>
    /// Bildirimin gönderildiği rol (role yönelik bildirimlerde, örn. KptoOfficer).
    /// </summary>
    public UserRole? TargetRole { get; set; }

    /// <summary>
    /// İlgili staj kaydı (varsa).
    /// </summary>
    public Guid? InternshipId { get; set; }

    /// <summary>
    /// Bildirim kategorisi.
    /// </summary>
    public NotificationType Type { get; set; } = NotificationType.Info;

    /// <summary>
    /// Bildirim başlığı.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Bildirim metni.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Okundu bilgisi.
    /// </summary>
    public bool IsRead { get; set; }

    /// <summary>
    /// Oluşturulma tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
