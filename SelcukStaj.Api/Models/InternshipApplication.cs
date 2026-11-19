namespace SelcukStaj.Api.Models;

public enum ApplicationStatus
{
    Draft = 1,
    Submitted = 2,
    RevisionRequired = 3,
    ApprovedByCommission = 4,
    InsuranceStarted = 5,
    InProgress = 6,
    AwaitingAdvisorApproval = 7,
    AdvisorApproved = 8,
    Completed = 9,
    Rejected = 10,
    Cancelled = 11
}

public enum CommissionDecisionType
{
    None = 0,
    Approved = 1, // Onaylandı
    Rejected = 2  // Reddedildi
}

public enum AcademicResultType
{
    None = 0,
    Successful = 1,          // Başarılı
    PartiallySuccessful = 2, // Kısmen Başarılı
    Unsuccessful = 3        // Başarısız
}

public class InternshipApplication
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public User? Student { get; set; }

    public int PeriodId { get; set; }
    public InternshipPeriod? Period { get; set; }

    public int WorkplaceId { get; set; }
    public Workplace? Workplace { get; set; }

    public InternshipType Type { get; set; } = InternshipType.Staj1;
    public string Subject { get; set; } = string.Empty; // Stajın Konusu / Birimi (Örn: Web Geliştirme, Veri Analizi)
    public int RequiredWorkDays { get; set; } = 20; // 20 veya 30 gün bağımsız seçim
    public bool IncludesSaturday { get; set; } = false; // İşyeri cumartesi çalışıyor mu?

    // Tarihler
    public DateTime StartDate { get; set; }
    public DateTime CalculatedEndDate { get; set; }
    public DateTime CurrentEndDate { get; set; } // İzin ve devamsızlıklarla ötelenen güncel bitiş tarihi

    // Durum ve Kararlar
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Draft;
    
    // v2.1: Komisyon İşlem Kararı (Onaylandı / Reddedildi)
    public CommissionDecisionType CommissionDecision { get; set; } = CommissionDecisionType.None;
    public string? CommissionRejectReason { get; set; }
    public DateTime? CommissionDecisionDate { get; set; }
    public int? EvaluatedByUserId { get; set; }

    // v2.1: Nihai Akademik Başarı Sonucu (Başarılı / Kısmen Başarılı / Başarısız)
    public AcademicResultType AcademicResult { get; set; } = AcademicResultType.None;
    public int AcceptedDaysCount { get; set; } = 0; // Kabul edilen iş günü
    public string? AcademicNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Staj Süresi Uzatma Modülü (Öğrenci talebi -> Komisyon Onayı -> KPTO SGK Bildirimi)
    public bool HasExtensionRequest { get; set; } = false;
    public int ExtensionExtraDays { get; set; } = 0;
    public string? ExtensionReason { get; set; }
    public string? ExtensionMissedDates { get; set; }
    public DateTime? ExtensionRequestedAt { get; set; }
    public bool IsExtensionApprovedByCommission { get; set; } = false;
    public DateTime? ExtensionCommissionApprovedAt { get; set; }
    public bool IsExtensionSgkProcessedByKPTO { get; set; } = false;
    public DateTime? ExtensionSgkProcessedAt { get; set; }

    // Staj İptal Formu (Form 7) Modülü (Öğrenci yükler -> Komisyon onaylar -> KPTO SGK çıkışı)
    public bool HasCancelRequest { get; set; } = false;
    public string? CancelReason { get; set; }
    public string? CancelFormDocumentPath { get; set; }
    public DateTime? CancelRequestedAt { get; set; }
    public bool IsCancelApprovedByCommission { get; set; } = false;
    public DateTime? CancelCommissionApprovedAt { get; set; }
    public string? CancelCommissionNotes { get; set; }

    // Staj Başvurusuna Dekont Ekleme Modülü (KPTO Masasına iletilir)
    public string? ReceiptDocumentPath { get; set; }
    public DateTime? ReceiptUploadedAt { get; set; }
    public bool IsReceiptVerifiedByKPTO { get; set; } = false;

    // İlişkiler
    public WorkplaceAdvisor? Advisor { get; set; }
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public InternshipDiary? Diary { get; set; }
    public ICollection<AttendanceAbsence> Absences { get; set; } = new List<AttendanceAbsence>();
    public PhysicalDelivery? PhysicalDelivery { get; set; }
    public InsuranceRecord? InsuranceRecord { get; set; }
    public ICollection<SalaryReceipt> SalaryReceipts { get; set; } = new List<SalaryReceipt>();
}
