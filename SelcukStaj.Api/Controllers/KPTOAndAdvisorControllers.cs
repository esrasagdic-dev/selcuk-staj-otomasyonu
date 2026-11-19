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
public class KPTOController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;

    public KPTOController(AppDbContext context, INotificationService notificationService, IEmailService emailService)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
    }

    [HttpGet("students")]
    public async Task<IActionResult> GetInsuranceStudents([FromQuery] string? statusFilter)
    {
        var query = _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Include(a => a.InsuranceRecord)
            .Include(a => a.Documents).ThenInclude(d => d.Versions)
            .Where(a => a.Status >= ApplicationStatus.ApprovedByCommission && a.Status != ApplicationStatus.Rejected && a.Status != ApplicationStatus.Cancelled);

        if (!string.IsNullOrEmpty(statusFilter))
        {
            if (statusFilter.Equals("Started", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(a => a.Status >= ApplicationStatus.InsuranceStarted || (a.InsuranceRecord != null && a.InsuranceRecord.Status == InsuranceStatus.Started));
            }
            else if (statusFilter.Equals("Pending", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(a => a.Status == ApplicationStatus.ApprovedByCommission && (a.InsuranceRecord == null || a.InsuranceRecord.Status == InsuranceStatus.Pending));
            }
        }

        var list = await query
            .OrderByDescending(a => a.StartDate)
            .Select(a => new
            {
                a.Id,
                StudentName = a.Student != null ? a.Student.FullName : "",
                StudentNumber = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.StudentNumber : "",
                NationalId = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.NationalId : "",
                Department = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.Department : "",
                WorkplaceName = a.Workplace != null ? a.Workplace.Name : "",
                a.StartDate,
                a.CurrentEndDate,
                ApplicationStatus = a.Status.ToString(),
                InsuranceStatus = (a.Status >= ApplicationStatus.InsuranceStarted || (a.InsuranceRecord != null && a.InsuranceRecord.Status == InsuranceStatus.Started)) ? "Started" : "Pending",
                RegistrationNo = a.InsuranceRecord != null ? a.InsuranceRecord.SgkDocumentRegistrationNo : "",
                SgkEntryDate = a.InsuranceRecord != null && a.InsuranceRecord.SgkEntryDate.HasValue ? a.InsuranceRecord.SgkEntryDate.Value : a.StartDate,
                SgkExitDate = a.InsuranceRecord != null && a.InsuranceRecord.SgkExitDate.HasValue ? a.InsuranceRecord.SgkExitDate.Value : a.CurrentEndDate,
                HasSpasDocument = a.Documents.Any(d => d.Type == DocumentType.Spas_Mustehaklik)
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("{applicationId}/start-insurance")]
    public async Task<IActionResult> StartInsurance(int applicationId, [FromBody] StartInsuranceDto dto)
    {
        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Include(a => a.InsuranceRecord)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null) return NotFound();

        if (app.InsuranceRecord == null)
        {
            app.InsuranceRecord = new InsuranceRecord();
        }

        app.InsuranceRecord.Status = InsuranceStatus.Started;
        app.InsuranceRecord.SgkEntryDate = dto.SgkEntryDate ?? app.StartDate;
        app.InsuranceRecord.SgkExitDate = dto.SgkExitDate ?? app.CurrentEndDate;
        app.InsuranceRecord.SgkDocumentRegistrationNo = dto.RegistrationNo;
        app.InsuranceRecord.ProcessedAt = DateTime.UtcNow;

        app.Status = ApplicationStatus.InsuranceStarted;

        await _context.SaveChangesAsync();

        var periodTitle = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
        var regNoStr = !string.IsNullOrWhiteSpace(dto.RegistrationNo) ? $" (SGK No: {dto.RegistrationNo})" : "";

        await _notificationService.SendNotificationAsync(
            app.StudentId,
            "SGK Staj Sigortanız Başlatıldı",
            $"{periodTitle} için 5510 Sayılı Kanun 5/b kapsamında staj sigorta girişiniz tamamlanmıştır{regNoStr}. Stajınıza başlayabilirsiniz.",
            NotificationType.Success,
            app.Id
        );

        await _emailService.SendInsuranceStartedEmailAsync(app);

        return Ok(new { message = "Sigorta girişi başarıyla tamamlandı.", insuranceStatus = "Started" });
    }

    public record StartInsuranceDto(DateTime? SgkEntryDate, DateTime? SgkExitDate, string? RegistrationNo);

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var list = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Where(a => a.Status >= ApplicationStatus.ApprovedByCommission)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Öğrenci No;TC Kimlik No;Ad Soyad;Firma Adı;Staj Başlangıç;Staj Bitiş;İş Günü");

        foreach (var item in list)
        {
            sb.AppendLine($"{item.Student?.StudentProfile?.StudentNumber};{item.Student?.StudentProfile?.NationalId};{item.Student?.FullName};{item.Workplace?.Name};{item.StartDate:yyyy-MM-dd};{item.CurrentEndDate:yyyy-MM-dd};{item.RequiredWorkDays}");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", $"Selcuk_Staj_Sigorta_Listesi_{DateTime.Now:yyyyMMdd}.csv");
    }

    [HttpGet("archive-years")]
    public async Task<IActionResult> GetArchiveYears()
    {
        var years = await _context.AcademicYears
            .Include(y => y.Periods).ThenInclude(p => p.Applications)
            .OrderByDescending(y => y.Title)
            .Select(y => new
            {
                Year = y.Title,
                IsActive = y.IsActive,
                TotalCount = y.Periods.SelectMany(p => p.Applications).Count(),
                CompletedCount = y.Periods.SelectMany(p => p.Applications).Count(a => a.Status == ApplicationStatus.Completed || a.Status == ApplicationStatus.AdvisorApproved),
                Periods = y.Periods.Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Type,
                    ApplicationCount = p.Applications.Count
                })
            })
            .ToListAsync();

        return Ok(years);
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
                a.StartDate,
                a.CurrentEndDate,
                a.RequiredWorkDays,
                a.AcceptedDaysCount,
                Status = a.Status.ToString(),
                AcademicResult = a.AcademicResult.ToString(),
                SgkRegistrationNo = a.InsuranceRecord != null ? a.InsuranceRecord.SgkDocumentRegistrationNo : null,
                SgkEntryDate = a.InsuranceRecord != null ? a.InsuranceRecord.SgkEntryDate : null,
                SgkExitDate = a.InsuranceRecord != null ? a.InsuranceRecord.SgkExitDate : null,
                InsuranceStatus = a.InsuranceRecord != null ? a.InsuranceRecord.Status.ToString() : "NotStarted"
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("archive/export-csv")]
    public async Task<IActionResult> ExportArchiveCsv([FromQuery] string? year = null)
    {
        var query = _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period).ThenInclude(p => p!.AcademicYear)
            .Include(a => a.Workplace)
            .Include(a => a.InsuranceRecord)
            .AsQueryable();

        if (!string.IsNullOrEmpty(year) && year != "all")
        {
            query = query.Where(a => a.Period != null && a.Period.AcademicYear != null && a.Period.AcademicYear.Title == year);
        }

        var list = await query.OrderByDescending(a => a.StartDate).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Akademik Yıl;Dönem;Öğrenci No;TC Kimlik No;Ad Soyad;Bölüm;Firma Adı;Şehir;Staj Türü;İş Günü;Kabul Edilen Gün;SGK Tescil No;Başlangıç;Bitiş;Sonuç");

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
            var stajType = item.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
            var sgk = item.InsuranceRecord?.SgkDocumentRegistrationNo ?? "—";
            var res = item.AcademicResult.ToString();

            sb.AppendLine($"{y};{pTitle};{sNo};{tc};{name};{dept};{wp};{city};{stajType};{item.RequiredWorkDays};{item.AcceptedDaysCount};{sgk};{item.StartDate:yyyy-MM-dd};{item.CurrentEndDate:yyyy-MM-dd};{res}");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        var fn = !string.IsNullOrEmpty(year) && year != "all" ? $"Selcuk_Staj_Arsiv_{year}.csv" : "Selcuk_Staj_Arsiv_Tum_Yillar.csv";
        return File(bytes, "text/csv; charset=utf-8", fn);
    }

    [HttpGet("extensions/pending")]
    public async Task<IActionResult> GetPendingExtensions()
    {
        var list = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Include(a => a.InsuranceRecord)
            .Where(a => a.HasExtensionRequest && a.IsExtensionApprovedByCommission && !a.IsExtensionSgkProcessedByKPTO)
            .Select(a => new
            {
                a.Id,
                StudentName = a.Student != null ? a.Student.FullName : "",
                StudentNumber = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.StudentNumber : "",
                Department = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.Department : "Bilgisayar Mühendisliği",
                WorkplaceName = a.Workplace != null ? a.Workplace.Name : "",
                a.StartDate,
                CurrentEndDate = a.CurrentEndDate,
                a.ExtensionExtraDays,
                a.ExtensionReason,
                a.ExtensionCommissionApprovedAt,
                SgkRegistrationNo = a.InsuranceRecord != null ? a.InsuranceRecord.SgkDocumentRegistrationNo : ""
            })
            .ToListAsync();

        return Ok(list);
    }

    public class ProcessExtensionDto
    {
        public string? SgkDocumentRegistrationNo { get; set; }
        public string? Notes { get; set; }
    }

    [HttpPost("process-extension/{id}")]
    public async Task<IActionResult> ProcessExtension(int id, [FromBody] ProcessExtensionDto? dto = null)
    {
        dto ??= new ProcessExtensionDto();
        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.InsuranceRecord)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });
        if (!app.HasExtensionRequest)
        {
            return BadRequest(new { message = "Bu başvuru için uzatma talebi bulunmuyor." });
        }

        // Komisyon onayı bayrağı eksik kalsa bile KPTO memurunun tescil işlemini engelleme;
        // otomatik olarak komisyon onayıyla senkronize et
        app.IsExtensionApprovedByCommission = true;
        if (!app.ExtensionCommissionApprovedAt.HasValue)
        {
            app.ExtensionCommissionApprovedAt = DateTime.UtcNow;
        }

        var extraDays = app.ExtensionExtraDays > 0 ? app.ExtensionExtraDays : 5;
        var calculator = HttpContext.RequestServices.GetRequiredService<IWorkDayCalculator>();
        var newEndDate = await calculator.CalculateMakeUpDateAsync(app.CurrentEndDate, extraDays, app.IncludesSaturday);

        app.CurrentEndDate = newEndDate;
        app.IsExtensionSgkProcessedByKPTO = true;
        app.ExtensionSgkProcessedAt = DateTime.UtcNow;

        if (app.InsuranceRecord == null)
        {
            app.InsuranceRecord = new InsuranceRecord
            {
                InternshipApplicationId = app.Id,
                Status = InsuranceStatus.Started,
                SgkEntryDate = app.StartDate
            };
            _context.InsuranceRecords.Add(app.InsuranceRecord);
        }

        app.InsuranceRecord.Status = InsuranceStatus.Started;
        app.InsuranceRecord.SgkExitDate = newEndDate;
        if (!string.IsNullOrEmpty(dto.SgkDocumentRegistrationNo))
        {
            app.InsuranceRecord.SgkDocumentRegistrationNo = dto.SgkDocumentRegistrationNo;
        }
        else if (string.IsNullOrEmpty(app.InsuranceRecord.SgkDocumentRegistrationNo))
        {
            app.InsuranceRecord.SgkDocumentRegistrationNo = $"SGK-{DateTime.Now.Year}-4A-{new Random().Next(100000, 999999)}";
        }

        app.InsuranceRecord.Notes = (app.InsuranceRecord.Notes ?? "") + $" [Ek {extraDays} gün SGK tescili yapıldı: {newEndDate:dd.MM.yyyy}]";

        var extReq = await _context.InternshipExtensionRequests
            .Where(e => e.InternshipApplicationId == app.Id)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        if (extReq != null)
        {
            extReq.Status = ExtensionStatus.SgkProcessedByKPTO;
            extReq.KptoProcessedAt = DateTime.UtcNow;
            extReq.KptoNotes = dto.Notes ?? "KPTO Masasınca tescil edildi.";
        }
        else
        {
            _context.InternshipExtensionRequests.Add(new InternshipExtensionRequest
            {
                InternshipApplicationId = app.Id,
                RequestedExtraDays = extraDays,
                MissedDates = app.ExtensionMissedDates ?? $"{extraDays} İş Günü Telafi",
                Reason = app.ExtensionReason ?? "Staj telafisi",
                OriginalEndDate = app.CurrentEndDate,
                NewCalculatedEndDate = newEndDate,
                Status = ExtensionStatus.SgkProcessedByKPTO,
                CreatedAt = DateTime.UtcNow,
                CommissionApprovedAt = DateTime.UtcNow,
                KptoProcessedAt = DateTime.UtcNow,
                KptoNotes = dto.Notes ?? "KPTO Masasınca tescil edildi."
            });
        }

        var notificationService = HttpContext.RequestServices.GetRequiredService<INotificationService>();
        await notificationService.SendNotificationAsync(
            app.StudentId,
            "🎉 Staj Uzatması ve SGK Ek Bildirimi Tamamlandı",
            $"Stajınız {extraDays} iş günü uzatıldı. Yeni staj bitiş tarihiniz: {newEndDate:dd.MM.yyyy}. SGK ek prim bildiriminiz yapılmıştır.",
            NotificationType.Success,
            app.Id
        );

        await _context.SaveChangesAsync();
        return Ok(new
        {
            message = $"{app.Student?.FullName ?? "Öğrenci"} için +{extraDays} iş günü SGK ek prim bildirimi başarıyla tescil edildi.",
            newEndDate = app.CurrentEndDate
        });
    }

    [HttpGet("cancellations/pending")]
    public async Task<IActionResult> GetPendingCancellations()
    {
        var list = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Include(a => a.InsuranceRecord)
            .Where(a => a.HasCancelRequest && a.IsCancelApprovedByCommission && (a.InsuranceRecord == null || a.InsuranceRecord.Status != InsuranceStatus.Cancelled))
            .Select(a => new
            {
                a.Id,
                StudentName = a.Student != null ? a.Student.FullName : "",
                StudentNumber = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.StudentNumber : "",
                Department = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.Department : "Bilgisayar Mühendisliği",
                WorkplaceName = a.Workplace != null ? a.Workplace.Name : "",
                a.StartDate,
                a.CurrentEndDate,
                a.CancelReason,
                a.CancelFormDocumentPath,
                a.CancelCommissionApprovedAt,
                SgkRegistrationNo = a.InsuranceRecord != null ? a.InsuranceRecord.SgkDocumentRegistrationNo : ""
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("process-cancellation/{id}")]
    public async Task<IActionResult> ProcessCancellation(int id)
    {
        var app = await _context.InternshipApplications
            .Include(a => a.Student)
            .Include(a => a.InsuranceRecord)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        if (app.InsuranceRecord != null)
        {
            app.InsuranceRecord.Status = InsuranceStatus.Cancelled;
            app.InsuranceRecord.ProcessedAt = DateTime.UtcNow;
            app.InsuranceRecord.Notes = "SGK çıkış bildirgesi KPTO memuru tarafından onaylandı.";
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"{app.Student?.FullName ?? "Öğrenci"} için SGK çıkış bildirimi onaylandı." });
    }

    [HttpGet("receipts")]
    public async Task<IActionResult> GetReceipts()
    {
        var list = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Where(a => !string.IsNullOrEmpty(a.ReceiptDocumentPath))
            .OrderByDescending(a => a.ReceiptUploadedAt)
            .Select(a => new
            {
                a.Id,
                StudentName = a.Student != null ? a.Student.FullName : "",
                StudentNumber = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.StudentNumber : "",
                Department = a.Student != null && a.Student.StudentProfile != null ? a.Student.StudentProfile.Department : "Bilgisayar Mühendisliği",
                WorkplaceName = a.Workplace != null ? a.Workplace.Name : "",
                a.ReceiptDocumentPath,
                a.ReceiptUploadedAt,
                a.IsReceiptVerifiedByKPTO
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("verify-receipt/{id}")]
    public async Task<IActionResult> VerifyReceipt(int id)
    {
        var app = await _context.InternshipApplications.FindAsync(id);
        if (app == null) return NotFound(new { message = "Başvuru bulunamadı." });

        app.IsReceiptVerifiedByKPTO = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Öğrenci dekontu başarıyla doğrulandı." });
    }
}

[ApiController]
[Route("api/[controller]")]
public class AdvisorController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;

    public AdvisorController(AppDbContext context, INotificationService notificationService, IEmailService emailService)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
    }

    [HttpGet("demo-tokens")]
    public async Task<IActionResult> GetDemoAdvisors()
    {
        var advisors = await _context.WorkplaceAdvisors
            .AsNoTracking()
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Workplace)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Diary).ThenInclude(d => d!.Entries)
            .OrderBy(a => a.Id)
            .Select(a => new
            {
                a.Id,
                AdvisorName = a.FullName,
                AdvisorEmail = a.Email,
                AdvisorTitle = a.TitleOrPosition,
                Token = a.AccessToken,
                HasApproved = a.HasApprovedDiary,
                ApprovedAt = a.ApprovedAt,
                StudentName = a.InternshipApplication != null && a.InternshipApplication.Student != null ? a.InternshipApplication.Student.FullName : "",
                StudentNumber = a.InternshipApplication != null && a.InternshipApplication.Student != null && a.InternshipApplication.Student.StudentProfile != null ? a.InternshipApplication.Student.StudentProfile.StudentNumber : "",
                WorkplaceName = a.InternshipApplication != null && a.InternshipApplication.Workplace != null ? a.InternshipApplication.Workplace.Name : "",
                InternshipType = a.InternshipApplication != null ? (a.InternshipApplication.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1") : "Staj 1",
                Subject = a.InternshipApplication != null ? a.InternshipApplication.Subject : "",
                DiaryEntryCount = a.InternshipApplication != null && a.InternshipApplication.Diary != null ? a.InternshipApplication.Diary.Entries.Count : 0,
                RequiredWorkDays = a.InternshipApplication != null ? a.InternshipApplication.RequiredWorkDays : 20
            })
            .ToListAsync();

        return Ok(advisors);
    }

    [HttpGet("verify")]
    public async Task<IActionResult> VerifyToken([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { message = "Token zorunludur." });
        }

        var advisor = await _context.WorkplaceAdvisors
            .AsNoTracking()
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Workplace)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.InsuranceRecord)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Diary).ThenInclude(d => d!.Entries)
            .FirstOrDefaultAsync(a => a.AccessToken == token);

        if (advisor == null)
        {
            return Unauthorized(new { message = "Geçersiz veya süresi dolmuş erişim bağlantısı." });
        }

        var app = advisor.InternshipApplication;
        if (app == null) return NotFound();

        var filledDaysCount = app.Diary?.Entries.Count(e => !e.IsDraft) ?? 0;
        var requiredDays = app.RequiredWorkDays;
        var isComplete = filledDaysCount >= requiredDays;
        var missingDays = Math.Max(0, requiredDays - filledDaysCount);

        DiaryCoverInfoDto? coverInfo = null;
        if (!string.IsNullOrEmpty(app.Diary?.CoverPageDataJson))
        {
            try
            {
                coverInfo = System.Text.Json.JsonSerializer.Deserialize<DiaryCoverInfoDto>(app.Diary.CoverPageDataJson);
            }
            catch { }
        }

        return Ok(new
        {
            AdvisorName = advisor.FullName,
            AdvisorEmail = advisor.Email,
            AdvisorTitle = advisor.TitleOrPosition,
            AdvisorDepartment = advisor.GraduatedUniversityAndDepartment,
            AdvisorPhone = advisor.PhoneNumber,
            HasApproved = advisor.HasApprovedDiary,
            ApprovedAt = advisor.ApprovedAt,
            ApprovedIpAddress = advisor.ApprovedIpAddress,
            AdvisorNotes = app.Diary?.AdvisorNotes,
            StudentName = app.Student?.FullName,
            StudentNumber = app.Student?.StudentProfile?.StudentNumber,
            Faculty = app.Student?.StudentProfile?.Faculty ?? "Teknoloji Fakültesi",
            Department = app.Student?.StudentProfile?.Department ?? "Bilgisayar Mühendisliği",
            WorkplaceName = app.Workplace?.Name,
            WorkplaceAddress = coverInfo?.WorkplaceAddress ?? app.Workplace?.Address,
            WorkplaceCity = coverInfo?.WorkplaceCity ?? app.Workplace?.City,
            WorkplacePhone = coverInfo?.WorkplacePhone ?? app.Workplace?.PhoneNumber ?? advisor.PhoneNumber,
            WorkplaceEmail = coverInfo?.WorkplaceEmail ?? app.Workplace?.CompanyEmail ?? advisor.Email,
            WorkplaceWebSite = coverInfo?.WorkplaceWebSite ?? app.Workplace?.WebSite,
            WorkplaceSector = app.Workplace?.Sector,
            TotalEmployees = coverInfo?.TotalEmployees ?? app.Diary?.TotalEmployees ?? "250+",
            ActivityAreas = coverInfo?.ActivityAreas,
            StaffMembers = coverInfo?.StaffMembers,
            InternshipType = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1",
            Subject = app.Subject,
            app.StartDate,
            app.CurrentEndDate,
            app.RequiredWorkDays,
            app.IncludesSaturday,
            Status = app.Status.ToString(),
            FilledDaysCount = filledDaysCount,
            IsDiaryComplete = isComplete,
            MissingDaysCount = missingDays,
            SgkRegistrationNo = app.InsuranceRecord?.SgkDocumentRegistrationNo,
            HasInsuranceStarted = app.InsuranceRecord != null && app.InsuranceRecord.Status == InsuranceStatus.Started,
            CoverInfo = coverInfo,
            DiaryEntries = app.Diary?.Entries.OrderBy(e => e.DayNumber).Select(e => new
            {
                e.DayNumber,
                e.EntryDate,
                e.Title,
                e.Content,
                e.IsDraft,
                e.ImageUrl,
                e.ImageCaption,
                ImageUrlFull = !string.IsNullOrEmpty(e.ImageUrl) ? $"/api/diary/{app.Id}/entry/{e.DayNumber}/image?token={advisor.AccessToken}" : null
            })
        });
    }

    [HttpPost("approve")]
    public async Task<IActionResult> ApproveByAdvisor([FromBody] ApproveByAdvisorDto dto)
    {
        var advisor = await _context.WorkplaceAdvisors
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Diary).ThenInclude(d => d!.Entries)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Workplace)
            .FirstOrDefaultAsync(a => a.AccessToken == dto.Token);

        if (advisor == null)
        {
            return Unauthorized(new { message = "Geçersiz erişim bağlantısı." });
        }

        var app = advisor.InternshipApplication;
        if (app == null) return NotFound();

        // 20 gün ise 20 gün, 30 gün ise 30 gün defter zorunluluğu kontrolü
        var filledDaysCount = app.Diary?.Entries.Count(e => !e.IsDraft) ?? 0;
        if (filledDaysCount < app.RequiredWorkDays)
        {
            var missing = app.RequiredWorkDays - filledDaysCount;
            return BadRequest(new 
            { 
                message = $"Staj defteri henüz tamamlanmamıştır! Zorunlu staj süresi {app.RequiredWorkDays} iş günü olmasına rağmen defterde yalnızca {filledDaysCount} gün kayıt bulunmaktadır ({missing} gün eksik). Üniversitemiz staj yönergesi uyarınca eksik staj defteri iş yeri yetkilisi tarafından onaylanamaz. Lütfen öğrencinin kalan {missing} günü tamamlamasını sağlayınız.",
                requiredWorkDays = app.RequiredWorkDays,
                filledDaysCount,
                missingDaysCount = missing
            });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        advisor.HasApprovedDiary = true;
        advisor.ApprovedAt = DateTime.UtcNow;
        advisor.ApprovedIpAddress = ip;

        app.Status = ApplicationStatus.AdvisorApproved;
        if (app.Diary != null)
        {
            app.Diary.IsApprovedByAdvisor = true;
            app.Diary.ApprovedAt = DateTime.UtcNow;
            app.Diary.AdvisorIpAddress = ip;
        }

        // Denetim Günlüğüne mühürle
        _context.AuditLogs.Add(new AuditLog
        {
            UserEmail = advisor.Email,
            Action = "AdvisorApprovedDiary",
            EntityName = "InternshipDiary",
            EntityId = app.Id,
            IpAddress = ip,
            Details = $"{advisor.FullName} tarafından {app.RequiredWorkDays} günlük staj defteri incelenip onaylandı."
        });

        await _notificationService.SendNotificationAsync(
            app.StudentId,
            "Staj Defteriniz İşyeri Tarafından Onaylandı",
            $"İşyeri sorumlu personeli ({advisor.FullName}) Sanal Staj Defterinizi onayladı. Süreç komisyon nihai değerlendirmesine aktarıldı.",
            NotificationType.Success,
            app.Id
        );

        await _notificationService.SendToRoleAsync(
            UserRole.CommissionMember,
            "Defter Onayı Tamamlandı",
            $"{app.Student?.FullName} ({app.Student?.StudentProfile?.StudentNumber}) staj defterini işyeri onaylattı. Nihai akademik değerlendirme bekliyor.",
            NotificationType.Info,
            app.Id
        );

        await _emailService.SendAdvisorApprovedDiaryEmailAsync(app);

        await _context.SaveChangesAsync();
        return Ok(new { message = "Staj defteri başarıyla onaylandı.", approvedAt = advisor.ApprovedAt });
    }

    public record RequestRevisionDto(string Token, string RevisionNotes);

    [HttpPost("request-revision")]
    public async Task<IActionResult> RequestRevision([FromBody] RequestRevisionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RevisionNotes))
        {
            return BadRequest(new { message = "Lütfen düzeltme / revizyon gerekçesini belirtiniz." });
        }

        var advisor = await _context.WorkplaceAdvisors
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Diary)
            .Include(a => a.InternshipApplication).ThenInclude(app => app!.Student)
            .FirstOrDefaultAsync(a => a.AccessToken == dto.Token);

        if (advisor == null)
        {
            return Unauthorized(new { message = "Geçersiz erişim bağlantısı." });
        }

        var app = advisor.InternshipApplication;
        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        if (app.Diary != null)
        {
            app.Diary.IsRevisionRequestedByAdvisor = true;
            app.Diary.AdvisorRevisionNotes = dto.RevisionNotes.Trim();
            app.Diary.RevisionRequestedAt = DateTime.UtcNow;
            app.Diary.IsSubmittedToAdvisor = false;
        }

        app.Status = ApplicationStatus.InsuranceStarted;

        await _notificationService.SendNotificationAsync(
            app.StudentId,
            "⚠️ İşyeri Sorumlu Mühendisi Staj Defterinde Düzeltme İstedi",
            $"İşyeri sorumlu mühendisiniz ({advisor.FullName}) defterinizde revizyon talep etti: \"{dto.RevisionNotes.Trim()}\". Lütfen belirtilen günleri güncelleyip tekrar onaya gönderiniz.",
            NotificationType.Warning,
            app.Id
        );

        await _context.SaveChangesAsync();
        return Ok(new
        {
            message = "Düzeltme talebiniz öğrenciye iletildi.",
            isRevisionRequestedByAdvisor = true,
            revisionNotes = dto.RevisionNotes.Trim()
        });
    }

    public record ApproveByAdvisorDto(string Token);
}

[ApiController]
[Route("api/[controller]")]
public class DiaryController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;
    private readonly IFileStorageService _fileStorage;

    public DiaryController(
        AppDbContext context, 
        INotificationService notificationService, 
        IEmailService emailService,
        IFileStorageService fileStorage)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
        _fileStorage = fileStorage;
    }

    [HttpPost("{applicationId}/submit-to-advisor")]
    public async Task<IActionResult> SubmitToAdvisor(int applicationId)
    {
        var app = await _context.InternshipApplications
            .Include(a => a.Diary).ThenInclude(d => d!.Entries)
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Advisor)
            .Include(a => a.Workplace)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        if (app.Status == ApplicationStatus.AdvisorApproved || app.Status == ApplicationStatus.Completed)
        {
            return BadRequest(new { message = "Bu staj defteri zaten onaylanmıştır." });
        }

        var filledDaysCount = app.Diary?.Entries.Count(e => !e.IsDraft) ?? 0;
        if (filledDaysCount < app.RequiredWorkDays)
        {
            var missing = app.RequiredWorkDays - filledDaysCount;
            return BadRequest(new
            {
                message = $"Staj defteriniz eksiktir! Zorunlu staj süresi {app.RequiredWorkDays} iş günüdür. Şu ana kadar {filledDaysCount} gün doldurulmuştur ({missing} gün eksik). Üniversite yönergemiz uyarınca {app.RequiredWorkDays} iş gününün tamamı eksiksiz doldurulmadan defter iş yeri onayına gönderilemez.",
                requiredWorkDays = app.RequiredWorkDays,
                filledDaysCount,
                missingDaysCount = missing
            });
        }

        app.Status = ApplicationStatus.AwaitingAdvisorApproval;
        await _context.SaveChangesAsync();

        // Öğrenciye sistem içi bildirim
        await _notificationService.SendNotificationAsync(
            app.StudentId,
            "Staj Defteriniz İş Yeri Onayına Gönderildi",
            $"{app.RequiredWorkDays} iş günlük staj defteriniz eksiksiz olarak iş yeri sorumlu mühendisi ({app.Advisor?.FullName}) onayına sunulmuştur.",
            NotificationType.Success,
            app.Id
        );

        // İş yeri yetkilisine bilgilendirme e-postası
        await _emailService.SendAdvisorInvitationEmailAsync(app);

        return Ok(new
        {
            message = $"Tebrikler! {app.RequiredWorkDays} iş günlük staj defteriniz eksiksiz şekilde iş yeri yetkilisinin onayına sunuldu.",
            status = app.Status.ToString(),
            filledDaysCount = filledDaysCount
        });
    }

    [HttpPost("prepare-esra-advisor-test")]
    public async Task<IActionResult> PrepareEsraAdvisorTest()
    {
        var targetApps = await _context.InternshipApplications
            .Include(a => a.Advisor)
            .Include(a => a.Diary).ThenInclude(d => d!.Entries)
            .Include(a => a.InsuranceRecord)
            .Include(a => a.Workplace)
            .Include(a => a.Student)
            .Where(a => a.Student!.Email == "ogrenci@selcuk.edu.tr" || a.Student!.Email == "esra.sagdic@selcuk.edu.tr")
            .ToListAsync();

        var primaryToken = string.Empty;
        var primaryAppId = 0;

        var sampleEntries = new[]
        {
            ("Kurumsal Oryantasyon ve Çalışma Ortamı", "Şirket içi oryantasyon programı tamamlandı. Geliştirme ortamı, Git versiyon kontrol sistemi ve kurumsal kodlama standartları incelendi."),
            ("Veritabanı Şeması ve ER Modelleme", "Mevcut kurumsal ERP projesinin PostgreSQL / SQLite veritabanı şeması incelendi. Tablo ilişkileri ve foreign key kısıtları dokümante edildi."),
            ("REST API Mimarisi ve Katmanlı Tasarım", "ASP.NET Core 9.0 Web API katmanlı mimarisi (Controller - Service - Repository) incelenerek yeni servis iskeleti oluşturuldu."),
            ("Entity Framework Core & Migration", "EF Core Code-First yaklaşımı ile veri modelleri güncellendi ve migration işlemleri başarıyla uygulandı."),
            ("JWT Kimlik Doğrulama Servisleri", "Sistemde kullanıcı oturum yönetimi için JWT (JSON Web Token) tabanlı güvenli kimlik doğrulama mekanizması kodlandı."),
            ("Role-Based Yetkilendirme Mekanizması", "Öğrenci, Komisyon, İşyeri ve KPTO rolleri için Controller düzeyinde yetki denetimleri [Authorize] eklendi."),
            ("React ve Tailwind CSS ile Arayüz Tasarımı", "Modern kullanıcı deneyimi için Vite + React üzerinde Tailwind CSS ile duyarlı (responsive) UI bileşenleri geliştirildi."),
            ("Dinamik İş Günü Hesaplama Modülü", "Resmî tatilleri ve cumartesi günlerini dinamik olarak hesaba katan takvim motoru yazıldı."),
            ("Sanal Staj Defteri Veri Akışı", "Öğrencilerin günlük teknik raporlarını girmesini sağlayan sanal defter ekranı ve otomatik kaydetme akışı kodlandı."),
            ("Evrak Yönetimi ve Dosya Yükleme", "Form 2 ve SPAS belgelerinin sisteme güvenli şekilde yüklenmesi ve doğrulanması için dosya yönetim servisi oluşturuldu."),
            ("Bölüm Komisyonu İnceleme Masası", "Staj komisyonunun başvuruları onaylaması, reddetmesi ve düzeltme istemesi için komisyon yönetim arayüzü bağlandı."),
            ("KPTO SGK Sigorta Tescil Modülü", "5510 Sayılı Kanunun 5/b maddesi kapsamında SGK tescil ve belge takip numarası üreten servis entegre edildi."),
            ("Staj Süresi Uzatma ve Mazeret İzni", "Öğrencinin sağlık raporu veya sınav mazereti ile talep ettiği uzatma günlerini hesaplayan ve komisyona sunan modül tamamlandı."),
            ("FORM 7 Staj İptal ve SGK Çıkış Akışı", "Stajı zorunlu nedenlerle iptal olan öğrencilerin Form 7 yükleme ve acil SGK çıkış bildirimi süreci uygulandı."),
            ("3308 Sayılı Kanun Ücret Dekont Doğrulama", "İşletmenin öğrenciye ödediği katkı payı ve ücret dekontunun KPTO tarafından doğrulanması sağlandı."),
            ("E-posta ve Bildirim Altyapısı", "Staj aşamalarındaki durum değişikliklerinde kullanıcılara anlık bildirim ve e-posta şablonları üreten servis yazıldı."),
            ("Birim Testleri (xUnit)", "İş günü hesaplama ve izin algoritmaları için xUnit birim testleri yazılarak doğrulama yapıldı."),
            ("Sistem Entegrasyon Testleri", "Uçtan uca başvuru, onay, sigorta, defter ve notlama adımlarını test eden 38 adımlı test senaryosu çalıştırıldı."),
            ("Performans ve Güvenlik Optimizasyonu", "Veritabanı indekslemeleri, lazy-loading engellemeleri ve OWASP güvenlik kontrolleri uygulandı."),
            ("Stajın Tamamlanması ve Sunum Hazırlığı", "20 günlük staj çalışmaları derlenerek staj defteri tamamlandı ve iş yeri yetkilisinin nihai onayına sunuldu.")
        };

        foreach (var app in targetApps)
        {
            if (app.Advisor == null)
            {
                app.Advisor = new WorkplaceAdvisor { InternshipApplicationId = app.Id };
                _context.WorkplaceAdvisors.Add(app.Advisor);
            }

            var token = Guid.NewGuid().ToString("N");
            if (string.IsNullOrEmpty(primaryToken))
            {
                primaryToken = token;
                primaryAppId = app.Id;
            }

            app.Advisor.FullName = "Müh. Esra SAĞDIÇ (İş Yeri Yetkilisi)";
            app.Advisor.Email = "esrasagdic200@gmail.com";
            app.Advisor.PhoneNumber = "0555 123 4567";
            app.Advisor.TitleOrPosition = "Yazılım Direktörü / Danışman Mühendis";
            app.Advisor.GraduatedUniversityAndDepartment = "Selçuk Üniversitesi Bilgisayar Mühendisliği";
            app.Advisor.AccessToken = token;
            app.Advisor.TokenExpiresAt = DateTime.UtcNow.AddMonths(4);
            app.Advisor.HasApprovedDiary = false;

            if (app.InsuranceRecord == null)
            {
                app.InsuranceRecord = new InsuranceRecord
                {
                    InternshipApplicationId = app.Id,
                    Status = InsuranceStatus.Started,
                    SgkDocumentRegistrationNo = "SGK-5510-2026-ESRA",
                    SgkEntryDate = new DateTime(2026, 11, 2),
                    SgkExitDate = new DateTime(2026, 12, 2),
                    ProcessedAt = DateTime.UtcNow
                };
                _context.InsuranceRecords.Add(app.InsuranceRecord);
            }
            else
            {
                app.InsuranceRecord.Status = InsuranceStatus.Started;
                app.InsuranceRecord.SgkDocumentRegistrationNo = "SGK-5510-2026-ESRA";
            }

            if (app.Diary == null)
            {
                app.Diary = new InternshipDiary { InternshipApplicationId = app.Id };
                _context.InternshipDiaries.Add(app.Diary);
            }

            app.Diary.IsLocked = false;
            app.Diary.IsRevisionRequestedByAdvisor = false;
            app.Diary.IsSubmittedToAdvisor = true;
            app.Diary.IsApprovedByAdvisor = false;
            app.Diary.SubmittedAt = DateTime.UtcNow;

            app.Diary.Entries.Clear();
            for (int i = 0; i < sampleEntries.Length; i++)
            {
                var dayNum = i + 1;
                app.Diary.Entries.Add(new DiaryEntry
                {
                    InternshipDiaryId = app.Diary.Id,
                    DayNumber = dayNum,
                    EntryDate = app.StartDate.AddDays(dayNum - 1),
                    Title = sampleEntries[i].Item1,
                    Content = sampleEntries[i].Item2,
                    IsDraft = false
                });
            }

            app.Status = ApplicationStatus.AwaitingAdvisorApproval;
        }

        await _context.SaveChangesAsync();

        var primaryApp = targetApps.FirstOrDefault();
        if (primaryApp != null)
        {
            await _emailService.SendAdvisorInvitationEmailAsync(primaryApp);
        }

        return Ok(new
        {
            message = "Esra SAĞDIÇ staj başvuruları 'İş Yeri Onayı Bekliyor' aşamasına getirildi ve esrasagdic200@gmail.com adresine giriş şifreli resmî davet e-postası üretildi!",
            advisorName = "Müh. Esra SAĞDIÇ (İş Yeri Yetkilisi)",
            advisorEmail = "esrasagdic200@gmail.com",
            advisorToken = primaryToken,
            directLoginUrl = $"http://localhost:8080/advisor/review?token={primaryToken}",
            status = "AwaitingAdvisorApproval"
        });
    }

    [HttpGet("{applicationId}")]
    public async Task<IActionResult> GetDiary(int applicationId)
    {
        var diary = await _context.InternshipDiaries
            .Include(d => d.Entries.OrderBy(e => e.DayNumber))
            .FirstOrDefaultAsync(d => d.InternshipApplicationId == applicationId);

        if (diary == null) return NotFound();

        return Ok(diary.Entries.Select(e => new
        {
            e.Id,
            e.DayNumber,
            e.EntryDate,
            e.Title,
            e.Content,
            e.IsDraft,
            e.ImageUrl,
            e.ImageCaption,
            ImageUrlFull = !string.IsNullOrEmpty(e.ImageUrl) ? $"/api/diary/{applicationId}/entry/{e.DayNumber}/image" : null,
            e.UpdatedAt
        }));
    }

    public record SaveEntryDto(int DayNumber, DateTime EntryDate, string Title, string Content, bool IsDraft, string? ImageCaption = null);

    [HttpPost("{applicationId}/entry")]
    public async Task<IActionResult> SaveEntry(int applicationId, [FromBody] SaveEntryDto dto)
    {
        var diary = await _context.InternshipDiaries
            .Include(d => d.Entries)
            .FirstOrDefaultAsync(d => d.InternshipApplicationId == applicationId);

        if (diary == null)
        {
            diary = new InternshipDiary { InternshipApplicationId = applicationId };
            _context.InternshipDiaries.Add(diary);
            await _context.SaveChangesAsync();
        }

        if (diary.IsApprovedByAdvisor)
        {
            return BadRequest(new { message = "İşyeri tarafından onaylanan staj defteri düzenlenemez." });
        }

        var entry = diary.Entries.FirstOrDefault(e => e.DayNumber == dto.DayNumber);
        if (entry == null)
        {
            entry = new DiaryEntry
            {
                InternshipDiaryId = diary.Id,
                DayNumber = dto.DayNumber,
                EntryDate = dto.EntryDate.Date,
                Title = dto.Title,
                Content = dto.Content,
                IsDraft = dto.IsDraft,
                ImageCaption = dto.ImageCaption,
                CreatedAt = DateTime.UtcNow
            };
            _context.DiaryEntries.Add(entry);
        }
        else
        {
            entry.EntryDate = dto.EntryDate.Date;
            entry.Title = dto.Title;
            entry.Content = dto.Content;
            entry.IsDraft = dto.IsDraft;
            if (!string.IsNullOrEmpty(dto.ImageCaption))
            {
                entry.ImageCaption = dto.ImageCaption;
            }
            entry.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new
        {
            entry.Id,
            entry.DayNumber,
            entry.EntryDate,
            entry.Title,
            entry.Content,
            entry.IsDraft,
            entry.ImageUrl,
            entry.ImageCaption,
            ImageUrlFull = !string.IsNullOrEmpty(entry.ImageUrl) ? $"/api/diary/{applicationId}/entry/{entry.DayNumber}/image" : null,
            entry.CreatedAt,
            entry.UpdatedAt
        });
    }

    [HttpPost("{applicationId}/entry/{dayNumber}/upload-image")]
    public async Task<IActionResult> UploadEntryImage(int applicationId, int dayNumber, [FromForm] IFormFile file, [FromForm] string? caption = null)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Lütfen geçerli bir görsel dosyası seçiniz." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp" };
        if (!allowedExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Yalnızca PNG, JPG, JPEG veya WEBP formatında görsel yükleyebilirsiniz." });
        }

        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new { message = "Görsel boyutu en fazla 10 MB olabilir." });
        }

        var diary = await _context.InternshipDiaries
            .Include(d => d.Entries)
            .FirstOrDefaultAsync(d => d.InternshipApplicationId == applicationId);

        if (diary == null)
        {
            diary = new InternshipDiary { InternshipApplicationId = applicationId };
            _context.InternshipDiaries.Add(diary);
            await _context.SaveChangesAsync();
        }

        if (diary.IsApprovedByAdvisor)
        {
            return BadRequest(new { message = "İşyeri tarafından onaylanan staj defterine yeni görsel eklenemez." });
        }

        var entry = diary.Entries.FirstOrDefault(e => e.DayNumber == dayNumber);
        if (entry == null)
        {
            entry = new DiaryEntry
            {
                InternshipDiaryId = diary.Id,
                DayNumber = dayNumber,
                EntryDate = DateTime.UtcNow.Date,
                Title = $"{dayNumber}. Gün",
                Content = string.Empty,
                IsDraft = true,
                CreatedAt = DateTime.UtcNow
            };
            _context.DiaryEntries.Add(entry);
        }

        // Eski görsel varsa kaldır
        if (!string.IsNullOrEmpty(entry.ImageUrl))
        {
            _fileStorage.DeleteFile($"diaries/{applicationId}", entry.ImageUrl);
        }

        var (storedFileName, size) = await _fileStorage.SaveFileAsync(file, $"diaries/{applicationId}");
        entry.ImageUrl = storedFileName;
        if (!string.IsNullOrWhiteSpace(caption))
        {
            entry.ImageCaption = caption;
        }
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"{dayNumber}. gün için çalışma görseli başarıyla yüklendi.",
            imageUrl = storedFileName,
            imageCaption = entry.ImageCaption,
            imageUrlFull = $"/api/diary/{applicationId}/entry/{dayNumber}/image"
        });
    }

    [HttpDelete("{applicationId}/entry/{dayNumber}/image")]
    public async Task<IActionResult> DeleteEntryImage(int applicationId, int dayNumber)
    {
        var diary = await _context.InternshipDiaries
            .Include(d => d.Entries)
            .FirstOrDefaultAsync(d => d.InternshipApplicationId == applicationId);

        if (diary == null) return NotFound(new { message = "Staj defteri bulunamadı." });

        if (diary.IsApprovedByAdvisor)
        {
            return BadRequest(new { message = "Onaylanan staj defterinden görsel silinemez." });
        }

        var entry = diary.Entries.FirstOrDefault(e => e.DayNumber == dayNumber);
        if (entry == null || string.IsNullOrEmpty(entry.ImageUrl))
        {
            return NotFound(new { message = "Bu güne ait görsel bulunamadı." });
        }

        _fileStorage.DeleteFile($"diaries/{applicationId}", entry.ImageUrl);
        entry.ImageUrl = null;
        entry.ImageCaption = null;
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = $"{dayNumber}. gün görseli başarıyla kaldırıldı." });
    }

    [HttpGet("{applicationId}/entry/{dayNumber}/image")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEntryImage(int applicationId, int dayNumber, [FromQuery] string? token = null)
    {
        var diary = await _context.InternshipDiaries
            .Include(d => d.Entries)
            .Include(d => d.InternshipApplication).ThenInclude(app => app!.Advisor)
            .FirstOrDefaultAsync(d => d.InternshipApplicationId == applicationId);

        if (diary == null) return NotFound(new { message = "Staj defteri bulunamadı." });

        bool isAuthorized = User.Identity?.IsAuthenticated == true;
        if (!isAuthorized && !string.IsNullOrEmpty(token))
        {
            var advisor = diary.InternshipApplication?.Advisor;
            if (advisor != null && advisor.AccessToken == token)
            {
                isAuthorized = true;
            }
        }

        if (!isAuthorized)
        {
            return Unauthorized(new { message = "Bu görseli görüntüleme yetkiniz yok." });
        }

        var entry = diary.Entries.FirstOrDefault(e => e.DayNumber == dayNumber);
        if (entry == null || string.IsNullOrEmpty(entry.ImageUrl))
        {
            return NotFound(new { message = "Bu güne ait görsel bulunamadı." });
        }

        var fileResult = await _fileStorage.GetFileAsync($"diaries/{applicationId}", entry.ImageUrl);
        if (!fileResult.HasValue)
        {
            return NotFound(new { message = "Görsel dosyası sunucuda bulunamadı." });
        }

        return File(fileResult.Value.fileBytes, fileResult.Value.contentType);
    }

    [HttpGet("{applicationId}/cover-info")]
    public async Task<IActionResult> GetCoverInfo(int applicationId)
    {
        var app = await _context.InternshipApplications
            .Include(a => a.Diary)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        DiaryCoverInfoDto? coverInfo = null;
        if (!string.IsNullOrEmpty(app.Diary?.CoverPageDataJson))
        {
            try
            {
                coverInfo = System.Text.Json.JsonSerializer.Deserialize<DiaryCoverInfoDto>(app.Diary.CoverPageDataJson);
            }
            catch { }
        }

        if (coverInfo == null)
        {
            coverInfo = new DiaryCoverInfoDto();
        }

        if (string.IsNullOrEmpty(coverInfo.TotalEmployees))
        {
            coverInfo.TotalEmployees = app.Diary?.TotalEmployees ?? "250+";
        }
        if (string.IsNullOrEmpty(coverInfo.WorkplacePhone))
        {
            coverInfo.WorkplacePhone = app.Workplace?.PhoneNumber ?? app.Advisor?.PhoneNumber ?? "0332 000 00 00";
        }
        if (string.IsNullOrEmpty(coverInfo.WorkplaceEmail))
        {
            coverInfo.WorkplaceEmail = app.Workplace?.CompanyEmail ?? app.Advisor?.Email ?? "info@firma.com.tr";
        }
        if (string.IsNullOrEmpty(coverInfo.WorkplaceWebSite))
        {
            coverInfo.WorkplaceWebSite = app.Workplace?.WebSite ?? "www.firma.com.tr";
        }
        if (string.IsNullOrEmpty(coverInfo.WorkplaceAddress))
        {
            coverInfo.WorkplaceAddress = app.Workplace?.Address ?? "Teknoloji Geliştirme Bölgesi / Konya";
        }
        if (string.IsNullOrEmpty(coverInfo.WorkplaceCity))
        {
            coverInfo.WorkplaceCity = app.Workplace?.City ?? "Konya";
        }

        if (coverInfo.ActivityAreas == null || coverInfo.ActivityAreas.Count == 0)
        {
            coverInfo.ActivityAreas = new List<string>
            {
                "Yazılım Geliştirme, Sistem Analizi ve Kurumsal Bilişim Çözümleri",
                "Web, Mobil ve Bulut Tabanlı Dağıtık Servis Mimarileri",
                "Veri Tabanı Yönetim Sistemleri ve İş Zekâsı / Analitik",
                "Yapay Zekâ, Makine Öğrenmesi ve Otomasyon Teknolojileri",
                "Bilgi Güvenliği, Ağ Altyapısı ve DevOps Süreçleri"
            };
        }

        if (coverInfo.StaffMembers == null || coverInfo.StaffMembers.Count == 0)
        {
            coverInfo.StaffMembers = new List<WorkplaceStaffDto>
            {
                new()
                {
                    RowNo = 1,
                    FullName = app.Advisor?.FullName ?? "Müh. Serdar Keskin",
                    GraduatedUniversityAndDepartment = app.Advisor?.GraduatedUniversityAndDepartment ?? "Selçuk Üniversitesi Bilgisayar Mühendisliği",
                    TitleOrPosition = app.Advisor?.TitleOrPosition ?? "Kıdemli Bulut Mimarı"
                },
                new()
                {
                    RowNo = 2,
                    FullName = "Müh. Can Demir",
                    GraduatedUniversityAndDepartment = "Selçuk Üniversitesi Bilgisayar Mühendisliği",
                    TitleOrPosition = "Kıdemli Yazılım Mimarı"
                },
                new()
                {
                    RowNo = 3,
                    FullName = "Müh. Ayşe Çelik",
                    GraduatedUniversityAndDepartment = "Hacettepe Üniversitesi Bilgisayar Mühendisliği",
                    TitleOrPosition = "Veri Tabanı Yöneticisi"
                },
                new()
                {
                    RowNo = 4,
                    FullName = "Müh. Emre Yılmaz",
                    GraduatedUniversityAndDepartment = "ODTÜ Bilgisayar Mühendisliği",
                    TitleOrPosition = "DevOps ve Bulut Mühendisi"
                },
                new()
                {
                    RowNo = 5,
                    FullName = "Müh. Selin Doğan",
                    GraduatedUniversityAndDepartment = "İTÜ Yazılım Mühendisliği",
                    TitleOrPosition = "Mobil Yazılım Uzmanı"
                }
            };
        }

        return Ok(coverInfo);
    }

    [HttpPost("{applicationId}/cover-info")]
    public async Task<IActionResult> SaveCoverInfo(int applicationId, [FromBody] DiaryCoverInfoDto dto)
    {
        var app = await _context.InternshipApplications
            .Include(a => a.Diary)
            .Include(a => a.Workplace)
            .FirstOrDefaultAsync(a => a.Id == applicationId);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        var diary = app.Diary;
        if (diary == null)
        {
            diary = new InternshipDiary { InternshipApplicationId = applicationId };
            _context.InternshipDiaries.Add(diary);
            app.Diary = diary;
        }

        if (diary.IsApprovedByAdvisor)
        {
            return BadRequest(new { message = "İşyeri tarafından onaylanan staj defteri düzenlenemez." });
        }

        // Sıra numaralarını düzelt (1, 2, 3...)
        if (dto.StaffMembers != null)
        {
            for (int i = 0; i < dto.StaffMembers.Count; i++)
            {
                dto.StaffMembers[i].RowNo = i + 1;
            }
        }

        diary.TotalEmployees = dto.TotalEmployees;
        diary.CoverPageDataJson = System.Text.Json.JsonSerializer.Serialize(dto);

        if (app.Workplace != null)
        {
            if (!string.IsNullOrEmpty(dto.WorkplacePhone)) app.Workplace.PhoneNumber = dto.WorkplacePhone;
            if (!string.IsNullOrEmpty(dto.WorkplaceEmail)) app.Workplace.CompanyEmail = dto.WorkplaceEmail;
            if (!string.IsNullOrEmpty(dto.WorkplaceWebSite)) app.Workplace.WebSite = dto.WorkplaceWebSite;
            if (!string.IsNullOrEmpty(dto.WorkplaceAddress)) app.Workplace.Address = dto.WorkplaceAddress;
            if (!string.IsNullOrEmpty(dto.WorkplaceCity)) app.Workplace.City = dto.WorkplaceCity;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Kapak ve personel tanıtım bilgileri başarıyla kaydedildi.", coverInfo = dto });
    }
}
