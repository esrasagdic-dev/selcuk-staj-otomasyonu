using Microsoft.EntityFrameworkCore;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Services;

/// <summary>
/// Staj dönemleri (takvim), resmi tatiller, firma havuzu ve firma ilanları yönetimi.
/// </summary>
public class CatalogService
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly NotificationService _notify;

    /// <summary>
    /// Yeni bir katalog servisi oluşturur.
    /// </summary>
    public CatalogService(IAppDbContext db, ICurrentUser currentUser, NotificationService notify)
    {
        _db = db;
        _currentUser = currentUser;
        _notify = notify;
    }

    // ------------------------------------------------------------------ DÖNEMLER

    /// <summary>
    /// Dönemleri listeler. <paramref name="onlyOpen"/> true ise yalnızca başvuruya açık (aktif ve son başvuru tarihi geçmemiş) dönemler döner.
    /// </summary>
    public async Task<List<TermDto>> GetTermsAsync(bool onlyOpen, CancellationToken ct = default)
    {
        var q = _db.Terms.AsQueryable();
        if (onlyOpen) q = q.Where(t => t.IsActive);
        return await q.OrderByDescending(t => t.AcademicYear).ThenBy(t => t.InternshipType)
            .Select(t => new TermDto(t.Id, t.Name, t.AcademicYear, t.InternshipType, t.EarliestStartDate, t.LatestEndDate,
                t.ApplicationDeadline, t.ReportDeadline, t.MinWorkDays, t.MaxWorkDays, t.IsActive, t.Internships.Count))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Yeni staj dönemi açar.
    /// </summary>
    public async Task<TermDto> CreateTermAsync(TermUpsertRequest req, CancellationToken ct = default)
    {
        Validate(req);
        var term = new Term();
        Apply(term, req);
        _db.Terms.Add(term);
        _notify.Audit("Term.Create", nameof(Term), term.Id, term.Name);
        await _db.SaveChangesAsync(ct);
        return (await GetTermsAsync(false, ct)).First(t => t.Id == term.Id);
    }

    /// <summary>
    /// Staj dönemini günceller.
    /// </summary>
    public async Task<TermDto> UpdateTermAsync(Guid id, TermUpsertRequest req, CancellationToken ct = default)
    {
        Validate(req);
        var term = await _db.Terms.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("Dönem");
        Apply(term, req);
        _notify.Audit("Term.Update", nameof(Term), term.Id, term.Name);
        await _db.SaveChangesAsync(ct);
        return (await GetTermsAsync(false, ct)).First(t => t.Id == term.Id);
    }

    /// <summary>
    /// Başvurusu olmayan dönemi siler.
    /// </summary>
    public async Task DeleteTermAsync(Guid id, CancellationToken ct = default)
    {
        var term = await _db.Terms.Include(t => t.Internships).FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw AppException.NotFound("Dönem");
        if (term.Internships.Count > 0) throw AppException.BadRequest("Başvurusu olan dönem silinemez; pasif yapabilirsiniz.");
        _db.Terms.Remove(term);
        await _db.SaveChangesAsync(ct);
    }

    private static void Validate(TermUpsertRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) throw AppException.BadRequest("Dönem adı zorunludur.");
        if (r.EarliestStartDate >= r.LatestEndDate) throw AppException.BadRequest("En erken başlangıç, en geç bitişten önce olmalıdır.");
        if (r.MinWorkDays < 1 || r.MaxWorkDays < r.MinWorkDays) throw AppException.BadRequest("İş günü sınırları geçersiz.");
    }

    private static void Apply(Term t, TermUpsertRequest r)
    {
        t.Name = r.Name.Trim();
        t.AcademicYear = r.AcademicYear.Trim();
        t.InternshipType = r.InternshipType;
        t.EarliestStartDate = r.EarliestStartDate;
        t.LatestEndDate = r.LatestEndDate;
        t.ApplicationDeadline = r.ApplicationDeadline;
        t.ReportDeadline = r.ReportDeadline;
        t.MinWorkDays = r.MinWorkDays;
        t.MaxWorkDays = r.MaxWorkDays;
        t.IsActive = r.IsActive;
    }

    // ------------------------------------------------------------------ TATİLLER

    /// <summary>
    /// Resmi tatilleri listeler (isteğe bağlı yıl filtresi).
    /// </summary>
    public async Task<List<HolidayDto>> GetHolidaysAsync(int? year, CancellationToken ct = default)
    {
        var q = _db.Holidays.AsQueryable();
        if (year.HasValue)
        {
            var from = new DateOnly(year.Value, 1, 1);
            var to = new DateOnly(year.Value, 12, 31);
            q = q.Where(h => h.Date >= from && h.Date <= to);
        }
        return await q.OrderBy(h => h.Date).Select(h => new HolidayDto(h.Id, h.Date, h.Name)).ToListAsync(ct);
    }

    /// <summary>
    /// Resmi tatil ekler.
    /// </summary>
    public async Task<HolidayDto> AddHolidayAsync(HolidayCreateRequest req, CancellationToken ct = default)
    {
        if (await _db.Holidays.AnyAsync(h => h.Date == req.Date, ct)) throw AppException.BadRequest("Bu tarih zaten tatil olarak kayıtlı.");
        var h = new Holiday { Date = req.Date, Name = req.Name.Trim() };
        _db.Holidays.Add(h);
        await _db.SaveChangesAsync(ct);
        return new HolidayDto(h.Id, h.Date, h.Name);
    }

    /// <summary>
    /// Resmi tatili siler.
    /// </summary>
    public async Task DeleteHolidayAsync(Guid id, CancellationToken ct = default)
    {
        var h = await _db.Holidays.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("Tatil");
        _db.Holidays.Remove(h);
        await _db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ FİRMALAR

    /// <summary>
    /// Firma adına göre otomatik tamamlama araması yapar.
    /// </summary>
    public async Task<List<CompanyDto>> SearchCompaniesAsync(string? q, CancellationToken ct = default)
    {
        var query = _db.Companies.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(term));
        }
        var list = await query.OrderBy(c => c.Name).Take(20).ToListAsync(ct);
        return list.Select(c => c.ToDto()).ToList();
    }

    /// <summary>
    /// Yeni firma oluşturur (aynı isimde firma varsa onu döner).
    /// </summary>
    public async Task<Company> GetOrCreateCompanyAsync(CompanyCreateRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) throw AppException.BadRequest("Firma adı zorunludur.");
        var name = req.Name.Trim();
        var existing = await _db.Companies.FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower(), ct);
        if (existing is not null) return existing;
        var company = new Company
        {
            Name = name, Sector = req.Sector, City = req.City, Address = req.Address, Phone = req.Phone, Email = req.Email,
            IsVerified = _currentUser.Role is UserRole.CommitteeMember or UserRole.DepartmentHead
        };
        _db.Companies.Add(company);
        return company;
    }

    /// <summary>
    /// Yeni firma ekler ve kaydeder.
    /// </summary>
    public async Task<CompanyDto> CreateCompanyAsync(CompanyCreateRequest req, CancellationToken ct = default)
    {
        var c = await GetOrCreateCompanyAsync(req, ct);
        await _db.SaveChangesAsync(ct);
        return c.ToDto();
    }

    /// <summary>
    /// Firmayı komisyon tarafından doğrulanmış olarak işaretler / bilgilerini günceller.
    /// </summary>
    public async Task<CompanyDto> UpdateCompanyAsync(Guid id, CompanyCreateRequest req, bool verified, CancellationToken ct = default)
    {
        var c = await _db.Companies.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("Firma");
        c.Name = req.Name.Trim(); c.Sector = req.Sector; c.City = req.City; c.Address = req.Address; c.Phone = req.Phone; c.Email = req.Email;
        c.IsVerified = verified;
        await _db.SaveChangesAsync(ct);
        return c.ToDto();
    }

    /// <summary>
    /// Firma arşivi ve istatistikleri (Hangi firmada kaç öğrenci staj yaptı?).
    /// </summary>
    public async Task<List<CompanyStatDto>> GetCompanyStatsAsync(CancellationToken ct = default)
    {
        var active = new[] { InternshipStatus.ApprovedByCommittee, InternshipStatus.InsuranceStarted, InternshipStatus.InProgress, InternshipStatus.CompletedPendingReview };
        var list = await _db.Companies
            .Select(c => new CompanyStatDto(
                c.Id, c.Name, c.City, c.Sector, c.IsVerified,
                c.Internships.Count(i => i.Status != InternshipStatus.Draft && i.Status != InternshipStatus.Cancelled),
                c.Internships.Count(i => i.Status == InternshipStatus.Passed),
                c.Internships.Count(i => active.Contains(i.Status))))
            .ToListAsync(ct);
        return list.OrderByDescending(s => s.TotalInternships).ThenBy(s => s.Name).ToList();
    }

    // ------------------------------------------------------------------ İLANLAR

    /// <summary>
    /// Firma ilanlarını listeler (öğrenciler yalnızca aktif ilanları görür).
    /// </summary>
    public async Task<List<ListingDto>> GetListingsAsync(bool onlyActive, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var q = _db.CompanyListings.AsQueryable();
        if (onlyActive) q = q.Where(l => l.IsActive && (l.Deadline == null || l.Deadline >= today));
        var list = await q.OrderByDescending(l => l.CreatedAt).ToListAsync(ct);
        return list.Select(l => l.ToDto()).ToList();
    }

    /// <summary>
    /// Yeni ilan girer ve öğrenci duyuru panelinde duyuru olarak da yayınlar (Madde 4).
    /// </summary>
    public async Task<ListingDto> CreateListingAsync(ListingUpsertRequest req, CancellationToken ct = default)
    {
        var l = new CompanyListing { CreatedById = _currentUser.UserId };
        await ApplyListingAsync(l, req, ct);
        _db.CompanyListings.Add(l);

        var deadlineText = l.Deadline.HasValue ? $" (Son Başvuru: {l.Deadline.Value:dd.MM.yyyy})" : "";
        var contactText = !string.IsNullOrWhiteSpace(l.Contact) ? $" • İletişim: {l.Contact}" : "";
        _db.Announcements.Add(new Announcement
        {
            Title = $"📢 Stajyer Arayan Firma İlanı: {l.CompanyName} — {l.Title}",
            Content = $"{l.Description}{deadlineText}{contactText}",
            Category = "CompanyListing",
            IsPinned = true,
            IsActive = true,
            CreatedById = _currentUser.UserId
        });

        _notify.ToRole(UserRole.Student, "Yeni Stajyer Arayan Firma Duyurusu", $"{l.CompanyName}: {l.Title}");
        await _db.SaveChangesAsync(ct);
        return l.ToDto();
    }

    // ------------------------------------------------------------------ DUYURULAR (KOMİSYON & ÖĞRENCİ DUYURU PANELİ)

    /// <summary>
    /// Duyuruları listeler. <paramref name="onlyActive"/> true ise yalnızca aktif duyurular döner.
    /// </summary>
    public async Task<List<AnnouncementDto>> GetAnnouncementsAsync(bool onlyActive, CancellationToken ct = default)
    {
        var q = _db.Announcements.AsQueryable();
        if (onlyActive) q = q.Where(a => a.IsActive);
        var list = await q.OrderByDescending(a => a.IsPinned).ThenByDescending(a => a.CreatedAt).ToListAsync(ct);
        return list.Select(a => a.ToDto()).ToList();
    }

    /// <summary>
    /// Komisyon tarafından yeni duyuru yayınlar.
    /// </summary>
    public async Task<AnnouncementDto> CreateAnnouncementAsync(AnnouncementUpsertRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Title)) throw AppException.BadRequest("Duyuru başlığı zorunludur.");
        if (string.IsNullOrWhiteSpace(req.Content)) throw AppException.BadRequest("Duyuru içeriği zorunludur.");

        var a = new Announcement
        {
            Title = req.Title.Trim(),
            Content = req.Content.Trim(),
            Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim(),
            IsPinned = req.IsPinned,
            IsActive = req.IsActive,
            CreatedById = _currentUser.UserId
        };
        _db.Announcements.Add(a);
        _notify.ToRole(UserRole.Student, $"Komisyon Duyurusu: {a.Title}", a.Content);
        await _db.SaveChangesAsync(ct);
        return a.ToDto();
    }

    /// <summary>
    /// Duyuruyu günceller.
    /// </summary>
    public async Task<AnnouncementDto> UpdateAnnouncementAsync(Guid id, AnnouncementUpsertRequest req, CancellationToken ct = default)
    {
        var a = await _db.Announcements.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("Duyuru");
        if (string.IsNullOrWhiteSpace(req.Title)) throw AppException.BadRequest("Duyuru başlığı zorunludur.");
        a.Title = req.Title.Trim();
        a.Content = req.Content.Trim();
        a.Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim();
        a.IsPinned = req.IsPinned;
        a.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        return a.ToDto();
    }

    /// <summary>
    /// Duyuruyu siler.
    /// </summary>
    public async Task DeleteAnnouncementAsync(Guid id, CancellationToken ct = default)
    {
        var a = await _db.Announcements.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("Duyuru");
        _db.Announcements.Remove(a);
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// İlanı günceller.
    /// </summary>
    public async Task<ListingDto> UpdateListingAsync(Guid id, ListingUpsertRequest req, CancellationToken ct = default)
    {
        var l = await _db.CompanyListings.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("İlan");
        await ApplyListingAsync(l, req, ct);
        await _db.SaveChangesAsync(ct);
        return l.ToDto();
    }

    /// <summary>
    /// İlanı siler.
    /// </summary>
    public async Task DeleteListingAsync(Guid id, CancellationToken ct = default)
    {
        var l = await _db.CompanyListings.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("İlan");
        _db.CompanyListings.Remove(l);
        await _db.SaveChangesAsync(ct);
    }

    private async Task ApplyListingAsync(CompanyListing l, ListingUpsertRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Title)) throw AppException.BadRequest("İlan başlığı zorunludur.");
        l.CompanyId = r.CompanyId;
        l.CompanyName = r.CompanyName.Trim();
        if (r.CompanyId.HasValue)
        {
            var c = await _db.Companies.FindAsync(new object[] { r.CompanyId.Value }, ct) ?? throw AppException.NotFound("Firma");
            l.CompanyName = c.Name;
            l.City ??= c.City;
        }
        if (string.IsNullOrWhiteSpace(l.CompanyName)) throw AppException.BadRequest("Firma adı zorunludur.");
        l.Title = r.Title.Trim();
        l.Description = r.Description;
        l.Contact = r.Contact;
        l.City = r.City ?? l.City;
        l.Deadline = r.Deadline;
        l.IsActive = r.IsActive;
    }
}
