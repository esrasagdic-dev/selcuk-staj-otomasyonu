using Staj.Domain.Enums;

namespace Staj.Domain.Entities;

/// <summary>
/// Bir öğrencinin belirli bir dönemde, belirli bir firmada yaptığı staj başvurusunu ve tüm staj sürecini temsil eder.
/// Başvuru → Komisyon onayı → KPTO sigorta → Sanal defter → Şirket onayı → Komisyon değerlendirmesi → Arşiv akışının merkezidir.
/// </summary>
public class Internship
{
    /// <summary>
    /// Benzersiz staj kimliği.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Stajı yapan öğrencinin kimliği.
    /// </summary>
    public Guid StudentId { get; set; }

    /// <summary>
    /// Stajı yapan öğrenci.
    /// </summary>
    public User Student { get; set; } = null!;

    /// <summary>
    /// Başvurunun yapıldığı staj dönemi kimliği.
    /// </summary>
    public Guid TermId { get; set; }

    /// <summary>
    /// Başvurunun yapıldığı staj dönemi.
    /// </summary>
    public Term Term { get; set; } = null!;

    /// <summary>
    /// Stajın yapılacağı firma kimliği.
    /// </summary>
    public Guid CompanyId { get; set; }

    /// <summary>
    /// Stajın yapılacağı firma.
    /// </summary>
    public Company Company { get; set; } = null!;

    /// <summary>
    /// Şirket yetkilisinin (Advisor) e-posta adresi. Komisyon onayında bu adrese giriş şifresi gönderilir.
    /// </summary>
    public string AdvisorEmail { get; set; } = string.Empty;

    /// <summary>
    /// Şirket yetkilisinin adı soyadı.
    /// </summary>
    public string AdvisorName { get; set; } = string.Empty;

    /// <summary>
    /// Komisyon onayı sonrası oluşturulan şirket yetkilisi kullanıcı hesabının kimliği.
    /// </summary>
    public Guid? AdvisorId { get; set; }

    /// <summary>
    /// Şirket yetkilisi kullanıcı hesabı.
    /// </summary>
    public User? Advisor { get; set; }

    /// <summary>
    /// Staj türü (Staj 1 / Staj 2). Dönemden kopyalanır.
    /// </summary>
    public InternshipType Type { get; set; }

    /// <summary>
    /// Öğrencinin seçtiği iş günü sayısı (20 veya 30).
    /// </summary>
    public int WorkDays { get; set; }

    /// <summary>
    /// Staj başlangıç tarihi.
    /// </summary>
    public DateOnly StartDate { get; set; }

    /// <summary>
    /// Staj bitiş tarihi. Hafta sonları ve resmi tatiller düşülerek otomatik hesaplanır; izin/telafi onaylandıkça ileri kayar.
    /// </summary>
    public DateOnly EndDate { get; set; }

    /// <summary>
    /// Başvuru anında hesaplanan ilk bitiş tarihi (izinlerden önceki).
    /// </summary>
    public DateOnly OriginalEndDate { get; set; }

    /// <summary>
    /// Stajın genel süreç durumu.
    /// </summary>
    public InternshipStatus Status { get; set; } = InternshipStatus.Draft;

    /// <summary>
    /// KPTO ekranındaki sigorta durumu. Komisyon onayından önce null'dır.
    /// </summary>
    public KptoInsuranceStatus? KptoStatus { get; set; }

    /// <summary>
    /// KPTO'nun sigortayı başlatmama gerekçesi.
    /// </summary>
    public string? KptoNote { get; set; }

    /// <summary>
    /// Öğrencinin şirketten stajyer maaşı alıp almadığı. True ise dekont yüklemesi beklenir.
    /// </summary>
    public bool ReceivesSalary { get; set; }

    /// <summary>
    /// Stajyerin cumartesi günleri çalışıp çalışmadığı. True ise cumartesi iş günü hesabına dahil edilir.
    /// </summary>
    public bool WorksOnSaturday { get; set; }

    /// <summary>
    /// Öğrencinin stajda çalışacağı birim / departman.
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// Staj konusu / yapılacak çalışma özeti.
    /// </summary>
    public string? Subject { get; set; }

    /// <summary>
    /// Sorumlu mühendis / şirket yetkilisinin unvanı veya görevi.
    /// </summary>
    public string? AdvisorTitle { get; set; }

    /// <summary>
    /// Sorumlu mühendis / şirket yetkilisinin mezun olduğu fakülte ve bölüm.
    /// </summary>
    public string? AdvisorGraduatedDepartment { get; set; }

    /// <summary>
    /// Komisyon tarafından staj sonunda verilen 3 kademeli akademik değerlendirme sonucu.
    /// </summary>
    public AcademicResultType AcademicResult { get; set; } = AcademicResultType.None;

    /// <summary>
    /// Komisyon tarafından kabul edilen iş günü sayısı.
    /// </summary>
    public int AcceptedDaysCount { get; set; }

    /// <summary>
    /// Sorumlu mühendisin sanal defteri onayladığı IP adresi damgası.
    /// </summary>
    public string? AdvisorApprovedIpAddress { get; set; }

    /// <summary>
    /// Komisyonun revize talebi gerekçesi.
    /// </summary>
    public string? RevisionNote { get; set; }

    /// <summary>
    /// Komisyonun staj sonu değerlendirme notu.
    /// </summary>
    public string? EvaluationNote { get; set; }

    /// <summary>
    /// Başvuruyu inceleyen / onaylayan komisyon üyesinin kimliği.
    /// </summary>
    public Guid? ReviewedById { get; set; }

    /// <summary>
    /// Başvurunun komisyona gönderildiği tarih.
    /// </summary>
    public DateTime? SubmittedAt { get; set; }

    /// <summary>
    /// Komisyonun onay verdiği tarih.
    /// </summary>
    public DateTime? ApprovedAt { get; set; }

    /// <summary>
    /// KPTO'nun sigortayı başlattığı tarih.
    /// </summary>
    public DateTime? InsuranceStartedAt { get; set; }

    /// <summary>
    /// Öğrencinin tamamlanan staj defterini sorumlu mühendise (şirket danışmanına) inceleme için gönderdiği tarih.
    /// </summary>
    public DateTime? LogbookSubmittedToAdvisorAt { get; set; }

    /// <summary>
    /// Sorumlu mühendisin veya danışmanın staj defterini beğenmeyip revize isteyip istemediği.
    /// </summary>
    public bool LogbookRevisionRequested { get; set; }

    /// <summary>
    /// Sorumlu mühendisin veya danışmanın staj defteri için yazdığı revize gerekçesi.
    /// </summary>
    public string? LogbookRevisionNote { get; set; }

    /// <summary>
    /// Şirket danışmanına (sorumlu mühendise) e-postanın gönderildiği tarih.
    /// </summary>
    public DateTime? AdvisorEmailSentAt { get; set; }

    /// <summary>
    /// Şirket danışmanına gönderilen e-postanın takip durumu / özeti.
    /// </summary>
    public string? AdvisorEmailStatus { get; set; }

    /// <summary>
    /// Şirket danışmanının sisteme giriş yaptığı son tarih (e-posta takibi için).
    /// </summary>
    public DateTime? AdvisorLastLoginAt { get; set; }

    /// <summary>
    /// Şirket yetkilisinin "Staj defterini gördüm / inceledim" onayı.
    /// </summary>
    public bool AdvisorLogbookApproved { get; set; }

    /// <summary>
    /// Şirket yetkilisinin defter onay tarihi.
    /// </summary>
    public DateTime? AdvisorApprovedAt { get; set; }

    /// <summary>
    /// Sanal staj defterinin düzenlemeye karşı kilitli olup olmadığı.
    /// </summary>
    public bool IsLogbookLocked { get; set; }

    /// <summary>
    /// Sanal staj defterinin kilitlenme gerekçesi.
    /// </summary>
    public string? LogbookLockReason { get; set; }

    /// <summary>
    /// Staj defteri Sayfa 2 (İşyeri ve Personel Tanıtımı - TF-BM-SF-02a) için öğrencinin girdiği JSON verisi.
    /// </summary>
    public string? CoverPageDataJson { get; set; }

    /// <summary>
    /// Komisyonun Geçti/Kaldı kararını verdiği tarih.
    /// </summary>
    public DateTime? EvaluatedAt { get; set; }

    /// <summary>
    /// "Stajınız bitmek üzere" uyarısının gönderilip gönderilmediği.
    /// </summary>
    public bool EndingSoonNotified { get; set; }

    /// <summary>
    /// Kaydın arşive taşınıp taşınmadığı.
    /// </summary>
    public bool IsArchived { get; set; }

    /// <summary>
    /// Arşiv yılı etiketi (Örn: "2026").
    /// </summary>
    public string? ArchiveYear { get; set; }

    /// <summary>
    /// Sistemden üretilen PDF formlardaki QR kod ile belge doğrulamada kullanılan benzersiz kod.
    /// </summary>
    public Guid VerificationCode { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Kaydın oluşturulma tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Kaydın son güncellenme tarihi.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Staja ait yüklenen belgeler (Form 2, SPAS, Sonuç Formu, Dekont...).
    /// </summary>
    public ICollection<Document> Documents { get; set; } = new List<Document>();

    /// <summary>
    /// Sanal staj defteri sayfaları.
    /// </summary>
    public ICollection<LogbookEntry> LogbookEntries { get; set; } = new List<LogbookEntry>();

    /// <summary>
    /// İzin / telafi talepleri.
    /// </summary>
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
}
