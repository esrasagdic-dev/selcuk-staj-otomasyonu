namespace Staj.Domain.Entities;

/// <summary>
/// Staj yapılan / yapılabilecek firmaları temsil eder (Firma havuzu).
/// Öğrenci başvuruda listeden seçer ya da yeni firma ekler. Komisyon istatistikleri bu tablo üzerinden üretilir.
/// </summary>
public class Company
{
    /// <summary>
    /// Benzersiz firma kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Firma ticari unvanı.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Firmanın faaliyet alanı / sektörü.
    /// </summary>
    public string? Sector { get; set; }

    /// <summary>
    /// Firmanın bulunduğu şehir.
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// Firma açık adresi.
    /// </summary>
    public string? Address { get; set; }

    /// <summary>
    /// Firma telefon numarası.
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Firma genel e-posta adresi.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Firmanın kaydı oluşturan kullanıcı tarafından eklenip eklenmediği / komisyonca doğrulanıp doğrulanmadığı.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Kayıt tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Bu firmada yapılan stajlar.
    /// </summary>
    public ICollection<Internship> Internships { get; set; } = new List<Internship>();

    /// <summary>
    /// Bu firmaya ait stajyer ilanları.
    /// </summary>
    public ICollection<CompanyListing> Listings { get; set; } = new List<CompanyListing>();
}
