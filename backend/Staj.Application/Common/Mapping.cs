using Staj.Application.DTOs;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Common;

/// <summary>
/// Entity → DTO dönüşümleri.
/// </summary>
public static class Mapping
{
    /// <summary>Kullanıcıyı DTO'ya çevirir.</summary>
    public static UserDto ToDto(this User u) => new(
        u.Id, u.Email, u.FullName, u.Role, u.StudentNo, u.NationalId, u.Phone, u.Department,
        u.HasAcceptedGuide, u.MustChangePassword, u.IsActive);

    /// <summary>Firmayı DTO'ya çevirir.</summary>
    public static CompanyDto ToDto(this Company c) => new(c.Id, c.Name, c.Sector, c.City, c.Address, c.Phone, c.Email, c.IsVerified);

    /// <summary>İlanı DTO'ya çevirir.</summary>
    public static ListingDto ToDto(this CompanyListing l) =>
        new(l.Id, l.CompanyId, l.CompanyName, l.Title, l.Description, l.Contact, l.City, l.Deadline, l.IsActive, l.CreatedAt);

    /// <summary>Duyuruyu DTO'ya çevirir.</summary>
    public static AnnouncementDto ToDto(this Announcement a) =>
        new(a.Id, a.Title, a.Content, a.Category, a.IsPinned, a.IsActive, a.CreatedAt);

    /// <summary>Belgeyi DTO'ya çevirir.</summary>
    public static DocumentDto ToDto(this Document d) => new(d.Id, d.Type, d.OriginalFileName, d.SizeBytes, d.UploadedAt);

    /// <summary>Defter sayfasını DTO'ya çevirir.</summary>
    public static LogbookEntryDto ToDto(this LogbookEntry e) => new(e.Id, e.DayNumber, e.Date, e.Title, e.Content, e.UpdatedAt);

    /// <summary>Bildirimi DTO'ya çevirir.</summary>
    public static NotificationDto ToDto(this Notification n) => new(n.Id, n.Type, n.Title, n.Message, n.IsRead, n.CreatedAt, n.InternshipId);

    /// <summary>İzin talebini DTO'ya çevirir (Internship.Student ve Internship.Company yüklü olmalıdır).</summary>
    public static LeaveRequestDto ToDto(this LeaveRequest r) => new(
        r.Id, r.InternshipId, r.Internship?.Student?.FullName ?? "", r.Internship?.Company?.Name ?? "",
        r.Type, r.StartDate, r.Days, r.Reason, r.Status, r.ReviewNote, r.OldEndDate, r.NewEndDate, r.CreatedAt);

    /// <summary>Stajı liste satırına çevirir (Student, Term, Company, LeaveRequests, Documents yüklü olmalıdır).</summary>
    public static InternshipSummaryDto ToSummary(this Internship i)
    {
        var form2 = i.Documents.FirstOrDefault(d => d.Type == DocumentType.Form2);
        var spas = i.Documents.FirstOrDefault(d => d.Type == DocumentType.Spas);
        var form7 = i.Documents.FirstOrDefault(d => d.Type == DocumentType.Form7);
        return new(
            i.Id, i.StudentId, i.Student.FullName, i.Student.StudentNo, i.Term.Name, i.Type, i.Company.Name,
            i.StartDate, i.EndDate, i.WorkDays, i.Status, i.KptoStatus, i.ReceivesSalary, i.SubmittedAt,
            i.AdvisorLogbookApproved, i.IsArchived, i.ArchiveYear ?? i.StartDate.Year.ToString(),
            i.LeaveRequests.Count(l => l.Status == LeaveRequestStatus.Pending),
            form2?.Id, form2?.OriginalFileName,
            spas?.Id, spas?.OriginalFileName,
            form7?.Id, form7?.OriginalFileName,
            i.WorksOnSaturday, i.LogbookSubmittedToAdvisorAt, i.LogbookRevisionRequested,
            i.AcademicResult, i.AcceptedDaysCount, i.Subject);
    }

    /// <summary>Stajı detay DTO'suna çevirir (tüm ilişkiler yüklü olmalıdır).</summary>
    public static InternshipDetailDto ToDetail(this Internship i, int? currentDay) => new(
        i.Id,
        i.StudentId, i.Student.FullName, i.Student.Email, i.Student.StudentNo, i.Student.Phone, i.Student.NationalId,
        i.TermId, i.Term.Name, i.Type,
        i.CompanyId, i.Company.Name, i.Company.City, i.Company.Address,
        i.AdvisorName, i.AdvisorEmail, i.Department,
        i.WorkDays, i.StartDate, i.EndDate, i.OriginalEndDate,
        i.Status, i.KptoStatus, i.KptoNote, i.ReceivesSalary,
        i.RevisionNote, i.EvaluationNote,
        i.SubmittedAt, i.ApprovedAt, i.InsuranceStartedAt,
        i.AdvisorLogbookApproved, i.AdvisorApprovedAt, i.EvaluatedAt,
        i.IsArchived, i.ArchiveYear ?? i.StartDate.Year.ToString(), i.VerificationCode,
        currentDay, i.LogbookEntries.Count,
        i.Documents.OrderByDescending(d => d.UploadedAt).Select(d => d.ToDto()).ToList(),
        i.LeaveRequests.OrderByDescending(l => l.CreatedAt).Select(l => l.ToDto()).ToList(),
        i.WorksOnSaturday,
        i.LogbookSubmittedToAdvisorAt,
        i.LogbookRevisionRequested,
        i.LogbookRevisionNote,
        i.AdvisorEmailSentAt,
        i.AdvisorEmailStatus,
        i.AdvisorLastLoginAt,
        i.EndingSoonNotified,
        i.Subject,
        i.AdvisorTitle,
        i.AdvisorGraduatedDepartment,
        i.AcademicResult,
        i.AcceptedDaysCount,
        i.AdvisorApprovedIpAddress);

    /// <summary>Durumu Türkçe metne çevirir (e-posta ve bildirim metinleri için).</summary>
    public static string ToTurkish(this InternshipStatus s) => s switch
    {
        InternshipStatus.Draft => "Taslak",
        InternshipStatus.Submitted => "Komisyon İncelemesinde",
        InternshipStatus.RevisionRequested => "Revize İstendi",
        InternshipStatus.ApprovedByCommittee => "Komisyon Onayladı",
        InternshipStatus.InsuranceStarted => "Sigorta Başlatıldı",
        InternshipStatus.InProgress => "Staj Devam Ediyor",
        InternshipStatus.CompletedPendingReview => "Değerlendirme Bekleniyor",
        InternshipStatus.Passed => "Geçti",
        InternshipStatus.Failed => "Kaldı",
        InternshipStatus.Cancelled => "İptal",
        InternshipStatus.CancellationRequested => "İptal Talebi Bekliyor (Form 7)",
        InternshipStatus.Rejected => "Reddedildi",
        _ => s.ToString()
    };

    /// <summary>Akademik değerlendirme sonucunu Türkçe metne çevirir.</summary>
    public static string ToTurkish(this AcademicResultType r) => r switch
    {
        AcademicResultType.Successful => "Başarılı (Tam Kabul)",
        AcademicResultType.PartiallySuccessful => "Kısmen Başarılı",
        AcademicResultType.Unsuccessful => "Başarısız (Kaldı)",
        _ => "Değerlendirilmedi"
    };

    /// <summary>Staj türünü Türkçe metne çevirir.</summary>
    public static string ToTurkish(this InternshipType t) => t == InternshipType.Staj1 ? "Staj 1" : "Staj 2";
}
