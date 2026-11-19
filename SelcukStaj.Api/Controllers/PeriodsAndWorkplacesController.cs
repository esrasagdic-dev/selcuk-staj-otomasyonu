using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PeriodsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PeriodsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActivePeriods()
    {
        var year = await _context.AcademicYears
            .Include(y => y.Periods.Where(p => p.IsActive))
            .FirstOrDefaultAsync(y => y.IsActive);

        if (year == null)
        {
            return NotFound(new { message = "Aktif staj dönemi bulunamadı." });
        }

        return Ok(new
        {
            AcademicYear = year.Title,
            year.StartDate,
            year.EndDate,
            Periods = year.Periods.Select(p => new
            {
                p.Id,
                p.Title,
                Type = p.Type.ToString(),
                p.DefaultWorkDays,
                p.ApplicationStartDate,
                p.ApplicationEndDate,
                p.EarliestStartDate,
                p.LatestEndDate,
                p.DocumentDeadlineDate,
                p.IsSaturdayAllowed,
                p.IsActive
            })
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAllPeriods()
    {
        var periods = await _context.InternshipPeriods
            .Include(p => p.AcademicYear)
            .OrderByDescending(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.Title,
                Type = p.Type.ToString(),
                p.DefaultWorkDays,
                p.ApplicationStartDate,
                p.ApplicationEndDate,
                p.EarliestStartDate,
                p.LatestEndDate,
                p.DocumentDeadlineDate,
                p.IsSaturdayAllowed,
                p.IsActive,
                AcademicYear = p.AcademicYear != null ? p.AcademicYear.Title : "2026-2027",
                ApplicationCount = p.Applications.Count
            })
            .ToListAsync();

        return Ok(periods);
    }

    public class CreatePeriodDto
    {
        public string Title { get; set; } = string.Empty;
        public int Type { get; set; } = 1; // 1: Staj1, 2: Staj2
        public int DefaultWorkDays { get; set; } = 20;
        public DateTime ApplicationStartDate { get; set; }
        public DateTime ApplicationEndDate { get; set; }
        public DateTime EarliestStartDate { get; set; }
        public DateTime LatestEndDate { get; set; }
        public DateTime DocumentDeadlineDate { get; set; }
        public bool IsSaturdayAllowed { get; set; } = true;
        public bool PublishAnnouncement { get; set; } = true;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePeriod([FromBody] CreatePeriodDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Dönem başlığı zorunludur." });
        }

        var activeYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive);
        if (activeYear == null)
        {
            activeYear = new AcademicYear
            {
                Title = "2026-2027",
                StartDate = new DateTime(2026, 9, 1),
                EndDate = new DateTime(2027, 8, 31),
                IsActive = true
            };
            _context.AcademicYears.Add(activeYear);
            await _context.SaveChangesAsync();
        }

        var period = new InternshipPeriod
        {
            AcademicYearId = activeYear.Id,
            Title = dto.Title.Trim(),
            Type = dto.Type == 2 ? InternshipType.Staj2 : InternshipType.Staj1,
            DefaultWorkDays = dto.DefaultWorkDays > 0 ? dto.DefaultWorkDays : 20,
            ApplicationStartDate = dto.ApplicationStartDate,
            ApplicationEndDate = dto.ApplicationEndDate,
            EarliestStartDate = dto.EarliestStartDate,
            LatestEndDate = dto.LatestEndDate,
            DocumentDeadlineDate = dto.DocumentDeadlineDate,
            IsSaturdayAllowed = dto.IsSaturdayAllowed,
            IsActive = true
        };

        _context.InternshipPeriods.Add(period);
        await _context.SaveChangesAsync();

        if (dto.PublishAnnouncement)
        {
            var periodName = period.Type == InternshipType.Staj1 ? "Staj 1" : "Staj 2";
            var announcement = new Announcement
            {
                Title = $"📢 Yeni Staj Dönemi Açıldı: {period.Title}",
                Summary = $"{periodName} için staj başvuruları açılmıştır. Başvuru Aralığı: {period.ApplicationStartDate:dd.MM.yyyy} - {period.ApplicationEndDate:dd.MM.yyyy}",
                Content = $"Selçuk Üniversitesi Teknoloji Fakültesi Staj Komisyonu tarafından yeni bir staj dönemi açılmıştır.\n\n" +
                          $"• Dönem: {period.Title}\n" +
                          $"• Başvuru Kabul Tarihleri: {period.ApplicationStartDate:dd.MM.yyyy} - {period.ApplicationEndDate:dd.MM.yyyy}\n" +
                          $"• Staj Yapılabilecek Tarihler: {period.EarliestStartDate:dd.MM.yyyy} - {period.LatestEndDate:dd.MM.yyyy}\n" +
                          $"• Defter/Evrak Son Teslim Tarihi: {period.DocumentDeadlineDate:dd.MM.yyyy}\n" +
                          $"• Varsayılan Süre: {period.DefaultWorkDays} İş Günü\n" +
                          $"• Cumartesi Çalışması: {(period.IsSaturdayAllowed ? "İzin Veriliyor" : "İzin Verilmiyor")}\n\n" +
                          $"Tüm öğrencilerimizin süresi içerisinde başvurularını ve Form 2 belgelerini tamamlamaları önemle rica olunur.",
                Category = "Dönem Açılışı",
                CreatedAt = DateTime.UtcNow,
                IsPublished = true,
                Author = "Staj Komisyonu",
                RelatedPeriodId = period.Id
            };
            _context.Announcements.Add(announcement);

            // Tüm aktif öğrencilere duyuru bildirimi gönder
            var activeStudents = await _context.Users.Where(u => u.Role == UserRole.Student && u.IsActive).ToListAsync();
            foreach (var student in activeStudents)
            {
                _context.UserNotifications.Add(new UserNotification
                {
                    UserId = student.Id,
                    Title = $"📢 Yeni Staj Dönemi Açıldı: {period.Title}",
                    Message = $"{period.Title} için staj başvuruları {period.ApplicationStartDate:dd.MM.yyyy} - {period.ApplicationEndDate:dd.MM.yyyy} tarihleri arasında kabul edilmektedir.",
                    Type = NotificationType.Info,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                });
            }

            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Yeni staj dönemi başarıyla açıldı ve öğrencilere toplu duyuru iletildi.", periodId = period.Id });
    }

    [HttpPut("{id}/toggle-active")]
    public async Task<IActionResult> TogglePeriodActive(int id)
    {
        var period = await _context.InternshipPeriods.FindAsync(id);
        if (period == null) return NotFound(new { message = "Staj dönemi bulunamadı." });

        period.IsActive = !period.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Dönem durumu güncellendi: {(period.IsActive ? "Aktif" : "Pasif/Kapatıldı")}", isActive = period.IsActive });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePeriod(int id)
    {
        var period = await _context.InternshipPeriods.Include(p => p.Applications).FirstOrDefaultAsync(p => p.Id == id);
        if (period == null) return NotFound(new { message = "Staj dönemi bulunamadı." });

        if (period.Applications.Any())
        {
            // Kayıtlı başvuru varsa fiziksel silme yerine pasife çek
            period.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Bu döneme ait kayıtlı başvurular bulunduğu için dönem arşivlenmiş ve pasife alınmıştır." });
        }

        var relatedAnnouncements = await _context.Announcements.Where(a => a.RelatedPeriodId == id).ToListAsync();
        foreach (var ann in relatedAnnouncements)
        {
            ann.RelatedPeriodId = null;
        }

        _context.InternshipPeriods.Remove(period);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Staj dönemi başarıyla silindi." });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePeriod(int id, [FromBody] UpdatePeriodDto dto)
    {
        var period = await _context.InternshipPeriods.FindAsync(id);
        if (period == null) return NotFound(new { message = "Staj dönemi bulunamadı." });

        if (dto.ApplicationStartDate > dto.ApplicationEndDate)
        {
            return BadRequest(new { message = "Başvuru başlangıç tarihi, bitiş tarihinden sonra olamaz." });
        }

        if (dto.EarliestStartDate > dto.LatestEndDate)
        {
            return BadRequest(new { message = "Staj en erken başlangıç tarihi, en geç bitiş tarihinden sonra olamaz." });
        }

        period.ApplicationStartDate = dto.ApplicationStartDate;
        period.ApplicationEndDate = dto.ApplicationEndDate;
        period.EarliestStartDate = dto.EarliestStartDate;
        period.LatestEndDate = dto.LatestEndDate;
        period.DocumentDeadlineDate = dto.DocumentDeadlineDate;
        period.IsSaturdayAllowed = dto.IsSaturdayAllowed;
        if (dto.DefaultWorkDays == 20 || dto.DefaultWorkDays == 30)
        {
            period.DefaultWorkDays = dto.DefaultWorkDays;
        }

        if (dto.PublishAnnouncement)
        {
            var periodName = period.Type == InternshipType.Staj1 ? "Staj 1" : "Staj 2";
            var announcementTitle = !string.IsNullOrWhiteSpace(dto.CustomAnnouncementTitle)
                ? dto.CustomAnnouncementTitle
                : $"2026-2027 {periodName} Başvuru ve Staj Takvimi Güncellendi";

            var content = 
                $"Selçuk Üniversitesi Staj Komisyonu tarafından belirlenen güncel staj takvimi:\n\n" +
                $"• Başvuru Kabul Tarihleri: {period.ApplicationStartDate:dd.MM.yyyy} - {period.ApplicationEndDate:dd.MM.yyyy}\n" +
                $"• Staj Yapılabilecek Tarih Aralığı: {period.EarliestStartDate:dd.MM.yyyy} - {period.LatestEndDate:dd.MM.yyyy}\n" +
                $"• Defter ve Belge Son Teslim Tarihi: {period.DocumentDeadlineDate:dd.MM.yyyy}\n" +
                $"• Cumartesi Çalışması: {(period.IsSaturdayAllowed ? "Kabul Ediliyor" : "Kabul Edilmiyor")}\n" +
                $"• Varsayılan Staj Süresi: {period.DefaultWorkDays} İş Günü\n\n" +
                $"{(string.IsNullOrWhiteSpace(dto.CustomAnnouncementNote) ? "" : "Komisyon Notu: " + dto.CustomAnnouncementNote + "\n\n")}" +
                $"Öğrencilerimizin başvurularını belirtilen başvuru tarihleri içerisinde tamamlamaları ve staj başlangıç tarihlerini izin verilen aralıkta seçmeleri gerekmektedir.";

            var announcement = new Announcement
            {
                Title = announcementTitle,
                Summary = $"{periodName} için başvuru kabul ({period.ApplicationStartDate:dd.MM.yyyy} - {period.ApplicationEndDate:dd.MM.yyyy}) ve staj tarihleri ({period.EarliestStartDate:dd.MM.yyyy} - {period.LatestEndDate:dd.MM.yyyy}) güncellendi.",
                Content = content,
                Category = "Takvim",
                CreatedAt = DateTime.Now,
                IsPublished = true,
                Author = "Staj Komisyonu",
                RelatedPeriodId = period.Id
            };
            _context.Announcements.Add(announcement);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Staj dönemi takvimi başarıyla güncellendi ve duyurusu oluşturuldu.",
            period = new
            {
                period.Id,
                period.Title,
                Type = period.Type.ToString(),
                period.DefaultWorkDays,
                period.ApplicationStartDate,
                period.ApplicationEndDate,
                period.EarliestStartDate,
                period.LatestEndDate,
                period.DocumentDeadlineDate,
                period.IsSaturdayAllowed
            }
        });
    }
}

public class UpdatePeriodDto
{
    public DateTime ApplicationStartDate { get; set; }
    public DateTime ApplicationEndDate { get; set; }
    public DateTime EarliestStartDate { get; set; }
    public DateTime LatestEndDate { get; set; }
    public DateTime DocumentDeadlineDate { get; set; }
    public bool IsSaturdayAllowed { get; set; }
    public int DefaultWorkDays { get; set; } = 20;
    public bool PublishAnnouncement { get; set; } = true;
    public string? CustomAnnouncementTitle { get; set; }
    public string? CustomAnnouncementNote { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class WorkplacesController : ControllerBase
{
    private readonly AppDbContext _context;

    public WorkplacesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchWorkplaces([FromQuery] string? q)
    {
        var query = _context.Workplaces.AsNoTracking().Where(w => w.IsApproved);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(w => w.Name.ToLower().Contains(term) || w.City.ToLower().Contains(term));
        }

        var results = await query
            .OrderBy(w => w.Name)
            .Take(20)
            .Select(w => new
            {
                w.Id,
                w.Name,
                w.City,
                w.Address,
                w.WebSite,
                w.PhoneNumber,
                w.CompanyEmail,
                w.Sector
            })
            .ToListAsync();

        return Ok(results);
    }

    public record CreateWorkplaceDto(
        string Name,
        string TaxNumber,
        string City,
        string Address,
        string WebSite,
        string PhoneNumber,
        string CompanyEmail,
        string Sector
    );

    [HttpPost]
    public async Task<IActionResult> CreateWorkplace([FromBody] CreateWorkplaceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Firma adı zorunludur." });
        }

        // Benzer isim kontrolü
        var existing = await _context.Workplaces
            .FirstOrDefaultAsync(w => w.Name.ToLower() == dto.Name.Trim().ToLower());

        if (existing != null)
        {
            return Ok(existing);
        }

        var workplace = new Workplace
        {
            Name = dto.Name.Trim(),
            TaxNumber = dto.TaxNumber ?? string.Empty,
            City = dto.City ?? "Konya",
            Address = dto.Address ?? string.Empty,
            WebSite = dto.WebSite ?? string.Empty,
            PhoneNumber = dto.PhoneNumber ?? string.Empty,
            CompanyEmail = dto.CompanyEmail ?? string.Empty,
            Sector = dto.Sector ?? "Yazılım / Bilişim",
            IsApproved = true
        };

        _context.Workplaces.Add(workplace);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(SearchWorkplaces), new { id = workplace.Id }, workplace);
    }
}
