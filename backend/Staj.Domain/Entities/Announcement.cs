namespace Staj.Domain.Entities;

/// <summary>
/// Komisyon tarafından yayınlanan genel duyurular, staj başlama takvimi duyuruları ve önemli bilgilendirmeler.
/// </summary>
public class Announcement
{
    /// <summary>Benzersiz duyuru kimliği.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Duyuru başlığı.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Duyuru içeriği / detay metni.</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>Duyuru kategorisi (General, Calendar, CompanyListing, Warning).</summary>
    public string Category { get; set; } = "General";

    /// <summary>Sabitlenmiş / öne çıkarılmış duyuru mu?</summary>
    public bool IsPinned { get; set; }

    /// <summary>Duyuru yayında mı?</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Duyuruyu oluşturan yetkili kimliği.</summary>
    public Guid? CreatedById { get; set; }

    /// <summary>Oluşturulma tarihi.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
