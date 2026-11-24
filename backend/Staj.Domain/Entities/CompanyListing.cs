namespace Staj.Domain.Entities;

/// <summary>
/// Komisyon tarafından sisteme girilen "Stajyer arayan firma" ilanlarını temsil eder. Öğrenciler bu ilanları görür.
/// </summary>
public class CompanyListing
{
    /// <summary>
    /// Benzersiz ilan kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// İlanı veren firmanın kimliği (firma havuzunda kayıtlıysa).
    /// </summary>
    public Guid? CompanyId { get; set; }

    /// <summary>
    /// İlanı veren firma.
    /// </summary>
    public Company? Company { get; set; }

    /// <summary>
    /// Firma adı (havuzda olmayan firmalar için serbest metin).
    /// </summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>
    /// İlan başlığı (Örn: "Yazılım Stajyeri - Staj 2").
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// İlan açıklaması / aranan nitelikler.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Başvuru için iletişim bilgisi (e-posta / telefon).
    /// </summary>
    public string? Contact { get; set; }

    /// <summary>
    /// Firmanın bulunduğu şehir.
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// İlanın son başvuru tarihi.
    /// </summary>
    public DateOnly? Deadline { get; set; }

    /// <summary>
    /// Firmanın ayırdığı stajyer kontenjanı.
    /// </summary>
    public int? Quota { get; set; }

    /// <summary>
    /// İlanın ilgili olduğu sektör.
    /// </summary>
    public string? Sector { get; set; }

    /// <summary>
    /// İlanın ilgili olduğu çalışma bölümü / departman.
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// İlanın yayında olup olmadığı.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// İlanı giren komisyon üyesinin kimliği.
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// İlanın oluşturulma tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
