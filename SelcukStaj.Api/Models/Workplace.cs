namespace SelcukStaj.Api.Models;

public class Workplace
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TaxNumber { get; set; } = string.Empty;
    public string City { get; set; } = "Konya";
    public string Address { get; set; } = string.Empty;
    public string WebSite { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string CompanyEmail { get; set; } = string.Empty;
    public string Sector { get; set; } = "Yazılım / Bilişim"; // Faaliyet Alanı
    public bool IsApproved { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InternshipApplication> Applications { get; set; } = new List<InternshipApplication>();
}

public class WorkplaceAdvisor
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public string FullName { get; set; } = string.Empty; // Sorumlu Mühendis Adı Soyadı
    public string Email { get; set; } = string.Empty; // Güvenli giriş tokeni buraya gönderilecek
    public string PhoneNumber { get; set; } = string.Empty;
    public string GraduatedUniversityAndDepartment { get; set; } = string.Empty; // Mezun olduğu fakülte/bölüm (Mühendislik şartı)
    public string TitleOrPosition { get; set; } = string.Empty; // Görevi / Unvanı

    // Güvenli Tekil Erişim Tokeni
    public string AccessToken { get; set; } = Guid.NewGuid().ToString("N");
    public DateTime? TokenExpiresAt { get; set; }
    public bool HasApprovedDiary { get; set; } = false;
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovedIpAddress { get; set; }
}
