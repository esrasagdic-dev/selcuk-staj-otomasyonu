using Microsoft.EntityFrameworkCore;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Services;

/// <summary>
/// KPTO (Sigorta Birimi) işlemleri: Gelenler / Sigortası Başlatılanlar / Başlatılmayanlar listeleri,
/// Excel (SPAS) dökümü, "Sigorta Başlatıldı" işlemi ve maaş dekontu takibi.
/// </summary>
public class KptoService
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly InternshipService _internships;
    private readonly NotificationService _notify;
    private readonly IExcelService _excel;

    /// <summary>
    /// Yeni bir KPTO servisi oluşturur.
    /// </summary>
    public KptoService(IAppDbContext db, ICurrentUser currentUser, InternshipService internships, NotificationService notify, IExcelService excel)
    {
        _db = db;
        _currentUser = currentUser;
        _internships = internships;
        _notify = notify;
        _excel = excel;
    }

    /// <summary>
    /// KPTO listesini sigorta durumuna göre döner (null ise tümü).
    /// </summary>
    public async Task<List<KptoRowDto>> ListAsync(KptoInsuranceStatus? status, CancellationToken ct = default)
    {
        var q = _db.Internships
            .Include(i => i.Student).Include(i => i.Company).Include(i => i.Documents).Include(i => i.LeaveRequests)
            .Where(i => i.KptoStatus != null && !i.IsArchived);
        if (status.HasValue) q = q.Where(i => i.KptoStatus == status.Value);
        var list = await q.OrderBy(i => i.StartDate).ThenBy(i => i.Student.FullName).ToListAsync(ct);
        return list.Select(ToRow).ToList();
    }

    /// <summary>
    /// Listeyi SGK girişi için Excel dökümü olarak üretir.
    /// </summary>
    public async Task<FileResultDto> ExportAsync(KptoInsuranceStatus? status, CancellationToken ct = default)
    {
        var rows = await ListAsync(status, ct);
        var bytes = _excel.GenerateKptoList(rows);
        var label = status switch
        {
            KptoInsuranceStatus.Pending => "Gelenler",
            KptoInsuranceStatus.InsuranceActive => "SigortasiBaslatilanlar",
            KptoInsuranceStatus.InsuranceNotStarted => "Baslatilmayanlar",
            _ => "Tumu"
        };
        return new FileResultDto(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"KPTO_{label}_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
    }

    /// <summary>
    /// "Sigorta Başlatıldı": öğrenci "Sigortası Başlatılanlar" listesine geçer ve öğrenci paneline yeşil tik düşer.
    /// </summary>
    public async Task<KptoRowDto> StartInsuranceAsync(Guid id, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status != InternshipStatus.ApprovedByCommittee)
            throw AppException.BadRequest("Yalnızca komisyon onaylı ve sigortası başlamamış stajlar için sigorta başlatılabilir.");

        i.KptoStatus = KptoInsuranceStatus.InsuranceActive;
        i.KptoNote = null;
        i.InsuranceStartedAt = DateTime.UtcNow;
        i.Status = WorkDayCalculator.EffectiveToday >= i.StartDate ? InternshipStatus.InProgress : InternshipStatus.InsuranceStarted;
        i.UpdatedAt = DateTime.UtcNow;

        _notify.ToUser(i.StudentId, "Sigortanız Başlatıldı ✔", "Sigortanız başlatıldı, staja başlayabilirsiniz.", NotificationType.Success, i.Id);
        _notify.Audit("Kpto.StartInsurance", nameof(Internship), i.Id);
        await _db.SaveChangesAsync(ct);
        await _notify.TryEmailAsync(i.Student.Email, "Sigortanız Başlatıldı",
            $"<p>Sayın {i.Student.FullName},</p><p>SGK staj sigortanız başlatılmıştır. {i.StartDate:dd.MM.yyyy} tarihinde {i.Company.Name} firmasında staja başlayabilirsiniz.</p>", ct);
        return ToRow(i);
    }

    /// <summary>
    /// Sigortanın başlatılamadığını (eksik evrak vb.) gerekçesiyle işaretler; kayıt "Başlatılmayanlar" listesine geçer.
    /// </summary>
    public async Task<KptoRowDto> MarkNotStartedAsync(Guid id, string? note, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(note)) throw AppException.BadRequest("Gerekçe yazılmalıdır.");
        var i = await _internships.LoadAsync(id, ct);
        if (i.KptoStatus != KptoInsuranceStatus.Pending) throw AppException.BadRequest("Yalnızca 'Gelenler' listesindeki kayıtlar işaretlenebilir.");
        i.KptoStatus = KptoInsuranceStatus.InsuranceNotStarted;
        i.KptoNote = note.Trim();
        i.UpdatedAt = DateTime.UtcNow;
        _notify.ToUser(i.StudentId, "Sigorta Girişi Yapılamadı", note.Trim(), NotificationType.Warning, i.Id);
        _notify.ToRole(UserRole.CommitteeMember, "KPTO Sigorta Başlatamadı", $"{i.Student.FullName}: {note.Trim()}", NotificationType.Warning, i.Id);
        _notify.Audit("Kpto.NotStarted", nameof(Internship), i.Id, note);
        await _db.SaveChangesAsync(ct);
        return ToRow(i);
    }

    /// <summary>
    /// "Başlatılmayanlar" listesindeki kaydı (sorun giderildiyse) tekrar "Gelenler" listesine alır.
    /// </summary>
    public async Task<KptoRowDto> MoveToPendingAsync(Guid id, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.KptoStatus != KptoInsuranceStatus.InsuranceNotStarted || i.Status != InternshipStatus.ApprovedByCommittee)
            throw AppException.BadRequest("Bu kayıt tekrar 'Gelenler' listesine alınamaz.");
        i.KptoStatus = KptoInsuranceStatus.Pending;
        i.KptoNote = null;
        await _db.SaveChangesAsync(ct);
        return ToRow(i);
    }

    /// <summary>
    /// Maaş alan öğrencilerin yüklediği dekontları listeler.
    /// </summary>
    public async Task<List<SalaryReceiptDto>> ListSalaryReceiptsAsync(CancellationToken ct = default)
    {
        return await _db.Documents
            .Where(d => d.Type == DocumentType.SalaryReceipt && !d.Internship.IsArchived)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new SalaryReceiptDto(d.Id, d.InternshipId, d.Internship.Student.FullName, d.Internship.Student.StudentNo,
                d.Internship.Company.Name, d.OriginalFileName, d.UploadedAt))
            .ToListAsync(ct);
    }

    private static KptoRowDto ToRow(Internship i) => new(
        i.Id, i.Student.FullName, i.Student.StudentNo, i.Student.NationalId, i.Student.Email, i.Student.Phone,
        i.Company.Name, i.Company.Address, i.Type, i.StartDate, i.EndDate, i.WorkDays, i.ReceivesSalary,
        i.KptoStatus, i.KptoNote, i.ApprovedAt, i.InsuranceStartedAt,
        i.Documents.Where(d => d.Type == DocumentType.Spas).OrderByDescending(d => d.UploadedAt).Select(d => (Guid?)d.Id).FirstOrDefault(),
        i.Documents.Count(d => d.Type == DocumentType.SalaryReceipt),
        i.EndDate != i.OriginalEndDate);
}
