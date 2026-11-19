using Staj.Domain.Enums;

namespace Staj.Domain.Entities;

/// <summary>
/// Sistemde oturum açabilen tüm kullanıcıları (Öğrenci, Komisyon, Bölüm Başkanı, Şirket Danışmanı, KPTO) temsil eder.
/// </summary>
public class User
{
    /// <summary>
    /// Benzersiz kullanıcı kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Kullanıcı e-posta adresi (Giriş için kullanılır, benzersizdir).
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// BCrypt ile hash'lenmiş güvenli parola özeti.
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Kullanıcının adı ve soyadı.
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Öğrenciler için öğrenci numarası. (Personel/Şirket için boş olabilir).
    /// </summary>
    public string? StudentNo { get; set; }

    /// <summary>
    /// T.C. Kimlik Numarası. KPTO'nun SGK işe giriş bildirgesi (Excel dökümü) için gereklidir.
    /// </summary>
    public string? NationalId { get; set; }

    /// <summary>
    /// Öğrencinin bölümü / programı.
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// Kullanıcı iletişim telefon numarası.
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Kullanıcının sistemdeki rolü (Student, CommitteeMember, DepartmentHead, CompanyAdvisor, KptoOfficer).
    /// </summary>
    public UserRole Role { get; set; }

    /// <summary>
    /// Kullanıcı hesabının aktiflik durumu.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Öğrencinin ilk girişte gösterilen Staj Kılavuzu'nu "Okudum, Anladım" diyerek onaylayıp onaylamadığı.
    /// </summary>
    public bool HasAcceptedGuide { get; set; }

    /// <summary>
    /// Kullanıcının bir sonraki girişte şifresini değiştirmesi gerekip gerekmediği (Şirket yetkilisine mail ile giden geçici şifre için).
    /// </summary>
    public bool MustChangePassword { get; set; }

    /// <summary>
    /// Şirket yetkilileri için bağlı olduğu firma kimliği.
    /// </summary>
    public Guid? CompanyId { get; set; }

    /// <summary>
    /// Şirket yetkilileri için bağlı olduğu firma.
    /// </summary>
    public Company? Company { get; set; }

    /// <summary>
    /// Hesabın oluşturulma tarihi (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Öğrencinin yaptığı staj başvuruları ilişkisi.
    /// </summary>
    public ICollection<Internship> Internships { get; set; } = new List<Internship>();
}
