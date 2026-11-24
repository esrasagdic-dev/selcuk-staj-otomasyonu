using Staj.Domain.Enums;

namespace Staj.Application.DTOs;

// ============================================================
//  KİMLİK DOĞRULAMA
// ============================================================

/// <summary>Giriş isteği.</summary>
public record LoginRequest(string Email, string Password);

/// <summary>Öğrenci kayıt isteği (yalnızca okul e-posta alan adı ile).</summary>
public record RegisterStudentRequest(
    string Email, string Password, string FullName, string StudentNo,
    string? NationalId, string? Phone, string? Department);

/// <summary>Başarılı giriş yanıtı.</summary>
public record AuthResponse(string Token, UserDto User);

/// <summary>Kullanıcı bilgisi.</summary>
public record UserDto(
    Guid Id, string Email, string FullName, UserRole Role, string? StudentNo,
    string? NationalId, string? Phone, string? Department,
    bool HasAcceptedGuide, bool MustChangePassword, bool IsActive);

/// <summary>Parola değiştirme isteği.</summary>
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

/// <summary>Profil güncelleme isteği.</summary>
public record UpdateProfileRequest(string FullName, string? NationalId, string? Phone, string? Department);

/// <summary>Bölüm Başkanı / Admin tarafından personel (Komisyon, KPTO) oluşturma isteği.</summary>
public record CreateStaffRequest(string Email, string FullName, UserRole Role, string Password, string? Phone);

// ============================================================
//  DÖNEM / TATİL
// ============================================================

/// <summary>Staj dönemi.</summary>
public record TermDto(
    Guid Id, string Name, string AcademicYear, InternshipType InternshipType,
    DateOnly EarliestStartDate, DateOnly LatestEndDate, DateOnly ApplicationDeadline, DateOnly ReportDeadline,
    int MinWorkDays, int MaxWorkDays, bool IsActive, int ApplicationCount,
    DateOnly? ApplicationStartDate = null, bool IsSaturdayAllowed = true);

/// <summary>Staj dönemi oluşturma / güncelleme isteği.</summary>
public record TermUpsertRequest(
    string Name, string AcademicYear, InternshipType InternshipType,
    DateOnly EarliestStartDate, DateOnly LatestEndDate, DateOnly ApplicationDeadline, DateOnly ReportDeadline,
    int MinWorkDays, int MaxWorkDays, bool IsActive,
    DateOnly? ApplicationStartDate = null, bool IsSaturdayAllowed = true);

/// <summary>Resmi tatil.</summary>
public record HolidayDto(Guid Id, DateOnly Date, string Name);

/// <summary>Resmi tatil ekleme isteği.</summary>
public record HolidayCreateRequest(DateOnly Date, string Name);

// ============================================================
//  FİRMA / İLAN
// ============================================================

/// <summary>Firma.</summary>
public record CompanyDto(Guid Id, string Name, string? Sector, string? City, string? Address, string? Phone, string? Email, bool IsVerified);

/// <summary>Yeni firma ekleme isteği.</summary>
public record CompanyCreateRequest(string Name, string? Sector, string? City, string? Address, string? Phone, string? Email);

/// <summary>Firma istatistiği (Hangi firmada kaç öğrenci staj yaptı?).</summary>
public record CompanyStatDto(Guid Id, string Name, string? City, string? Sector, bool IsVerified, int TotalInternships, int PassedCount, int ActiveCount);

/// <summary>Stajyer arayan firma ilanı.</summary>
public record ListingDto(Guid Id, Guid? CompanyId, string CompanyName, string Title, string Description, string? Contact, string? City, DateOnly? Deadline, bool IsActive, DateTime CreatedAt);

/// <summary>İlan oluşturma / güncelleme isteği.</summary>
public record ListingUpsertRequest(Guid? CompanyId, string CompanyName, string Title, string Description, string? Contact, string? City, DateOnly? Deadline, bool IsActive);

/// <summary>Komisyon duyurusu.</summary>
public record AnnouncementDto(Guid Id, string Title, string Content, string Category, bool IsPinned, bool IsActive, DateTime CreatedAt);

/// <summary>Komisyon duyurusu oluşturma / güncelleme isteği.</summary>
public record AnnouncementUpsertRequest(string Title, string Content, string Category = "General", bool IsPinned = false, bool IsActive = true);

// ============================================================
//  STAJ
// ============================================================

/// <summary>Bitiş tarihi hesaplama isteği.</summary>
public record CalculateEndDateRequest(DateOnly StartDate, int WorkDays, bool WorksOnSaturday = false);

/// <summary>Gün-gün iş günü ve tatil döküm satırı.</summary>
public record WorkDayBreakdownItemDto(DateOnly Date, string DayName, bool IsWorkDay, int? WorkDayNumber, string Reason);

/// <summary>Bitiş tarihi hesaplama sonucu (atlanan tatillerle birlikte).</summary>
public record EndDateResponse(
    DateOnly StartDate, DateOnly EndDate, int WorkDays, int CalendarDays, List<HolidayDto> SkippedHolidays,
    List<WorkDayBreakdownItemDto>? Breakdown = null, int SkippedSaturdays = 0, int SkippedSundays = 0);

/// <summary>Staj başvurusu oluşturma / güncelleme isteği.</summary>
public record InternshipUpsertRequest(
    Guid TermId, Guid? CompanyId, CompanyCreateRequest? NewCompany,
    string AdvisorName, string AdvisorEmail, int WorkDays, DateOnly StartDate,
    string? Department, bool ReceivesSalary, bool WorksOnSaturday = false,
    string? Subject = null, string? AdvisorTitle = null, string? AdvisorGraduatedDepartment = null);

/// <summary>Staj listesi satırı.</summary>
public record InternshipSummaryDto(
    Guid Id, Guid StudentId, string StudentName, string? StudentNo, string TermName, InternshipType Type,
    string CompanyName, DateOnly StartDate, DateOnly EndDate, int WorkDays,
    InternshipStatus Status, KptoInsuranceStatus? KptoStatus, bool ReceivesSalary,
    DateTime? SubmittedAt, bool AdvisorLogbookApproved, bool IsArchived, string? ArchiveYear, int PendingLeaveCount,
    Guid? Form2DocumentId = null, string? Form2FileName = null,
    Guid? SpasDocumentId = null, string? SpasFileName = null,
    Guid? Form7DocumentId = null, string? Form7FileName = null,
    bool WorksOnSaturday = false,
    DateTime? LogbookSubmittedToAdvisorAt = null,
    bool LogbookRevisionRequested = false,
    AcademicResultType AcademicResult = AcademicResultType.None,
    int AcceptedDaysCount = 0,
    string? Subject = null);

/// <summary>Belge sürüm geçmişi satırı.</summary>
public record DocumentVersionDto(Guid Id, int VersionNumber, string OriginalFileName, long SizeBytes, DateTime UploadedAt);

/// <summary>Yüklü belge bilgisi.</summary>
public record DocumentDto(
    Guid Id, DocumentType Type, string OriginalFileName, long SizeBytes, DateTime UploadedAt,
    DocumentStatus Status = DocumentStatus.Pending, string? CommissionFeedback = null,
    int VersionNumber = 1, DateTime? ReviewedAt = null, List<DocumentVersionDto>? Versions = null);

/// <summary>Komisyonun belge bazlı onay / düzeltme / ret inceleme isteği.</summary>
public record DocumentReviewRequest(DocumentStatus Status, string? Feedback);

/// <summary>Defter Sayfa 2 (TF-BM-SF-02a) personel tanıtım satırı.</summary>
public record CoverStaffMemberDto(int RowNo, string FullName, string GraduatedDepartment, string Role);

/// <summary>Defter Sayfa 2 (TF-BM-SF-02a) düzenlenebilir işyeri ve personel tanıtım verisi.</summary>
public record CoverPageDataDto(string? TotalEmployees, List<string> ActivityAreas, List<CoverStaffMemberDto> StaffMembers);

/// <summary>Komisyon defter kilitleme / kilit açma isteği.</summary>
public record LogbookLockRequest(bool Locked, string? Reason);

/// <summary>Sanal defter sayfası.</summary>
public record LogbookEntryDto(
    Guid Id, int DayNumber, DateOnly Date, string Title, string Content, DateTime UpdatedAt,
    bool IsDraft = false, bool HasImage = false, string? ImageOriginalFileName = null, string? ImageCaption = null);

/// <summary>Sanal defter sayfası oluşturma / güncelleme isteği.</summary>
public record LogbookUpsertRequest(
    DateOnly Date, string Title, string Content, Guid? Id = null, int? PageNumber = null,
    bool IsDraft = false, string? ImageCaption = null);

/// <summary>İzin / telafi talebi.</summary>
public record LeaveRequestDto(
    Guid Id, Guid InternshipId, string StudentName, string CompanyName, LeaveType Type, DateOnly StartDate, int Days,
    string Reason, LeaveRequestStatus Status, string? ReviewNote, DateOnly? OldEndDate, DateOnly? NewEndDate, DateTime CreatedAt);

/// <summary>İzin talebi oluşturma isteği.</summary>
public record LeaveCreateRequest(LeaveType Type, DateOnly StartDate, int Days, string Reason);

/// <summary>Öğrenci tarafından Form 7 (Staj İptal Formu) önizleme ve komisyona gönderme isteği.</summary>
public record Form7Request(string Reason, string? EducationType = "NÖ", string? NationalId = null, string? Phone = null);

/// <summary>Not içeren genel karar isteği (revize, red vb.).</summary>
public record NoteRequest(string? Note);

/// <summary>Staj sonu değerlendirme isteği (3 kademeli).</summary>
public record EvaluateRequest(bool Passed, string? Note, AcademicResultType? AcademicResult = null, int? AcceptedDaysCount = null);

/// <summary>Staj detay bilgisi (tüm paneller ortak kullanır).</summary>
public record InternshipDetailDto(
    Guid Id,
    Guid StudentId, string StudentName, string StudentEmail, string? StudentNo, string? StudentPhone, string? StudentNationalId,
    Guid TermId, string TermName, InternshipType Type,
    Guid CompanyId, string CompanyName, string? CompanyCity, string? CompanyAddress,
    string AdvisorName, string AdvisorEmail, string? Department,
    int WorkDays, DateOnly StartDate, DateOnly EndDate, DateOnly OriginalEndDate,
    InternshipStatus Status, KptoInsuranceStatus? KptoStatus, string? KptoNote, bool ReceivesSalary,
    string? RevisionNote, string? EvaluationNote,
    DateTime? SubmittedAt, DateTime? ApprovedAt, DateTime? InsuranceStartedAt,
    bool AdvisorLogbookApproved, DateTime? AdvisorApprovedAt, DateTime? EvaluatedAt,
    bool IsArchived, string? ArchiveYear, Guid VerificationCode,
    int? CurrentDay, int LogbookCount,
    List<DocumentDto> Documents, List<LeaveRequestDto> LeaveRequests,
    bool WorksOnSaturday = false,
    DateTime? LogbookSubmittedToAdvisorAt = null,
    bool LogbookRevisionRequested = false,
    string? LogbookRevisionNote = null,
    DateTime? AdvisorEmailSentAt = null,
    string? AdvisorEmailStatus = null,
    DateTime? AdvisorLastLoginAt = null,
    bool EndingSoonNotified = false,
    string? Subject = null,
    string? AdvisorTitle = null,
    string? AdvisorGraduatedDepartment = null,
    AcademicResultType AcademicResult = AcademicResultType.None,
    int AcceptedDaysCount = 0,
    string? AdvisorApprovedIpAddress = null,
    bool IsLogbookLocked = false,
    string? LogbookLockReason = null,
    string? CoverPageDataJson = null);

// ============================================================
//  KPTO
// ============================================================

/// <summary>KPTO listesi / Excel dökümü satırı.</summary>
public record KptoRowDto(
    Guid InternshipId, string StudentName, string? StudentNo, string? NationalId, string StudentEmail, string? StudentPhone,
    string CompanyName, string? CompanyAddress, InternshipType Type, DateOnly StartDate, DateOnly EndDate, int WorkDays,
    bool ReceivesSalary, KptoInsuranceStatus? KptoStatus, string? KptoNote, DateTime? ApprovedAt, DateTime? InsuranceStartedAt,
    Guid? SpasDocumentId, int SalaryReceiptCount, bool DateChanged);

/// <summary>Maaş dekontu satırı (KPTO).</summary>
public record SalaryReceiptDto(Guid DocumentId, Guid InternshipId, string StudentName, string? StudentNo, string CompanyName, string FileName, DateTime UploadedAt);

// ============================================================
//  BİLDİRİM / İSTATİSTİK / DOĞRULAMA
// ============================================================

/// <summary>Bildirim.</summary>
public record NotificationDto(Guid Id, NotificationType Type, string Title, string Message, bool IsRead, DateTime CreatedAt, Guid? InternshipId);

/// <summary>Komisyon gösterge paneli istatistikleri.</summary>
public record CommitteeStatsDto(
    int TotalApplications, int PendingReview, int Approved, int InProgress, int AwaitingEvaluation,
    int Passed, int Failed, int PendingLeaves, List<CompanyStatDto> TopCompanies,
    int CancellationRequested = 0, int Cancelled = 0, int Rejected = 0);

/// <summary>Test staj verilerini sıfırlama sonucu.</summary>
public record ResetInternshipsResultDto(
    int DeletedInternships, int DeletedDocuments, int DeletedLogbookEntries,
    int DeletedLeaveRequests, int DeletedNotifications);

/// <summary>QR kod ile belge doğrulama sonucu (herkese açık).</summary>
public record VerifyResultDto(bool Valid, string? StudentName, string? StudentNo, string? CompanyName, string? TermName,
    DateOnly? StartDate, DateOnly? EndDate, InternshipStatus? Status);

/// <summary>Bellekte üretilmiş dosya (PDF/Excel indirme).</summary>
public record FileResultDto(byte[] Content, string ContentType, string FileName);

/// <summary>Diskten okunacak dosya (yüklenen belge indirme).</summary>
public record StoredFileDto(Stream Stream, string ContentType, string FileName);
