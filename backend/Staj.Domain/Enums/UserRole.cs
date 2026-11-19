namespace Staj.Domain.Enums;

/// <summary>
/// Sistemdeki kullanıcı rollerini tanımlar.
/// Toplantı kararı: Sekreterlik çıkarılmış; Öğrenci, Komisyon, Bölüm Başkanı, Şirket Danışmanı ve KPTO olarak 5 rol belirlenmiştir.
/// </summary>
public enum UserRole
{
    /// <summary>
    /// Staj başvurusu yapan, defter dolduran ve evrak yükleyen öğrenci rolü.
    /// </summary>
    Student = 1,

    /// <summary>
    /// Başvuruları inceleyen, revize/onay veren ve stajı değerlendiren komisyon üyesi rolü.
    /// </summary>
    CommitteeMember = 2,

    /// <summary>
    /// Komisyon yetkilerine ek olarak tüm sistemde tam yetkiye sahip bölüm başkanı rolü.
    /// </summary>
    DepartmentHead = 3,

    /// <summary>
    /// Şirketteki yetkili mühendis/danışman. Öğrencinin staj defterini inceleyip sonuç formunu yükler.
    /// </summary>
    CompanyAdvisor = 4,

    /// <summary>
    /// Üniversite Kariyer Planlama ve Tanıtım / Sigorta birimi yetkilisi. SGK girişini yapar ve takip eder.
    /// </summary>
    KptoOfficer = 5,

    /// <summary>
    /// Sistem yöneticisi.
    /// </summary>
    Admin = 6
}
