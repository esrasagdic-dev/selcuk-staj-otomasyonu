using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Services;

/// <summary>
/// Komisyon üyesi ve Bölüm Başkanı işlemleri: başvuru inceleme (Onayla / Revize İste), izin onayı,
/// staj sonu değerlendirme (Geçti / Kaldı), iptal, yıllık arşivleme ve istatistikler.
/// </summary>
public class CommitteeService
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly InternshipService _internships;
    private readonly WorkDayCalculator _calc;
    private readonly NotificationService _notify;
    private readonly CatalogService _catalog;
    private readonly IPasswordHasher _hasher;
    private readonly IFileStorage _storage;
    private readonly AppSettings _settings;

    /// <summary>
    /// Yeni bir komisyon servisi oluşturur.
    /// </summary>
    public CommitteeService(IAppDbContext db, ICurrentUser currentUser, InternshipService internships, WorkDayCalculator calc,
        NotificationService notify, CatalogService catalog, IPasswordHasher hasher, IFileStorage storage, IOptions<AppSettings> settings)
    {
        _db = db;
        _currentUser = currentUser;
        _internships = internships;
        _calc = calc;
        _notify = notify;
        _catalog = catalog;
        _hasher = hasher;
        _storage = storage;
        _settings = settings.Value;
    }

    /// <summary>
    /// Başvuruları listeler. Arşiv modunda onaylanan ve tamamlanan stajları yıllara göre ayırarak sorgular (Madde 12).
    /// </summary>
    public async Task<List<InternshipSummaryDto>> ListAsync(InternshipStatus? status, Guid? termId, string? search, bool archived, string? archiveYear, CancellationToken ct = default)
    {
        var approvedOrCompleted = new[]
        {
            InternshipStatus.ApprovedByCommittee,
            InternshipStatus.InsuranceStarted,
            InternshipStatus.InProgress,
            InternshipStatus.CompletedPendingReview,
            InternshipStatus.Passed
        };

        var q = _internships.Query().Where(i => i.Status != InternshipStatus.Draft);
        if (archived)
        {
            q = q.Where(i => i.IsArchived || approvedOrCompleted.Contains(i.Status));
        }
        else
        {
            q = q.Where(i => !i.IsArchived);
        }

        if (status.HasValue) q = q.Where(i => i.Status == status.Value);
        if (termId.HasValue) q = q.Where(i => i.TermId == termId.Value);
        if (!string.IsNullOrWhiteSpace(archiveYear))
        {
            var y = archiveYear.Trim();
            q = q.Where(i => i.ArchiveYear == y || i.StartDate.Year.ToString() == y);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(i => i.Student.FullName.ToLower().Contains(s) || (i.Student.StudentNo ?? "").Contains(s) || i.Company.Name.ToLower().Contains(s));
        }
        var list = await q.OrderByDescending(i => i.StartDate).ThenByDescending(i => i.SubmittedAt ?? i.CreatedAt).ToListAsync(ct);
        return list.Select(i => i.ToSummary()).ToList();
    }

    /// <summary>
    /// Başvuruyu onaylar. Aynı anda: (1) Şirket yetkilisine giriş şifresi e-postalanır, (2) Kayıt KPTO'nun "Gelenler" listesine düşer.
    /// </summary>
    public async Task<InternshipDetailDto> ApproveAsync(Guid id, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status != InternshipStatus.Submitted) throw AppException.BadRequest("Yalnızca komisyona gönderilmiş başvurular onaylanabilir.");

        // 1) Şirket yetkilisi hesabı: yoksa oluştur, geçici şifre üret.
        var advisor = await _db.Users.FirstOrDefaultAsync(u => u.Email == i.AdvisorEmail, ct);
        string? tempPassword = null;
        if (advisor is null)
        {
            tempPassword = GeneratePassword();
            advisor = new User
            {
                Email = i.AdvisorEmail, FullName = i.AdvisorName, Role = UserRole.CompanyAdvisor, CompanyId = i.CompanyId,
                PasswordHash = _hasher.Hash(tempPassword), MustChangePassword = true, HasAcceptedGuide = true
            };
            _db.Users.Add(advisor);
        }
        else if (advisor.Role != UserRole.CompanyAdvisor)
        {
            throw AppException.BadRequest("Şirket yetkilisi e-postası sistemde başka rolde bir kullanıcıya ait. Öğrenciden düzeltme isteyiniz.");
        }

        i.AdvisorId = advisor.Id;
        i.Status = InternshipStatus.ApprovedByCommittee;
        i.KptoStatus = KptoInsuranceStatus.Pending;
        i.ApprovedAt = DateTime.UtcNow;
        i.ReviewedById = _currentUser.UserId;
        i.RevisionNote = null;
        i.ArchiveYear = i.StartDate.Year.ToString();
        i.AdvisorEmailSentAt = DateTime.UtcNow;
        i.AdvisorEmailStatus = tempPassword is null
            ? $"Onay ve giriş e-postası {advisor.Email} adresine gönderildi ({DateTime.Now:dd.MM.yyyy HH:mm}) — Mevcut danışman hesabı aktif."
            : $"Şirket danışmanı hesabı oluşturuldu ve geçici şifre ({tempPassword}) {advisor.Email} adresine e-posta ile gönderildi ({DateTime.Now:dd.MM.yyyy HH:mm}).";
        i.UpdatedAt = DateTime.UtcNow;
        i.Company.IsVerified = true;

        foreach (var doc in i.Documents.Where(d => (d.Type == DocumentType.Form2 || d.Type == DocumentType.Spas) && d.Status == DocumentStatus.Pending))
        {
            doc.Status = DocumentStatus.Approved;
            doc.ReviewedAt = DateTime.UtcNow;
            doc.ReviewedById = _currentUser.UserId;
        }

        // 2) KPTO ve öğrenci bildirimleri.
        _notify.ToRole(UserRole.KptoOfficer, "Sigorta Bekleyen Yeni Stajyer",
            $"{i.Student.FullName} - {i.Company.Name} ({i.StartDate:dd.MM.yyyy} - {i.EndDate:dd.MM.yyyy})", NotificationType.Info, i.Id);
        _notify.ToUser(i.StudentId, "Başvurunuz Onaylandı",
            "Staj başvurunuz komisyon tarafından onaylandı. KPTO sigorta girişinizi yaptığında bilgilendirileceksiniz.", NotificationType.Success, i.Id);
        _notify.Audit("Internship.Approve", nameof(Internship), i.Id);
        await _db.SaveChangesAsync(ct);

        // 3) Şirket yetkilisine e-posta.
        var loginUrl = $"{_settings.PublicBaseUrl.TrimEnd('/')}/login";
        var body = $"""
            <p>Sayın {i.AdvisorName},</p>
            <p><b>{i.Student.FullName}</b> isimli öğrencinin <b>{i.Company.Name}</b> bünyesindeki {i.Type.ToTurkish()} başvurusu
            ({i.StartDate:dd.MM.yyyy} - {i.EndDate:dd.MM.yyyy}) Staj Komisyonu tarafından onaylanmıştır.</p>
            <p>Öğrencinin sanal staj defterini inceleyebilmek ve staj sonunda değerlendirme formunu yükleyebilmek için Şirket Paneli'ne giriş yapabilirsiniz.</p>
            <p>Giriş adresi: <a href="{loginUrl}">{loginUrl}</a><br/>
            Kullanıcı adı: <b>{advisor.Email}</b><br/>
            {(tempPassword is null ? "Mevcut şifrenizle giriş yapabilirsiniz." : $"Geçici şifreniz: <b>{tempPassword}</b> (ilk girişte değiştirmeniz istenecektir)")}</p>
            <p>Saygılarımızla,<br/>Staj Komisyonu</p>
            """;
        await _notify.TryEmailAsync(advisor.Email, $"Stajyer Onayı - {i.Student.FullName}", body, ct, i.Id);
        await _notify.TryEmailAsync(i.Student.Email, "Staj Başvurunuz Onaylandı",
            $"<p>Sayın {i.Student.FullName},</p><p>{i.Company.Name} firmasındaki staj başvurunuz onaylanmıştır. Sigorta girişiniz KPTO tarafından yapılacaktır.</p>", ct, i.Id);

        return await _internships.ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Başvuru için gerekçeli revize ister. Öğrenci evrakı düzeltip tekrar gönderebilir.
    /// </summary>
    public async Task<InternshipDetailDto> RequestRevisionAsync(Guid id, string? note, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(note)) throw AppException.BadRequest("Revize gerekçesi yazılmalıdır.");
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status is not (InternshipStatus.Submitted or InternshipStatus.ApprovedByCommittee))
            throw AppException.BadRequest("Bu aşamadaki başvuru için revize istenemez.");

        var wasApproved = i.Status == InternshipStatus.ApprovedByCommittee;
        i.Status = InternshipStatus.RevisionRequested;
        i.RevisionNote = note.Trim();
        i.ReviewedById = _currentUser.UserId;
        i.UpdatedAt = DateTime.UtcNow;
        if (wasApproved)
        {
            // Onaylanmış ama sigortası başlamamış kayıt KPTO listesinden "Başlatılmayanlar"a düşer.
            i.KptoStatus = KptoInsuranceStatus.InsuranceNotStarted;
            i.KptoNote = "Komisyon revize istedi: " + note.Trim();
            _notify.ToRole(UserRole.KptoOfficer, "Başvuru Revizeye Alındı", $"{i.Student.FullName} başvurusu revizeye alındı, sigorta başlatmayınız.", NotificationType.Warning, i.Id);
        }
        _notify.ToUser(i.StudentId, "Başvurunuz İçin Revize İstendi", note.Trim(), NotificationType.Warning, i.Id);
        _notify.Audit("Internship.RequestRevision", nameof(Internship), i.Id, note);
        await _db.SaveChangesAsync(ct);
        await _notify.TryEmailAsync(i.Student.Email, "Staj Başvurunuz İçin Revize İstendi",
            $"<p>Sayın {i.Student.FullName},</p><p>Başvurunuz için komisyon revize istemiştir:</p><blockquote>{System.Net.WebUtility.HtmlEncode(note)}</blockquote>", ct, i.Id);
        return await _internships.ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Başvuruyu gerekçeli olarak kesin reddeder. Öğrenci bu statüden sonra yeni başvuru oluşturabilir.
    /// </summary>
    public async Task<InternshipDetailDto> RejectAsync(Guid id, string? note, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(note))
            throw AppException.BadRequest("Başvuru reddi için gerekçe yazılmalıdır.");

        var i = await _internships.LoadAsync(id, ct);
        if (i.Status is not (InternshipStatus.Submitted or InternshipStatus.RevisionRequested or InternshipStatus.ApprovedByCommittee))
            throw AppException.BadRequest("Bu aşamadaki başvuru reddedilemez (aktif stajlar için Form 7 iptal sürecini kullanınız).");

        var trimmedNote = note.Trim();
        var wasApproved = i.Status == InternshipStatus.ApprovedByCommittee;
        if (wasApproved)
        {
            i.KptoStatus = KptoInsuranceStatus.InsuranceNotStarted;
            i.KptoNote = "Komisyon başvuruyu reddetti: " + trimmedNote;
            _notify.ToRole(UserRole.KptoOfficer, "Başvuru Reddedildi",
                $"{i.Student.FullName} başvurusu komisyon tarafından reddedildi, sigorta başlatmayınız.",
                NotificationType.Warning, i.Id);
        }

        i.Status = InternshipStatus.Rejected;
        i.RevisionNote = trimmedNote;
        i.EvaluationNote = trimmedNote;
        i.AcademicResult = AcademicResultType.Unsuccessful;
        i.AcceptedDaysCount = 0;
        i.ReviewedById = _currentUser.UserId;
        i.EvaluatedAt = DateTime.UtcNow;
        i.UpdatedAt = DateTime.UtcNow;

        _notify.ToUser(i.StudentId, "Staj Başvurunuz Reddedildi", trimmedNote, NotificationType.Warning, i.Id);
        _notify.Audit("Internship.Reject", nameof(Internship), i.Id, trimmedNote);
        await _db.SaveChangesAsync(ct);

        await _notify.TryEmailAsync(i.Student.Email, "Staj Başvurunuz Reddedildi",
            $"<p>Sayın {i.Student.FullName},</p><p>{i.Type.ToTurkish()} başvurunuz Staj Komisyonu tarafından aşağıdaki gerekçe ile reddedilmiştir:</p><blockquote>{System.Net.WebUtility.HtmlEncode(trimmedNote)}</blockquote><p>Gerekli düzenlemeleri yaptıktan sonra yeni bir staj başvurusu oluşturabilirsiniz.</p>", ct, i.Id);
        return await _internships.ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Öğrencinin ilettiği Form 7 staj iptal talebini onaylar ve stajı iptal eder. Sigortası başlamışsa KPTO bilgilendirilir.
    /// </summary>
    public async Task<InternshipDetailDto> CancelAsync(Guid id, string? note, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status is InternshipStatus.Passed or InternshipStatus.Failed or InternshipStatus.Cancelled)
            throw AppException.BadRequest("Sonuçlanmış staj iptal edilemez.");
        var hadInsurance = i.KptoStatus == KptoInsuranceStatus.InsuranceActive;
        i.Status = InternshipStatus.Cancelled;
        if (!string.IsNullOrWhiteSpace(note))
            i.EvaluationNote = note.Trim();
        else if (string.IsNullOrWhiteSpace(i.EvaluationNote))
            i.EvaluationNote = "Öğrencinin Form 7 staj iptal talebi komisyon tarafından onaylandı.";

        if (i.KptoStatus != null)
        {
            i.KptoStatus = KptoInsuranceStatus.InsuranceNotStarted;
            i.KptoNote = "Staj iptal edildi (Form 7). " + i.EvaluationNote;
            _notify.ToRole(UserRole.KptoOfficer, hadInsurance ? "Staj İptali (Form 7) - Sigorta Çıkışı Yapınız" : "Staj İptal Edildi (Form 7)",
                $"{i.Student.FullName} - {i.Company.Name} stajı Form 7 talebi üzerine iptal edildi.", NotificationType.DateChanged, i.Id);
        }
        _notify.ToUser(i.StudentId, "Staj İptal Talebiniz (Form 7) Onaylandı", i.EvaluationNote ?? "Staj iptal talebiniz komisyon tarafından onaylandı.", NotificationType.Warning, i.Id);
        _notify.Audit("Internship.Cancel", nameof(Internship), i.Id, i.EvaluationNote);
        await _db.SaveChangesAsync(ct);
        return await _internships.ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Öğrencinin Form 7 staj iptal talebini reddeder ve stajı önceki aktif durumuna geri döndürür.
    /// </summary>
    public async Task<InternshipDetailDto> RejectCancelRequestAsync(Guid id, string? note, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status != InternshipStatus.CancellationRequested)
            throw AppException.BadRequest("Bu başvuru için bekleyen bir staj iptal talebi bulunmuyor.");

        var today = WorkDayCalculator.EffectiveToday;
        if (i.KptoStatus == KptoInsuranceStatus.InsuranceActive)
            i.Status = today >= i.StartDate ? InternshipStatus.InProgress : InternshipStatus.InsuranceStarted;
        else if (i.ApprovedAt.HasValue)
            i.Status = InternshipStatus.ApprovedByCommittee;
        else
            i.Status = InternshipStatus.Submitted;

        i.UpdatedAt = DateTime.UtcNow;
        var rejectMsg = string.IsNullOrWhiteSpace(note)
            ? "Staj iptal talebiniz (Form 7) komisyon tarafından uygun görülmedi; staj süreciniz devam etmektedir."
            : $"Staj iptal talebiniz (Form 7) reddedildi: {note.Trim()}";

        _notify.ToUser(i.StudentId, "Staj İptal Talebiniz Reddedildi", rejectMsg, NotificationType.Info, i.Id);
        _notify.Audit("Internship.RejectCancel", nameof(Internship), i.Id, rejectMsg);
        await _db.SaveChangesAsync(ct);
        return await _internships.ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Staj sonu değerlendirmesi (3 kademeli): Başarılı (Tam Kabul), Kısmen Başarılı (Belirli Gün Kabulü) veya Başarısız (Kaldı).
    /// Başarılı kabulü için şirket yetkilisinin defter onayı ve imzalı sonuç formu gereklidir.
    /// </summary>
    public async Task<InternshipDetailDto> EvaluateAsync(Guid id, EvaluateRequest req, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        if (i.Status is not (InternshipStatus.CompletedPendingReview or InternshipStatus.InProgress))
            throw AppException.BadRequest("Yalnızca tamamlanmış stajlar değerlendirilebilir.");

        var result = req.AcademicResult.HasValue && req.AcademicResult.Value != AcademicResultType.None
            ? req.AcademicResult.Value
            : (req.Passed ? AcademicResultType.Successful : AcademicResultType.Unsuccessful);

        if (result == AcademicResultType.Successful)
        {
            if (i.Status == InternshipStatus.InProgress) throw AppException.BadRequest("Staj süresi henüz dolmadı.");
            var completedCount = i.LogbookEntries.Count(e => !e.IsDraft);
            if (completedCount < i.WorkDays)
                throw AppException.BadRequest($"Eksik staj defteriyle staj onaylanamaz! Öğrenci {i.WorkDays} iş gününün tamamını doldurup tamamlamalıdır (Tamamlanan: {completedCount} / {i.WorkDays} gün).");
            if (!i.AdvisorLogbookApproved) throw AppException.BadRequest("Şirket yetkilisi henüz sanal defteri onaylamadı.");
            if (!i.Documents.Any(d => d.Type == DocumentType.ResultForm)) throw AppException.BadRequest("Şirketin imzalı sonuç formu yüklenmemiş.");

            i.Status = InternshipStatus.Passed;
            i.AcademicResult = AcademicResultType.Successful;
            i.AcceptedDaysCount = i.WorkDays;
        }
        else if (result == AcademicResultType.PartiallySuccessful)
        {
            if (i.Status == InternshipStatus.InProgress) throw AppException.BadRequest("Staj süresi henüz dolmadı.");
            if (!i.Documents.Any(d => d.Type == DocumentType.ResultForm)) throw AppException.BadRequest("Şirketin imzalı sonuç formu yüklenmemiş.");
            var accepted = req.AcceptedDaysCount ?? 0;
            if (accepted < 1 || accepted >= i.WorkDays)
                throw AppException.BadRequest($"Kısmen başarılı değerlendirmesi için kabul edilen gün sayısı 1 ile {i.WorkDays - 1} arasında olmalıdır.");
            if (string.IsNullOrWhiteSpace(req.Note))
                throw AppException.BadRequest("\"Kısmen Başarılı\" kararı için gerekçe / açıklama yazılmalıdır.");

            i.Status = InternshipStatus.Passed;
            i.AcademicResult = AcademicResultType.PartiallySuccessful;
            i.AcceptedDaysCount = accepted;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(req.Note))
                throw AppException.BadRequest("\"Kaldı / Başarısız\" kararı için gerekçe yazılmalıdır.");

            i.Status = InternshipStatus.Failed;
            i.AcademicResult = AcademicResultType.Unsuccessful;
            i.AcceptedDaysCount = 0;
        }

        var isPassedOutcome = result is AcademicResultType.Successful or AcademicResultType.PartiallySuccessful;
        var resultLabel = result.ToTurkish();
        var daySummary = result == AcademicResultType.PartiallySuccessful
            ? $" ({i.AcceptedDaysCount} / {i.WorkDays} İş Günü Kabul Edildi)"
            : result == AcademicResultType.Successful
                ? $" ({i.WorkDays} / {i.WorkDays} İş Günü)"
                : "";

        i.EvaluationNote = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim();
        i.EvaluatedAt = DateTime.UtcNow;
        i.ReviewedById = _currentUser.UserId;
        i.IsLogbookLocked = true;
        i.LogbookLockReason ??= "Staj sonu değerlendirmesi tamamlandığı için defter kilitlendi.";
        i.UpdatedAt = DateTime.UtcNow;

        var notifTitle = result switch
        {
            AcademicResultType.Successful => "Stajınız Başarılı (Geçti)",
            AcademicResultType.PartiallySuccessful => $"Stajınız Kısmen Başarılı ({i.AcceptedDaysCount}/{i.WorkDays} Gün)",
            _ => "Stajınız Başarısız (Kaldı)"
        };
        var notifBody = string.IsNullOrWhiteSpace(i.EvaluationNote)
            ? $"Staj değerlendirmeniz {resultLabel}{daySummary} olarak sonuçlandırıldı."
            : $"{resultLabel}{daySummary} — {i.EvaluationNote}";

        _notify.ToUser(i.StudentId, notifTitle, notifBody, isPassedOutcome ? NotificationType.Success : NotificationType.Warning, i.Id);
        _notify.Audit("Internship.Evaluate", nameof(Internship), i.Id, $"{resultLabel}{daySummary}");
        await _db.SaveChangesAsync(ct);
        await _notify.TryEmailAsync(i.Student.Email, "Staj Değerlendirme Sonucu",
            $"<p>Sayın {i.Student.FullName},</p><p>{i.Type.ToTurkish()} değerlendirme sonucunuz: <b>{resultLabel}{daySummary}</b></p>" +
            (string.IsNullOrWhiteSpace(i.EvaluationNote) ? "" : $"<blockquote>{System.Net.WebUtility.HtmlEncode(i.EvaluationNote)}</blockquote>"), ct, i.Id);
        return await _internships.ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Yüklenen resmi bir belgeyi (Form 2, SPAS, Form 3, Sonuç Formu vb.) komisyon düzeyinde onaylar, düzeltme ister veya reddeder.
    /// </summary>
    public async Task<DocumentDto> ReviewDocumentAsync(Guid documentId, DocumentReviewRequest req, CancellationToken ct = default)
    {
        if (req.Status is DocumentStatus.RevisionRequested or DocumentStatus.Rejected && string.IsNullOrWhiteSpace(req.Feedback))
            throw AppException.BadRequest("Düzeltme veya ret kararı için geri bildirim / gerekçe yazılmalıdır.");

        var doc = await _db.Documents
            .Include(d => d.Internship).ThenInclude(i => i.Student)
            .Include(d => d.Versions)
            .FirstOrDefaultAsync(d => d.Id == documentId, ct) ?? throw AppException.NotFound("Belge");

        doc.Status = req.Status;
        doc.CommissionFeedback = string.IsNullOrWhiteSpace(req.Feedback) ? null : req.Feedback.Trim();
        doc.ReviewedAt = DateTime.UtcNow;
        doc.ReviewedById = _currentUser.UserId;

        var statusText = req.Status.ToTurkish();
        var msgBody = string.IsNullOrWhiteSpace(doc.CommissionFeedback)
            ? $"{doc.OriginalFileName} belgeniz komisyon tarafından \"{statusText}\" olarak işaretlendi."
            : $"{doc.OriginalFileName} belgeniz \"{statusText}\" — Not: {doc.CommissionFeedback}";

        _notify.ToUser(doc.Internship.StudentId, $"Belge Durumu: {statusText}",
            msgBody, req.Status == DocumentStatus.Approved ? NotificationType.Success : NotificationType.Warning, doc.InternshipId);
        _notify.Audit("Document.Review", nameof(Document), doc.Id, $"{doc.Type} -> {statusText} | {doc.CommissionFeedback}");

        await _db.SaveChangesAsync(ct);
        return doc.ToDto();
    }

    /// <summary>
    /// Komisyon tarafından öğrencinin sanal staj defterini kilitler veya kilidini açar.
    /// </summary>
    public async Task<InternshipDetailDto> SetLogbookLockAsync(Guid id, LogbookLockRequest req, CancellationToken ct = default)
    {
        var i = await _internships.LoadAsync(id, ct);
        i.IsLogbookLocked = req.Locked;
        i.LogbookLockReason = req.Locked
            ? (string.IsNullOrWhiteSpace(req.Reason) ? "Staj Komisyonu tarafından kilitlendi." : req.Reason.Trim())
            : null;
        i.UpdatedAt = DateTime.UtcNow;

        _notify.ToUser(i.StudentId,
            req.Locked ? "Staj Defteriniz Kilitlendi" : "Staj Defteri Kilidi Açıldı",
            req.Locked
                ? $"Sanal staj defteriniz düzenlemeye kapatıldı: {i.LogbookLockReason}"
                : "Sanal staj defterinizin düzenleme kilidi Staj Komisyonu tarafından açıldı.",
            req.Locked ? NotificationType.Warning : NotificationType.Info,
            i.Id);

        _notify.Audit(req.Locked ? "Internship.LogbookLock" : "Internship.LogbookUnlock", nameof(Internship), i.Id, i.LogbookLockReason);
        await _db.SaveChangesAsync(ct);
        return await _internships.ToDetailAsync(i, ct);
    }

    // ------------------------------------------------------------------ İZİN TALEPLERİ

    /// <summary>
    /// İzin taleplerini listeler.
    /// </summary>
    public async Task<List<LeaveRequestDto>> ListLeavesAsync(LeaveRequestStatus? status, CancellationToken ct = default)
    {
        var q = _db.LeaveRequests.Include(l => l.Internship).ThenInclude(i => i.Student)
            .Include(l => l.Internship).ThenInclude(i => i.Company).AsQueryable();
        if (status.HasValue) q = q.Where(l => l.Status == status.Value);
        var list = await q.OrderByDescending(l => l.CreatedAt).ToListAsync(ct);
        return list.Select(l => l.ToDto()).ToList();
    }

    /// <summary>
    /// İzin talebini onaylar: bitiş tarihi izin günleri kadar ileri ötelenir ve KPTO'ya tarih değişikliği bildirilir.
    /// </summary>
    public async Task<LeaveRequestDto> ApproveLeaveAsync(Guid leaveId, string? note, CancellationToken ct = default)
    {
        var l = await LoadLeaveAsync(leaveId, ct);
        var i = l.Internship;
        var newEnd = await _calc.ExtendAsync(i.EndDate, l.Days, i.WorksOnSaturday, ct);

        l.Status = LeaveRequestStatus.Approved;
        l.ReviewNote = note;
        l.ReviewedById = _currentUser.UserId;
        l.ReviewedAt = DateTime.UtcNow;
        l.OldEndDate = i.EndDate;
        l.NewEndDate = newEnd;
        i.EndDate = newEnd;
        i.EndingSoonNotified = false;
        i.ExtensionSgkProcessed = false;
        i.ExtensionSgkProcessedAt = null;
        i.UpdatedAt = DateTime.UtcNow;

        _notify.ToRole(UserRole.KptoOfficer, "Sigorta Bitiş Tarihi Değişti",
            $"{i.Student.FullName} ({i.Company.Name}) - {l.Days} gün izin/telafi onaylandı. Yeni bitiş: {newEnd:dd.MM.yyyy} (eski: {l.OldEndDate:dd.MM.yyyy})",
            NotificationType.DateChanged, i.Id);
        _notify.ToUser(i.StudentId, "İzin Talebiniz Onaylandı", $"Staj bitiş tarihiniz {newEnd:dd.MM.yyyy} olarak güncellendi.", NotificationType.Success, i.Id);
        if (i.AdvisorId.HasValue)
            _notify.ToUser(i.AdvisorId.Value, "Stajyer Bitiş Tarihi Değişti", $"{i.Student.FullName} stajı {newEnd:dd.MM.yyyy} tarihinde bitecek.", NotificationType.DateChanged, i.Id);
        _notify.Audit("Leave.Approve", nameof(LeaveRequest), l.Id, $"{l.OldEndDate} -> {newEnd}");
        await _db.SaveChangesAsync(ct);
        return l.ToDto();
    }

    /// <summary>
    /// İzin talebini reddeder.
    /// </summary>
    public async Task<LeaveRequestDto> RejectLeaveAsync(Guid leaveId, string? note, CancellationToken ct = default)
    {
        var l = await LoadLeaveAsync(leaveId, ct);
        l.Status = LeaveRequestStatus.Rejected;
        l.ReviewNote = note;
        l.ReviewedById = _currentUser.UserId;
        l.ReviewedAt = DateTime.UtcNow;
        _notify.ToUser(l.Internship.StudentId, "İzin Talebiniz Reddedildi", note ?? "", NotificationType.Warning, l.InternshipId);
        await _db.SaveChangesAsync(ct);
        return l.ToDto();
    }

    private async Task<LeaveRequest> LoadLeaveAsync(Guid id, CancellationToken ct)
    {
        var l = await _db.LeaveRequests.Include(x => x.Internship).ThenInclude(i => i.Student)
            .Include(x => x.Internship).ThenInclude(i => i.Company)
            .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("İzin talebi");
        if (l.Status != LeaveRequestStatus.Pending) throw AppException.BadRequest("Bu talep zaten sonuçlandırılmış.");
        return l;
    }

    // ------------------------------------------------------------------ ARŞİV / İSTATİSTİK

    /// <summary>
    /// Onaylanan veya sonuçlanan stajları yıl etiketiyle arşive taşır / sınıflandırır. Taşınan kayıt sayısını döner.
    /// </summary>
    public async Task<int> ArchiveAsync(string year, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(year)) throw AppException.BadRequest("Arşiv yılı zorunludur.");
        var y = year.Trim();
        var archivableStatuses = new[]
        {
            InternshipStatus.ApprovedByCommittee,
            InternshipStatus.InsuranceStarted,
            InternshipStatus.InProgress,
            InternshipStatus.CompletedPendingReview,
            InternshipStatus.Passed,
            InternshipStatus.Failed,
            InternshipStatus.Cancelled
        };
        var list = await _db.Internships.Include(i => i.Term)
            .Where(i => archivableStatuses.Contains(i.Status) &&
                        (i.StartDate.Year.ToString() == y || i.Term.AcademicYear.StartsWith(y)))
            .ToListAsync(ct);
        foreach (var i in list)
        {
            if (i.Status is InternshipStatus.Passed or InternshipStatus.Failed or InternshipStatus.Cancelled)
                i.IsArchived = true;
            i.ArchiveYear = y;
        }
        _notify.Audit("Internship.Archive", nameof(Internship), null, $"{y}: {list.Count} kayıt");
        await _db.SaveChangesAsync(ct);
        return list.Count;
    }

    /// <summary>
    /// Onaylanan ve arşivlenen stajların bulunduğu tüm yılları döner (Madde 12).
    /// </summary>
    public async Task<List<string>> GetArchiveYearsAsync(CancellationToken ct = default)
    {
        var approvedOrArchived = new[]
        {
            InternshipStatus.ApprovedByCommittee,
            InternshipStatus.InsuranceStarted,
            InternshipStatus.InProgress,
            InternshipStatus.CompletedPendingReview,
            InternshipStatus.Passed
        };
        var items = await _db.Internships
            .Where(i => i.IsArchived || approvedOrArchived.Contains(i.Status))
            .Select(i => new { i.ArchiveYear, Year = i.StartDate.Year })
            .ToListAsync(ct);

        var years = items
            .Select(x => !string.IsNullOrWhiteSpace(x.ArchiveYear) ? x.ArchiveYear! : x.Year.ToString())
            .Append(DateTime.Today.Year.ToString())
            .Distinct()
            .OrderByDescending(y => y)
            .ToList();
        return years;
    }

    /// <summary>
    /// Komisyon gösterge paneli istatistikleri.
    /// </summary>
    public async Task<CommitteeStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var q = _db.Internships.Where(i => !i.IsArchived && i.Status != InternshipStatus.Draft);
        var counts = await q.GroupBy(i => i.Status).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        int C(InternshipStatus s) => counts.FirstOrDefault(c => c.Key == s)?.Count ?? 0;
        var pendingLeaves = await _db.LeaveRequests.CountAsync(l => l.Status == LeaveRequestStatus.Pending, ct);
        var top = (await _catalog.GetCompanyStatsAsync(ct)).Where(s => s.TotalInternships > 0).Take(5).ToList();
        return new CommitteeStatsDto(
            counts.Sum(c => c.Count), C(InternshipStatus.Submitted),
            C(InternshipStatus.ApprovedByCommittee) + C(InternshipStatus.InsuranceStarted),
            C(InternshipStatus.InProgress), C(InternshipStatus.CompletedPendingReview),
            C(InternshipStatus.Passed), C(InternshipStatus.Failed), pendingLeaves, top,
            C(InternshipStatus.CancellationRequested), C(InternshipStatus.Cancelled), C(InternshipStatus.Rejected));
    }

    /// <summary>
    /// Kullanıcı profillerine, 2025-2026 yıllık arşiv kayıtlarına, dönemlere ve firma havuzuna zarar vermeden
    /// aktif test staj başvurularını, bunlara bağlı üretilmiş/yüklenmiş belgeleri (Form 2, Form 7, SPAS vb.),
    /// sanal defter kayıtlarını, izin taleplerini ve staj süreç geçmişini sıfırlar.
    /// </summary>
    public async Task<ResetInternshipsResultDto> ResetAllInternshipsAsync(CancellationToken ct = default)
    {
        var activeInternships = await _db.Internships
            .Include(i => i.Documents).ThenInclude(d => d.Versions)
            .Include(i => i.LogbookEntries)
            .Include(i => i.LeaveRequests)
            .Where(i => !i.IsArchived)
            .ToListAsync(ct);

        var docs = activeInternships.SelectMany(i => i.Documents).ToList();
        foreach (var doc in docs)
        {
            if (!string.IsNullOrWhiteSpace(doc.StoredFileName))
                _storage.Delete(doc.StoredFileName);
            foreach (var ver in doc.Versions)
            {
                if (!string.IsNullOrWhiteSpace(ver.StoredFileName))
                    _storage.Delete(ver.StoredFileName);
            }
        }

        var logbooks = activeInternships.SelectMany(i => i.LogbookEntries).ToList();
        foreach (var entry in logbooks)
        {
            if (!string.IsNullOrWhiteSpace(entry.ImageStoredFileName))
                _storage.Delete(entry.ImageStoredFileName);
        }
        var leaves = activeInternships.SelectMany(i => i.LeaveRequests).ToList();
        var notifications = await _db.Notifications.ToListAsync(ct);
        var auditLogs = await _db.AuditLogs.ToListAsync(ct);

        _db.Documents.RemoveRange(docs);
        _db.LogbookEntries.RemoveRange(logbooks);
        _db.LeaveRequests.RemoveRange(leaves);
        _db.Notifications.RemoveRange(notifications);
        _db.AuditLogs.RemoveRange(auditLogs);
        _db.Internships.RemoveRange(activeInternships);

        await _db.SaveChangesAsync(ct);

        return new ResetInternshipsResultDto(
            activeInternships.Count, docs.Count, logbooks.Count, leaves.Count, notifications.Count);
    }

    private static string GeneratePassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        return new string(Enumerable.Range(0, 10).Select(_ => chars[RandomNumberGenerator.GetInt32(chars.Length)]).ToArray());
    }
}
