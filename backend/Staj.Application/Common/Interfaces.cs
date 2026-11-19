using Microsoft.EntityFrameworkCore;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Application.Common;

/// <summary>
/// Uygulama katmanının veritabanına erişim sözleşmesi. Infrastructure katmanındaki AppDbContext tarafından uygulanır.
/// </summary>
public interface IAppDbContext
{
    /// <summary>Kullanıcılar.</summary>
    DbSet<User> Users { get; }
    /// <summary>Staj dönemleri.</summary>
    DbSet<Term> Terms { get; }
    /// <summary>Firmalar.</summary>
    DbSet<Company> Companies { get; }
    /// <summary>Firma ilanları.</summary>
    DbSet<CompanyListing> CompanyListings { get; }
    /// <summary>Stajlar.</summary>
    DbSet<Internship> Internships { get; }
    /// <summary>Belgeler.</summary>
    DbSet<Document> Documents { get; }
    /// <summary>Sanal defter sayfaları.</summary>
    DbSet<LogbookEntry> LogbookEntries { get; }
    /// <summary>İzin talepleri.</summary>
    DbSet<LeaveRequest> LeaveRequests { get; }
    /// <summary>Resmi tatiller.</summary>
    DbSet<Holiday> Holidays { get; }
    /// <summary>Komisyon duyuruları.</summary>
    DbSet<Announcement> Announcements { get; }
    /// <summary>Bildirimler.</summary>
    DbSet<Notification> Notifications { get; }
    /// <summary>Denetim logları.</summary>
    DbSet<AuditLog> AuditLogs { get; }

    /// <summary>Değişiklikleri veritabanına kaydeder.</summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

/// <summary>
/// İsteği yapan (oturum açmış) kullanıcının bilgilerine erişim sağlar.
/// </summary>
public interface ICurrentUser
{
    /// <summary>Kullanıcı kimliği.</summary>
    Guid UserId { get; }
    /// <summary>Kullanıcı rolü.</summary>
    UserRole Role { get; }
    /// <summary>Oturum açık mı?</summary>
    bool IsAuthenticated { get; }
}

/// <summary>
/// PDF ve diğer dosyaları diskte (uploads klasörü) GUID isimle saklayan servis sözleşmesi.
/// </summary>
public interface IFileStorage
{
    /// <summary>Akışı diske kaydeder ve üretilen GUID tabanlı dosya adını döner.</summary>
    Task<string> SaveAsync(Stream content, string extension, CancellationToken ct = default);
    /// <summary>Kayıtlı dosyayı okumak için açar.</summary>
    Stream OpenRead(string storedFileName);
    /// <summary>Kayıtlı dosyayı siler.</summary>
    void Delete(string storedFileName);
}

/// <summary>
/// E-posta gönderim servisi sözleşmesi (geliştirmede MailHog'a gönderir).
/// </summary>
public interface IEmailService
{
    /// <summary>HTML gövdeli e-posta gönderir.</summary>
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}

/// <summary>
/// Resmi formları PDF olarak üreten servis sözleşmesi.
/// </summary>
public interface IPdfService
{
    /// <summary>Öğrenci ve firma bilgileri önceden doldurulmuş resmi Form 2 (Staj Kabul Formu) üretir.</summary>
    byte[] GenerateForm2(Internship internship);
    /// <summary>Öğrenci bilgileri önceden doldurulmuş resmi Form 3 (Staj Devam Formu) üretir.</summary>
    byte[] GenerateForm3(Internship internship);
    /// <summary>Öğrenci ve işyeri bilgileri önceden doldurulmuş resmi Form 4 (Staj Değerlendirme Formu) üretir.</summary>
    byte[] GenerateForm4(Internship internship);
    /// <summary>Sanal staj defterini (Kapak + Rapor Sayfaları) tek PDF olarak üretir.</summary>
    byte[] GenerateLogbook(Internship internship);
    /// <summary>Öğrenci ve staj bilgileriyle doldurulmuş resmi Form 7 (Staj İptal Formu) üretir.</summary>
    byte[] GenerateForm7(Internship internship, string reason, string educationType, DateOnly formDate);
}

/// <summary>
/// KPTO için SGK/SPAS Excel dökümü üreten servis sözleşmesi.
/// </summary>
public interface IExcelService
{
    /// <summary>KPTO listesini Excel (xlsx) olarak üretir.</summary>
    byte[] GenerateKptoList(IEnumerable<DTOs.KptoRowDto> rows);
}

/// <summary>
/// JWT erişim belirteci üretim servisi sözleşmesi.
/// </summary>
public interface ITokenService
{
    /// <summary>Kullanıcı için imzalı JWT üretir.</summary>
    string CreateToken(User user);
}

/// <summary>
/// Parola hash'leme servisi sözleşmesi (BCrypt).
/// </summary>
public interface IPasswordHasher
{
    /// <summary>Parolayı hash'ler.</summary>
    string Hash(string password);
    /// <summary>Parolayı hash ile doğrular.</summary>
    bool Verify(string password, string hash);
}
