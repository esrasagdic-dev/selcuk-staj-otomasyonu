namespace Staj.Domain.Entities;

/// <summary>
/// Tekrar yüklenen belgelerin önceki dosya sürümlerini (versiyon geçmişini) saklar.
/// </summary>
public class DocumentVersion
{
    /// <summary>
    /// Benzersiz sürüm kaydı kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Bağlı olduğu ana belge kimliği.
    /// </summary>
    public Guid DocumentId { get; set; }

    /// <summary>
    /// Bağlı olduğu ana belge.
    /// </summary>
    public Document Document { get; set; } = null!;

    /// <summary>
    /// Sürüm numarası (1, 2, 3...).
    /// </summary>
    public int VersionNumber { get; set; }

    /// <summary>
    /// Yüklenen dosyanın orijinal adı.
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// Diskte saklanan GUID tabanlı dosya adı.
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
    /// Bu sürümü yükleyen kullanıcının kimliği.
    /// </summary>
    public Guid UploadedById { get; set; }

    /// <summary>
    /// Sürümün yüklenme tarihi.
    /// </summary>
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
