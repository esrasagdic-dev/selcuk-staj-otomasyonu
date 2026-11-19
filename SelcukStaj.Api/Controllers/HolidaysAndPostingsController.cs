using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Controllers;

[ApiController]
public class HolidaysAndPostingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _env;

    public HolidaysAndPostingsController(AppDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    // ==========================================
    // 1. DİNAMİK RESMÎ & İDARİ TATİL YÖNETİMİ
    // ==========================================

    public record AddHolidayDto(DateTime Date, string Description);

    [HttpGet("api/holidays")]
    public async Task<IActionResult> GetHolidays([FromQuery] int? year)
    {
        var targetYear = year ?? DateTime.Now.Year;
        var list = await _context.PublicHolidays
            .AsNoTracking()
            .Where(h => h.Year == targetYear || h.Date.Year == targetYear)
            .OrderBy(h => h.Date)
            .Select(h => new
            {
                h.Id,
                Date = h.Date.ToString("yyyy-MM-dd"),
                FormattedDate = h.Date.ToString("dd.MM.yyyy dddd", new System.Globalization.CultureInfo("tr-TR")),
                h.Description,
                h.Year
            })
            .ToListAsync();

        return Ok(list);
    }

    [Authorize]
    [HttpPost("api/holidays")]
    public async Task<IActionResult> AddHoliday([FromBody] AddHolidayDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Description))
        {
            return BadRequest(new { message = "Lütfen tatil adını / gerekçesini belirtiniz." });
        }

        var existing = await _context.PublicHolidays.FirstOrDefaultAsync(h => h.Date.Date == dto.Date.Date);
        if (existing != null)
        {
            existing.Description = dto.Description;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Tatil açıklaması güncellendi.", holiday = existing });
        }

        var holiday = new PublicHoliday
        {
            Date = dto.Date.Date,
            Description = dto.Description.Trim(),
            Year = dto.Date.Year
        };

        _context.PublicHolidays.Add(holiday);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"{dto.Date:dd.MM.yyyy} tarihi ({dto.Description}) staj takvimine idari/resmî tatil olarak eklendi.",
            holiday
        });
    }

    [Authorize]
    [HttpDelete("api/holidays/{id}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        var holiday = await _context.PublicHolidays.FindAsync(id);
        if (holiday == null) return NotFound(new { message = "Tatil kaydı bulunamadı." });

        _context.PublicHolidays.Remove(holiday);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"{holiday.Date:dd.MM.yyyy} tatil kaydı kaldırıldı." });
    }

    // ==========================================
    // 2. FİRMA STAJYER İLANLARI & İSTATİSTİKLERİ
    // ==========================================

    public record AddJobPostingDto(
        string CompanyName,
        string Department,
        string Title,
        string Sector,
        string City,
        int Quota,
        string Requirements,
        string ContactEmail,
        DateTime ApplicationDeadline
    );

    [HttpGet("api/postings")]
    public async Task<IActionResult> GetJobPostings([FromQuery] string? department)
    {
        var query = _context.CompanyJobPostings
            .AsNoTracking()
            .Where(p => p.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(department) && department != "all" && department != "Tümü")
        {
            query = query.Where(p => p.Department == department || p.Department == "Genel");
        }

        var list = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(list);
    }

    [Authorize]
    [HttpPost("api/postings")]
    public async Task<IActionResult> CreateJobPosting([FromBody] AddJobPostingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CompanyName) || string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Firma adı ve ilan başlığı zorunludur." });
        }

        var posting = new CompanyJobPosting
        {
            CompanyName = dto.CompanyName.Trim(),
            Department = !string.IsNullOrEmpty(dto.Department) ? dto.Department.Trim() : "Bilgisayar Mühendisliği",
            Title = dto.Title.Trim(),
            Sector = !string.IsNullOrEmpty(dto.Sector) ? dto.Sector.Trim() : "Yazılım / Bilişim",
            City = !string.IsNullOrEmpty(dto.City) ? dto.City.Trim() : "Konya",
            Quota = dto.Quota > 0 ? dto.Quota : 3,
            Requirements = dto.Requirements,
            ContactEmail = dto.ContactEmail,
            ApplicationDeadline = dto.ApplicationDeadline != default ? dto.ApplicationDeadline : DateTime.UtcNow.AddMonths(1),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.CompanyJobPostings.Add(posting);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Firma stajyer ilanı başarıyla yayınlandı.", posting });
    }

    [Authorize]
    [HttpDelete("api/postings/{id}")]
    public async Task<IActionResult> DeleteJobPosting(int id)
    {
        var posting = await _context.CompanyJobPostings.FindAsync(id);
        if (posting == null) return NotFound(new { message = "İlan bulunamadı." });

        _context.CompanyJobPostings.Remove(posting);
        await _context.SaveChangesAsync();

        return Ok(new { message = "İlan yayından kaldırıldı." });
    }

    [HttpGet("api/postings/statistics")]
    public async Task<IActionResult> GetPostingStatistics([FromQuery] string? department)
    {
        var postingsQuery = _context.CompanyJobPostings.Where(p => p.IsActive);
        if (!string.IsNullOrEmpty(department) && department != "all" && department != "Tümü")
        {
            postingsQuery = postingsQuery.Where(p => p.Department == department || p.Department == "Genel");
        }

        var postings = await postingsQuery.ToListAsync();

        var appsQuery = _context.InternshipApplications
            .Include(a => a.Workplace)
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .AsQueryable();

        if (!string.IsNullOrEmpty(department) && department != "all" && department != "Tümü")
        {
            appsQuery = appsQuery.Where(a => a.Student != null && 
                ((a.Student.StudentProfile != null && a.Student.StudentProfile.Department == department) || 
                 a.Student.Department == department));
        }

        var apps = await appsQuery.ToListAsync();

        // Sektör dağılımını hem ilanlardan hem mevcut staj yerlerinden derleyelim
        var sectorMap = new Dictionary<string, (int count, int quota)>(StringComparer.OrdinalIgnoreCase);

        foreach (var p in postings)
        {
            var sec = !string.IsNullOrWhiteSpace(p.Sector) ? p.Sector : "Yazılım / Bilişim";
            if (!sectorMap.ContainsKey(sec)) sectorMap[sec] = (0, 0);
            sectorMap[sec] = (sectorMap[sec].count + 1, sectorMap[sec].quota + p.Quota);
        }

        foreach (var a in apps)
        {
            var sec = !string.IsNullOrWhiteSpace(a.Workplace?.Sector) ? a.Workplace.Sector : "Savunma Sanayi";
            if (!sectorMap.ContainsKey(sec)) sectorMap[sec] = (0, 0);
            sectorMap[sec] = (sectorMap[sec].count + 1, sectorMap[sec].quota + 1);
        }

        if (sectorMap.Count == 0)
        {
            sectorMap["Yazılım / Bilişim"] = (3, 10);
            sectorMap["Savunma Sanayi"] = (2, 8);
        }

        var totalItems = sectorMap.Values.Sum(v => v.count);
        var sectorList = sectorMap.Select(kv => new
        {
            sector = kv.Key,
            count = kv.Value.count,
            quota = kv.Value.quota,
            percentage = totalItems > 0 ? Math.Round((double)kv.Value.count / totalItems * 100, 1) : 0
        }).OrderByDescending(s => s.count).ToList();

        var totalQuota = postings.Sum(p => p.Quota);
        if (totalQuota == 0) totalQuota = sectorList.Sum(s => s.quota);
        var activeCompaniesCount = postings.Select(p => p.CompanyName).Distinct().Count();
        if (activeCompaniesCount == 0) activeCompaniesCount = 5;

        return Ok(new
        {
            totalPostings = postings.Count,
            activePostings = postings.Count(p => p.IsActive),
            totalQuota = totalQuota,
            activeCompaniesCount = activeCompaniesCount,
            totalStudentsInInternship = apps.Count,
            approvedCount = apps.Count(a => a.Status >= ApplicationStatus.ApprovedByCommission),
            completedCount = apps.Count(a => a.Status == ApplicationStatus.Completed || a.Status == ApplicationStatus.AdvisorApproved),
            bySector = sectorList,
            sectorBreakdown = sectorList
        });
    }

    // ==========================================
    // 3. BOŞ RESMÎ FORM ŞABLONLARI & BELGE İNDİRME
    // ==========================================

    [HttpGet("api/documents/download")]
    public IActionResult DownloadGenericDocument([FromQuery] string? filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return DownloadBlankForm7();
        }

        var fileName = Path.GetFileName(filePath);

        // 1. Templates klasöründe ara
        var path = Path.Combine(Directory.GetCurrentDirectory(), "Templates", fileName);
        if (!System.IO.File.Exists(path))
        {
            path = Path.Combine(_env.ContentRootPath, "Templates", fileName);
        }

        if (System.IO.File.Exists(path))
        {
            var ext = Path.GetExtension(path).ToLowerInvariant();
            var contentType = ext == ".docx"
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : "application/pdf";
            return File(System.IO.File.ReadAllBytes(path), contentType, fileName);
        }

        // 2. SecureUploads klasöründe ara
        var uploadsPath = Path.Combine(_env.ContentRootPath, "..", "SecureUploads", filePath.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(uploadsPath))
        {
            var ext = Path.GetExtension(uploadsPath).ToLowerInvariant();
            var contentType = ext switch
            {
                ".pdf" => "application/pdf",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                _ => "application/octet-stream"
            };
            return File(System.IO.File.ReadAllBytes(uploadsPath), contentType, fileName);
        }

        // 3. Form 7 veya Form 2 ise şablon olarak geri döndür
        if (fileName.Contains("Form7", StringComparison.OrdinalIgnoreCase) || fileName.Contains("FORM7", StringComparison.OrdinalIgnoreCase))
        {
            return DownloadBlankForm7();
        }
        if (fileName.Contains("Form2", StringComparison.OrdinalIgnoreCase) || fileName.Contains("FORM2", StringComparison.OrdinalIgnoreCase))
        {
            return DownloadBlankForm2();
        }

        return NotFound(new { message = "Belge bulunamadı." });
    }

    [HttpGet("api/documents/blank/form2")]
    public IActionResult DownloadBlankForm2()
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "Templates", "FORM2_Staj_Kabul_Formu.docx");
        if (!System.IO.File.Exists(path))
        {
            path = Path.Combine(_env.ContentRootPath, "Templates", "FORM2_Staj_Kabul_Formu.docx");
        }

        if (System.IO.File.Exists(path))
        {
            var bytes = System.IO.File.ReadAllBytes(path);
            return File(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "FORM2_Staj_Kabul_Formu_Bos.docx");
        }

        return NotFound(new { message = "Form 2 şablonu bulunamadı." });
    }

    [HttpGet("api/documents/blank/form7")]
    public IActionResult DownloadBlankForm7()
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "Templates", "FORM7_Staj_Iptal_Formu.docx");
        if (!System.IO.File.Exists(path))
        {
            path = Path.Combine(_env.ContentRootPath, "Templates", "FORM7_Staj_Iptal_Formu.docx");
        }

        if (System.IO.File.Exists(path))
        {
            var bytes = System.IO.File.ReadAllBytes(path);
            return File(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "FORM7_Staj_Iptal_Formu_Bos.docx");
        }

        return NotFound(new { message = "Form 7 şablonu bulunamadı." });
    }
}
