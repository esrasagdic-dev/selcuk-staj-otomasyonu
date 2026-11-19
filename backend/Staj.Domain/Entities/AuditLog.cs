namespace Staj.Domain.Entities;

/// <summary>
/// Sistemde yapılan kritik işlemlerin (onay, revize, sigorta başlatma, değerlendirme vb.) denetim kaydını tutar.
/// </summary>
public class AuditLog
{
    /// <summary>
    /// Benzersiz log kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// İşlemi yapan kullanıcı kimliği (sistem işlemlerinde null).
    /// </summary>
    public Guid? UserId { get; set; }

    /// <summary>
    /// İşlem adı (Örn: "Internship.Approve").
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// İşlem yapılan varlık türü (Örn: "Internship").
    /// </summary>
    public string EntityName { get; set; } = string.Empty;

    /// <summary>
    /// İşlem yapılan varlığın kimliği.
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// Ek açıklama / detay.
    /// </summary>
    public string? Details { get; set; }

    /// <summary>
    /// İşlem tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
