using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Services;

/// <summary>
/// Giriş, öğrenci kaydı, parola değiştirme, kılavuz onayı ve personel (Komisyon/KPTO) yönetimi işlemleri.
/// </summary>
public class AuthService
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;
    private readonly ICurrentUser _currentUser;
    private readonly AppSettings _settings;

    /// <summary>
    /// Yeni bir kimlik doğrulama servisi oluşturur.
    /// </summary>
    public AuthService(IAppDbContext db, IPasswordHasher hasher, ITokenService tokens, ICurrentUser currentUser, IOptions<AppSettings> settings)
    {
        _db = db;
        _hasher = hasher;
        _tokens = tokens;
        _currentUser = currentUser;
        _settings = settings.Value;
    }

    /// <summary>
    /// E-posta ve parola ile giriş yapar, JWT döner.
    /// Öğrenci e-postalarında (@ogr.selcuk.edu.tr) @ öncesindeki kısım otomatik olarak öğrenci numarası olarak kaydedilir.
    /// </summary>
    public async Task<AuthResponse> LoginAsync(LoginRequest req, CancellationToken ct = default)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Eğer @ogr.selcuk.edu.tr uzantılı bir öğrenci e-postası ile ilk kez giriş yapılıyorsa otomatik öğrenci kaydı oluştur
        var atIndex = email.IndexOf('@');
        var emailPrefix = atIndex > 0 ? email[..atIndex].Trim() : string.Empty;

        if (user is null && email.EndsWith("@" + _settings.StudentEmailDomain) && !string.IsNullOrWhiteSpace(emailPrefix) && req.Password.Length >= 4)
        {
            user = new User
            {
                Email = email,
                PasswordHash = _hasher.Hash(req.Password),
                FullName = emailPrefix.All(char.IsDigit) ? $"Öğrenci ({emailPrefix})" : emailPrefix,
                StudentNo = emailPrefix,
                Department = "Bilgisayar Mühendisliği",
                Role = UserRole.Student,
                HasAcceptedGuide = false
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);
        }

        if (user is null || !_hasher.Verify(req.Password, user.PasswordHash))
            throw new AppException("E-posta veya parola hatalı.", 401);
        if (!user.IsActive)
            throw new AppException("Hesabınız pasif durumdadır. Komisyon ile iletişime geçiniz.", 401);

        // Öğrenci rolündeyse @ öncesindeki kısmı öğrenci numarası olarak senkronize et ve her girişte zorunlu bilgilendirme onayını sıfırla (Madde 1)
        if (user.Role == UserRole.Student)
        {
            user.HasAcceptedGuide = false;
            if (!string.IsNullOrWhiteSpace(emailPrefix))
            {
                if (emailPrefix.All(char.IsDigit) && user.StudentNo != emailPrefix)
                {
                    user.StudentNo = emailPrefix;
                }
                else if (string.IsNullOrWhiteSpace(user.StudentNo))
                {
                    user.StudentNo = emailPrefix;
                }
            }
            await _db.SaveChangesAsync(ct);
        }
        else if (user.Role == UserRole.CompanyAdvisor)
        {
            // Şirket danışmanı giriş yaptığında ilgili staj kayıtlarında son giriş tarihini ve e-posta takip durumunu güncelle (Madde 7)
            var assignedInternships = await _db.Internships
                .Where(i => i.AdvisorId == user.Id || i.AdvisorEmail == user.Email)
                .ToListAsync(ct);
            foreach (var intern in assignedInternships)
            {
                intern.AdvisorId ??= user.Id;
                intern.AdvisorLastLoginAt = DateTime.UtcNow;
                if (string.IsNullOrWhiteSpace(intern.AdvisorEmailStatus) || intern.AdvisorEmailStatus.Contains("Şifre"))
                {
                    intern.AdvisorEmailStatus = $"E-posta iletildi ve şirket danışmanı sisteme giriş yaptı ({DateTime.Now:dd.MM.yyyy HH:mm})";
                }
            }
            if (assignedInternships.Count > 0)
            {
                await _db.SaveChangesAsync(ct);
            }
        }

        return new AuthResponse(_tokens.CreateToken(user), user.ToDto());
    }

    /// <summary>
    /// Okul e-postası ile öğrenci hesabı oluşturur.
    /// </summary>
    public async Task<AuthResponse> RegisterStudentAsync(RegisterStudentRequest req, CancellationToken ct = default)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (!email.EndsWith("@" + _settings.StudentEmailDomain))
            throw AppException.BadRequest($"Yalnızca @{_settings.StudentEmailDomain} uzantılı okul e-postası ile kayıt olunabilir.");
        if (req.Password.Length < 6)
            throw AppException.BadRequest("Parola en az 6 karakter olmalıdır.");
        if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.StudentNo))
            throw AppException.BadRequest("Ad soyad ve öğrenci numarası zorunludur.");
        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw AppException.BadRequest("Bu e-posta adresi ile zaten bir hesap var.");

        var user = new User
        {
            Email = email,
            PasswordHash = _hasher.Hash(req.Password),
            FullName = req.FullName.Trim(),
            StudentNo = req.StudentNo.Trim(),
            NationalId = req.NationalId?.Trim(),
            Phone = req.Phone?.Trim(),
            Department = req.Department?.Trim(),
            Role = UserRole.Student
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return new AuthResponse(_tokens.CreateToken(user), user.ToDto());
    }

    /// <summary>
    /// Oturumdaki kullanıcının bilgilerini döner.
    /// </summary>
    public async Task<UserDto> MeAsync(CancellationToken ct = default) => (await CurrentAsync(ct)).ToDto();

    /// <summary>
    /// Parola değiştirir ve "ilk girişte parola değiştir" zorunluluğunu kaldırır.
    /// </summary>
    public async Task ChangePasswordAsync(ChangePasswordRequest req, CancellationToken ct = default)
    {
        var user = await CurrentAsync(ct);
        if (!_hasher.Verify(req.CurrentPassword, user.PasswordHash))
            throw AppException.BadRequest("Mevcut parola hatalı.");
        if (req.NewPassword.Length < 6)
            throw AppException.BadRequest("Yeni parola en az 6 karakter olmalıdır.");
        user.PasswordHash = _hasher.Hash(req.NewPassword);
        user.MustChangePassword = false;
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Öğrencinin Staj Kılavuzu'nu "Okudum, Anladım" olarak onaylamasını kaydeder.
    /// </summary>
    public async Task<UserDto> AcceptGuideAsync(CancellationToken ct = default)
    {
        var user = await CurrentAsync(ct);
        user.HasAcceptedGuide = true;
        await _db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    /// <summary>
    /// Profil bilgilerini (TC, telefon, bölüm) günceller.
    /// </summary>
    public async Task<UserDto> UpdateProfileAsync(UpdateProfileRequest req, CancellationToken ct = default)
    {
        var user = await CurrentAsync(ct);
        if (!string.IsNullOrWhiteSpace(req.FullName)) user.FullName = req.FullName.Trim();
        if (req.NationalId is { Length: > 0 } && (req.NationalId.Length != 11 || !req.NationalId.All(char.IsDigit)))
            throw AppException.BadRequest("T.C. Kimlik No 11 haneli olmalıdır.");
        user.NationalId = req.NationalId?.Trim();
        user.Phone = req.Phone?.Trim();
        user.Department = req.Department?.Trim();
        await _db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    /// <summary>
    /// Tüm kullanıcıları listeler (Bölüm Başkanı / Komisyon kendi bölümünün öğrenci ve komisyon üyelerini görür).
    /// </summary>
    public async Task<List<UserDto>> ListUsersAsync(UserRole? role, CancellationToken ct = default)
    {
        var current = await CurrentAsync(ct);
        var commDept = string.IsNullOrWhiteSpace(current.Department) ? "Bilgisayar Mühendisliği" : current.Department.Trim();
        var q = _db.Users.AsQueryable();
        if (current.Role is UserRole.CommitteeMember or UserRole.DepartmentHead)
        {
            q = q.Where(u =>
                (u.Department ?? "Bilgisayar Mühendisliği") == commDept ||
                u.Role == UserRole.KptoOfficer ||
                u.Role == UserRole.CompanyAdvisor);
        }
        if (role.HasValue) q = q.Where(u => u.Role == role.Value);
        var list = await q.OrderBy(u => u.Role).ThenBy(u => u.FullName).ToListAsync(ct);
        return list.Select(u => u.ToDto()).ToList();
    }

    /// <summary>
    /// Personel hesabı (Komisyon üyesi, KPTO memuru, Bölüm Başkanı) oluşturur.
    /// </summary>
    public async Task<UserDto> CreateStaffAsync(CreateStaffRequest req, CancellationToken ct = default)
    {
        var current = await CurrentAsync(ct);
        var commDept = string.IsNullOrWhiteSpace(current.Department) ? "Bilgisayar Mühendisliği" : current.Department.Trim();
        if (req.Role is UserRole.Student or UserRole.CompanyAdvisor)
            throw AppException.BadRequest("Öğrenci ve şirket yetkilisi hesapları bu ekrandan oluşturulamaz.");
        var email = req.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw AppException.BadRequest("Bu e-posta adresi ile zaten bir hesap var.");
        var user = new User
        {
            Email = email, FullName = req.FullName.Trim(), Role = req.Role, Phone = req.Phone,
            Department = req.Role == UserRole.KptoOfficer ? "Kariyer Planlama ve Sigorta Birimi" : commDept,
            PasswordHash = _hasher.Hash(req.Password), MustChangePassword = true, HasAcceptedGuide = true
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    /// <summary>
    /// Kullanıcı hesabını aktif / pasif yapar.
    /// </summary>
    public async Task<UserDto> SetActiveAsync(Guid id, bool active, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync(new object[] { id }, ct) ?? throw AppException.NotFound("Kullanıcı");
        if (user.Id == _currentUser.UserId) throw AppException.BadRequest("Kendi hesabınızı pasif yapamazsınız.");
        user.IsActive = active;
        await _db.SaveChangesAsync(ct);
        return user.ToDto();
    }

    private async Task<User> CurrentAsync(CancellationToken ct) =>
        await _db.Users.FindAsync(new object[] { _currentUser.UserId }, ct) ?? throw AppException.NotFound("Kullanıcı");
}
