using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Data;
using SelcukStaj.Api.Models;

namespace SelcukStaj.Api.Services;

public class DeadlineReminderResult
{
    public int ProcessedPeriodsCount { get; set; }
    public int ApplicationDeadlinesSent { get; set; }
    public int DocumentDeadlinesSent { get; set; }
    public int DiaryRemindersSent { get; set; }
    public int DiariesLockedCount { get; set; }
    public int TotalRemindersSent => ApplicationDeadlinesSent + DocumentDeadlinesSent + DiaryRemindersSent + DiariesLockedCount;
    public List<string> Details { get; set; } = new();
}

public interface IDeadlineReminderService
{
    Task<DeadlineReminderResult> ProcessUpcomingDeadlinesAsync(int thresholdDays = 7, bool ignoreCooldown = false);
}

public class DeadlineReminderService : IDeadlineReminderService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IEmailService _emailService;
    private readonly ILogger<DeadlineReminderService> _logger;

    public DeadlineReminderService(
        AppDbContext context,
        INotificationService notificationService,
        IEmailService emailService,
        ILogger<DeadlineReminderService> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<DeadlineReminderResult> ProcessUpcomingDeadlinesAsync(int thresholdDays = 7, bool ignoreCooldown = false)
    {
        var result = new DeadlineReminderResult();
        var now = DateTime.UtcNow;

        var activePeriods = await _context.InternshipPeriods
            .Where(p => p.IsActive)
            .Include(p => p.Applications)
            .ToListAsync();

        result.ProcessedPeriodsCount = activePeriods.Count;

        var allStudents = await _context.Users
            .Include(u => u.StudentProfile)
            .Where(u => u.Role == UserRole.Student && u.IsActive)
            .ToListAsync();

        foreach (var period in activePeriods)
        {
            var periodName = period.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";

            // 1. BAŞVURU SON GÜNÜ YAKLAŞIMI (Application Deadline)
            var daysUntilAppEnd = (period.ApplicationEndDate.Date - now.Date).TotalDays;
            if (daysUntilAppEnd >= 0 && daysUntilAppEnd <= thresholdDays)
            {
                var daysLeftInt = Math.Max(1, (int)Math.Ceiling(daysUntilAppEnd));

                foreach (var student in allStudents)
                {
                    // Öğrencinin bu dönemde onaylanmış veya komisyonda bekleyen geçerli başvurusu var mı?
                    var hasValidApp = await _context.InternshipApplications.AnyAsync(a => 
                        a.StudentId == student.Id && 
                        a.PeriodId == period.Id && 
                        a.Status >= ApplicationStatus.Submitted && 
                        a.Status != ApplicationStatus.RevisionRequired);

                    if (hasValidApp) continue; // Başvurusu zaten tamam

                    // Anti-Spam / Cooldown Kontrolü (Son 24 saatte başvuru uyarısı gönderildi mi?)
                    var recentlyReminded = await _context.UserNotifications.AnyAsync(n => 
                        n.UserId == student.Id && 
                        n.Title.Contains("Başvuru Süresi") && 
                        n.CreatedAt > now.AddHours(-24));

                    if (!ignoreCooldown && recentlyReminded) continue;

                    // Öğrencinin taslak veya revize bekleyen başvurusu var mı?
                    var existingDraft = await _context.InternshipApplications.FirstOrDefaultAsync(a => 
                        a.StudentId == student.Id && 
                        a.PeriodId == period.Id && 
                        (a.Status == ApplicationStatus.Draft || a.Status == ApplicationStatus.RevisionRequired));

                    var title = $"⏳ Staj Başvuru Süresi Sona Eriyor (Son {daysLeftInt} Gün)";
                    var message = $"{period.Title} için staj başvuruları {period.ApplicationEndDate:dd.MM.yyyy} tarihinde sona erecektir. " +
                                  (existingDraft != null 
                                      ? "Kayıtlı taslak başvurunuzu ve Form 2 kabul belgenizi tamamlayarak ivedilikle komisyon onayına gönderiniz." 
                                      : "Stajınızın yanmaması için sisteme giriş yaparak staj başvurunuzu ve evraklarınızı en kısa sürede tamamlayınız.");

                    // In-App Bildirim
                    await _notificationService.SendNotificationAsync(
                        userId: student.Id,
                        title: title,
                        message: message,
                        type: NotificationType.Warning,
                        applicationId: existingDraft?.Id
                    );

                    // Kurumsal Selçuk Üniversitesi HTML E-postası
                    var emailBody = EmailService.WrapSelcukTemplate(
                        title: $"{periodName} Başvuru Süresi Sona Eriyor (Son {daysLeftInt} Gün)",
                        subtitle: "Resmî Staj Başvuru Takvimi Önemli Hatırlatması",
                        content: $@"
                            <p>Sayın <strong>{student.FullName}</strong> ({student.StudentProfile?.StudentNumber ?? "Öğrenci"}),</p>
                            <p style='color: #b45309; font-weight: 600; font-size: 15px;'>{period.Title} için staj başvuru takvimi kapanmak üzeredir.</p>
                            <div style='background: #fffbeb; border-left: 4px solid #d97706; padding: 16px 20px; margin: 20px 0;'>
                                <p style='margin: 0 0 6px 0;'><strong>Staj Dönemi:</strong> {period.Title}</p>
                                <p style='margin: 0 0 6px 0;'><strong>Son Başvuru Tarihi:</strong> {period.ApplicationEndDate:dd.MM.yyyy} Saat: 23:59</p>
                                <p style='margin: 0 0 6px 0;'><strong>Kalan Süre:</strong> {daysLeftInt} Gün</p>
                                <p style='margin: 0;'><strong>Zorunlu İşlem:</strong> Form 2 (Staj Kabul Formu) ve e-Devlet SPAS Müstehaklık Belgesinin yüklenerek komisyona iletilmesi.</p>
                            </div>
                            <p>Staj yönergemiz uyarınca bu tarihten sonra başvuru alınamayacak ve 5510 Sayılı Kanun kapsamındaki SGK girişleri yapılamayacaktır.</p>
                            <div style='text-align: center; margin: 25px 0;'>
                                <a href='http://localhost:8080' style='background: #1c458b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Staj Başvuru Sistemine Giriş Yap</a>
                            </div>
                        ",
                        headerColor: "#d97706"
                    );

                    await _emailService.SendEmailAsync(
                        toEmail: student.Email,
                        recipientName: student.FullName,
                        subject: $"[Selçuk Staj] Önemli Hatırlatma: {periodName} Başvuru Süresi Sona Eriyor (Son {daysLeftInt} Gün)",
                        templateType: "ApplicationDeadlineReminder",
                        htmlBody: emailBody,
                        applicationId: existingDraft?.Id
                    );

                    result.ApplicationDeadlinesSent++;
                    result.Details.Add($"Başvuru Hatırlatması: {student.FullName} ({student.Email}) - Kalan Gün: {daysLeftInt}");
                }
            }

            // 2. EVRAK VE SANAL DEFTER TESLİM SON GÜNÜ YAKLAŞIMI (Document Deadline)
            var daysUntilDocEnd = (period.DocumentDeadlineDate.Date - now.Date).TotalDays;
            if (daysUntilDocEnd >= 0 && daysUntilDocEnd <= thresholdDays)
            {
                var daysLeftDocInt = Math.Max(1, (int)Math.Ceiling(daysUntilDocEnd));

                var pendingDocApps = await _context.InternshipApplications
                    .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
                    .Include(a => a.PhysicalDelivery)
                    .Include(a => a.Advisor)
                    .Where(a => a.PeriodId == period.Id && 
                                (a.Status == ApplicationStatus.InsuranceStarted || 
                                 a.Status == ApplicationStatus.InProgress || 
                                 a.Status == ApplicationStatus.AwaitingAdvisorApproval || 
                                 a.Status == ApplicationStatus.AdvisorApproved) &&
                                (a.PhysicalDelivery == null || !a.PhysicalDelivery.IsReceivedByUniversity))
                    .ToListAsync();

                foreach (var app in pendingDocApps)
                {
                    if (app.Student == null) continue;

                    // Anti-Spam / Cooldown Kontrolü (Son 24 saatte evrak teslim uyarısı gönderildi mi?)
                    var recentlyReminded = await _context.UserNotifications.AnyAsync(n => 
                        n.UserId == app.StudentId && 
                        n.Title.Contains("Evrak ve Defter Teslim") && 
                        n.CreatedAt > now.AddHours(-24));

                    if (!ignoreCooldown && recentlyReminded) continue;

                    var title = $"⚠️ Staj Evrak ve Defter Teslim Süresi Doluyor (Son {daysLeftDocInt} Gün)";
                    var message = $"{period.Title} staj evraklarınızın (Form 3-4, Islak İmzalı Teslimat Belgesi) ve Sanal Staj Defterinizin son teslim tarihi {period.DocumentDeadlineDate:dd.MM.yyyy}'dir. " +
                                  "Stajınızın geçersiz sayılmaması için işlemlerinizi tamamlayıp bölüm sekreterliğine teslim ediniz.";

                    // In-App Bildirim
                    await _notificationService.SendNotificationAsync(
                        userId: app.StudentId,
                        title: title,
                        message: message,
                        type: NotificationType.Warning,
                        applicationId: app.Id
                    );

                    // Kurumsal Selçuk Üniversitesi HTML E-postası
                    var emailBody = EmailService.WrapSelcukTemplate(
                        title: $"{periodName} Evrak ve Defter Teslim Süresi Doluyor",
                        subtitle: "Akademik Değerlendirme Öncesi Son Teslim Uyarısı",
                        content: $@"
                            <p>Sayın <strong>{app.Student.FullName}</strong>,</p>
                            <p style='color: #dc2626; font-weight: 600; font-size: 15px;'>{period.Title} staj evrak ve defter teslim süresi dolmak üzeredir.</p>
                            <div style='background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 20px 0;'>
                                <p style='margin: 0 0 6px 0;'><strong>Başvuru Takip No:</strong> #{app.Id}</p>
                                <p style='margin: 0 0 6px 0;'><strong>Son Teslim Tarihi:</strong> {period.DocumentDeadlineDate:dd.MM.yyyy} Saat: 17:00</p>
                                <p style='margin: 0 0 6px 0;'><strong>Kalan Süre:</strong> {daysLeftDocInt} Gün</p>
                                <p style='margin: 0;'><strong>Teslim Edilecekler:</strong> Sanal Defter İşyeri Onayı, Form 3 (Öğrenci Değerlendirme) ve Form 4 (İşyeri Değerlendirme) kapalı zarf içinde Bölüm Sekreterliğine teslim edilmelidir.</p>
                            </div>
                            <p>Yönerge uyarınca son teslim tarihinden sonra teslim edilen belgeler kabul edilmeyecek ve staj başarısız sayılacaktır.</p>
                            <div style='text-align: center; margin: 25px 0;'>
                                <a href='http://localhost:8080' style='background: #1c458b; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Staj Portalı Evrak Sayfasına Git</a>
                            </div>
                        ",
                        headerColor: "#dc2626"
                    );

                    await _emailService.SendEmailAsync(
                        toEmail: app.Student.Email,
                        recipientName: app.Student.FullName,
                        subject: $"[Selçuk Staj] Acil: {periodName} Evrak ve Defter Teslim Süresi Dolmak Üzere (Son {daysLeftDocInt} Gün)",
                        templateType: "DocumentDeadlineReminder",
                        htmlBody: emailBody,
                        applicationId: app.Id
                    );

                    result.DocumentDeadlinesSent++;
                    result.Details.Add($"Evrak Teslim Hatırlatması: {app.Student.FullName} ({app.Student.Email}) - Kalan Gün: {daysLeftDocInt}");
                }
            }
        }

        // 3. STAJ BİTİMİNE 1 HAFTA KALA VE STAJ SÜRESİ DOLUNCA DEFTER KİLİTLEME KONTROLÜ
        var ongoingApps = await _context.InternshipApplications
            .Include(a => a.Student)
            .Include(a => a.Diary)
            .Where(a => a.Status == ApplicationStatus.InProgress || 
                        a.Status == ApplicationStatus.InsuranceStarted || 
                        a.Status == ApplicationStatus.AwaitingAdvisorApproval)
            .ToListAsync();

        foreach (var app in ongoingApps)
        {
            if (app.Student == null) continue;

            var daysUntilStajEnd = (app.CurrentEndDate.Date - now.Date).TotalDays;

            // 3a. Staj bitimine 1 hafta kala hatırlatma (0 <= kalan gün <= 7)
            if (daysUntilStajEnd >= 0 && daysUntilStajEnd <= thresholdDays)
            {
                var daysLeftInt = Math.Max(1, (int)Math.Ceiling(daysUntilStajEnd));

                var alreadyWarned = await _context.UserNotifications.AnyAsync(n => 
                    n.UserId == app.StudentId && 
                    n.Title.Contains("Staj Bitişi Yaklaşıyor") && 
                    n.CreatedAt > now.AddHours(-24));

                if (ignoreCooldown || !alreadyWarned)
                {
                    var title = $"⏰ Staj Bitişi Yaklaşıyor: Kalan {daysLeftInt} Gün!";
                    var message = $"Stajınız {app.CurrentEndDate:dd.MM.yyyy} tarihinde tamamlanacaktır. " +
                                  "Lütfen günlük staj defterinizin tüm günlerini eksiksiz doldurunuz. " +
                                  "Staj süreniz bittiğinde defteriniz sistemsel olarak kilitlenecek ve yeni giriş yapılamayacaktır.";

                    await _notificationService.SendNotificationAsync(
                        userId: app.StudentId,
                        title: title,
                        message: message,
                        type: NotificationType.Warning,
                        applicationId: app.Id
                    );

                    result.DiaryRemindersSent++;
                    result.Details.Add($"Defter Doldurma Uyarısı (1 Hafta Kala): {app.Student.FullName} - Bitiş: {app.CurrentEndDate:dd.MM.yyyy}");
                }
            }

            // 3b. Süre dolduysa ve defter henüz kilitlenmemişse KİLİTLE (Süre dolunca defteri kullanamasın öğrenci)
            if (now.Date > app.CurrentEndDate.Date)
            {
                if (app.Diary != null && !app.Diary.IsLocked && !app.Diary.IsApprovedByAdvisor)
                {
                    app.Diary.IsLocked = true;
                    app.Diary.LockReason = $"Staj süresi {app.CurrentEndDate:dd.MM.yyyy} tarihinde dolduğu için sistem tarafından otomatik olarak kilitlenmiştir. Düzenleme yapılamaz.";

                    var title = "🔒 Staj Süresi Sona Erdi - Staj Defteriniz Kilitlendi";
                    var message = $"Resmî staj süreniz {app.CurrentEndDate:dd.MM.yyyy} tarihi itibarıyla sona ermiştir. " +
                                  "Yönerge kuralları gereğince staj defteriniz kilitlenmiştir. " +
                                  "Defterinizi onay için işyeri danışman mühendisinize sunabilir ve evrak teslim sürecini başlatabilirsiniz.";

                    await _notificationService.SendNotificationAsync(
                        userId: app.StudentId,
                        title: title,
                        message: message,
                        type: NotificationType.Warning,
                        applicationId: app.Id
                    );

                    result.DiariesLockedCount++;
                    result.Details.Add($"Defter Kilitlendi: {app.Student.FullName} - Bitiş Tarihi: {app.CurrentEndDate:dd.MM.yyyy}");
                }
            }
        }

        await _context.SaveChangesAsync();

        return result;
    }
}
