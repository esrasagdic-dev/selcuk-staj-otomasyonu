using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;
using SelcukStaj.Api.Services;

namespace SelcukStaj.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWorkDayCalculator _calculator;
    private readonly IFileStorageService _fileStorage;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;

    public ApplicationsController(
        AppDbContext context, 
        IWorkDayCalculator calculator, 
        IFileStorageService fileStorage,
        INotificationService notificationService,
        IEmailService emailService)
    {
        _context = context;
        _calculator = calculator;
        _fileStorage = fileStorage;
        _notificationService = notificationService;
        _emailService = emailService;
    }

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idStr, out var id) ? id : 0;
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyApplications()
    {
        var userId = GetCurrentUserId();
        var applications = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .Include(a => a.Documents).ThenInclude(d => d.Versions)
            .Include(a => a.InsuranceRecord)
            .Include(a => a.PhysicalDelivery)
            .Include(a => a.Diary)
            .Where(a => a.StudentId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(applications.Select(a => MapToDto(a)));
    }

    [HttpGet("commission-queue")]
    public async Task<IActionResult> GetCommissionQueue([FromQuery] string? statusFilter, [FromQuery] string? department)
    {
        var role = GetCurrentUserRole();
        if (role != UserRole.CommissionMember.ToString() && role != UserRole.DepartmentHead.ToString())
        {
            return Forbid();
        }

        var userId = GetCurrentUserId();
        var currentUser = await _context.Users.FindAsync(userId);

        var query = _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .Include(a => a.Documents).ThenInclude(d => d.Versions)
            .Include(a => a.InsuranceRecord)
            .Include(a => a.PhysicalDelivery)
            .Include(a => a.Diary)
            .AsQueryable();

        string filterDept;
        if (!string.IsNullOrWhiteSpace(department) && department != "Tümü")
        {
            filterDept = department;
        }
        else if (department == "Tümü")
        {
            filterDept = "Tümü";
        }
        else
        {
            filterDept = !string.IsNullOrWhiteSpace(currentUser?.Department) 
                ? currentUser.Department 
                : "Bilgisayar Mühendisliği";
        }

        if (!string.IsNullOrWhiteSpace(filterDept) && filterDept != "Tümü")
        {
            query = query.Where(a => a.Student != null && 
                ((a.Student.StudentProfile != null && a.Student.StudentProfile.Department == filterDept) || 
                 a.Student.Department == filterDept));
        }

        if (!string.IsNullOrEmpty(statusFilter) && Enum.TryParse<ApplicationStatus>(statusFilter, out var parsedStatus))
        {
            query = query.Where(a => a.Status == parsedStatus);
        }

        var list = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
        return Ok(list.Select(a => MapToDto(a)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetCurrentUserId();
        var role = GetCurrentUserRole();

        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .Include(a => a.Documents).ThenInclude(d => d.Versions)
            .Include(a => a.InsuranceRecord)
            .Include(a => a.PhysicalDelivery)
            .Include(a => a.Absences)
            .Include(a => a.Diary).ThenInclude(d => d!.Entries)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound();

        // Rol ve yetki kontrolü
        if (role == UserRole.Student.ToString() && app.StudentId != userId)
        {
            return Forbid("Yalnızca kendi staj başvurunuza erişebilirsiniz.");
        }

        return Ok(MapToDto(app, includeDetails: true));
    }

    public record SaveApplicationDto(
        int? Id,
        int PeriodId,
        int? WorkplaceId,
        WorkplacesController.CreateWorkplaceDto? NewWorkplace,
        string AdvisorFullName,
        string AdvisorEmail,
        string AdvisorPhoneNumber,
        string AdvisorGraduatedDepartment,
        string AdvisorTitle,
        string InternshipTypeStr, // "Staj1" veya "Staj2"
        string? Subject,           // Stajın Konusu (Web Geliştirme vb.)
        int RequiredWorkDays,      // 20 veya 30 gün
        bool IncludesSaturday,
        DateTime StartDate
    );

    [HttpPost("save-draft")]
    public async Task<IActionResult> SaveDraft([FromBody] SaveApplicationDto dto)
    {
        var userId = GetCurrentUserId();
        if (dto.RequiredWorkDays != 20 && dto.RequiredWorkDays != 30)
        {
            return BadRequest(new { message = "Staj süresi 20 veya 30 gün olmalıdır." });
        }

        var type = dto.InternshipTypeStr == "Staj2" ? InternshipType.Staj2 : InternshipType.Staj1;

        var period = await _context.InternshipPeriods.FindAsync(dto.PeriodId);
        if (period == null)
        {
            return BadRequest(new { message = "Geçerli bir staj dönemi bulunamadı." });
        }

        // Bitiş tarihini hesapla
        var calcResult = await _calculator.CalculateEndDateAsync(dto.StartDate, dto.RequiredWorkDays, dto.IncludesSaturday);

        // 1. Komisyonun belirlediği staj başlangıç tarihi sınırı
        if (dto.StartDate.Date < period.EarliestStartDate.Date)
        {
            return BadRequest(new { message = $"Seçilen staj başlangıç tarihi ({dto.StartDate:dd.MM.yyyy}), komisyonun belirlediği en erken başlangıç tarihinden ({period.EarliestStartDate:dd.MM.yyyy}) önce olamaz." });
        }

        // 2. Komisyonun belirlediği staj bitiş tarihi sınırı
        if (calcResult.CalculatedEndDate.Date > period.LatestEndDate.Date)
        {
            return BadRequest(new { message = $"Hesaplanan staj bitiş tarihi ({calcResult.CalculatedEndDate:dd.MM.yyyy}), komisyonun belirlediği en geç staj bitiş tarihini ({period.LatestEndDate:dd.MM.yyyy}) aşmaktadır." });
        }

        // 3. Cumartesi izni kontrolü
        if (dto.IncludesSaturday && !period.IsSaturdayAllowed)
        {
            return BadRequest(new { message = "Komisyon kararı uyarınca bu dönemde Cumartesi günleri çalışma kabul edilmemektedir." });
        }

        // Firma belirle
        int workplaceId = dto.WorkplaceId ?? 0;
        if (workplaceId == 0 && dto.NewWorkplace != null)
        {
            var wp = new Workplace
            {
                Name = dto.NewWorkplace.Name.Trim(),
                City = dto.NewWorkplace.City ?? "Konya",
                Address = dto.NewWorkplace.Address ?? "",
                WebSite = dto.NewWorkplace.WebSite ?? "",
                PhoneNumber = dto.NewWorkplace.PhoneNumber ?? "",
                CompanyEmail = dto.NewWorkplace.CompanyEmail ?? "",
                Sector = dto.NewWorkplace.Sector ?? "Bilişim"
            };
            _context.Workplaces.Add(wp);
            await _context.SaveChangesAsync();
            workplaceId = wp.Id;
        }

        InternshipApplication app;
        if (dto.Id.HasValue && dto.Id.Value > 0)
        {
            app = await _context.InternshipApplications
                .Include(a => a.Advisor)
                .FirstOrDefaultAsync(a => a.Id == dto.Id.Value && a.StudentId == userId)
                ?? throw new InvalidOperationException("Başvuru bulunamadı.");

            if (app.Status != ApplicationStatus.Draft && app.Status != ApplicationStatus.RevisionRequired)
            {
                return BadRequest(new { message = "Yalnızca taslak veya düzeltme bekleyen başvurular güncellenebilir." });
            }
        }
        else
        {
            app = new InternshipApplication
            {
                StudentId = userId,
                Status = ApplicationStatus.Draft,
                Diary = new InternshipDiary(),
                InsuranceRecord = new InsuranceRecord { Status = InsuranceStatus.Pending },
                PhysicalDelivery = new PhysicalDelivery { Method = DeliveryMethod.HandDelivery }
            };
            _context.InternshipApplications.Add(app);
        }

        app.PeriodId = dto.PeriodId;
        app.WorkplaceId = workplaceId;
        app.Type = type;
        app.Subject = dto.Subject ?? string.Empty;
        app.RequiredWorkDays = dto.RequiredWorkDays;
        app.IncludesSaturday = dto.IncludesSaturday;
        app.StartDate = dto.StartDate.Date;
        app.CalculatedEndDate = calcResult.CalculatedEndDate;
        app.CurrentEndDate = calcResult.CalculatedEndDate;
        app.UpdatedAt = DateTime.UtcNow;

        if (app.Advisor == null)
        {
            app.Advisor = new WorkplaceAdvisor();
        }

        app.Advisor.FullName = dto.AdvisorFullName;
        app.Advisor.Email = dto.AdvisorEmail;
        app.Advisor.PhoneNumber = dto.AdvisorPhoneNumber;
        app.Advisor.GraduatedUniversityAndDepartment = dto.AdvisorGraduatedDepartment;
        app.Advisor.TitleOrPosition = dto.AdvisorTitle;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(app));
    }

    [HttpPost("{id}/upload-document")]
    public async Task<IActionResult> UploadDocument(int id, [FromForm] IFormFile file, [FromForm] string documentType)
    {
        var userId = GetCurrentUserId();
        var app = await _context.InternshipApplications
            .Include(a => a.Documents).ThenInclude(d => d.Versions)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == userId);

        if (app == null) return NotFound(new { message = "Başvuru bulunamadı." });

        if (!Enum.TryParse<DocumentType>(documentType, out var parsedType))
        {
            return BadRequest(new { message = "Geçersiz belge türü." });
        }

        // Dosyayı kaydet
        var (storedFileName, size) = await _fileStorage.SaveFileAsync(file, $"applications/{app.Id}");

        var doc = app.Documents.FirstOrDefault(d => d.Type == parsedType);
        if (doc == null)
        {
            doc = new Document
            {
                InternshipApplicationId = app.Id,
                Type = parsedType,
                Status = DocumentStatus.Pending,
                CurrentVersionNumber = 1
            };
            _context.Documents.Add(doc);
        }
        else
        {
            doc.CurrentVersionNumber++;
            doc.Status = DocumentStatus.Pending;
        }

        var version = new DocumentVersion
        {
            Document = doc,
            VersionNumber = doc.CurrentVersionNumber,
            OriginalFileName = file.FileName,
            StoredFileName = storedFileName,
            ContentType = file.ContentType,
            FileSizeBytes = size,
            UploadedByUserId = userId,
            UploadedAt = DateTime.UtcNow
        };

        _context.DocumentVersions.Add(version);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Belge başarıyla yüklendi.",
            documentId = doc.Id,
            versionNumber = doc.CurrentVersionNumber,
            type = doc.Type.ToString(),
            originalFileName = file.FileName
        });
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitApplication(int id)
    {
        var userId = GetCurrentUserId();
        var app = await _context.InternshipApplications
            .Include(a => a.Documents)
            .Include(a => a.Advisor)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == userId);

        if (app == null) return NotFound();

        // Zorunlu evrak kontrolleri (v2.1 kuralları: Form 2 ve SPAS Müstehaklık zorunludur!)
        var hasForm2 = app.Documents.Any(d => d.Type == DocumentType.Form2_KabulFormu);
        var hasSpas = app.Documents.Any(d => d.Type == DocumentType.Spas_Mustehaklik);

        if (!hasForm2)
        {
            return BadRequest(new { message = "Başvuruyu gönderebilmek için ıslak imzalı Form 2 yüklenmelidir." });
        }

        if (!hasSpas)
        {
            return BadRequest(new { message = "Başvuruyu gönderebilmek için e-Devlet SPAS Müstehaklık Belgesi yüklenmelidir." });
        }

        var period = await _context.InternshipPeriods.FindAsync(app.PeriodId);
        if (period != null)
        {
            var today = DateTime.Today;
            if (today < period.ApplicationStartDate.Date)
            {
                return BadRequest(new { message = $"Staj başvuruları henüz başlamamıştır. Başvuru Başlangıç Tarihi: {period.ApplicationStartDate:dd.MM.yyyy}" });
            }
            if (today > period.ApplicationEndDate.Date)
            {
                return BadRequest(new { message = $"Staj başvuru süresi ({period.ApplicationEndDate:dd.MM.yyyy}) sona ermiştir." });
            }
        }

        if (app.Advisor == null || string.IsNullOrWhiteSpace(app.Advisor.Email))
        {
            return BadRequest(new { message = "İşyeri sorumlu mühendisinin e-posta adresi eksik olamaz." });
        }

        app.Status = ApplicationStatus.Submitted;
        app.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Bildirim & E-posta tetikleyicileri
        var student = await _context.Users.Include(u => u.StudentProfile).FirstOrDefaultAsync(u => u.Id == app.StudentId);
        var workplace = await _context.Workplaces.FirstOrDefaultAsync(w => w.Id == app.WorkplaceId);
        app.Student = student;
        app.Workplace = workplace;

        var periodTitle = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
        await _notificationService.SendNotificationAsync(
            app.StudentId, 
            "Staj Başvurunuz Gönderildi", 
            $"{periodTitle} staj başvurunuz ve evraklarınız komisyon incelemesine iletilmiştir.", 
            NotificationType.Info, 
            app.Id
        );

        await _notificationService.SendToRoleAsync(
            UserRole.CommissionMember, 
            "Yeni Staj Başvurusu", 
            $"{student?.FullName} isimli öğrenci {workplace?.Name} firması için {periodTitle} başvurusu yaptı.", 
            NotificationType.Info, 
            app.Id
        );

        await _emailService.SendApplicationSubmittedEmailAsync(app);

        return Ok(new { message = "Başvurunuz başarıyla komisyon onayına gönderildi.", status = app.Status.ToString() });
    }

    [HttpPost("{id}/commission-review")]
    public async Task<IActionResult> ReviewByCommission(int id, [FromBody] CommissionReviewDto dto)
    {
        var role = GetCurrentUserRole();
        if (role != UserRole.CommissionMember.ToString() && role != UserRole.DepartmentHead.ToString())
        {
            return Forbid();
        }

        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .Include(a => a.InsuranceRecord)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound();

        var userId = GetCurrentUserId();
        var currentUser = await _context.Users.FindAsync(userId);
        var studentDept = app.Student?.StudentProfile?.Department ?? app.Student?.Department;
        if (role == UserRole.CommissionMember.ToString() &&
            !string.IsNullOrWhiteSpace(currentUser?.Department) &&
            !string.IsNullOrWhiteSpace(studentDept) &&
            !string.Equals(studentDept, currentUser.Department, StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = $"Bu stajyer ({studentDept}) bölümüne aittir. Yalnızca kendi bölümünüzün ({currentUser.Department}) başvurularını değerlendirebilirsiniz." });
        }

        var periodTitle = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";

        if (dto.Action == "Approve")
        {
            app.Status = ApplicationStatus.ApprovedByCommission;
            app.CommissionDecision = CommissionDecisionType.Approved;
            app.CommissionDecisionDate = DateTime.UtcNow;
            app.EvaluatedByUserId = GetCurrentUserId();

            // Tetikleyici 1: Sigorta kaydını KPTO kuyruğuna düşür
            if (app.InsuranceRecord == null)
            {
                app.InsuranceRecord = new InsuranceRecord();
            }
            app.InsuranceRecord.Status = InsuranceStatus.Pending;

            // Tetikleyici 2: Danışman tokenini aktifleştir
            if (app.Advisor != null)
            {
                app.Advisor.TokenExpiresAt = DateTime.UtcNow.AddMonths(4);
            }

            // Bildirimler & E-postalar
            await _notificationService.SendNotificationAsync(
                app.StudentId, 
                "Staj Başvurunuz Onaylandı", 
                $"Tebrikler! {periodTitle} başvurunuz Staj Komisyonu tarafından ONAYLANDI. Sigorta tescili için KPTO'ya aktarıldı.", 
                NotificationType.Success, 
                app.Id
            );

            await _notificationService.SendToRoleAsync(
                UserRole.KPTOOfficer, 
                "Sigorta Girişi Bekleyen Öğrenci", 
                $"{app.Student?.FullName} ({app.Student?.StudentProfile?.StudentNumber}) için {periodTitle} sigorta tescili bekleniyor.", 
                NotificationType.Info, 
                app.Id
            );

            await _emailService.SendCommissionDecisionEmailAsync(app, "Approve");
            await _emailService.SendAdvisorInvitationEmailAsync(app);
        }
        else if (dto.Action == "RequestRevision")
        {
            app.Status = ApplicationStatus.RevisionRequired;
            app.CommissionRejectReason = dto.Reason;

            await _notificationService.SendNotificationAsync(
                app.StudentId, 
                "Başvuruda Düzeltme İstendi", 
                $"Komisyon düzeltme/revizyon talep etti: {dto.Reason}", 
                NotificationType.Warning, 
                app.Id
            );

            await _emailService.SendCommissionDecisionEmailAsync(app, "RequestRevision", dto.Reason);
        }
        else if (dto.Action == "Reject")
        {
            if (string.IsNullOrWhiteSpace(dto.Reason))
            {
                return BadRequest(new { message = "Reddedilme durumunda gerekçe girilmesi zorunludur." });
            }
            app.Status = ApplicationStatus.Rejected;
            app.CommissionDecision = CommissionDecisionType.Rejected;
            app.CommissionRejectReason = dto.Reason;
            app.CommissionDecisionDate = DateTime.UtcNow;
            app.EvaluatedByUserId = GetCurrentUserId();

            await _notificationService.SendNotificationAsync(
                app.StudentId, 
                "Başvurunuz Reddedildi", 
                $"Staj başvurunuz reddedildi: {dto.Reason}", 
                NotificationType.Error, 
                app.Id
            );

            await _emailService.SendCommissionDecisionEmailAsync(app, "Reject", dto.Reason);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "İşlem kaydedildi.", status = app.Status.ToString() });
    }

    public record CommissionReviewDto(string Action, string? Reason);

    [HttpPost("{id}/final-evaluation")]
    public async Task<IActionResult> FinalEvaluation(int id, [FromBody] FinalEvaluationDto dto)
    {
        var role = GetCurrentUserRole();
        if (role != UserRole.CommissionMember.ToString() && role != UserRole.DepartmentHead.ToString())
        {
            return Forbid();
        }

        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (app == null) return NotFound();

        var userId = GetCurrentUserId();
        var currentUser = await _context.Users.FindAsync(userId);
        var studentDept = app.Student?.StudentProfile?.Department ?? app.Student?.Department;
        if (role == UserRole.CommissionMember.ToString() &&
            !string.IsNullOrWhiteSpace(currentUser?.Department) &&
            !string.IsNullOrWhiteSpace(studentDept) &&
            !string.Equals(studentDept, currentUser.Department, StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = $"Bu stajyer ({studentDept}) bölümüne aittir. Yalnızca kendi bölümünüzün ({currentUser.Department}) nihai notlandırmasını yapabilirsiniz." });
        }

        if (dto.CommissionDecision == "Rejected" && string.IsNullOrWhiteSpace(dto.RejectReason))
        {
            return BadRequest(new { message = "Komisyon kararı Reddedildi seçildiğinde gerekçe zorunludur." });
        }

        app.CommissionDecision = dto.CommissionDecision == "Approved" ? CommissionDecisionType.Approved : CommissionDecisionType.Rejected;
        app.CommissionRejectReason = dto.RejectReason;
        app.CommissionDecisionDate = DateTime.UtcNow;
        app.EvaluatedByUserId = GetCurrentUserId();

        app.AcademicResult = dto.AcademicResult switch
        {
            "Successful" => AcademicResultType.Successful,
            "PartiallySuccessful" => AcademicResultType.PartiallySuccessful,
            _ => AcademicResultType.Unsuccessful
        };

        app.AcceptedDaysCount = dto.AcceptedDaysCount;
        app.AcademicNotes = dto.AcademicNotes;
        app.Status = ApplicationStatus.Completed;

        await _context.SaveChangesAsync();

        var periodTitle = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
        var resultText = app.AcademicResult == AcademicResultType.Successful ? "Başarılı" : (app.AcademicResult == AcademicResultType.PartiallySuccessful ? "Kısmen Başarılı" : "Başarısız");

        await _notificationService.SendNotificationAsync(
            app.StudentId, 
            "Stajınız Sonuçlandı", 
            $"{periodTitle} nihai değerlendirme sonucunuz: {resultText}. Kabul edilen iş günü: {app.AcceptedDaysCount} gün.", 
            NotificationType.Success, 
            app.Id
        );

        await _emailService.SendFinalAcademicEvaluationEmailAsync(app);

        return Ok(new { message = "Nihai staj değerlendirmesi kaydedildi.", app.CommissionDecision, app.AcademicResult });
    }

    public record FinalEvaluationDto(
        string CommissionDecision, // "Approved" / "Rejected"
        string? RejectReason,
        string AcademicResult,     // "Successful", "PartiallySuccessful", "Unsuccessful"
        int AcceptedDaysCount,
        string? AcademicNotes
    );

    [HttpGet("{id}/documents/{docId}/download")]
    public async Task<IActionResult> DownloadDocument(int id, int docId)
    {
        var doc = await _context.Documents
            .Include(d => d.Versions)
            .Include(d => d.InternshipApplication)
            .FirstOrDefaultAsync(d => d.Id == docId && d.InternshipApplicationId == id);

        if (doc == null) return NotFound();

        var latestVersion = doc.Versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault();
        if (latestVersion == null) return NotFound();

        var fileResult = await _fileStorage.GetFileAsync($"applications/{id}", latestVersion.StoredFileName);
        if (!fileResult.HasValue) return NotFound(new { message = "Fiziksel dosya sunucuda bulunamadı." });

        return File(fileResult.Value.fileBytes, fileResult.Value.contentType, latestVersion.OriginalFileName);
    }

    [HttpGet("archive-years")]
    public async Task<IActionResult> GetArchiveYears()
    {
        var years = await _context.AcademicYears
            .Include(y => y.Periods)
            .OrderByDescending(y => y.StartDate)
            .ToListAsync();

        var result = new List<object>();

        foreach (var y in years)
        {
            var periodIds = y.Periods.Select(p => p.Id).ToList();
            var appsQuery = _context.InternshipApplications.Where(a => periodIds.Contains(a.PeriodId));

            var total = await appsQuery.CountAsync();
            var completed = await appsQuery.CountAsync(a => a.Status == ApplicationStatus.Completed || a.AcademicResult == AcademicResultType.Successful);
            var partially = await appsQuery.CountAsync(a => a.AcademicResult == AcademicResultType.PartiallySuccessful);
            var unsuccessful = await appsQuery.CountAsync(a => a.AcademicResult == AcademicResultType.Unsuccessful || a.Status == ApplicationStatus.Rejected);

            result.Add(new
            {
                Year = y.Title,
                y.IsActive,
                TotalCount = total,
                CompletedCount = completed,
                PartiallySuccessfulCount = partially,
                UnsuccessfulCount = unsuccessful,
                Periods = y.Periods.Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Type,
                    ApplicationCount = _context.InternshipApplications.Count(a => a.PeriodId == p.Id)
                })
            });
        }

        return Ok(result);
    }

    [HttpGet("archive")]
    public async Task<IActionResult> GetArchive(
        [FromQuery] string? year = null, 
        [FromQuery] string? periodId = null,
        [FromQuery] string? type = null,
        [FromQuery] string? result = null,
        [FromQuery] string? search = null)
    {
        var query = _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period).ThenInclude(p => p!.AcademicYear)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .Include(a => a.InsuranceRecord)
            .Include(a => a.Diary).ThenInclude(d => d!.Entries)
            .AsQueryable();

        if (!string.IsNullOrEmpty(year) && year != "all")
        {
            query = query.Where(a => a.Period != null && a.Period.AcademicYear != null && a.Period.AcademicYear.Title == year);
        }

        if (!string.IsNullOrEmpty(periodId) && int.TryParse(periodId, out var pid))
        {
            query = query.Where(a => a.PeriodId == pid);
        }

        if (!string.IsNullOrEmpty(type) && type != "all")
        {
            if (type == "Staj1" || type == "Staj 1")
                query = query.Where(a => a.Type == InternshipType.Staj1);
            else if (type == "Staj2" || type == "Staj 2")
                query = query.Where(a => a.Type == InternshipType.Staj2);
        }

        if (!string.IsNullOrEmpty(result) && result != "all")
        {
            if (Enum.TryParse<AcademicResultType>(result, out var rType))
            {
                query = query.Where(a => a.AcademicResult == rType);
            }
        }

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower().Trim();
            query = query.Where(a => 
                (a.Student != null && a.Student.FullName.ToLower().Contains(s)) ||
                (a.Student != null && a.Student.StudentProfile != null && a.Student.StudentProfile.StudentNumber.ToLower().Contains(s)) ||
                (a.Student != null && a.Student.StudentProfile != null && a.Student.StudentProfile.NationalId.Contains(s)) ||
                (a.Workplace != null && a.Workplace.Name.ToLower().Contains(s)) ||
                (a.Workplace != null && a.Workplace.City.ToLower().Contains(s)) ||
                (a.Advisor != null && a.Advisor.FullName.ToLower().Contains(s)) ||
                (a.Subject != null && a.Subject.ToLower().Contains(s)) ||
                (a.InsuranceRecord != null && a.InsuranceRecord.SgkDocumentRegistrationNo != null && a.InsuranceRecord.SgkDocumentRegistrationNo.ToLower().Contains(s))
            );
        }

        var list = await query
            .OrderByDescending(a => a.StartDate)
            .Select(a => new
            {
                a.Id,
                StudentName = a.Student != null ? a.Student.FullName : "",
                StudentNumber = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.StudentNumber : "",
                NationalId = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.NationalId : "",
                Department = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.Department : "Bilgisayar Mühendisliği",
                AcademicYear = a.Period != null && a.Period.AcademicYear != null ? a.Period.AcademicYear.Title : $"{a.StartDate.Year}-{a.StartDate.Year + 1}",
                PeriodTitle = a.Period != null ? a.Period.Title : "",
                InternshipType = a.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1",
                Subject = a.Subject,
                WorkplaceName = a.Workplace != null ? a.Workplace.Name : "",
                WorkplaceCity = a.Workplace != null ? a.Workplace.City : "",
                WorkplaceSector = a.Workplace != null ? a.Workplace.Sector : "",
                AdvisorName = a.Advisor != null ? a.Advisor.FullName : "",
                AdvisorTitle = a.Advisor != null ? a.Advisor.TitleOrPosition : "",
                AdvisorEmail = a.Advisor != null ? a.Advisor.Email : "",
                AdvisorApproved = a.Advisor != null && a.Advisor.HasApprovedDiary,
                a.StartDate,
                a.CurrentEndDate,
                a.RequiredWorkDays,
                a.AcceptedDaysCount,
                Status = a.Status.ToString(),
                CommissionDecision = a.CommissionDecision.ToString(),
                AcademicResult = a.AcademicResult.ToString(),
                AcademicNotes = a.AcademicNotes,
                CommissionRejectReason = a.CommissionRejectReason,
                SgkRegistrationNo = a.InsuranceRecord != null ? a.InsuranceRecord.SgkDocumentRegistrationNo : null,
                SgkEntryDate = a.InsuranceRecord != null ? a.InsuranceRecord.SgkEntryDate : null,
                SgkExitDate = a.InsuranceRecord != null ? a.InsuranceRecord.SgkExitDate : null,
                InsuranceStatus = a.InsuranceRecord != null ? a.InsuranceRecord.Status.ToString() : "NotStarted",
                DiaryEntriesCount = a.Diary != null ? a.Diary.Entries.Count : 0
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("archive/{id}/details")]
    public async Task<IActionResult> GetArchiveDetails(int id)
    {
        var a = await _context.InternshipApplications
            .Include(app => app.Student).ThenInclude(s => s!.StudentProfile)
            .Include(app => app.Period).ThenInclude(p => p!.AcademicYear)
            .Include(app => app.Workplace)
            .Include(app => app.Advisor)
            .Include(app => app.InsuranceRecord)
            .Include(app => app.Documents).ThenInclude(d => d.Versions)
            .Include(app => app.Diary).ThenInclude(d => d!.Entries)
            .FirstOrDefaultAsync(app => app.Id == id);

        if (a == null) return NotFound(new { message = "Arşiv staj kaydı bulunamadı." });

        return Ok(new
        {
            a.Id,
            Student = new
            {
                FullName = a.Student?.FullName,
                Email = a.Student?.Email,
                PhoneNumber = a.Student?.PhoneNumber,
                StudentNumber = a.Student?.StudentProfile?.StudentNumber,
                NationalId = a.Student?.StudentProfile?.NationalId,
                Faculty = a.Student?.StudentProfile?.Faculty ?? "Teknoloji Fakültesi",
                Department = a.Student?.StudentProfile?.Department ?? "Bilgisayar Mühendisliği",
                ClassLevel = a.Student?.StudentProfile?.ClassLevel ?? 4,
                Address = a.Student?.StudentProfile?.Address
            },
            AcademicYear = a.Period?.AcademicYear?.Title ?? $"{a.StartDate.Year}-{a.StartDate.Year + 1}",
            PeriodTitle = a.Period?.Title,
            InternshipType = a.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1",
            Subject = a.Subject,
            Workplace = a.Workplace != null ? new
            {
                a.Workplace.Name,
                a.Workplace.City,
                a.Workplace.Sector,
                a.Workplace.Address,
                a.Workplace.WebSite,
                a.Workplace.PhoneNumber,
                a.Workplace.CompanyEmail
            } : null,
            Advisor = a.Advisor != null ? new
            {
                a.Advisor.FullName,
                a.Advisor.Email,
                a.Advisor.PhoneNumber,
                a.Advisor.TitleOrPosition,
                a.Advisor.GraduatedUniversityAndDepartment,
                a.Advisor.HasApprovedDiary,
                a.Advisor.ApprovedAt,
                a.Advisor.ApprovedIpAddress
            } : null,
            Insurance = a.InsuranceRecord != null ? new
            {
                Status = a.InsuranceRecord.Status.ToString(),
                a.InsuranceRecord.SgkDocumentRegistrationNo,
                a.InsuranceRecord.SgkEntryDate,
                a.InsuranceRecord.SgkExitDate,
                a.InsuranceRecord.ProcessedAt
            } : null,
            DatesAndDuration = new
            {
                a.StartDate,
                a.CurrentEndDate,
                a.CalculatedEndDate,
                a.RequiredWorkDays,
                a.AcceptedDaysCount,
                a.IncludesSaturday
            },
            Evaluation = new
            {
                Status = a.Status.ToString(),
                CommissionDecision = a.CommissionDecision.ToString(),
                AcademicResult = a.AcademicResult.ToString(),
                a.CommissionRejectReason,
                a.CommissionDecisionDate,
                a.AcademicNotes
            },
            Diary = a.Diary != null ? new
            {
                a.Diary.TotalEmployees,
                a.Diary.CoverPageDataJson,
                a.Diary.IsSubmittedToAdvisor,
                a.Diary.SubmittedAt,
                a.Diary.IsApprovedByAdvisor,
                a.Diary.ApprovedAt,
                Entries = a.Diary.Entries
                    .OrderBy(e => e.DayNumber)
                    .Select(e => new
                    {
                        e.Id,
                        e.DayNumber,
                        Date = e.EntryDate,
                        WorkSummary = e.Title,
                        Description = e.Content,
                        e.ImageUrl,
                        e.ImageCaption,
                        HasImage = !string.IsNullOrEmpty(e.ImageUrl),
                        e.IsDraft
                    })
            } : null,
            Documents = a.Documents.Select(d => new
            {
                d.Id,
                Type = d.Type.ToString(),
                Status = d.Status.ToString(),
                d.CurrentVersionNumber,
                LatestVersion = d.Versions.OrderByDescending(v => v.VersionNumber).Select(v => new
                {
                    v.Id,
                    v.VersionNumber,
                    v.OriginalFileName,
                    v.FileSizeBytes,
                    v.UploadedAt
                }).FirstOrDefault()
            })
        });
    }

    [HttpGet("archive/export-csv")]
    public async Task<IActionResult> ExportArchiveCsv(
        [FromQuery] string? year = null,
        [FromQuery] string? type = null,
        [FromQuery] string? result = null,
        [FromQuery] string? search = null)
    {
        var query = _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period).ThenInclude(p => p!.AcademicYear)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .Include(a => a.InsuranceRecord)
            .AsQueryable();

        if (!string.IsNullOrEmpty(year) && year != "all")
        {
            query = query.Where(a => a.Period != null && a.Period.AcademicYear != null && a.Period.AcademicYear.Title == year);
        }

        if (!string.IsNullOrEmpty(type) && type != "all")
        {
            if (type == "Staj1" || type == "Staj 1")
                query = query.Where(a => a.Type == InternshipType.Staj1);
            else if (type == "Staj2" || type == "Staj 2")
                query = query.Where(a => a.Type == InternshipType.Staj2);
        }

        if (!string.IsNullOrEmpty(result) && result != "all")
        {
            if (Enum.TryParse<AcademicResultType>(result, out var rType))
            {
                query = query.Where(a => a.AcademicResult == rType);
            }
        }

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower().Trim();
            query = query.Where(a => 
                (a.Student != null && a.Student.FullName.ToLower().Contains(s)) ||
                (a.Student != null && a.Student.StudentProfile != null && a.Student.StudentProfile.StudentNumber.ToLower().Contains(s)) ||
                (a.Student != null && a.Student.StudentProfile != null && a.Student.StudentProfile.NationalId.Contains(s)) ||
                (a.Workplace != null && a.Workplace.Name.ToLower().Contains(s)) ||
                (a.Workplace != null && a.Workplace.City.ToLower().Contains(s)) ||
                (a.Advisor != null && a.Advisor.FullName.ToLower().Contains(s)) ||
                (a.Subject != null && a.Subject.ToLower().Contains(s)) ||
                (a.InsuranceRecord != null && a.InsuranceRecord.SgkDocumentRegistrationNo != null && a.InsuranceRecord.SgkDocumentRegistrationNo.ToLower().Contains(s))
            );
        }

        var list = await query.OrderByDescending(a => a.StartDate).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Akademik Yıl;Dönem;Öğrenci No;TC Kimlik No;Ad Soyad;Bölüm;Firma Adı;Şehir;Sektör;Staj Türü;İş Günü;Kabul Edilen Gün;Komisyon Kararı;Akademik Sonuç;SGK Tescil No;Başlangıç;Bitiş;Danışman Adı;Danışman Unvanı");

        foreach (var item in list)
        {
            var y = item.Period?.AcademicYear?.Title ?? $"{item.StartDate.Year}-{item.StartDate.Year + 1}";
            var pTitle = item.Period?.Title ?? "";
            var sNo = item.Student?.StudentProfile?.StudentNumber ?? "";
            var tc = item.Student?.StudentProfile?.NationalId ?? "";
            var name = item.Student?.FullName ?? "";
            var dept = item.Student?.StudentProfile?.Department ?? "Bilgisayar Mühendisliği";
            var wp = item.Workplace?.Name ?? "";
            var city = item.Workplace?.City ?? "";
            var sector = item.Workplace?.Sector ?? "";
            var stajType = item.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
            var commDecision = item.CommissionDecision.ToString();
            var acResult = item.AcademicResult.ToString();
            var sgk = item.InsuranceRecord?.SgkDocumentRegistrationNo ?? "—";
            var advName = item.Advisor?.FullName ?? "";
            var advTitle = item.Advisor?.TitleOrPosition ?? "";

            sb.AppendLine($"{y};{pTitle};{sNo};{tc};{name};{dept};{wp};{city};{sector};{stajType};{item.RequiredWorkDays};{item.AcceptedDaysCount};{commDecision};{acResult};{sgk};{item.StartDate:yyyy-MM-dd};{item.CurrentEndDate:yyyy-MM-dd};{advName};{advTitle}");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        var fn = !string.IsNullOrEmpty(year) && year != "all" ? $"Selcuk_Staj_Komisyon_Arsiv_{year}.csv" : "Selcuk_Staj_Komisyon_Arsiv_Tum_Yillar.csv";
        return File(bytes, "text/csv; charset=utf-8", fn);
    }

    private static object MapToDto(InternshipApplication a, bool includeDetails = false)
    {
        return new
        {
            a.Id,
            a.StudentId,
            StudentName = a.Student?.FullName,
            StudentNumber = a.Student?.StudentProfile?.StudentNumber,
            StudentDepartment = a.Student?.StudentProfile?.Department ?? a.Student?.Department ?? "Bilgisayar Mühendisliği",
            StudentFaculty = a.Student?.StudentProfile?.Faculty ?? "Teknoloji Fakültesi",
            PeriodId = a.PeriodId,
            PeriodTitle = a.Period?.Title,
            WorkplaceId = a.WorkplaceId,
            WorkplaceName = a.Workplace?.Name,
            WorkplaceCity = a.Workplace?.City,
            Type = a.Type.ToString(),
            Subject = a.Subject,
            a.RequiredWorkDays,
            a.IncludesSaturday,
            a.StartDate,
            a.CalculatedEndDate,
            a.CurrentEndDate,
            Status = a.Status.ToString(),
            CommissionDecision = a.CommissionDecision.ToString(),
            a.CommissionRejectReason,
            AcademicResult = a.AcademicResult.ToString(),
            a.AcceptedDaysCount,

            // Staj Uzatma Alanları
            a.HasExtensionRequest,
            a.ExtensionExtraDays,
            a.ExtensionReason,
            a.ExtensionMissedDates,
            a.ExtensionRequestedAt,
            a.IsExtensionApprovedByCommission,
            a.ExtensionCommissionApprovedAt,
            a.IsExtensionSgkProcessedByKPTO,
            a.ExtensionSgkProcessedAt,

            // Staj İptal Alanları
            a.HasCancelRequest,
            a.CancelReason,
            a.CancelFormDocumentPath,
            a.CancelRequestedAt,
            a.IsCancelApprovedByCommission,
            a.CancelCommissionApprovedAt,
            a.CancelCommissionNotes,

            // Dekont Alanları
            a.ReceiptDocumentPath,
            a.ReceiptUploadedAt,
            a.IsReceiptVerifiedByKPTO,

            // Defter Durum Alanları
            Diary = a.Diary != null ? new
            {
                a.Diary.Id,
                a.Diary.IsLocked,
                a.Diary.LockReason,
                a.Diary.IsRevisionRequestedByAdvisor,
                a.Diary.AdvisorRevisionNotes,
                a.Diary.RevisionRequestedAt,
                a.Diary.IsSubmittedToAdvisor,
                a.Diary.IsApprovedByAdvisor,
                a.Diary.ApprovedAt
            } : null,

            Advisor = a.Advisor != null ? new
            {
                a.Advisor.FullName,
                a.Advisor.Email,
                a.Advisor.PhoneNumber,
                a.Advisor.GraduatedUniversityAndDepartment,
                a.Advisor.TitleOrPosition,
                a.Advisor.HasApprovedDiary,
                a.Advisor.AccessToken
            } : null,
            Documents = a.Documents.Select(d => new
            {
                d.Id,
                Type = d.Type.ToString(),
                Status = d.Status.ToString(),
                d.CurrentVersionNumber,
                LatestVersion = d.Versions.OrderByDescending(v => v.VersionNumber).Select(v => new
                {
                    v.Id,
                    v.VersionNumber,
                    v.OriginalFileName,
                    v.FileSizeBytes,
                    v.UploadedAt
                }).FirstOrDefault()
            }),
            Insurance = a.InsuranceRecord != null ? new
            {
                Status = a.InsuranceRecord.Status.ToString(),
                a.InsuranceRecord.SgkEntryDate,
                a.InsuranceRecord.SgkExitDate
            } : null,
            PhysicalDelivery = a.PhysicalDelivery != null ? new
            {
                Method = a.PhysicalDelivery.Method.ToString(),
                a.PhysicalDelivery.CargoCompany,
                a.PhysicalDelivery.TrackingNumber,
                a.PhysicalDelivery.IsReceivedByUniversity,
                a.PhysicalDelivery.ReceivedDate
            } : null
        };
    }
}
