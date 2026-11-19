using Staj.Domain.Enums;

namespace Staj.Domain.Entities;

/// <summary>
/// Sisteme yüklenen bir belgenin üst verisini (metadata) temsil eder.
/// Dosyanın kendisi veritabanında DEĞİL, diskte (uploads klasörü) GUID isimle saklanır.
/// </summary>
public class Document
{
    /// <summary>
    /// Benzersiz belge kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Belgenin ait olduğu staj kimliği.
    /// </summary>
    public Guid InternshipId { get; set; }

    /// <summary>
    /// Belgenin ait olduğu staj.
    /// </summary>
    public Internship Internship { get; set; } = null!;

    /// <summary>
    /// Belge türü (Form2, SPAS, Sonuç Formu, Dekont...).
    /// </summary>
    public DocumentType Type { get; set; }

    /// <summary>
    /// Kullanıcının yüklediği dosyanın orijinal adı.
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// Diskte saklanan GUID tabanlı dosya adı (Örn: "3f2a...pdf").
    /// </summary>
    public string StoredFileName { get; set; } = string.Empty;

    /// <summary>
    /// Dosyanın MIME türü.
    /// </summary>
    public string ContentType { get; set; } = "application/pdf";

    /// <summary>
    /// Dosya boyutu (byte).
    /// </summary>
    public long SizeBytes { get; set; }

    /// <summary>
    /// Belgeyi yükleyen kullanıcının kimliği.
    /// </summary>
    public Guid UploadedById { get; set; }

    /// <summary>
    /// Yükleme tarihi.
    /// </summary>
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
