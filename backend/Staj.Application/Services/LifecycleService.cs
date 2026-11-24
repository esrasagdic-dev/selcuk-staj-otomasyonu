using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Staj.Application.Common;
using Staj.Application.Services;
using Staj.Domain.Enums;

namespace Staj.Application.Services
{
    /// <summary>
    /// Zamana bağlı otomatik durum geçişlerini yapar (arka plan görevi tarafından periyodik çağrılır):
    /// <list type="bullet">
    /// <item>Sigortası başlatılmış staj, başlangıç günü gelince → "Staj Devam Ediyor" ("Stajınız Başladı: 1. Gün").</item>
    /// <item>Bitişe 1 hafta kala → "Stajınız bitmek üzere, Sanal Defterinizi tamamlayın" uyarısı.</item>
    /// <item>Bitiş tarihi geçince → "Değerlendirme Bekleniyor" (dosya Komisyon paneline düşer).</item>
    /// </list>
    /// </summary>
    public class LifecycleService
    {
        private readonly IAppDbContext _db;
        private readonly NotificationService _notify;

        /// <summary>
        /// Yeni bir yaşam döngüsü servisi oluşturur.
        /// </summary>
        public LifecycleService(IAppDbContext db, NotificationService notify)
        {
            _db = db;
            _notify = notify;
        }

        /// <summary>
        /// Verilen güne göre tüm otomatik geçişleri uygular. Değişen kayıt sayısını döner.
        /// </summary>
        public async Task<int> RunAsync(DateOnly today, CancellationToken ct = default)
        {
            WorkDayCalculator.SimulatedToday = today;
            var changed = 0;
            var list = await _db.Internships
                .Include(i => i.Student).Include(i => i.Company).Include(i => i.Term)
                .Include(i => i.Documents).Include(i => i.LogbookEntries)
                .Where(i => i.Status == InternshipStatus.ApprovedByCommittee ||
                            i.Status == InternshipStatus.InsuranceStarted ||
                            i.Status == InternshipStatus.InProgress ||
                            i.Status == InternshipStatus.CompletedPendingReview)
                .ToListAsync(ct);

            foreach (var i in list)
            {
                if (i.Status == InternshipStatus.ApprovedByCommittee &&
                    i.KptoStatus == KptoInsuranceStatus.Pending &&
                    !i.InsuranceReminderNotified &&
                    i.StartDate.AddDays(-5) <= today)
                {
                    i.InsuranceReminderNotified = true;
                    _notify.ToRole(UserRole.KptoOfficer, "⚠️ Acil SGK İşe Giriş Hatırlatması",
                        $"{i.Student.FullName} ({i.Company.Name}) staj başlangıcına 5 günden az kaldı ({i.StartDate:dd.MM.yyyy}) — SGK işe giriş işlemi bekliyor.",
                        NotificationType.Warning, i.Id);
                    changed++;
                }

                if ((i.Status == InternshipStatus.InsuranceStarted || i.Status == InternshipStatus.ApprovedByCommittee) && today >= i.StartDate && today <= i.EndDate)
                {
                    if (i.KptoStatus != KptoInsuranceStatus.InsuranceActive)
                    {
                        i.KptoStatus = KptoInsuranceStatus.InsuranceActive;
                        i.InsuranceStartedAt ??= DateTime.UtcNow;
                    }
                    i.Status = InternshipStatus.InProgress;
                    _notify.ToUser(i.StudentId, "Stajınız Başladı: 1. Gün", "Staj başlangıç tarihiniz geldi ve aktif staj sayacınız 1. Gün olarak başlatıldı. Sanal staj defterinizi her gün doldurmayı unutmayınız.", NotificationType.Info, i.Id);
                    changed++;
                }

                if ((i.Status == InternshipStatus.InProgress || i.Status == InternshipStatus.InsuranceStarted || i.Status == InternshipStatus.ApprovedByCommittee) && today > i.EndDate)
                {
                    if (i.KptoStatus != KptoInsuranceStatus.InsuranceActive)
                    {
                        i.KptoStatus = KptoInsuranceStatus.InsuranceActive;
                        i.InsuranceStartedAt ??= DateTime.UtcNow;
                    }
                    i.Status = InternshipStatus.CompletedPendingReview;
                    _notify.ToRole(UserRole.CommitteeMember, "Değerlendirme Bekleyen Staj", $"{i.Student.FullName} ({i.Company.Name}) stajını tamamladı.", NotificationType.Info, i.Id);
                    if (i.AdvisorId.HasValue)
                        _notify.ToUser(i.AdvisorId.Value, "Staj Tamamlandı", $"{i.Student.FullName} stajını tamamladı. Lütfen defteri inceleyip onaylayınız ve imzalı sonuç formunu yükleyiniz.", NotificationType.Warning, i.Id);
                    changed++;
                }
                else if (i.Status == InternshipStatus.InProgress && !i.EndingSoonNotified && i.EndDate.AddDays(-7) <= today)
                {
                    i.EndingSoonNotified = true;
                    _notify.ToUser(i.StudentId, "⚠️ Stajınızın Bitimine 1 Hafta Kaldı!",
                        $"Stajınız {i.EndDate:dd.MM.yyyy} tarihinde sona erecektir. Lütfen sanal staj defterinizi ({i.WorkDays} iş günü) eksiksiz tamamlayıp sorumlu mühendise göndermeyi ve zorunlu belgelerinizi yüklemeyi unutmayınız.",
                        NotificationType.Warning, i.Id);
                    await _notify.TryEmailAsync(i.Student.Email, "Stajınız Bitmek Üzere",
                        $"<p>Sayın {i.Student.FullName},</p><p>Stajınız {i.EndDate:dd.MM.yyyy} tarihinde sona erecektir. Lütfen sanal staj defterinizi tamamlayınız.</p>", ct, i.Id);
                    changed++;
                }

                if (i.Status == InternshipStatus.CompletedPendingReview &&
                    !i.ReportDeadlineNotified &&
                    i.Term != null &&
                    i.Term.ReportDeadline.AddDays(-3) <= today &&
                    (!i.AdvisorLogbookApproved ||
                     !i.Documents.Any(d => d.Type == DocumentType.ResultForm) ||
                     i.LogbookEntries.Count(e => !e.IsDraft) < i.WorkDays))
                {
                    i.ReportDeadlineNotified = true;
                    _notify.ToUser(i.StudentId, "⏰ Rapor ve Evrak Teslim Son Tarihi Yaklaşıyor!",
                        $"Dönem rapor son teslim tarihi ({i.Term.ReportDeadline:dd.MM.yyyy}) yaklaşıyor. Eksik sanal defter, sorumlu mühendis onayı veya imzalı Form 4 evraklarınızı tamamlayınız.",
                        NotificationType.Warning, i.Id);
                    await _notify.TryEmailAsync(i.Student.Email, "Staj Raporu Son Teslim Hatırlatması",
                        $"<p>Sayın {i.Student.FullName},</p><p>{i.Term.Name} için rapor ve sonuç evrakı son teslim tarihi (<b>{i.Term.ReportDeadline:dd.MM.yyyy}</b>) yaklaşmaktadır. Eksik defter/imzalı form işlemlerinizi tamamlayınız.</p>", ct, i.Id);
                    changed++;
                }
            }

            if (changed > 0) await _db.SaveChangesAsync(ct);
            return changed;
        }
    }
}

namespace Staj.Application
{
    /// <summary>
    /// Application katmanı servis kayıtları.
    /// </summary>
    public static class DependencyInjection
    {
        /// <summary>
        /// Application servislerini DI konteynerine ekler.
        /// </summary>
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            services.AddScoped<WorkDayCalculator>();
            services.AddScoped<NotificationService>();
            services.AddScoped<AuthService>();
            services.AddScoped<CatalogService>();
            services.AddScoped<InternshipService>();
            services.AddScoped<CommitteeService>();
            services.AddScoped<AdvisorService>();
            services.AddScoped<KptoService>();
            services.AddScoped<LifecycleService>();
            return services;
        }
    }
}
