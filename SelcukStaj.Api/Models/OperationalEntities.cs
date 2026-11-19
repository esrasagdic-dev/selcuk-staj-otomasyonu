namespace SelcukStaj.Api.Models;

public class AttendanceAbsence
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public DateTime AbsenceDate { get; set; }
    public string Reason { get; set; } = string.Empty; // Sağlık raporu, vefat, vb.
    public string? ReportDocumentPath { get; set; } // Sağlık raporu belgesi
    public bool IsApprovedByCommission { get; set; } = false;
    public int? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CalculatedMakeUpDate { get; set; } // Bu devamsızlık nedeniyle eklenen telafi iş günü tarihi
}

public enum DeliveryMethod
{
    HandDelivery = 1,  // Elden teslim
    CourierCargo = 2   // Kargo ile gönderim
}

public class PhysicalDelivery
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public DeliveryMethod Method { get; set; } = DeliveryMethod.HandDelivery;
    public string? CargoCompany { get; set; } // Örn: Yurtiçi Kargo, Aras Kargo
    public string? TrackingNumber { get; set; } // Kargo Takip Numarası
    public DateTime? ShippedDate { get; set; } // Kargoya veriliş tarihi

    // Üniversite teslim alma bilgisi
    public bool IsReceivedByUniversity { get; set; } = false;
    public DateTime? ReceivedDate { get; set; } // Üniversiteye varış / teslim alış tarihi
    public int? ReceivedByUserId { get; set; }
    public bool IsEnvelopeSealIntact { get; set; } = true; // Kapalı ve mühürlü zarf şartı sağlam mı?
    public string? MissingItemsNote { get; set; }
}

public enum InsuranceStatus
{
    Pending = 1,     // Komisyon onayladı, sigorta bekliyor
    Started = 2,     // SGK girişi yapıldı, sigorta başlatıldı
    NotStarted = 3,  // Başlatılmadı / Beklemede
    Cancelled = 4    // Staj iptali nedeniyle sigorta çıkışı yapıldı
}

public class InsuranceRecord
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public InsuranceStatus Status { get; set; } = InsuranceStatus.Pending;
    public DateTime? SgkEntryDate { get; set; }
    public DateTime? SgkExitDate { get; set; }
    public string? SgkDocumentRegistrationNo { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public int? ProcessedByUserId { get; set; }
    public string? Notes { get; set; }
}

public class SalaryReceipt
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public string MonthAndYear { get; set; } = string.Empty; // Örn: "Temmuz 2026"
    public decimal? Amount { get; set; }
    public string DocumentPath { get; set; } = string.Empty; // Dekont PDF yolu
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public bool SentToKPTO { get; set; } = true;
}

public class PublicHoliday
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Year { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // Örn: "ApproveApplication", "UpdateDate", "AdvisorApprove"
    public string EntityName { get; set; } = string.Empty; // Örn: "InternshipApplication"
    public int EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class CompanyJobPosting
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Department { get; set; } = "Bilgisayar Mühendisliği"; // Bilgisayar, Makine, Elektrik-Elektronik, Genel
    public string Title { get; set; } = string.Empty;
    public string Sector { get; set; } = "Yazılım / Bilişim";
    public string City { get; set; } = "Konya";
    public int Quota { get; set; } = 3;
    public string Requirements { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public DateTime ApplicationDeadline { get; set; } = DateTime.UtcNow.AddMonths(1);
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum ExtensionStatus
{
    PendingCommission = 1,
    ApprovedByCommission = 2,
    RejectedByCommission = 3,
    SgkProcessedByKPTO = 4
}

public class InternshipExtensionRequest
{
    public int Id { get; set; }
    public int InternshipApplicationId { get; set; }
    public InternshipApplication? InternshipApplication { get; set; }

    public int RequestedExtraDays { get; set; } = 5;
    public string? MissedDates { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime OriginalEndDate { get; set; }
    public DateTime NewCalculatedEndDate { get; set; }

    public ExtensionStatus Status { get; set; } = ExtensionStatus.PendingCommission;
    public string? CommissionNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CommissionApprovedAt { get; set; }
    public DateTime? KptoProcessedAt { get; set; }
    public string? KptoNotes { get; set; }
}
