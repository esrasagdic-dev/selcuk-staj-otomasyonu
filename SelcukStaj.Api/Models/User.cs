namespace SelcukStaj.Api.Models;

public enum UserRole
{
    Student = 1,
    CommissionMember = 2,
    DepartmentHead = 3,
    KPTOOfficer = 4
}

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string Department { get; set; } = "Bilgisayar Mühendisliği"; // Bölüm bazlı komisyon ve bölüm başkanı ayrımı
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public StudentProfile? StudentProfile { get; set; }
    public ICollection<InternshipApplication> Applications { get; set; } = new List<InternshipApplication>();
}

public class StudentProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }

    public string StudentNumber { get; set; } = string.Empty;
    public string NationalId { get; set; } = string.Empty; // TC Kimlik No
    public string Faculty { get; set; } = "Teknoloji Fakültesi";
    public string Department { get; set; } = "Bilgisayar Mühendisliği";
    public int ClassLevel { get; set; } = 3; // 2, 3, 4. sınıf
    public string Address { get; set; } = string.Empty;
    public bool HasAcceptedGuide { get; set; } = false; // Kılavuz karşılama onayı
    public DateTime? GuideAcceptedAt { get; set; }
}
