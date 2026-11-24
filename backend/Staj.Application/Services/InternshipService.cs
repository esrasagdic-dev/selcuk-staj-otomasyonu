using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Services;

/// <summary>
/// Stajın öğrenci tarafındaki tüm işlemleri (başvuru, evrak, sanal defter, izin, dekont) ile
/// tüm panellerin ortak kullandığı detay görüntüleme, belge indirme ve PDF üretme işlemleri.
/// </summary>
public class InternshipService
{
    private static readonly string[] AllowedExtensions = { ".pdf", ".jpg", ".jpeg", ".png" };

    private static readonly InternshipStatus[] ActiveStatuses =
    {
        InternshipStatus.Draft, InternshipStatus.Submitted, InternshipStatus.RevisionRequested,
        InternshipStatus.ApprovedByCommittee, InternshipStatus.InsuranceStarted, InternshipStatus.InProgress,
        InternshipStatus.CompletedPendingReview, InternshipStatus.Passed, InternshipStatus.CancellationRequested
    };

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly WorkDayCalculator _calc;
    private readonly CatalogService _catalog;
    private readonly NotificationService _notify;
    private readonly IFileStorage _files;
    private readonly IPdfService _pdf;
    private readonly IPasswordHasher _hasher;
    private readonly AppSettings _settings;

    /// <summary>
    /// Yeni bir staj servisi oluşturur.
    /// </summary>
    public InternshipService(IAppDbContext db, ICurrentUser currentUser, WorkDayCalculator calc, CatalogService catalog,
        NotificationService notify, IFileStorage files, IPdfService pdf, IPasswordHasher hasher, IOptions<AppSettings> settings)
    {
        _db = db;
        _currentUser = currentUser;
        _calc = calc;
        _catalog = catalog;
        _notify = notify;
        _files = files;
        _pdf = pdf;
        _hasher = hasher;
        _settings = settings.Value;
    }

    private static DateOnly Today => WorkDayCalculator.EffectiveToday;

    // =====================================================================
    //  ORTAK SORGULAR
    // =====================================================================

    /// <summary>
    /// Listeleme için ilişkileriyle birlikte staj sorgusu.
    /// </summary>
    public IQueryable<Internship> Query() => _db.Internships
        .Include(i => i.Student).Include(i => i.Term).Include(i => i.Company).Include(i => i.LeaveRequests).Include(i => i.Documents);

    /// <summary>
    /// Stajı tüm ilişkileriyle yükler ve oturumdaki kullanıcının görme yetkisini kontrol eder.
    /// </summary>
    public async Task<Internship> LoadAsync(Guid id, CancellationToken ct = default)
    {
        var i = await _db.Internships
            .Include(x => x.Student).Include(x => x.Term).Include(x => x.Company)
            .Include(x => x.Documents).Include(x => x.LeaveRequests).Include(x => x.LogbookEntries)
    
            .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw AppException.NotFound("Staj kaydı");
        EnsureCanView(i);
        return i;
    }

    /// <summary>
    /// Oturumdaki kullanıcının stajı görüntüleme yetkisi olup olmadığını kontrol eder.
    /// </summary>
    public void EnsureCanView(Internship i)
    {
        var ok = _currentUser.Role switch
        {
            UserRole.Student => i.StudentId == _currentUser.UserId,
            UserRole.CompanyAdvisor => i.AdvisorId == _currentUser.UserId,
            UserRole.KptoOfficer => i.KptoStatus != null,
            UserRole.CommitteeMember or UserRole.DepartmentHead or UserRole.Admin => true,
            _ => false
        };
        if (!ok) throw AppException.Forbidden();
    }

    /// <summary>
    /// Staj detayını ("Stajın X. günü" sayacı dahil) döner.
    /// </summary>
    public async Task<InternshipDetailDto> GetDetailAsync(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        return await ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Entity'yi gün sayacıyla birlikte detay DTO'suna çevirir.
    /// Başlangıç tarihi geldiği anda stajı otomatik "InProgress" (1. Gün) durumuna geçirir ve bitime 1 hafta kala uyarısını tetikler.
    /// </summary>
    public async Task<InternshipDetailDto> ToDetailAsync(Internship i, CancellationToken ct = default)
    {
        var changed = false;
        if (i.Status == InternshipStatus.InsuranceStarted && Today >= i.StartDate)
        {
            i.Status = InternshipStatus.InProgress;
            _notify.ToUser(i.StudentId, "Stajınız Başladı: 1. Gün", "Staj başlangıç tarihiniz geldi ve aktif staj sayacınız 1. Gün olarak başlatıldı. Sanal staj defterinizi her gün doldurmayı unutmayınız.", NotificationType.Info, i.Id);
            changed = true;
        }
        if (i.Status == InternshipStatus.InProgress && !i.EndingSoonNotified && i.EndDate.AddDays(-7) <= Today)
        {
            i.EndingSoonNotified = true;
            _notify.ToUser(i.StudentId, "⚠️ Stajınızın Bitimine 1 Hafta Kaldı!",
                $"Stajınız {i.EndDate:dd.MM.yyyy} tarihinde sona erecektir. Lütfen sanal staj defterinizi ({i.WorkDays} iş günü) eksiksiz tamamlayıp sorumlu mühendise göndermeyi ve zorunlu belgelerinizi yüklemeyi unutmayınız.",
                NotificationType.Warning, i.Id);
            changed = true;
        }
        if (changed)
        {
            await _db.SaveChangesAsync(ct);
        }

        int? day = null;
        if (i.Status is InternshipStatus.ApprovedByCommittee or InternshipStatus.InsuranceStarted or InternshipStatus.InProgress or InternshipStatus.CompletedPendingReview or InternshipStatus.Passed)
            day = await _calc.CurrentDayAsync(i.StartDate, i.EndDate, Today, i.WorksOnSaturday, ct);
        var dto = i.ToDetail(day);
        if (_currentUser.Role == UserRole.Student && !string.IsNullOrWhiteSpace(dto.AdvisorEmailStatus))
        {
            var sanitized = System.Text.RegularExpressions.Regex.Replace(
                dto.AdvisorEmailStatus,
                @"geçici şifre \([^)]+\)",
                "geçici şifre (***)",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            dto = dto with { AdvisorEmailStatus = sanitized };
        }
        return dto;
    }

    /// <summary>
    /// Belge veya QR kod üzerindeki doğrulama koduyla staj kaydını KVKK maskeli olarak doğrular.
    /// </summary>
    public async Task<VerifyResultDto> VerifyAsync(Guid code, CancellationToken ct = default)
    {
        var i = await _db.Internships
            .Include(x => x.Student).Include(x => x.Company).Include(x => x.Term)
            .FirstOrDefaultAsync(x => x.VerificationCode == code, ct);
        if (i is null)
            return new VerifyResultDto(false, null, null, null, null, null, null, null);

        var maskedName = MaskFullName(i.Student.FullName);
        return new VerifyResultDto(true, maskedName, i.Student.StudentNo, i.Company.Name, i.Term.Name, i.StartDate, i.EndDate, i.Status);
    }

    private static string MaskFullName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return "-";
        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts.Select(p => p.Length <= 2 ? p[0] + "***" : p[..2] + "***"));
    }

    // =====================================================================
    //  ÖĞRENCİ: BAŞVURU
    // =====================================================================

    /// <summary>
    /// Öğrencinin tüm staj başvurularını döner.
    /// </summary>
    public async Task<List<InternshipDetailDto>> GetMineAsync(CancellationToken ct = default)
    {
        var list = await _db.Internships
            .Include(x => x.Student).Include(x => x.Term).Include(x => x.Company)
            .Include(x => x.Documents).Include(x => x.LeaveRequests).Include(x => x.LogbookEntries)
    
            .Where(x => x.StudentId == _currentUser.UserId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        var result = new List<InternshipDetailDto>();
        foreach (var i in list) result.Add(await ToDetailAsync(i, ct));
        return result;
    }

    /// <summary>
    /// Yeni staj başvurusu (taslak) oluşturur. Bitiş tarihi tatiller düşülerek otomatik hesaplanır ve kilitlenir.
    /// </summary>
    public async Task<InternshipDetailDto> CreateAsync(InternshipUpsertRequest req, CancellationToken ct = default)
    {
        var student = await _db.Users.FindAsync(new object[] { _currentUser.UserId }, ct) ?? throw AppException.NotFound("Kullanıcı");
        if (!student.HasAcceptedGuide) throw AppException.BadRequest("Başvuru yapmadan önce Staj Kılavuzu'nu okuyup onaylamalısınız.");

        var i = new Internship { StudentId = student.Id };
        await ApplyAsync(i, req, ct);

        var duplicate = await _db.Internships.AnyAsync(x => x.StudentId == student.Id && x.Type == i.Type && ActiveStatuses.Contains(x.Status), ct);
        if (duplicate) throw AppException.BadRequest($"{i.Type.ToTurkish()} için zaten aktif veya tamamlanmış bir başvurunuz bulunuyor.");

        _db.Internships.Add(i);
        await _db.SaveChangesAsync(ct);
        return await GetDetailAsync(i.Id, ct);
    }

    /// <summary>
    /// Taslak veya revize istenen başvuruyu günceller.
    /// </summary>
    public async Task<InternshipDetailDto> UpdateAsync(Guid id, InternshipUpsertRequest req, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (i.Status is not (InternshipStatus.Draft or InternshipStatus.RevisionRequested))
            throw AppException.BadRequest("Yalnızca taslak veya revize istenen başvurular düzenlenebilir.");
        await ApplyAsync(i, req, ct);
        i.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetDetailAsync(i.Id, ct);
    }

    private async Task ApplyAsync(Internship i, InternshipUpsertRequest req, CancellationToken ct)
    {
        var term = await _db.Terms.FindAsync(new object[] { req.TermId }, ct)
                   ?? await _db.Terms.FirstOrDefaultAsync(t => t.IsActive, ct)
                   ?? await _db.Terms.FirstOrDefaultAsync(ct)
                   ?? throw AppException.NotFound("Dönem");
        if (req.WorkDays < 1 || req.WorkDays > 60)
            throw AppException.BadRequest("İş günü sayısı geçersiz.");
        if (string.IsNullOrWhiteSpace(req.AdvisorEmail) || !req.AdvisorEmail.Contains('@'))
            throw AppException.BadRequest("Geçerli bir şirket yetkilisi e-posta adresi giriniz.");
        if (string.IsNullOrWhiteSpace(req.AdvisorName)) throw AppException.BadRequest("Şirket yetkilisinin adı zorunludur.");

        var calc = await _calc.CalculateAsync(req.StartDate, req.WorkDays, req.WorksOnSaturday, ct);

        Company company;
        if (req.CompanyId.HasValue)
            company = await _db.Companies.FindAsync(new object[] { req.CompanyId.Value }, ct) ?? throw AppException.NotFound("Firma");
        else if (req.NewCompany is not null)
            company = await _catalog.GetOrCreateCompanyAsync(req.NewCompany, ct);
        else
            throw AppException.BadRequest("Firma seçiniz veya yeni firma bilgilerini giriniz.");

        i.TermId = term.Id;
        i.Type = term.InternshipType;
        i.Company = company;
        i.CompanyId = company.Id;
        i.AdvisorName = req.AdvisorName.Trim();
        i.AdvisorEmail = req.AdvisorEmail.Trim().ToLowerInvariant();
        i.WorkDays = req.WorkDays;
        i.StartDate = req.StartDate;
        i.EndDate = calc.EndDate;
        i.OriginalEndDate = calc.EndDate;
        i.Department = req.Department;
        i.ReceivesSalary = req.ReceivesSalary;
        i.WorksOnSaturday = req.WorksOnSaturday;
    }

    /// <summary>
    /// Form 2, SPAS veya staj süreci/sonu belgeleri yüklenmiş başvuruyu Staj Komisyonu incelemesine gönderir.
    /// Öğrenci numarası e-posta adresinin @ öncesindeki kısımdan doğrulanır.
    /// </summary>
    public async Task<InternshipDetailDto> SubmitAsync(Guid id, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (!i.Documents.Any(d => d.Type == DocumentType.Form2)) throw AppException.BadRequest("Islak imzalı Form 2 yüklenmelidir.");
        if (!i.Documents.Any(d => d.Type == DocumentType.Spas)) throw AppException.BadRequest("SPAS Müstehaklık Belgesi yüklenmelidir.");

        var atIndex = i.Student.Email.IndexOf('@');
        var emailPrefix = atIndex > 0 ? i.Student.Email[..atIndex].Trim() : string.Empty;
        if (!string.IsNullOrWhiteSpace(emailPrefix) && (string.IsNullOrWhiteSpace(i.Student.StudentNo) || emailPrefix.All(char.IsDigit)))
        {
            i.Student.StudentNo = emailPrefix;
        }
        if (string.IsNullOrWhiteSpace(i.Student.StudentNo))
            throw AppException.BadRequest("Öğrenci numaranız kurumsal e-posta adresinizden doğrulanamadı.");

        if (i.Status is InternshipStatus.Draft or InternshipStatus.RevisionRequested)
        {
            var wasRevision = i.Status == InternshipStatus.RevisionRequested;
            i.Status = InternshipStatus.Submitted;
            i.SubmittedAt = DateTime.UtcNow;
            i.UpdatedAt = DateTime.UtcNow;
            _notify.ToRole(UserRole.CommitteeMember, wasRevision ? "Revize Edilmiş Başvuru ve Belgeler" : "Yeni Staj Başvurusu ve Belgeler",
                $"{i.Student.FullName} ({i.Student.StudentNo} - {i.Type.ToTurkish()} - {i.Company.Name}) başvurusunu ve belgelerini {(wasRevision ? "düzelterek tekrar " : "")}Komisyona gönderdi.",
                NotificationType.Info, i.Id);
        }
        else
        {
            i.SubmittedAt ??= DateTime.UtcNow;
            i.UpdatedAt = DateTime.UtcNow;
            _notify.ToRole(UserRole.CommitteeMember, "Öğrenci Staj Belgelerini Komisyona İletti",
                $"{i.Student.FullName} ({i.Student.StudentNo} - {i.Type.ToTurkish()} - {i.Company.Name}) güncel staj belgelerini ({i.Documents.Count} adet belge) Staj Komisyonuna iletti.",
                NotificationType.Info, i.Id);
        }

        _notify.Audit("Internship.Submit", nameof(Internship), i.Id);
        await _db.SaveChangesAsync(ct);
        return await ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Başvuruyu iptal eder (taslak ise siler). Sigorta başlatılmış stajlar komisyon tarafından iptal edilmelidir.
    /// </summary>
    public async Task CancelAsync(Guid id, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (i.Status == InternshipStatus.Draft)
        {
            foreach (var d in i.Documents) _files.Delete(d.StoredFileName);
            _db.Internships.Remove(i);
        }
        else if (i.Status is InternshipStatus.Submitted or InternshipStatus.RevisionRequested)
        {
            i.Status = InternshipStatus.Cancelled;
            i.UpdatedAt = DateTime.UtcNow;
            _notify.Audit("Internship.Cancel", nameof(Internship), i.Id, "Öğrenci tarafından iptal");
        }
        else throw AppException.BadRequest("Onaylanmış başvurular yalnızca komisyon tarafından iptal edilebilir (Form 7).");
        await _db.SaveChangesAsync(ct);
    }

    // =====================================================================
    //  BELGELER
    // =====================================================================

    /// <summary>
    /// Staja belge yükler. Kim, hangi durumda, hangi belgeyi yükleyebilir kuralları burada uygulanır.
    /// Aynı türdeki eski belge (Form 2, SPAS, Sonuç Formu) yenisiyle değiştirilir.
    /// </summary>
    public async Task<DocumentDto> UploadAsync(Guid id, DocumentType type, Stream content, string fileName, string contentType, long length, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext)) throw AppException.BadRequest("Yalnızca PDF, JPG veya PNG dosyası yüklenebilir.");
        if (length <= 0) throw AppException.BadRequest("Dosya boş.");
        if (length > _settings.MaxUploadMb * 1024L * 1024L) throw AppException.BadRequest($"Dosya boyutu en fazla {_settings.MaxUploadMb} MB olabilir.");

        EnsureCanUpload(i, type);

        // Tekil belgelerde eskisini sil (versiyonlama yerine son yüklenen geçerlidir).
        if (type is DocumentType.Form2 or DocumentType.Spas or DocumentType.ResultForm or DocumentType.Form3)
        {
            foreach (var old in i.Documents.Where(d => d.Type == type).ToList())
            {
                _files.Delete(old.StoredFileName);
                _db.Documents.Remove(old);
            }
        }

        var stored = await _files.SaveAsync(content, ext, ct);
        var doc = new Document
        {
            InternshipId = i.Id, Type = type, OriginalFileName = Path.GetFileName(fileName), StoredFileName = stored,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            SizeBytes = length, UploadedById = _currentUser.UserId
        };
        _db.Documents.Add(doc);
        i.UpdatedAt = DateTime.UtcNow;

        if (type == DocumentType.SalaryReceipt)
        {
            i.ReceivesSalary = true;
            _notify.ToRole(UserRole.KptoOfficer, "Maaş Dekontu Yüklendi",
                $"{i.Student.FullName} ({i.Company.Name}) stajyer maaş dekontu yükledi.", NotificationType.SalaryReceipt, i.Id);
        }
        if (type == DocumentType.ResultForm)
        {
            _notify.ToUser(i.StudentId, "Sonuç Formu Yüklendi", "Şirket yetkiliniz staj değerlendirme formunu sisteme yükledi.", NotificationType.Success, i.Id);
            _notify.ToRole(UserRole.CommitteeMember, "Sonuç Formu Yüklendi", $"{i.Student.FullName} için şirket sonuç formu yüklendi.", NotificationType.Info, i.Id);
        }

        await _db.SaveChangesAsync(ct);
        return doc.ToDto();
    }

    private void EnsureCanUpload(Internship i, DocumentType type)
    {
        var role = _currentUser.Role;
        if (role is UserRole.CommitteeMember or UserRole.DepartmentHead or UserRole.Admin) return;

        if (role == UserRole.Student)
        {
            if (i.Status == InternshipStatus.Cancelled)
                throw AppException.BadRequest("İptal edilmiş staja belge yüklenemez.");
            return;
        }
        if (role == UserRole.CompanyAdvisor && type == DocumentType.ResultForm)
        {
            if (i.Status is not (InternshipStatus.InsuranceStarted or InternshipStatus.InProgress or InternshipStatus.CompletedPendingReview))
                throw AppException.BadRequest("Sonuç formu staj süreci başladıktan sonra yüklenebilir.");
            return;
        }
        throw AppException.Forbidden("Bu belge türünü yükleme yetkiniz yok.");
    }

    /// <summary>
    /// Yüklenen belgeyi indirir (yetki kontrolü ile).
    /// </summary>
    public async Task<StoredFileDto> DownloadAsync(Guid documentId, CancellationToken ct = default)
    {
        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, ct) ?? throw AppException.NotFound("Belge");
        var i = await _db.Internships.FirstAsync(x => x.Id == doc.InternshipId, ct);
        EnsureCanView(i);
        return new StoredFileDto(_files.OpenRead(doc.StoredFileName), doc.ContentType, doc.OriginalFileName);
    }

    /// <summary>
    /// Öğrencinin kendi yüklediği belgeyi siler (yalnızca başvuru gönderilmeden önce).
    /// </summary>
    public async Task DeleteDocumentAsync(Guid documentId, CancellationToken ct = default)
    {
        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == documentId, ct) ?? throw AppException.NotFound("Belge");
        var i = await LoadAsync(doc.InternshipId, ct);
        if (doc.UploadedById != _currentUser.UserId) throw AppException.Forbidden("Yalnızca kendi yüklediğiniz belgeyi silebilirsiniz.");
        if (_currentUser.Role == UserRole.Student && doc.Type is DocumentType.Form2 or DocumentType.Spas &&
            i.Status is not (InternshipStatus.Draft or InternshipStatus.RevisionRequested))
            throw AppException.BadRequest("Gönderilmiş başvurunun evrakı silinemez.");
        _files.Delete(doc.StoredFileName);
        _db.Documents.Remove(doc);
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Önceden doldurulmuş resmi Form 2 (Staj Kabul Formu) PDF'ini üretir.
    /// </summary>
    public async Task<FileResultDto> GenerateForm2Async(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var bytes = _pdf.GenerateForm2(i);
        return new FileResultDto(bytes, "application/pdf", $"Form2_{i.Student.StudentNo}_{i.Type}.pdf");
    }

    /// <summary>
    /// Önceden doldurulmuş resmi Form 3 (Staj Devam Formu) PDF'ini üretir.
    /// </summary>
    public async Task<FileResultDto> GenerateForm3Async(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var bytes = _pdf.GenerateForm3(i);
        return new FileResultDto(bytes, "application/pdf", $"Form3_Devamlilik_{i.Student.StudentNo}_{i.Type}.pdf");
    }

    /// <summary>
    /// Önceden doldurulmuş resmi Form 4 (Staj Değerlendirme Formu) PDF'ini üretir.
    /// </summary>
    public async Task<FileResultDto> GenerateForm4Async(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var bytes = _pdf.GenerateForm4(i);
        return new FileResultDto(bytes, "application/pdf", $"Form4_Degerlendirme_{i.Student.StudentNo}_{i.Type}.pdf");
    }

    /// <summary>
    /// Sanal staj defterini (Kapak + İşyeri Tanıtım + Rapor Sayfaları) tek PDF olarak üretir.
    /// </summary>
    public async Task<FileResultDto> GenerateLogbookPdfAsync(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var bytes = _pdf.GenerateLogbook(i);
        return new FileResultDto(bytes, "application/pdf", $"StajDefteri_{i.Student.StudentNo}_{i.Type}.pdf");
    }

    /// <summary>
    /// Öğrencinin girdiği mazeret ve otomatik bilgilerle Form 7 (Staj İptal Formu) PDF önizlemesi üretir.
    /// </summary>
    public async Task<FileResultDto> PreviewForm7Async(Guid id, Form7Request req, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        if (!string.IsNullOrWhiteSpace(req.NationalId)) i.Student.NationalId = req.NationalId.Trim();
        if (!string.IsNullOrWhiteSpace(req.Phone)) i.Student.Phone = req.Phone.Trim();
        var eduType = ResolveEducationType(req.EducationType, i.Student.StudentNo);
        var bytes = _pdf.GenerateForm7(i, req.Reason, eduType, Today);
        return new FileResultDto(bytes, "application/pdf", $"Form7_Staj_Iptal_{i.Student.StudentNo}_{i.Type}.pdf");
    }

    /// <summary>
    /// Staja ait mevcut Form 7 (Staj İptal Formu) PDF'ini döner.
    /// </summary>
    public async Task<FileResultDto> GenerateForm7Async(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var existingDoc = i.Documents.FirstOrDefault(d => d.Type == DocumentType.Form7);
        if (existingDoc is not null)
        {
            await using var stream = _files.OpenRead(existingDoc.StoredFileName);
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms, ct);
            return new FileResultDto(ms.ToArray(), "application/pdf", existingDoc.OriginalFileName);
        }

        var eduType = ResolveEducationType(null, i.Student.StudentNo);
        var bytes = _pdf.GenerateForm7(i, i.EvaluationNote ?? "-", eduType, Today);
        return new FileResultDto(bytes, "application/pdf", $"Form7_Staj_Iptal_{i.Student.StudentNo}_{i.Type}.pdf");
    }

    /// <summary>
    /// Öğrencinin doldurduğu Form 7 (Staj İptal Formu) verilerini PDF'e işleyerek staj kaydına iliştirir
    /// ve başvuruyu "İptal Talebi Bekliyor (CancellationRequested)" durumuna çekerek komisyona iletir.
    /// </summary>
    public async Task<InternshipDetailDto> SubmitForm7CancelRequestAsync(Guid id, Form7Request req, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (i.Status is InternshipStatus.Draft or InternshipStatus.Passed or InternshipStatus.Failed or InternshipStatus.Cancelled)
            throw AppException.BadRequest("Bu durumdaki staj için Form 7 iptal talebi oluşturulamaz.");
        if (string.IsNullOrWhiteSpace(req.Reason))
            throw AppException.BadRequest("Lütfen staj iptal mazeretinizi yazınız.");

        if (!string.IsNullOrWhiteSpace(req.NationalId)) i.Student.NationalId = req.NationalId.Trim();
        if (!string.IsNullOrWhiteSpace(req.Phone)) i.Student.Phone = req.Phone.Trim();

        var eduType = ResolveEducationType(req.EducationType, i.Student.StudentNo);
        var pdfBytes = _pdf.GenerateForm7(i, req.Reason.Trim(), eduType, Today);

        // Varsa eski Form 7 belgesini temizle
        foreach (var old in i.Documents.Where(d => d.Type == DocumentType.Form7).ToList())
        {
            _files.Delete(old.StoredFileName);
            _db.Documents.Remove(old);
        }

        await using var pdfStream = new MemoryStream(pdfBytes);
        var storedName = await _files.SaveAsync(pdfStream, ".pdf", ct);
        var fileName = $"Form7_Staj_Iptal_{i.Student.StudentNo}_{i.Type}.pdf";

        var doc = new Document
        {
            InternshipId = i.Id,
            Type = DocumentType.Form7,
            OriginalFileName = fileName,
            StoredFileName = storedName,
            ContentType = "application/pdf",
            SizeBytes = pdfBytes.LongLength,
            UploadedById = _currentUser.UserId
        };
        _db.Documents.Add(doc);

        i.Status = InternshipStatus.CancellationRequested;
        i.EvaluationNote = req.Reason.Trim();
        i.UpdatedAt = DateTime.UtcNow;

        _notify.ToRole(
            UserRole.CommitteeMember,
            "Yeni Staj İptal Talebi (Form 7)",
            $"{i.Student.FullName} ({i.Student.StudentNo} - {i.Company.Name}) Form 7 staj iptal talebi gönderdi. Mazeret: {req.Reason.Trim()}",
            NotificationType.Warning,
            i.Id);
        _notify.Audit("Internship.Form7Submit", nameof(Internship), i.Id, req.Reason.Trim());

        await _db.SaveChangesAsync(ct);
        return await ToDetailAsync(i, ct);
    }

    private static string ResolveEducationType(string? requested, string? studentNo)
    {
        if (!string.IsNullOrWhiteSpace(requested)) return requested.Trim();
        if (!string.IsNullOrWhiteSpace(studentNo) && studentNo.Length >= 6)
        {
            var code = studentNo.Substring(4, 2);
            if (code is "21" or "22" or "23") return "İÖ";
        }
        return "NÖ";
    }

    // =====================================================================
    //  SANAL STAJ DEFTERİ
    // =====================================================================

    /// <summary>
    /// Stajın defter sayfalarını döner. Staj iş günü sayısını (WorkDays) aşan fazlalık sayfalar varsa temizler.
    /// </summary>
    public async Task<List<LogbookEntryDto>> GetLogbookAsync(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var excess = i.LogbookEntries.Where(e => e.DayNumber > i.WorkDays).ToList();
        if (excess.Count > 0)
        {
            _db.LogbookEntries.RemoveRange(excess);
            await _db.SaveChangesAsync(ct);
        }
        return i.LogbookEntries
            .Where(e => e.DayNumber <= i.WorkDays)
            .OrderBy(e => e.DayNumber)
            .ThenBy(e => e.Date)
            .ThenBy(e => e.UpdatedAt)
            .Select(e => e.ToDto())
            .ToList();
    }

    /// <summary>
    /// Staj defteri / rapor sayfasını oluşturur veya mevcut bir sayfayı günceller.
    /// Stajın iş günü sayısından (WorkDays) fazla gün/sayfa açılmasına izin vermez.
    /// </summary>
    public async Task<LogbookEntryDto> UpsertLogbookAsync(Guid id, LogbookUpsertRequest req, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (i.Status is not (InternshipStatus.ApprovedByCommittee or InternshipStatus.InsuranceStarted or InternshipStatus.InProgress or InternshipStatus.CompletedPendingReview))
            throw AppException.BadRequest("Staj defteri yalnızca onaylanmış staj sürecinde doldurulabilir.");
        if (i.AdvisorLogbookApproved) throw AppException.BadRequest("Şirket yetkilisi defteri onayladıktan sonra değişiklik yapılamaz.");
        if (string.IsNullOrWhiteSpace(req.Content))
            throw AppException.BadRequest("Rapor içeriği boş bırakılamaz.");

        LogbookEntry? entry = null;
        if (req.Id.HasValue)
        {
            entry = i.LogbookEntries.FirstOrDefault(e => e.Id == req.Id.Value);
        }

        // İlk boş gün numarasını bul (1..WorkDays arasında)
        var usedDays = i.LogbookEntries.Select(x => x.DayNumber).ToHashSet();
        int firstAvailableDay = 1;
        while (firstAvailableDay <= i.WorkDays && usedDays.Contains(firstAvailableDay))
        {
            firstAvailableDay++;
        }

        var requestedPageNo = req.PageNumber ?? firstAvailableDay;
        if (requestedPageNo < 1 || requestedPageNo > i.WorkDays)
        {
            throw AppException.BadRequest($"Staj süreniz {i.WorkDays} iş günüdür. En fazla {i.WorkDays} günlük staj defteri yazabilirsiniz ({requestedPageNo}. iş günü açılamaz).");
        }

        if (entry is null)
        {
            // Aynı gün numarasına ait kayıt varsa onu güncelle, yoksa yeni oluştur
            entry = i.LogbookEntries.FirstOrDefault(e => e.DayNumber == requestedPageNo);
            if (entry is null)
            {
                if (i.LogbookEntries.Count(e => e.DayNumber <= i.WorkDays) >= i.WorkDays)
                {
                    throw AppException.BadRequest($"Staj süreniz {i.WorkDays} iş günüdür. Tüm iş günleri ({i.WorkDays}/{i.WorkDays}) doldurulmuştur, daha fazla gün eklenemez.");
                }

                entry = new LogbookEntry
                {
                    InternshipId = i.Id,
                    DayNumber = requestedPageNo,
                    Date = req.Date
                };
                _db.LogbookEntries.Add(entry);
            }
            else
            {
                entry.Date = req.Date;
            }
        }
        else
        {
            entry.Date = req.Date;
            entry.DayNumber = requestedPageNo;
        }

        entry.Title = string.IsNullOrWhiteSpace(req.Title) ? $"{entry.DayNumber}. Sayfa Staj Raporu" : req.Title.Trim();
        entry.Content = req.Content.Trim();
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return entry.ToDto();
    }

    /// <summary>
    /// Defter sayfasını siler ve kalan sayfaların numaralarını sıralar.
    /// </summary>
    public async Task DeleteLogbookAsync(Guid id, Guid entryId, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (i.AdvisorLogbookApproved) throw AppException.BadRequest("Onaylanmış defterden sayfa silinemez.");
        var e = i.LogbookEntries.FirstOrDefault(x => x.Id == entryId) ?? throw AppException.NotFound("Defter sayfası");
        _db.LogbookEntries.Remove(e);
        var remaining = i.LogbookEntries.Where(x => x.Id != entryId).OrderBy(x => x.DayNumber).ThenBy(x => x.Date).ToList();
        for (int idx = 0; idx < remaining.Count; idx++)
        {
            remaining[idx].DayNumber = idx + 1;
        }
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Öğrencinin tamamlanan staj defterini sorumlu mühendise (şirket danışmanına) inceleme ve onay için göndermesi (Madde 6, 7, 16).
    /// </summary>
    public async Task<InternshipDetailDto> SubmitLogbookToAdvisorAsync(Guid id, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (i.Status is not (InternshipStatus.ApprovedByCommittee or InternshipStatus.InsuranceStarted or InternshipStatus.InProgress or InternshipStatus.CompletedPendingReview))
            throw AppException.BadRequest("Staj defteri yalnızca onaylanmış staj sürecinde sorumlu mühendise gönderilebilir.");
        if (i.AdvisorLogbookApproved)
            throw AppException.BadRequest("Staj defteriniz zaten sorumlu mühendis tarafından onaylanmıştır.");
        if (i.LogbookEntries.Count < i.WorkDays)
            throw AppException.BadRequest($"Eksik staj defteri sorumlu mühendise gönderilemez! Toplam {i.WorkDays} iş gününün tamamını doldurmalısınız (Mevcut doldurulan: {i.LogbookEntries.Count} / {i.WorkDays} gün).");

        i.LogbookSubmittedToAdvisorAt = DateTime.UtcNow;
        i.LogbookRevisionRequested = false;
        i.LogbookRevisionNote = null;
        i.AdvisorEmailSentAt = DateTime.UtcNow;
        i.AdvisorEmailStatus = $"Staj defteri tamamlandı ({i.LogbookEntries.Count}/{i.WorkDays} gün) ve sorumlu mühendise ({i.AdvisorEmail}) inceleme e-postası gönderildi ({DateTime.Now:dd.MM.yyyy HH:mm}).";
        i.UpdatedAt = DateTime.UtcNow;

        if (i.AdvisorId.HasValue)
        {
            _notify.ToUser(i.AdvisorId.Value, "Staj Defteri İncelemenize Sunuldu",
                $"{i.Student.FullName} ({i.Student.StudentNo}) {i.WorkDays} iş günlük staj defterini tamamladı ve onayınıza gönderdi.",
                NotificationType.Info, i.Id);
        }

        var loginUrl = $"{_settings.PublicBaseUrl.TrimEnd('/')}/login";
        var html = $"""
            <p>Sayın <b>{i.AdvisorName}</b>,</p>
            <p>Kurumunuzda ({i.Company.Name}) staj yapan <b>{i.Student.FullName}</b> ({i.Student.StudentNo}) isimli öğrenci, <b>{i.WorkDays} iş günlük</b> sanal staj defterini eksiksiz doldurarak inceleme ve onayınıza göndermiştir.</p>
            <p>Şirket Yetkilisi Paneli'ne giriş yaparak öğrencinin staj defterini inceleyebilir, onaylayabilir veya düzeltme (revize) talep edebilirsiniz:</p>
            <p>Giriş Adresi: <a href="{loginUrl}">{loginUrl}</a><br/>
            Yetkili E-Posta: <b>{i.AdvisorEmail}</b></p>
            <p>Saygılarımızla,<br/>T.C. Selçuk Üniversitesi Teknoloji Fakültesi Staj Komisyonu</p>
            """;
        await _notify.TryEmailAsync(i.AdvisorEmail, $"Staj Defteri Onayınıza Sunuldu - {i.Student.FullName}", html, ct);
        _notify.Audit("Internship.SubmitLogbookToAdvisor", nameof(Internship), i.Id, $"Sent to {i.AdvisorEmail}");

        await _db.SaveChangesAsync(ct);
        return await ToDetailAsync(i, ct);
    }

    /// <summary>
    /// Şirket danışmanına (sorumlu mühendise) bilgilendirme ve giriş e-postasını tekrar gönderir ve takip bilgisini günceller (Madde 7).
    /// </summary>
    public async Task<InternshipDetailDto> ResendAdvisorEmailAsync(Guid id, CancellationToken ct = default)
    {
        var i = await LoadAsync(id, ct);
        var advisor = await _db.Users.FirstOrDefaultAsync(u => u.Email == i.AdvisorEmail, ct);
        string tempPassword;
        if (i.AdvisorEmail == "danisman@aselsankonya.com.tr")
        {
            tempPassword = "123456";
        }
        else
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            tempPassword = new string(Enumerable.Range(0, 8)
                .Select(_ => chars[System.Security.Cryptography.RandomNumberGenerator.GetInt32(chars.Length)]).ToArray());
        }

        if (advisor is null)
        {
            advisor = new User
            {
                Email = i.AdvisorEmail,
                FullName = i.AdvisorName,
                Role = UserRole.CompanyAdvisor,
                CompanyId = i.CompanyId,
                PasswordHash = _hasher.Hash(tempPassword),
                MustChangePassword = i.AdvisorEmail != "danisman@aselsankonya.com.tr",
                HasAcceptedGuide = true
            };
            _db.Users.Add(advisor);
        }
        else if (advisor.Role == UserRole.CompanyAdvisor && i.AdvisorEmail != "danisman@aselsankonya.com.tr")
        {
            advisor.PasswordHash = _hasher.Hash(tempPassword);
        }

        i.AdvisorId = advisor.Id;
        var loginUrl = $"{_settings.PublicBaseUrl.TrimEnd('/')}/login";
        var html = $"""
            <p>Sayın <b>{i.AdvisorName}</b>,</p>
            <p><b>{i.Student.FullName}</b> ({i.Student.StudentNo}) isimli öğrencinin <b>{i.Company.Name}</b> bünyesindeki {i.Type.ToTurkish()} süreci için Şirket Yetkilisi (Sorumlu Mühendis) olarak tanımlanmış bulunmaktasınız.</p>
            <p>Giriş Adresi: <a href="{loginUrl}">{loginUrl}</a><br/>
            Kullanıcı E-Posta: <b>{i.AdvisorEmail}</b><br/>
            Geçici Şifreniz: <b>{tempPassword}</b></p>
            """;
        await _notify.TryEmailAsync(i.AdvisorEmail, $"Şirket Danışmanı Bilgilendirme - {i.Student.FullName}", html, ct);

        i.AdvisorEmailSentAt = DateTime.UtcNow;
        i.AdvisorEmailStatus = $"Şirket danışmanı hesabı oluşturuldu ve geçici şifre ({tempPassword}) {i.AdvisorEmail} adresine e-posta ile gönderildi ({DateTime.Now:dd.MM.yyyy HH:mm}).";
        i.UpdatedAt = DateTime.UtcNow;
        _notify.Audit("Internship.ResendAdvisorEmail", nameof(Internship), i.Id, i.AdvisorEmail);
        await _db.SaveChangesAsync(ct);
        return await ToDetailAsync(i, ct);
    }

    // =====================================================================
    //  İZİN / TELAFİ
    // =====================================================================

    /// <summary>
    /// İzin / rapor talebi oluşturur. Komisyon onayladığında günler stajın sonuna eklenir.
    /// </summary>
    public async Task<LeaveRequestDto> CreateLeaveAsync(Guid id, LeaveCreateRequest req, CancellationToken ct = default)
    {
        var i = await LoadOwnAsync(id, ct);
        if (i.Status is not (InternshipStatus.ApprovedByCommittee or InternshipStatus.InsuranceStarted or InternshipStatus.InProgress))
            throw AppException.BadRequest("İzin talebi yalnızca onaylanmış veya devam eden staj için oluşturulabilir.");
        if (req.Days is < 1 or > 15) throw AppException.BadRequest("İzin gün sayısı 1-15 arasında olmalıdır.");
        if (req.StartDate < i.StartDate || req.StartDate > i.EndDate) throw AppException.BadRequest("İzin başlangıcı staj tarihleri içinde olmalıdır.");
        if (string.IsNullOrWhiteSpace(req.Reason)) throw AppException.BadRequest("Gerekçe zorunludur.");
        if (i.LeaveRequests.Any(l => l.Status == LeaveRequestStatus.Pending))
            throw AppException.BadRequest("Bekleyen bir izin talebiniz zaten var.");

        var leave = new LeaveRequest { InternshipId = i.Id, Internship = i, Type = req.Type, StartDate = req.StartDate, Days = req.Days, Reason = req.Reason.Trim() };
        _db.LeaveRequests.Add(leave);
        _notify.ToRole(UserRole.CommitteeMember, "Yeni İzin / Telafi Talebi",
            $"{i.Student.FullName} {req.Days} gün {(req.Type == LeaveType.MedicalReport ? "rapor" : "izin")} talep etti.", NotificationType.Warning, i.Id);
        await _db.SaveChangesAsync(ct);
        return leave.ToDto();
    }

    private async Task<Internship> LoadOwnAsync(Guid id, CancellationToken ct)
    {
        var i = await LoadAsync(id, ct);
        if (i.StudentId != _currentUser.UserId) throw AppException.Forbidden();
        return i;
    }
}
