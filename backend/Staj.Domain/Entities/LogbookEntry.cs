namespace Staj.Domain.Entities;

/// <summary>
/// Sanal Staj Defterinin bir sayfasını (bir iş gününe ait çalışma kaydını) temsil eder.
/// </summary>
public class LogbookEntry
{
    /// <summary>
    /// Benzersiz sayfa kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Sayfanın ait olduğu staj kimliği.
    /// </summary>
    public Guid InternshipId { get; set; }

    /// <summary>
    /// Sayfanın ait olduğu staj.
    /// </summary>
    public Internship Internship { get; set; } = null!;

    /// <summary>
    /// Stajın kaçıncı iş günü olduğu (1, 2, 3...).
    /// </summary>
    public int DayNumber { get; set; }

    /// <summary>
    /// Çalışmanın yapıldığı tarih.
    /// </summary>
    public DateOnly Date { get; set; }

    /// <summary>
    /// Günün kısa başlığı (Örn: "Veritabanı tasarımı").
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// O gün yapılan işlerin detaylı açıklaması.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Sayfanın henüz taslak olarak kaydedilip edilmediği. Taslak sayfalar tamamlanmadan defter mühendise gönderilemez.
    /// </summary>
    public bool IsDraft { get; set; }

    /// <summary>
    /// Bu iş günü sayfasına eklenmiş görselin diskteki GUID dosya adı.
    /// </summary>
    public string? ImageStoredFileName { get; set; }

    /// <summary>
    /// Bu iş günü sayfasına eklenmiş görselin orijinal dosya adı.
    /// </summary>
    public string? ImageOriginalFileName { get; set; }

    /// <summary>
    /// Eklenen görselin MIME türü.
    /// </summary>
    public string? ImageContentType { get; set; }

    /// <summary>
    /// Görsel altı teknik açıklama metni.
    /// </summary>
    public string? ImageCaption { get; set; }

    /// <summary>
    /// Oluşturulma tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Son güncellenme tarihi.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
