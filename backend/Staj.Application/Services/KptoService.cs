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
    /// İsteğe bağlı SGK işe giriş tescil numarasını da kaydeder.
    /// </summary>
    public async Task<KptoRowDto> StartInsuranceAsync(Guid id, StartInsuranceRequest? req = null, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status != InternshipStatus.ApprovedByCommittee)
            throw AppException.BadRequest("Yalnızca komisyon onaylı ve sigortası başlamamış stajlar için sigorta başlatılabilir.");

        i.KptoStatus = KptoInsuranceStatus.InsuranceActive;
        i.KptoNote = null;
        if (!string.IsNullOrWhiteSpace(req?.SgkRegistrationNo))
            i.SgkRegistrationNo = req.SgkRegistrationNo.Trim();
        i.InsuranceStartedAt = DateTime.UtcNow;
        i.Status = WorkDayCalculator.EffectiveToday >= i.StartDate ? InternshipStatus.InProgress : InternshipStatus.InsuranceStarted;
        i.UpdatedAt = DateTime.UtcNow;

        var regSuffix = !string.IsNullOrWhiteSpace(i.SgkRegistrationNo) ? $" (SGK Tescil No: {i.SgkRegistrationNo})" : "";
        _notify.ToUser(i.StudentId, "Sigortanız Başlatıldı ✔", $"Sigortanız başlatıldı{regSuffix}, staja başlayabilirsiniz.", NotificationType.Success, i.Id);
        _notify.Audit("Kpto.StartInsurance", nameof(Internship), i.Id, i.SgkRegistrationNo);
        await _db.SaveChangesAsync(ct);
        await _notify.TryEmailAsync(i.Student.Email, "Sigortanız Başlatıldı",
            $"<p>Sayın {i.Student.FullName},</p><p>SGK staj sigortanız başlatılmıştır{regSuffix}. {i.StartDate:dd.MM.yyyy} tarihinde {i.Company.Name} firmasında staja başlayabilirsiniz.</p>", ct, i.Id);
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
    /// İzin veya telafi onaylanması nedeniyle bitiş tarihi ötelenmiş (Ek Prim Tescili gereken) sigortalı stajları listeler.
    /// </summary>
    public async Task<List<KptoRowDto>> ListExtensionsAsync(CancellationToken ct = default)
    {
        var list = await _db.Internships
            .Include(i => i.Student).Include(i => i.Company).Include(i => i.Documents).Include(i => i.LeaveRequests)
            .Where(i => i.KptoStatus == KptoInsuranceStatus.InsuranceActive &&
                        i.EndDate != i.OriginalEndDate &&
                        !i.IsArchived &&
                        i.Status != InternshipStatus.Cancelled)
            .OrderBy(i => i.ExtensionSgkProcessed)
            .ThenBy(i => i.EndDate)
            .ToListAsync(ct);
        return list.Select(ToRow).ToList();
    }

    /// <summary>
    /// İzin/telafi sonrası uzayan staj için SGK ek prim tescil işlemini tamamlar.
    /// </summary>
    public async Task<KptoRowDto> ProcessExtensionAsync(Guid id, KptoProcessRequest? req = null, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.EndDate == i.OriginalEndDate)
            throw AppException.BadRequest("Bu staj için süre uzatması / ek prim gereksinimi bulunmuyor.");

        var refPart = !string.IsNullOrWhiteSpace(req?.ReferenceNo) ? $"Ref: {req.ReferenceNo.Trim()}" : null;
        var notePart = !string.IsNullOrWhiteSpace(req?.Note) ? req.Note.Trim() : null;
        var combined = string.Join(" — ", new[] { refPart, notePart }.Where(x => !string.IsNullOrWhiteSpace(x)));

        i.ExtensionSgkProcessed = true;
        i.ExtensionSgkProcessedAt = DateTime.UtcNow;
        i.ExtensionSgkNote = string.IsNullOrWhiteSpace(combined) ? "SGK ek prim tescili işlendi." : combined;
        i.UpdatedAt = DateTime.UtcNow;

        _notify.ToUser(i.StudentId, "SGK Ek Prim Tesciliniz İşlendi",
            $"İzin/telafi sonrası güncellenen yeni bitiş tarihiniz ({i.EndDate:dd.MM.yyyy}) için SGK ek prim tescili KPTO tarafından tamamlandı.",
            NotificationType.Info, i.Id);
        _notify.ToRole(UserRole.CommitteeMember, "KPTO Ek Prim Tescilini Tamamladı",
            $"{i.Student.FullName} ({i.OriginalEndDate:dd.MM.yyyy} → {i.EndDate:dd.MM.yyyy}) ek prim tescili yapıldı.",
            NotificationType.Info, i.Id);
        _notify.Audit("Kpto.ProcessExtension", nameof(Internship), i.Id, i.ExtensionSgkNote);
        await _db.SaveChangesAsync(ct);
        return ToRow(i);
    }

    /// <summary>
    /// Sigortası başlatıldıktan sonra iptal edilmiş (SGK Çıkış Masası'na düşen) stajları listeler.
    /// </summary>
    public async Task<List<KptoRowDto>> ListExitsAsync(CancellationToken ct = default)
    {
        var list = await _db.Internships
            .Include(i => i.Student).Include(i => i.Company).Include(i => i.Documents).Include(i => i.LeaveRequests)
            .Where(i => i.Status == InternshipStatus.Cancelled &&
                        i.InsuranceStartedAt != null &&
                        !i.IsArchived)
            .OrderBy(i => i.SgkExitProcessed)
            .ThenByDescending(i => i.UpdatedAt)
            .ToListAsync(ct);
        return list.Select(ToRow).ToList();
    }

    /// <summary>
    /// İptal edilen sigortalı stajın SGK işten çıkış bildirgesini tamamlandı olarak işaretler.
    /// </summary>
    public async Task<KptoRowDto> ProcessExitAsync(Guid id, KptoProcessRequest? req = null, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status != InternshipStatus.Cancelled || i.InsuranceStartedAt is null)
            throw AppException.BadRequest("SGK çıkış işlemi yalnızca sigortası başlatıldıktan sonra iptal edilen stajlar için yapılabilir.");

        i.SgkExitProcessed = true;
        i.SgkExitProcessedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(req?.ReferenceNo))
            i.SgkExitNo = req.ReferenceNo.Trim();
        if (!string.IsNullOrWhiteSpace(req?.Note))
            i.KptoNote = req.Note.Trim();
        i.UpdatedAt = DateTime.UtcNow;

        var exitSuffix = !string.IsNullOrWhiteSpace(i.SgkExitNo) ? $" (Çıkış Bildirge No: {i.SgkExitNo})" : "";
        _notify.ToUser(i.StudentId, "SGK Çıkış İşleminiz Tamamlandı",
            $"İptal edilen stajınız için SGK sigorta çıkışı KPTO tarafından işlendi{exitSuffix}.",
            NotificationType.Info, i.Id);
        _notify.ToRole(UserRole.CommitteeMember, "KPTO SGK Çıkışını Tamamladı",
            $"{i.Student.FullName} için SGK sigorta çıkışı tamamlandı{exitSuffix}.",
            NotificationType.Info, i.Id);
        _notify.Audit("Kpto.ProcessExit", nameof(Internship), i.Id, i.SgkExitNo ?? i.KptoNote);
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
            .Select(d => new SalaryReceiptDto(
                d.Id, d.InternshipId, d.Internship.Student.FullName, d.Internship.Student.StudentNo,
                d.Internship.Company.Name, d.OriginalFileName, d.UploadedAt,
                d.IsVerifiedByKpto, d.VerifiedByKptoAt))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Öğrencinin yüklediği maaş dekontunu KPTO birimi tarafından doğrulandı olarak onaylar.
    /// </summary>
    public async Task<SalaryReceiptDto> VerifySalaryReceiptAsync(Guid documentId, CancellationToken ct = default)
    {
        var doc = await _db.Documents
            .Include(d => d.Internship).ThenInclude(i => i.Student)
            .Include(d => d.Internship).ThenInclude(i => i.Company)
            .FirstOrDefaultAsync(d => d.Id == documentId, ct) ?? throw AppException.NotFound("Dekont");
        if (doc.Type != DocumentType.SalaryReceipt)
            throw AppException.BadRequest("Yalnızca stajyer maaş dekontları KPTO tarafından doğrulanabilir.");

        doc.IsVerifiedByKpto = true;
        doc.VerifiedByKptoAt = DateTime.UtcNow;
        doc.VerifiedByKptoUserId = _currentUser.UserId;
        doc.Status = DocumentStatus.Approved;
        doc.ReviewedAt = DateTime.UtcNow;
        doc.ReviewedById = _currentUser.UserId;

        _notify.ToUser(doc.Internship.StudentId, "Maaş Dekontunuz Doğrulandı",
            $"{doc.OriginalFileName} maaş dekontunuz KPTO birimi tarafından incelendi ve doğrulandı.",
            NotificationType.Success, doc.InternshipId);
        _notify.Audit("Kpto.VerifySalaryReceipt", nameof(Document), doc.Id, doc.OriginalFileName);
        await _db.SaveChangesAsync(ct);

        return new SalaryReceiptDto(
            doc.Id, doc.InternshipId, doc.Internship.Student.FullName, doc.Internship.Student.StudentNo,
            doc.Internship.Company.Name, doc.OriginalFileName, doc.UploadedAt,
            doc.IsVerifiedByKpto, doc.VerifiedByKptoAt);
    }

    /// <summary>
    /// Sonuçlanmış veya arşivlenmiş KPTO sigorta kayıtlarını salt okunur olarak listeler.
    /// </summary>
    public async Task<List<KptoRowDto>> ListArchiveAsync(string? year, CancellationToken ct = default)
    {
        var q = _db.Internships
            .Include(i => i.Student).Include(i => i.Company).Include(i => i.Documents).Include(i => i.LeaveRequests)
            .Where(i => i.KptoStatus != null &&
                        (i.IsArchived ||
                         i.Status == InternshipStatus.Passed ||
                         i.Status == InternshipStatus.Failed ||
                         i.Status == InternshipStatus.Cancelled));

        if (!string.IsNullOrWhiteSpace(year))
        {
            var y = year.Trim();
            q = q.Where(i => i.ArchiveYear == y || i.StartDate.Year.ToString() == y);
        }

        var list = await q.OrderByDescending(i => i.StartDate).ThenBy(i => i.Student.FullName).ToListAsync(ct);
        return list.Select(ToRow).ToList();
    }

    /// <summary>
    /// Salt okunur KPTO SGK arşivini Excel dökümü olarak üretir.
    /// </summary>
    public async Task<FileResultDto> ExportArchiveAsync(string? year, CancellationToken ct = default)
    {
        var rows = await ListArchiveAsync(year, ct);
        var bytes = _excel.GenerateKptoList(rows);
        var label = string.IsNullOrWhiteSpace(year) ? "TumYillar" : year.Trim();
        return new FileResultDto(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"KPTO_Arsiv_{label}_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
    }

    private static KptoRowDto ToRow(Internship i) => new(
        i.Id, i.Student.FullName, i.Student.StudentNo, i.Student.NationalId, i.Student.Email, i.Student.Phone,
        i.Company.Name, i.Company.Address, i.Type, i.StartDate, i.EndDate, i.WorkDays, i.ReceivesSalary,
        i.KptoStatus, i.KptoNote, i.ApprovedAt, i.InsuranceStartedAt,
        i.Documents.Where(d => d.Type == DocumentType.Spas).OrderByDescending(d => d.UploadedAt).Select(d => (Guid?)d.Id).FirstOrDefault(),
        i.Documents.Count(d => d.Type == DocumentType.SalaryReceipt),
        i.EndDate != i.OriginalEndDate,
        i.SgkRegistrationNo,
        i.ExtensionSgkProcessed, i.ExtensionSgkProcessedAt, i.ExtensionSgkNote,
        i.SgkExitProcessed, i.SgkExitProcessedAt, i.SgkExitNo,
        i.Status, i.IsArchived, i.ArchiveYear ?? i.StartDate.Year.ToString(), i.OriginalEndDate);
}
