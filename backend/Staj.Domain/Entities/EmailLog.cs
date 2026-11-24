namespace Staj.Domain.Entities;

/// <summary>
/// Sistem tarafından gönderilen e-postaların alıcı, konu, HTML gövdesi ve gönderim durumu kayıtları.
/// </summary>
public class EmailLog
{
    /// <summary>
    /// Benzersiz e-posta log kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// İlgili staj başvurusunun kimliği (varsa).
    /// </summary>
    public Guid? InternshipId { get; set; }

    /// <summary>
    /// Alıcı e-posta adresi.
    /// </summary>
    public string ToEmail { get; set; } = string.Empty;

    /// <summary>
    /// E-posta konusu.
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// Gönderilen HTML e-posta içeriği.
    /// </summary>
    public string HtmlBody { get; set; } = string.Empty;

    /// <summary>
    /// Gönderimin başarıyla tamamlanıp tamamlanmadığı.
    /// </summary>
    public bool IsSuccess { get; set; } = true;

    /// <summary>
    /// SMTP veya ağ hatası durumunda hata açıklaması.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Gönderim zamanı (UTC).
    /// </summary>
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
