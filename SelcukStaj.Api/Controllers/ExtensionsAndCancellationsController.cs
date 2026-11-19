using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;
using SelcukStaj.Api.Services;

namespace SelcukStaj.Api.Controllers;

[ApiController]
[Route("api/applications")]
public class ExtensionsAndCancellationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWorkDayCalculator _calculator;
    private readonly IFileStorageService _fileStorage;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;

    public ExtensionsAndCancellationsController(
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
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    }

    // ==========================================
    // 1. STAJ SÜRESİ UZATMA MODÜLÜ
    // ==========================================

    public class ExtensionRequestDto
    {
        public int? RequestedExtraDays { get; set; }
        public int? ExtraDays { get => RequestedExtraDays; set => RequestedExtraDays = value; }
        public string? Reason { get; set; }
        public string? MissedDates { get; set; }
        public DateTime? AbsenceStartDate { get; set; }
        public DateTime? AbsenceEndDate { get; set; }
    }
    public class ExtensionDecisionDto
    {
        public bool Approved { get; set; }
        public bool IsApproved { get => Approved; set => Approved = value; }
        public string? Notes { get; set; }
    }

    [Authorize]
    [HttpPost("{id}/extension-request")]
    public async Task<IActionResult> RequestExtension(int id, [FromBody] ExtensionRequestDto dto)
    {
        var userId = GetCurrentUserId();
        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period)
            .Include(a => a.InsuranceRecord)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == userId);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        // Temel Kural: Mazeret izni ve staj uzatması; ancak Staj Komisyonu ve KPTO Sigorta onayı
        // tamamlanıp SGK işe giriş bildirgesi düzenlenerek staj fiilen başladıktan sonra talep edilebilir.
        if (app.Status != ApplicationStatus.InsuranceStarted && app.Status != ApplicationStatus.InProgress)
        {
            return BadRequest(new { 
                message = "Staj süresi uzatma ve mazeret izni talebi, ancak Staj Komisyonu ve KPTO Sigorta Masası onayları tamamlanıp SGK girişi yapılarak staj fiilen başladıktan sonra verilebilir. Mevcut staj durumunuz (" + app.Status + ") henüz bu aşamaya uygun değildir." 
            });
        }

        if (app.CommissionDecision != CommissionDecisionType.Approved && app.Status < ApplicationStatus.ApprovedByCommission)
        {
            return BadRequest(new { 
                message = "Staj başvurunuz henüz Bölüm Staj Komisyonu tarafından onaylanmamıştır. Uzatma veya mazeret izni talebinde bulunabilmek için Komisyon onayının tamamlanması gerekmektedir." 
            });
        }

        if (app.InsuranceRecord == null || app.InsuranceRecord.Status != InsuranceStatus.Started)
        {
            return BadRequest(new { 
                message = "KPTO Sigorta Masası tarafından SGK işe giriş bildirgeniz onaylanıp sigortanız fiilen başlatılmadan staj uzatma veya mazeret izni talebinde bulunulamaz." 
            });
        }

        int extraDays = 0;
        string missedDatesStr = string.Empty;

        if (dto.AbsenceStartDate.HasValue && dto.AbsenceEndDate.HasValue)
        {
            extraDays = await _calculator.CalculateWorkDaysBetweenAsync(dto.AbsenceStartDate.Value, dto.AbsenceEndDate.Value, app.IncludesSaturday);
            missedDatesStr = !string.IsNullOrWhiteSpace(dto.MissedDates)
                ? dto.MissedDates
                : (dto.AbsenceStartDate.Value.Date == dto.AbsenceEndDate.Value.Date
                    ? $"{dto.AbsenceStartDate.Value:dd.MM.yyyy} (1 İş Günü)"
                    : $"{dto.AbsenceStartDate.Value:dd.MM.yyyy} - {dto.AbsenceEndDate.Value:dd.MM.yyyy} ({extraDays} İş Günü)");
        }
        else if (dto.RequestedExtraDays.HasValue && dto.RequestedExtraDays.Value > 0)
        {
            extraDays = dto.RequestedExtraDays.Value;
            missedDatesStr = !string.IsNullOrWhiteSpace(dto.MissedDates) ? dto.MissedDates : $"{extraDays} İş Günü Telafi";
        }

        if (extraDays <= 0 || extraDays > 30)
        {
            return BadRequest(new { message = "Seçilen tarihler için hesaplanan telafi iş günü 1 ile 30 gün arasında olmalıdır." });
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            return BadRequest(new { message = "Lütfen staj uzatma ve mazeret gerekçenizi belirtiniz." });
        }

        var newEndDate = await _calculator.CalculateMakeUpDateAsync(app.CurrentEndDate, extraDays, app.IncludesSaturday);

        var fullReason = !string.IsNullOrWhiteSpace(missedDatesStr)
            ? $"[Gelemeyeceği Tarihler: {missedDatesStr}] {dto.Reason.Trim()}"
            : dto.Reason.Trim();

        app.HasExtensionRequest = true;
        app.ExtensionExtraDays = extraDays;
        app.ExtensionMissedDates = missedDatesStr;
        app.ExtensionReason = fullReason;
        app.ExtensionRequestedAt = DateTime.UtcNow;
        app.IsExtensionApprovedByCommission = false;
        app.IsExtensionSgkProcessedByKPTO = false;

        var extReq = new InternshipExtensionRequest
        {
            InternshipApplicationId = app.Id,
            RequestedExtraDays = extraDays,
            MissedDates = missedDatesStr,
            Reason = fullReason,
            OriginalEndDate = app.CurrentEndDate,
            NewCalculatedEndDate = newEndDate,
            Status = ExtensionStatus.PendingCommission,
            CreatedAt = DateTime.UtcNow
        };
        _context.InternshipExtensionRequests.Add(extReq);

        // Komisyona Bildirim Gönder
        var studentName = app.Student?.FullName ?? "Öğrenci";
        var commissionUsers = await _context.Users
            .Where(u => u.Role == UserRole.CommissionMember || u.Role == UserRole.DepartmentHead)
            .ToListAsync();

        foreach (var comm in commissionUsers)
        {
            await _notificationService.SendNotificationAsync(
                comm.Id,
                "⏱️ Yeni Staj Uzatma Talebi",
                $"{studentName} stajını {extraDays} iş günü uzatmak istiyor. Gerekçe: {dto.Reason}",
                NotificationType.Info,
                app.Id
            );
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Staj uzatma talebiniz ({extraDays} gün) başarıyla Bölüm Staj Komisyonu'na iletildi.",
            originalEndDate = app.CurrentEndDate,
            proposedEndDate = newEndDate,
            extraDays = extraDays
        });
    }

    [Authorize]
    [HttpPost("{id}/extension-decision")]
    public async Task<IActionResult> DecideExtension(int id, [FromBody] ExtensionDecisionDto dto)
    {
        var role = GetCurrentUserRole();
        if (role != UserRole.CommissionMember.ToString() && role != UserRole.DepartmentHead.ToString())
        {
            return Forbid();
        }

        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.InsuranceRecord)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        var userId = GetCurrentUserId();
        var currentUser = await _context.Users.FindAsync(userId);
        var studentDept = app.Student?.StudentProfile?.Department ?? app.Student?.Department;

        if (!app.HasExtensionRequest)
        {
            return BadRequest(new { message = "Bu başvuru için aktif bir uzatma talebi bulunmuyor." });
        }

        var extReq = await _context.InternshipExtensionRequests
            .Where(e => e.InternshipApplicationId == app.Id && e.Status == ExtensionStatus.PendingCommission)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        if (dto.Approved)
        {
            app.IsExtensionApprovedByCommission = true;
            app.ExtensionCommissionApprovedAt = DateTime.UtcNow;

            if (extReq != null)
            {
                extReq.Status = ExtensionStatus.ApprovedByCommission;
                extReq.CommissionApprovedAt = DateTime.UtcNow;
                extReq.CommissionNotes = dto.Notes;
            }

            // Öğrenciye Bildirim
            await _notificationService.SendNotificationAsync(
                app.StudentId,
                "✅ Staj Uzatma Talebiniz Komisyonca Onaylandı",
                $"Staj uzatma talebiniz Staj Komisyonu tarafından onaylandı ve SGK ek prim bildirimi için KPTO masasına aktarıldı.",
                NotificationType.Success,
                app.Id
            );

            // KPTO Memurlarına Bildirim
            var kptoUsers = await _context.Users.Where(u => u.Role == UserRole.KPTOOfficer).ToListAsync();
            foreach (var kpto in kptoUsers)
            {
                await _notificationService.SendNotificationAsync(
                    kpto.Id,
                    "🛡️ Onaylanmış Staj Uzatması (SGK Ek Tescil Gerekli)",
                    $"{app.Student?.FullName ?? "Öğrenci"} için {app.ExtensionExtraDays} günlük staj uzatması komisyonca onaylandı. Lütfen SGK tescilini güncelleyiniz.",
                    NotificationType.Warning,
                    app.Id
                );
            }
        }
        else
        {
            app.HasExtensionRequest = false;
            app.IsExtensionApprovedByCommission = false;

            if (extReq != null)
            {
                extReq.Status = ExtensionStatus.RejectedByCommission;
                extReq.CommissionNotes = dto.Notes;
            }

            await _notificationService.SendNotificationAsync(
                app.StudentId,
                "❌ Staj Uzatma Talebiniz Reddedildi",
                $"Staj uzatma talebiniz komisyon tarafından uygun görülmedi. Gerekçe: {dto.Notes ?? "Gerekçe belirtilmedi."}",
                NotificationType.Error,
                app.Id
            );
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = dto.Approved ? "Uzatma talebi onaylandı ve KPTO'ya bildirildi." : "Uzatma talebi reddedildi." });
    }

    // ==========================================
    // 2. STAJ İPTAL FORMU (FORM 7) MODÜLÜ
    // ==========================================

    public class CancelDecisionDto
    {
        public bool Approved { get; set; }
        public bool IsApproved { get => Approved; set => Approved = value; }
        public string? Notes { get; set; }
    }

    [Authorize]
    [HttpPost("{id}/cancel-request")]
    public async Task<IActionResult> RequestCancellation(int id, [FromForm] string reason, IFormFile? cancelForm, IFormFile? cancelFormDocument)
    {
        var userId = GetCurrentUserId();
        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Period)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == userId);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        if (string.IsNullOrWhiteSpace(reason))
        {
            return BadRequest(new { message = "Lütfen staj iptal gerekçesini açıklayınız." });
        }

        var effectiveFile = cancelForm ?? cancelFormDocument ?? (Request.HasFormContentType && Request.Form.Files.Count > 0 ? Request.Form.Files[0] : null);
        string storedFileName = "FORM7_Staj_Iptal_Formu.docx";
        if (effectiveFile != null && effectiveFile.Length > 0)
        {
            try
            {
                var (name, _) = await _fileStorage.SaveFileAsync(effectiveFile, $"applications/{app.Id}/cancellations");
                storedFileName = name;
            }
            catch
            {
                storedFileName = effectiveFile.FileName;
            }
        }

        app.HasCancelRequest = true;
        app.CancelReason = reason;
        app.CancelFormDocumentPath = storedFileName;
        app.CancelRequestedAt = DateTime.UtcNow;
        app.IsCancelApprovedByCommission = false;

        // Komisyona Bildirim Gönder
        var studentName = app.Student?.FullName ?? "Öğrenci";
        var commissionUsers = await _context.Users
            .Where(u => u.Role == UserRole.CommissionMember || u.Role == UserRole.DepartmentHead)
            .ToListAsync();

        foreach (var comm in commissionUsers)
        {
            await _notificationService.SendNotificationAsync(
                comm.Id,
                "🚨 Yeni Staj İptal Talebi (Form 7)",
                $"{studentName} mazeret/sağlık nedeniyle stajını iptal etmek istiyor. Gerekçe: {reason}",
                NotificationType.Warning,
                app.Id
            );
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Staj iptal başvurunuz ve Form 7 belgeniz Staj Komisyonu'na iletildi.",
            hasCancelRequest = true,
            cancelReason = reason
        });
    }

    [Authorize]
    [HttpPost("{id}/cancel-decision")]
    public async Task<IActionResult> DecideCancellation(int id, [FromBody] CancelDecisionDto dto)
    {
        var role = GetCurrentUserRole();
        if (role != UserRole.CommissionMember.ToString() && role != UserRole.DepartmentHead.ToString())
        {
            return Forbid();
        }

        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.InsuranceRecord)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });

        var userId = GetCurrentUserId();
        var currentUser = await _context.Users.FindAsync(userId);
        var studentDept = app.Student?.StudentProfile?.Department ?? app.Student?.Department;

        if (!app.HasCancelRequest)
        {
            return BadRequest(new { message = "Bu başvuru için aktif bir staj iptal talebi bulunmuyor." });
        }

        if (dto.Approved)
        {
            app.Status = ApplicationStatus.Cancelled;
            app.IsCancelApprovedByCommission = true;
            app.CancelCommissionApprovedAt = DateTime.UtcNow;
            app.CancelCommissionNotes = dto.Notes;

            if (app.InsuranceRecord != null)
            {
                app.InsuranceRecord.Status = InsuranceStatus.Cancelled;
                app.InsuranceRecord.Notes = $"Staj komisyonca iptal edildi. {DateTime.Now:dd.MM.yyyy}";
            }

            // Öğrenciye Bildirim
            await _notificationService.SendNotificationAsync(
                app.StudentId,
                "🚫 Staj İptal Talebiniz Kabul Edildi",
                $"Mazeret gerekçeniz uygun bulunarak stajınız resmen iptal edilmiştir. Gerekçe notu: {dto.Notes ?? "Gerekçe uygun görüldü."}",
                NotificationType.Info,
                app.Id
            );

            // KPTO Memuruna Acil SGK Çıkış Bildirimi
            var kptoUsers = await _context.Users.Where(u => u.Role == UserRole.KPTOOfficer).ToListAsync();
            foreach (var kpto in kptoUsers)
            {
                await _notificationService.SendNotificationAsync(
                    kpto.Id,
                    "⚠️ Staj İptali: Acil SGK Çıkışı Yapılacak",
                    $"{app.Student?.FullName ?? "Öğrenci"} stajı iptal edildi. 5510/5-b kapsamında SGK sigorta çıkış bildirgesi verilmelidir.",
                    NotificationType.Error,
                    app.Id
                );
            }
        }
        else
        {
            app.HasCancelRequest = false;
            app.IsCancelApprovedByCommission = false;
            app.CancelCommissionNotes = dto.Notes;

            await _notificationService.SendNotificationAsync(
                app.StudentId,
                "❌ Staj İptal Talebiniz Reddedildi",
                $"Staj iptal başvurunuz komisyon tarafından uygun görülmedi. Stajınıza devam etmeniz gerekmektedir. Komisyon Notu: {dto.Notes ?? "Yetersiz mazeret."}",
                NotificationType.Warning,
                app.Id
            );
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = dto.Approved ? "Staj iptal edildi ve KPTO'ya SGK çıkışı için iletildi." : "Staj iptal talebi reddedildi." });
    }

    // ==========================================
    // 3. STAJ BAŞVURUSUNA DEKONT EKLEME
    // ==========================================

    [Authorize]
    [HttpPost("{id}/upload-receipt")]
    public async Task<IActionResult> UploadReceipt(int id, IFormFile receiptFile)
    {
        var userId = GetCurrentUserId();
        var app = await _context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .FirstOrDefaultAsync(a => a.Id == id && a.StudentId == userId);

        if (app == null) return NotFound(new { message = "Staj başvurusu bulunamadı." });
        if (receiptFile == null || receiptFile.Length == 0)
        {
            return BadRequest(new { message = "Lütfen geçerli bir dekont belgesi yükleyiniz." });
        }

        var (storedFileName, _) = await _fileStorage.SaveFileAsync(receiptFile, $"applications/{app.Id}/receipts");

        app.ReceiptDocumentPath = storedFileName;
        app.ReceiptUploadedAt = DateTime.UtcNow;
        app.IsReceiptVerifiedByKPTO = false;

        // SalaryReceipt kaydı oluştur
        var receipt = new SalaryReceipt
        {
            InternshipApplicationId = app.Id,
            MonthAndYear = DateTime.Now.ToString("MMMM yyyy", new System.Globalization.CultureInfo("tr-TR")),
            DocumentPath = storedFileName,
            UploadedAt = DateTime.UtcNow,
            SentToKPTO = true
        };
        _context.SalaryReceipts.Add(receipt);

        // KPTO Memurlarına Bildirim Gönder
        var kptoUsers = await _context.Users.Where(u => u.Role == UserRole.KPTOOfficer).ToListAsync();
        foreach (var kpto in kptoUsers)
        {
            await _notificationService.SendNotificationAsync(
                kpto.Id,
                "💳 Yeni Staj Ücret / Katkı Payı Dekontu",
                $"{app.Student?.FullName ?? "Öğrenci"} tarafından staj dekont belgesi yüklendi. KPTO masasında doğrulanmayı bekliyor.",
                NotificationType.Info,
                app.Id
            );
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Dekont belgesi başarıyla yüklendi ve KPTO sigorta masasına iletildi.",
            receiptPath = storedFileName
        });
    }
}
