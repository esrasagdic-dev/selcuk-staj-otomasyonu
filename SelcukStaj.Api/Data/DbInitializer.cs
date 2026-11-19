using Microsoft.EntityFrameworkCore;
using SelcukStaj.Api.Models;
using SelcukStaj.Api.Services;

namespace SelcukStaj.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        // 1. Tabloların Varlığını Teyit Et (SQLite Migration)
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""Announcements"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Announcements"" PRIMARY KEY AUTOINCREMENT,
                ""Title"" TEXT NOT NULL,
                ""Summary"" TEXT NOT NULL,
                ""Content"" TEXT NOT NULL,
                ""Category"" TEXT NOT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                ""IsPublished"" INTEGER NOT NULL,
                ""Author"" TEXT NOT NULL,
                ""RelatedPeriodId"" INTEGER NULL,
                CONSTRAINT ""FK_Announcements_InternshipPeriods_RelatedPeriodId"" FOREIGN KEY (""RelatedPeriodId"") REFERENCES ""InternshipPeriods"" (""Id"") ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS ""UserNotifications"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_UserNotifications"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NOT NULL,
                ""Title"" TEXT NOT NULL,
                ""Message"" TEXT NOT NULL,
                ""Type"" INTEGER NOT NULL,
                ""RelatedApplicationId"" INTEGER NULL,
                ""IsRead"" INTEGER NOT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                ""ReadAt"" TEXT NULL,
                CONSTRAINT ""FK_UserNotifications_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ""EmailLogs"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_EmailLogs"" PRIMARY KEY AUTOINCREMENT,
                ""ToEmail"" TEXT NOT NULL,
                ""RecipientName"" TEXT NOT NULL,
                ""Subject"" TEXT NOT NULL,
                ""BodyHtml"" TEXT NOT NULL,
                ""TemplateType"" TEXT NOT NULL,
                ""RelatedApplicationId"" INTEGER NULL,
                ""Status"" TEXT NOT NULL,
                ""SentAt"" TEXT NOT NULL
            );
        ");

        // Staj defteri her gün için ayrı görsel sütunları (SQLite Safe Migration)
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""DiaryEntries"" ADD COLUMN ""ImageUrl"" TEXT NULL;");
        }
        catch { /* Kolon zaten mevcut */ }

        try
        {
            await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""DiaryEntries"" ADD COLUMN ""ImageCaption"" TEXT NULL;");
        }
        catch { /* Kolon zaten mevcut */ }

        // Staj defteri kapak ve personel tanıtımı sütunları (SQLite Safe Migration)
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipDiaries"" ADD COLUMN ""TotalEmployees"" TEXT NULL;");
        }
        catch { /* Kolon zaten mevcut */ }

        try
        {
            await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipDiaries"" ADD COLUMN ""CoverPageDataJson"" TEXT NULL;");
        }
        catch { /* Kolon zaten mevcut */ }

        // Yeni Tablolar (SQLite Safe Migration)
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""CompanyJobPostings"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_CompanyJobPostings"" PRIMARY KEY AUTOINCREMENT,
                ""CompanyName"" TEXT NOT NULL,
                ""Department"" TEXT NOT NULL,
                ""Title"" TEXT NOT NULL,
                ""Sector"" TEXT NOT NULL,
                ""City"" TEXT NOT NULL,
                ""Quota"" INTEGER NOT NULL,
                ""Requirements"" TEXT NOT NULL,
                ""ContactEmail"" TEXT NOT NULL,
                ""ApplicationDeadline"" TEXT NOT NULL,
                ""IsActive"" INTEGER NOT NULL,
                ""CreatedAt"" TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ""InternshipExtensionRequests"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_InternshipExtensionRequests"" PRIMARY KEY AUTOINCREMENT,
                ""InternshipApplicationId"" INTEGER NOT NULL,
                ""RequestedExtraDays"" INTEGER NOT NULL,
                ""Reason"" TEXT NOT NULL,
                ""OriginalEndDate"" TEXT NOT NULL,
                ""NewCalculatedEndDate"" TEXT NOT NULL,
                ""Status"" INTEGER NOT NULL,
                ""CommissionNotes"" TEXT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                ""CommissionApprovedAt"" TEXT NULL,
                ""KptoProcessedAt"" TEXT NULL,
                ""KptoNotes"" TEXT NULL,
                CONSTRAINT ""FK_InternshipExtensionRequests_InternshipApplications_InternshipApplicationId"" FOREIGN KEY (""InternshipApplicationId"") REFERENCES ""InternshipApplications"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Users Tablosu Sütunları
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""Users"" ADD COLUMN ""Department"" TEXT NOT NULL DEFAULT 'Bilgisayar Mühendisliği';"); } catch { }

        // InternshipApplications Tablosu Sütunları
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""HasExtensionRequest"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ExtensionExtraDays"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ExtensionReason"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ExtensionMissedDates"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipExtensionRequests"" ADD COLUMN ""MissedDates"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ExtensionRequestedAt"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""IsExtensionApprovedByCommission"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ExtensionCommissionApprovedAt"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""IsExtensionSgkProcessedByKPTO"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ExtensionSgkProcessedAt"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""HasCancelRequest"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""CancelReason"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""CancelFormDocumentPath"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""CancelRequestedAt"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""IsCancelApprovedByCommission"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""CancelCommissionApprovedAt"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""CancelCommissionNotes"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ReceiptDocumentPath"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""ReceiptUploadedAt"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipApplications"" ADD COLUMN ""IsReceiptVerifiedByKPTO"" INTEGER NOT NULL DEFAULT 0;"); } catch { }

        // InternshipDiaries Tablosu Sütunları
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipDiaries"" ADD COLUMN ""IsLocked"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipDiaries"" ADD COLUMN ""LockReason"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipDiaries"" ADD COLUMN ""IsRevisionRequestedByAdvisor"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipDiaries"" ADD COLUMN ""AdvisorRevisionNotes"" TEXT NULL;"); } catch { }
        try { await context.Database.ExecuteSqlRawAsync(@"ALTER TABLE ""InternshipDiaries"" ADD COLUMN ""RevisionRequestedAt"" TEXT NULL;"); } catch { }

        // 2. Resmî Tatilleri Ekle
        if (!await context.PublicHolidays.AnyAsync())
        {
            var holidays = new List<PublicHoliday>
            {
                new() { Date = new DateTime(2026, 1, 1), Description = "Yılbaşı", Year = 2026 },
                new() { Date = new DateTime(2026, 3, 20), Description = "Ramazan Bayramı Arifesi", Year = 2026 },
                new() { Date = new DateTime(2026, 3, 21), Description = "Ramazan Bayramı 1. Gün", Year = 2026 },
                new() { Date = new DateTime(2026, 3, 22), Description = "Ramazan Bayramı 2. Gün", Year = 2026 },
                new() { Date = new DateTime(2026, 3, 23), Description = "Ramazan Bayramı 3. Gün", Year = 2026 },
                new() { Date = new DateTime(2026, 4, 23), Description = "Ulusal Egemenlik ve Çocuk Bayramı", Year = 2026 },
                new() { Date = new DateTime(2026, 5, 1), Description = "Emek ve Dayanışma Günü", Year = 2026 },
                new() { Date = new DateTime(2026, 5, 19), Description = "Atatürk'ü Anma, Gençlik ve Spor Bayramı", Year = 2026 },
                new() { Date = new DateTime(2026, 5, 27), Description = "Kurban Bayramı Arifesi", Year = 2026 },
                new() { Date = new DateTime(2026, 5, 28), Description = "Kurban Bayramı 1. Gün", Year = 2026 },
                new() { Date = new DateTime(2026, 5, 29), Description = "Kurban Bayramı 2. Gün", Year = 2026 },
                new() { Date = new DateTime(2026, 5, 30), Description = "Kurban Bayramı 3. Gün", Year = 2026 },
                new() { Date = new DateTime(2026, 5, 31), Description = "Kurban Bayramı 4. Gün", Year = 2026 },
                new() { Date = new DateTime(2026, 7, 15), Description = "15 Temmuz Demokrasi ve Millî Birlik Günü", Year = 2026 },
                new() { Date = new DateTime(2026, 8, 30), Description = "Zafer Bayramı", Year = 2026 },
                new() { Date = new DateTime(2026, 10, 29), Description = "Cumhuriyet Bayramı", Year = 2026 },
                new() { Date = new DateTime(2027, 1, 1), Description = "Yılbaşı", Year = 2027 },
                new() { Date = new DateTime(2027, 4, 23), Description = "Ulusal Egemenlik ve Çocuk Bayramı", Year = 2027 },
                new() { Date = new DateTime(2027, 5, 1), Description = "Emek ve Dayanışma Günü", Year = 2027 },
                new() { Date = new DateTime(2027, 5, 19), Description = "Atatürk'ü Anma, Gençlik ve Spor Bayramı", Year = 2027 },
                new() { Date = new DateTime(2027, 7, 15), Description = "15 Temmuz Demokrasi ve Millî Birlik Günü", Year = 2027 },
                new() { Date = new DateTime(2027, 8, 30), Description = "Zafer Bayramı", Year = 2027 },
                new() { Date = new DateTime(2027, 10, 29), Description = "Cumhuriyet Bayramı", Year = 2027 }
            };
            await context.PublicHolidays.AddRangeAsync(holidays);
            await context.SaveChangesAsync();
        }

        // 3. Akademik Yıl ve Dönemleri Ekle
        if (!await context.AcademicYears.AnyAsync())
        {
            var year = new AcademicYear
            {
                Title = "2026-2027",
                StartDate = new DateTime(2026, 9, 1),
                EndDate = new DateTime(2027, 8, 31),
                IsActive = true,
                Periods = new List<InternshipPeriod>
                {
                    new()
                    {
                        Title = "2026-2027 Staj Dönemi - Staj 1",
                        Type = InternshipType.Staj1,
                        DefaultWorkDays = 20,
                        ApplicationStartDate = new DateTime(2026, 10, 1),
                        ApplicationEndDate = new DateTime(2026, 12, 31),
                        EarliestStartDate = new DateTime(2026, 11, 1),
                        LatestEndDate = new DateTime(2027, 3, 31),
                        DocumentDeadlineDate = new DateTime(2027, 4, 15),
                        IsSaturdayAllowed = true,
                        IsActive = true
                    },
                    new()
                    {
                        Title = "2026-2027 Staj Dönemi - Staj 2",
                        Type = InternshipType.Staj2,
                        DefaultWorkDays = 20,
                        ApplicationStartDate = new DateTime(2026, 10, 1),
                        ApplicationEndDate = new DateTime(2026, 12, 31),
                        EarliestStartDate = new DateTime(2026, 11, 1),
                        LatestEndDate = new DateTime(2027, 3, 31),
                        DocumentDeadlineDate = new DateTime(2027, 4, 15),
                        IsSaturdayAllowed = true,
                        IsActive = true
                    }
                }
            };
            await context.AcademicYears.AddAsync(year);
            await context.SaveChangesAsync();
        }

        // 4. Firma Havuzunu Ekle
        await SeedWorkplacesAsync(context);

        // 5. Kullanıcıları ve Zengin Öğrenci Kadrosunu Ekle
        await SeedUsersAndStudentsAsync(context);

        // 5.1 Firma Stajyer İlanlarını Ekle
        await SeedJobPostingsAsync(context);

        // 6. Duyuruları Ekle
        if (!context.Announcements.Any())
        {
            var announcements = new List<Announcement>
            {
                new()
                {
                    Title = "2026-2027 Eğitim-Öğretim Yılı Staj Başvuru ve Takvim Esasları",
                    Category = "Takvim",
                    Summary = "Staj 1 ve Staj 2 başvuruları sistem üzerinden açılmıştır. Başvuruların staj başlangıç tarihinden en az 15 gün önce tamamlanması zorunludur.",
                    Content = "Selçuk Üniversitesi Staj Komisyonu tarafından belirlenen güncel staj takvimi ve yönerge esasları:\n\n• Başvuru Kabul Tarihleri: 1 Ekim 2026 - 31 Aralık 2026\n• Staj Yapılabilecek Tarih Aralığı: 1 Kasım 2026 - 31 Mart 2027\n• Defter ve Belge Son Teslim Tarihi: 15 Nisan 2027\n• Cumartesi Çalışması: Cumartesi çalışan iş yerlerinde komisyon onayına tabidir.\n• Varsayılan Staj Süresi: 20 veya 30 İş Günü\n\nÖnemli Hatırlatmalar:\n1. Islak imzalı ve kaşeli Form 2 ile güncel e-Devlet SPAS Müstehaklık belgesi zorunludur.\n2. İşyeri Eğitici Personelinin Bilgisayar/Yazılım/Elektrik-Elektronik Mühendisi unvanına sahip olması şarttır.\n3. Aynı kurumda hem Staj 1 hem Staj 2 yapılacaksa staj konularının ve çalışma birimlerinin farklı olması zorunludur.",
                    CreatedAt = DateTime.Now.AddDays(-1),
                    IsPublished = true,
                    Author = "Staj Komisyonu"
                },
                new()
                {
                    Title = "e-Devlet SPAS Müstehaklık Belgesi ve 5510 Sayılı Kanun Prim Tescili",
                    Category = "Sigorta",
                    Summary = "Komisyon onayından geçen tüm öğrencilerimizin SGK iş kazası ve meslek hastalığı primleri KPTO tarafından karşılanarak işe giriş bildirgesi düzenlenir.",
                    Content = "5510 Sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu'nun 5/b maddesi uyarınca staj süresince sigorta primleriniz Selçuk Üniversitesi Rektörlüğü tarafından ödenmektedir. Prim tescilinizin yapılabilmesi için güncel SPAS belgenizi başvuru ekranına yüklemeniz gerekmektedir.",
                    CreatedAt = DateTime.Now.AddDays(-3),
                    IsPublished = true,
                    Author = "Kariyer Planlama ve Takibi Ofisi (KPTO)"
                },
                new()
                {
                    Title = "Sanal Staj Defteri ve Dijital Mühendis Onay Prosedürü",
                    Category = "Rehber",
                    Summary = "Öğrencilerimiz staj süresince her gün için en az bir sayfa teknik rapor yazmalı ve staj bitiminde işyeri mühendisine online onaylatmalıdır.",
                    Content = "Sanal staj defteri girişleri her iş günü için düzenli yapılmalıdır. Staj bittiğinde işyeri eğitici personeline doğrudan güvenli erişim bağlantısı iletilerek dijital imza ve onay alınması sağlanacaktır.",
                    CreatedAt = DateTime.Now.AddDays(-5),
                    IsPublished = true,
                    Author = "Staj Komisyonu"
                }
            };
            await context.Announcements.AddRangeAsync(announcements);
            await context.SaveChangesAsync();
        }

        // 7. Zengin Başvuru Verilerini Ekle
        await SeedApplicationsAsync(context);

        // 7.1 Bölüm Bazlı (Makine & Elektrik-Elektronik) Özel Başvuruları Ekle
        await SeedDepartmentSpecificApplicationsAsync(context);

        // 8. Senelere Göre Arşiv Verilerini Ekle (2023-2024, 2024-2025, 2025-2026)
        await SeedArchiveApplicationsAsync(context);

        // 9. Eksik E-posta ve Bildirimleri Tüm Başvurular İçin Ekle
        var allApps = await context.InternshipApplications
            .Include(a => a.Student).ThenInclude(s => s!.StudentProfile)
            .Include(a => a.Workplace)
            .Include(a => a.Advisor)
            .ToListAsync();
        await SeedInitialNotificationsAndEmailsAsync(context, allApps);
    }

    private static async Task SeedWorkplacesAsync(AppDbContext context)
    {
        var workplaces = new List<Workplace>
        {
            new() { Name = "AKINSOFT Yazılım Teknolojileri A.Ş.", City = "Konya", Address = "Beyhekim Mah. Şehit Halis Şişman Cad. No:1/A Selçuklu", WebSite = "https://www.akinsoft.com.tr", PhoneNumber = "444 40 80", CompanyEmail = "info@akinsoft.com.tr", Sector = "Yazılım ve Robotik", IsApproved = true },
            new() { Name = "Konya Teknokent Yönetici A.Ş.", City = "Konya", Address = "Selçuk Üniversitesi Alaeddin Keykubat Kampüsü", WebSite = "https://konyateknokent.com.tr", PhoneNumber = "0332 241 17 00", CompanyEmail = "info@konyateknokent.com.tr", Sector = "Ar-Ge ve Bilişim İnovasyon", IsApproved = true },
            new() { Name = "HAVELSAN Hava Elektronik Sanayi A.Ş.", City = "Ankara", Address = "Mustafa Kemal Mah. 2120. Cad. No:39 Çankaya", WebSite = "https://www.havelsan.com.tr", PhoneNumber = "0312 219 57 87", CompanyEmail = "staj@havelsan.com.tr", Sector = "Savunma ve Bilgi Teknolojileri", IsApproved = true },
            new() { Name = "ASELSAN Elektronik Sanayi ve Ticaret A.Ş.", City = "Ankara", Address = "Mehmet Akif Ersoy Mah. 296. Cad. No:16 Yenimahalle", WebSite = "https://www.aselsan.com.tr", PhoneNumber = "0312 592 10 00", CompanyEmail = "staj@aselsan.com.tr", Sector = "Savunma ve Haberleşme Sistemleri", IsApproved = true },
            new() { Name = "BAYKAR Savunma ve Havacılık A.Ş.", City = "İstanbul", Address = "Hadımköy Mah. Hasan Basri Sok. No:6 Arnavutköy", WebSite = "https://www.baykartech.com", PhoneNumber = "0212 867 09 00", CompanyEmail = "ik@baykartech.com", Sector = "İHA ve Otonom Sistemler", IsApproved = true },
            new() { Name = "TUSAŞ Türk Havacılık ve Uzay Sanayii A.Ş.", City = "Ankara", Address = "Fethiye Mah. Havacılık Blv. No:17 Kazan", WebSite = "https://www.tusas.com", PhoneNumber = "0312 811 18 00", CompanyEmail = "staj@tusas.com", Sector = "Havacılık ve Uzay", IsApproved = true },
            new() { Name = "Logo Yazılım Sanayi ve Ticaret A.Ş.", City = "Kocaeli / Gebze", Address = "Gebze Organize Sanayi Bölgesi Şahabettin Bilgisu Cad. No:609", WebSite = "https://www.logo.com.tr", PhoneNumber = "0262 679 80 00", CompanyEmail = "ik@logo.com.tr", Sector = "Kurumsal Yazılım ve ERP", IsApproved = true },
            new() { Name = "Turkcell Teknoloji Araştırma ve Geliştirme A.Ş.", City = "İstanbul", Address = "TÜBİTAK MAM Teknoloji Serbest Bölgesi Gebze", WebSite = "https://www.turkcell.com.tr", PhoneNumber = "0212 313 10 00", CompanyEmail = "staj@turkcell.com.tr", Sector = "Telekomünikasyon ve Bulut", IsApproved = true },
            new() { Name = "TÜBİTAK BİLGEM", City = "Kocaeli / Gebze", Address = "Barış Mah. Dr. Zeki Acar Cad. No:1 Gebze", WebSite = "https://bilgem.tubitak.gov.tr", PhoneNumber = "0262 648 10 00", CompanyEmail = "bilgem.staj@tubitak.gov.tr", Sector = "Kriptoloji ve Siber Güvenlik", IsApproved = true },
            new() { Name = "STM Savunma Teknolojileri Mühendislik A.Ş.", City = "Ankara", Address = "Mustafa Kemal Mah. Dumlupınar Blv. No:280 Çankaya", WebSite = "https://www.stm.com.tr", PhoneNumber = "0312 266 35 50", CompanyEmail = "ik@stm.com.tr", Sector = "Savunma ve Deniz Sistemleri", IsApproved = true },
            new() { Name = "InnoPark Konya Teknoloji Geliştirme Bölgesi", City = "Konya", Address = "Büyükkayacık OSB Mah. Yaylacık Cad. No:8 Selçuklu", WebSite = "https://www.innopark.com.tr", PhoneNumber = "0332 271 27 00", CompanyEmail = "info@innopark.com.tr", Sector = "Yüksek Teknoloji ve Kuluçka", IsApproved = true },
            new() { Name = "ROKETSAN Roket Sanayii ve Ticaret A.Ş.", City = "Ankara", Address = "Kemalpaşa Mah. Şehit Yzb. Adem Kutlu Cad. No:21 Elmadağ", WebSite = "https://www.roketsan.com.tr", PhoneNumber = "0312 860 55 00", CompanyEmail = "staj@roketsan.com.tr", Sector = "Savunma ve Füze Sistemleri", IsApproved = true },
            new() { Name = "Türk Telekomünikasyon A.Ş.", City = "Ankara", Address = "Turgut Özal Blv. 06103 Aydınlıkevler", WebSite = "https://www.turktelekom.com.tr", PhoneNumber = "444 1 444", CompanyEmail = "staj@turktelekom.com.tr", Sector = "Telekomünikasyon ve Ağ Teknolojileri", IsApproved = true },
            new() { Name = "Softtech Yazılım Teknolojileri A.Ş.", City = "İstanbul", Address = "İTÜ Ayazağa Yerleşkesi Koru Yolu Arı 3 Binası Maslak", WebSite = "https://softtech.com.tr", PhoneNumber = "0212 365 30 00", CompanyEmail = "ik@softtech.com.tr", Sector = "Fintek ve Bankacılık Yazılımları", IsApproved = true },
            new() { Name = "TEI TUSAŞ Motor Sanayii A.Ş.", City = "Eskişehir", Address = "Çamlıca Mah. Çevreyolu Blv. No:356 Tepebaşı", WebSite = "https://www.tei.com.tr", PhoneNumber = "0222 211 21 00", CompanyEmail = "ik@tei.com.tr", Sector = "Havacılık ve Gaz Türbinli Motorlar", IsApproved = true },
            new() { Name = "TÜMOSAN Motor ve Traktör Sanayi A.Ş.", City = "Konya", Address = "Büyükkayacık OSB Mah. 2. Organize Sanayi Bölgesi Yaylacık Cad. No:1 Selçuklu", WebSite = "https://www.tumosan.com.tr", PhoneNumber = "0332 239 09 00", CompanyEmail = "ik@tumosan.com.tr", Sector = "Otomotiv, Motor ve Güç Aktarma Sistemleri", IsApproved = true }
        };

        foreach (var wp in workplaces)
        {
            if (!await context.Workplaces.AnyAsync(w => w.Name == wp.Name))
            {
                context.Workplaces.Add(wp);
            }
        }
        await context.SaveChangesAsync();
    }

    private static async Task SeedUsersAndStudentsAsync(AppDbContext context)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("Selcuk123!");

        // Bölüm Komisyonları ve Yetkililer
        var komisyonComp = await context.Users.FirstOrDefaultAsync(u => u.Email == "komisyon@selcuk.edu.tr");
        if (komisyonComp == null)
        {
            context.Users.Add(new User
            {
                Email = "komisyon@selcuk.edu.tr",
                PasswordHash = hash,
                FullName = "Dr. Öğr. Üyesi Onur İNAN",
                PhoneNumber = "0332 223 0001",
                Role = UserRole.CommissionMember,
                Department = "Bilgisayar Mühendisliği",
                IsActive = true
            });
        }
        else
        {
            komisyonComp.FullName = "Dr. Öğr. Üyesi Onur İNAN";
            komisyonComp.Department = "Bilgisayar Mühendisliği";
        }

        var komisyonMakine = await context.Users.FirstOrDefaultAsync(u => u.Email == "komisyon.makine@selcuk.edu.tr");
        if (komisyonMakine == null)
        {
            context.Users.Add(new User
            {
                Email = "komisyon.makine@selcuk.edu.tr",
                PasswordHash = hash,
                FullName = "Doç. Dr. Serkan Çelik",
                PhoneNumber = "0332 223 0003",
                Role = UserRole.CommissionMember,
                Department = "Makine Mühendisliği",
                IsActive = true
            });
        }
        else
        {
            komisyonMakine.FullName = "Doç. Dr. Serkan Çelik";
            komisyonMakine.Department = "Makine Mühendisliği";
        }

        var komisyonEe = await context.Users.FirstOrDefaultAsync(u => u.Email == "komisyon.ee@selcuk.edu.tr");
        if (komisyonEe == null)
        {
            context.Users.Add(new User
            {
                Email = "komisyon.ee@selcuk.edu.tr",
                PasswordHash = hash,
                FullName = "Prof. Dr. Mehmet Aktaş",
                PhoneNumber = "0332 223 0004",
                Role = UserRole.CommissionMember,
                Department = "Elektrik-Elektronik Mühendisliği",
                IsActive = true
            });
        }
        else
        {
            komisyonEe.FullName = "Prof. Dr. Mehmet Aktaş";
            komisyonEe.Department = "Elektrik-Elektronik Mühendisliği";
        }

        if (!await context.Users.AnyAsync(u => u.Email == "bolumbaskani@selcuk.edu.tr"))
        {
            context.Users.Add(new User
            {
                Email = "bolumbaskani@selcuk.edu.tr",
                PasswordHash = hash,
                FullName = "Prof. Dr. Ahmet Bilgili (Bölüm Başkanı)",
                PhoneNumber = "0332 223 0005",
                Role = UserRole.DepartmentHead,
                Department = "Bilgisayar Mühendisliği",
                IsActive = true
            });
        }

        if (!await context.Users.AnyAsync(u => u.Email == "kpto@selcuk.edu.tr"))
        {
            context.Users.Add(new User
            {
                Email = "kpto@selcuk.edu.tr",
                PasswordHash = hash,
                FullName = "KPTO Sigorta Memuru",
                PhoneNumber = "0332 223 0002",
                Role = UserRole.KPTOOfficer,
                Department = "KPTO Sigorta Masası",
                IsActive = true
            });
        }
        await context.SaveChangesAsync();

        // 18 Gerçekçi Öğrenci Kadrosu
        var studentDefs = new (string Email, string Name, string Phone, string StuNo, string Tc, string Dept, int ClassLvl, bool HasAcceptedGuide)[]
        {
            ("ogrenci@selcuk.edu.tr", "Esra SAĞDIÇ", "0555 123 4567", "233311051", "11111111110", "Bilgisayar Mühendisliği", 4, true),
            ("esra.sagdic@selcuk.edu.tr", "Esra SAĞDIÇ", "0555 123 4567", "233311051", "11111111110", "Bilgisayar Mühendisliği", 4, true),
            ("betul.acar@selcuk.edu.tr", "Betül ACAR", "0555 123 9876", "233311052", "11111111120", "Bilgisayar Mühendisliği", 4, true),
            ("zeynep.kaya@selcuk.edu.tr", "Zeynep Kaya", "0555 234 5678", "203301042", "22222222220", "Bilgisayar Mühendisliği", 3, true),
            ("mehmet.demir@selcuk.edu.tr", "Mehmet Demir", "0555 345 6789", "203301088", "33333333330", "Bilgisayar Mühendisliği", 4, true),
            ("elif.celik@selcuk.edu.tr", "Elif Çelik", "0555 456 7890", "203301105", "44444444440", "Bilgisayar Mühendisliği", 4, true),
            ("can.ozturk@selcuk.edu.tr", "Can Öztürk", "0555 567 8901", "203301120", "55555555550", "Bilgisayar Mühendisliği", 4, true),
            ("ayse.yilmaz@selcuk.edu.tr", "Ayşe Yılmaz", "0555 678 9012", "213302015", "66666666660", "Yazılım Mühendisliği", 3, true),
            ("burak.ozkan@selcuk.edu.tr", "Burak Özkan", "0555 789 0123", "203303033", "77777777770", "Elektrik-Elektronik Mühendisliği", 3, true),
            ("gamze.arslan@selcuk.edu.tr", "Gamze Arslan", "0555 890 1234", "223301050", "88888888880", "Bilgisayar Mühendisliği", 2, true),
            // Makine Mühendisliği Öğrencileri
            ("oguzhan.kurt@selcuk.edu.tr", "Oğuzhan Kurt", "0555 901 2345", "193304012", "99999999990", "Makine Mühendisliği", 4, true),
            ("serhat.yilmaz@selcuk.edu.tr", "Serhat Yılmaz", "0555 902 3456", "203304022", "99999999991", "Makine Mühendisliği", 3, true),
            ("berke.kaya@selcuk.edu.tr", "Berke Kaya", "0555 903 4567", "203304045", "99999999992", "Makine Mühendisliği", 3, true),
            ("emre.demirtas@selcuk.edu.tr", "Emre Demirtaş", "0555 904 5678", "193304088", "99999999993", "Makine Mühendisliği", 4, true),

            // Elektrik-Elektronik Mühendisliği Öğrencileri
            ("burak.ozkan@selcuk.edu.tr", "Burak Özkan", "0555 789 0123", "203303033", "77777777770", "Elektrik-Elektronik Mühendisliği", 3, true),
            ("selin.karaca@selcuk.edu.tr", "Selin Karaca", "0555 444 5566", "203303075", "56789012340", "Elektrik-Elektronik Mühendisliği", 4, true),
            ("alperen.celik@selcuk.edu.tr", "Alperen Çelik", "0555 790 1234", "203303019", "77777777771", "Elektrik-Elektronik Mühendisliği", 3, true),
            ("ezgi.arslan@selcuk.edu.tr", "Ezgi Arslan", "0555 791 2345", "203303058", "77777777772", "Elektrik-Elektronik Mühendisliği", 4, true),

            // Diğer / Yazılım / Endüstri Mühendisliği Öğrencileri
            ("merve.sahin@selcuk.edu.tr", "Merve Şahin", "0555 012 3456", "203305028", "12345678910", "Endüstri Mühendisliği", 3, true),
            ("emre.aydin@selcuk.edu.tr", "Emre Aydın", "0555 111 2233", "203301144", "23456789010", "Bilgisayar Mühendisliği", 4, true),
            ("kubra.yildiz@selcuk.edu.tr", "Kübra Yıldız", "0555 222 3344", "213302062", "34567890120", "Yazılım Mühendisliği", 3, true),
            ("furkan.genc@selcuk.edu.tr", "Furkan Genç", "0555 333 4455", "203301168", "45678901230", "Bilgisayar Mühendisliği", 3, true),
            ("hakan.aksu@selcuk.edu.tr", "Hakan Aksu", "0555 555 6677", "203301190", "67890123450", "Bilgisayar Mühendisliği", 4, true),
            // Sıfır Başvurulu Test Öğrencileri (Süreci Başlamamış):
            ("mert.cetin@selcuk.edu.tr", "Mert Çetin", "0555 987 6543", "233301099", "19874563210", "Bilgisayar Mühendisliği", 3, false),
            ("caner.ozdemir@selcuk.edu.tr", "Caner Özdemir", "0555 876 5432", "233301100", "29874563211", "Bilgisayar Mühendisliği", 3, true),
            // Defteri Onay Bekleyen Test Öğrencisi (20 Gün Eksiksiz Doldurulmuş):
            ("tolga.yilmaz@selcuk.edu.tr", "Tolga Yılmaz", "0555 432 1098", "213301077", "38472910542", "Bilgisayar Mühendisliği", 4, true)
        };

        foreach (var def in studentDefs)
        {
            var user = await context.Users.Include(u => u.StudentProfile).FirstOrDefaultAsync(u => u.Email == def.Email);
            if (user == null)
            {
                user = new User
                {
                    Email = def.Email,
                    PasswordHash = hash,
                    FullName = def.Name,
                    PhoneNumber = def.Phone,
                    Role = UserRole.Student,
                    Department = def.Dept,
                    IsActive = true,
                    StudentProfile = new StudentProfile
                    {
                        StudentNumber = def.StuNo,
                        NationalId = def.Tc,
                        Faculty = "Teknoloji Fakültesi",
                        Department = def.Dept,
                        ClassLevel = def.ClassLvl,
                        Address = "Selçuklu / Konya",
                        HasAcceptedGuide = def.HasAcceptedGuide,
                        GuideAcceptedAt = def.HasAcceptedGuide ? DateTime.UtcNow.AddDays(-10) : null
                    }
                };
                context.Users.Add(user);
            }
            else
            {
                user.Department = def.Dept;
                if (user.StudentProfile != null)
                {
                    user.StudentProfile.Department = def.Dept;
                    user.StudentProfile.Faculty = "Teknoloji Fakültesi";
                }
            }
        }

        // Tüm mevcut öğrencilerin ana kullanıcı Department ile StudentProfile.Department alanlarını senkronize et
        var allStudents = await context.Users.Include(u => u.StudentProfile).Where(u => u.Role == UserRole.Student).ToListAsync();
        foreach (var st in allStudents)
        {
            if (st.StudentProfile != null && !string.IsNullOrEmpty(st.StudentProfile.Department))
            {
                st.Department = st.StudentProfile.Department;
                st.StudentProfile.Faculty = "Teknoloji Fakültesi";
            }
        }
        await context.SaveChangesAsync();
    }

    private static async Task SeedApplicationsAsync(AppDbContext context)
    {
        var existingGamzeApp = await context.InternshipApplications.Include(a => a.Student).FirstOrDefaultAsync(a => a.Student != null && a.Student.Email == "gamze.arslan@selcuk.edu.tr");
        if (existingGamzeApp != null)
        {
            existingGamzeApp.HasCancelRequest = true;
            existingGamzeApp.CancelReason = "Ortopedik cerrahi operasyon ve 20 günlük resmî heyet sağlık istirahat raporu nedeniyle stajımın 5510 sayılı kanun kapsamında iptalini ve SGK çıkışımın yapılmasını arz ederim.";
            existingGamzeApp.CancelFormDocumentPath = "FORM7_Staj_Iptal_Formu.docx";
            existingGamzeApp.CancelRequestedAt = DateTime.UtcNow.AddDays(-1);
            existingGamzeApp.IsCancelApprovedByCommission = false;
        }

        var existingFurkanApp = await context.InternshipApplications.Include(a => a.Student).FirstOrDefaultAsync(a => a.Student != null && a.Student.Email == "furkan.genc@selcuk.edu.tr");
        if (existingFurkanApp != null)
        {
            existingFurkanApp.HasExtensionRequest = true;
            existingFurkanApp.ExtensionExtraDays = 5;
            existingFurkanApp.ExtensionMissedDates = "16.11.2026 - 20.11.2026 (5 İş Günü)";
            existingFurkanApp.ExtensionReason = "[Gelemeyeceği Tarihler: 16.11.2026 - 20.11.2026 (5 İş Günü)] Üniversite ara sınav haftası ve ERP sertifikasyon eğitimi sebebiyle işyerinden izin alınmış olup telafisi talep edilmektedir.";
            existingFurkanApp.ExtensionRequestedAt = DateTime.UtcNow.AddDays(-1);
            existingFurkanApp.IsExtensionApprovedByCommission = true;
            existingFurkanApp.ExtensionCommissionApprovedAt = DateTime.UtcNow.AddHours(-12);
            existingFurkanApp.IsExtensionSgkProcessedByKPTO = false;

            var extReq = await context.InternshipExtensionRequests.FirstOrDefaultAsync(e => e.InternshipApplicationId == existingFurkanApp.Id);
            if (extReq == null)
            {
                context.InternshipExtensionRequests.Add(new InternshipExtensionRequest
                {
                    InternshipApplicationId = existingFurkanApp.Id,
                    RequestedExtraDays = 5,
                    MissedDates = existingFurkanApp.ExtensionMissedDates,
                    Reason = existingFurkanApp.ExtensionReason,
                    OriginalEndDate = existingFurkanApp.CurrentEndDate,
                    NewCalculatedEndDate = existingFurkanApp.CurrentEndDate.AddDays(7),
                    Status = ExtensionStatus.ApprovedByCommission,
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    CommissionApprovedAt = DateTime.UtcNow.AddHours(-12)
                });
            }
            else
            {
                extReq.Status = ExtensionStatus.ApprovedByCommission;
                extReq.CommissionApprovedAt = DateTime.UtcNow.AddHours(-12);
            }
        }
        await context.SaveChangesAsync();

        var count = await context.InternshipApplications.CountAsync();
        if (count >= 15) return; // Zaten yeterli başvuru varsa tekrar ekleme

        var staj1 = await context.InternshipPeriods.FirstOrDefaultAsync(p => p.Type == InternshipType.Staj1);
        var staj2 = await context.InternshipPeriods.FirstOrDefaultAsync(p => p.Type == InternshipType.Staj2);
        if (staj1 == null || staj2 == null) return;

        var workplaces = await context.Workplaces.ToListAsync();
        var students = await context.Users.Include(u => u.StudentProfile).Where(u => u.Role == UserRole.Student).ToListAsync();
        if (!workplaces.Any() || students.Count < 10) return;

        // Mevcut kayıtları temizle ve zengin seti yükle
        var existing = await context.InternshipApplications.ToListAsync();
        if (existing.Any())
        {
            context.InternshipApplications.RemoveRange(existing);
            await context.SaveChangesAsync();
        }

        var apps = new List<InternshipApplication>();

        // 1. Ayşe Yılmaz - Staj 1: Taslak (Draft)
        var ayse = students.First(s => s.Email == "ayse.yilmaz@selcuk.edu.tr");
        var wpTurkcell = workplaces.First(w => w.Name.Contains("Turkcell"));
        apps.Add(CreateApp(ayse, staj1, wpTurkcell, InternshipType.Staj1, "Mobil Uygulama Backend Mimarileri ve RESTful API", 20, false, 
            new DateTime(2026, 11, 9), ApplicationStatus.Draft, "Müh. Kemal Can", "kemal.can@turkcell.com.tr", "Kıdemli Yazılım Mimarı"));

        // 2. Gamze Arslan - Staj 1: İptal Talebi Gönderilmiş (HasCancelRequest = true)
        var gamze = students.First(s => s.Email == "gamze.arslan@selcuk.edu.tr");
        var wpInnopark = workplaces.First(w => w.Name.Contains("InnoPark"));
        var appGamze = CreateApp(gamze, staj1, wpInnopark, InternshipType.Staj1, "React ve Tailwind CSS ile Modern Web Arayüz Geliştirme", 20, false,
            new DateTime(2026, 11, 16), ApplicationStatus.InsuranceStarted, "Müh. Derya Güneş", "derya@innopark.com.tr", "Frontend Geliştirici");
        appGamze.CommissionDecision = CommissionDecisionType.Approved;
        appGamze.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 16),
            SgkExitDate = new DateTime(2026, 12, 11),
            SgkDocumentRegistrationNo = "SGK-2026-4A-881920",
            ProcessedAt = DateTime.UtcNow.AddDays(-2)
        };
        appGamze.HasCancelRequest = true;
        appGamze.CancelReason = "Ortopedik cerrahi operasyon ve 20 günlük resmî heyet sağlık istirahat raporu nedeniyle stajımın 5510 sayılı kanun kapsamında iptalini ve SGK çıkışımın yapılmasını arz ederim.";
        appGamze.CancelFormDocumentPath = "FORM7_Staj_Iptal_Formu.docx";
        appGamze.CancelRequestedAt = DateTime.UtcNow.AddDays(-1);
        appGamze.IsCancelApprovedByCommission = false;
        apps.Add(appGamze);

        // 3. Furkan Genç - Staj 1: Sigorta Başlatılmış & Uzatma Talebinde Bulunmuş (HasExtensionRequest = true)
        var furkan = students.First(s => s.Email == "furkan.genc@selcuk.edu.tr");
        var wpLogo = workplaces.First(w => w.Name.Contains("Logo"));
        var appFurkan = CreateApp(furkan, staj1, wpLogo, InternshipType.Staj1, "ERP Veritabanı Optimizasyonu ve SQL Analizi", 20, false,
            new DateTime(2026, 11, 9), ApplicationStatus.InsuranceStarted, "Müh. Orhan Veli", "orhan.veli@logo.com.tr", "Veritabanı Yöneticisi");
        appFurkan.CommissionDecision = CommissionDecisionType.Approved;
        appFurkan.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 9),
            SgkExitDate = new DateTime(2026, 12, 4),
            SgkDocumentRegistrationNo = "SGK-2026-4A-124982",
            ProcessedAt = DateTime.UtcNow.AddDays(-3)
        };
        appFurkan.HasExtensionRequest = true;
        appFurkan.ExtensionExtraDays = 5;
        appFurkan.ExtensionMissedDates = "16.11.2026 - 20.11.2026 (5 İş Günü)";
        appFurkan.ExtensionReason = "[Gelemeyeceği Tarihler: 16.11.2026 - 20.11.2026 (5 İş Günü)] Üniversite ara sınav haftası ve ERP sertifikasyon eğitimi sebebiyle işyerinden izin alınmış olup telafisi talep edilmektedir.";
        appFurkan.ExtensionRequestedAt = DateTime.UtcNow.AddDays(-1);
        appFurkan.IsExtensionApprovedByCommission = true;
        appFurkan.ExtensionCommissionApprovedAt = DateTime.UtcNow.AddHours(-12);
        appFurkan.IsExtensionSgkProcessedByKPTO = false;
        apps.Add(appFurkan);

        // 4. Merve Şahin - Staj 1: Düzeltme İstendi (RevisionRequired)
        var merve = students.First(s => s.Email == "merve.sahin@selcuk.edu.tr");
        var wpTeknokent = workplaces.First(w => w.Name.Contains("Teknokent"));
        var appMerve = CreateApp(merve, staj1, wpTeknokent, InternshipType.Staj1, "Yazılım Süreç Yönetimi ve Çevik Proje Takibi", 20, false,
            new DateTime(2026, 11, 9), ApplicationStatus.RevisionRequired, "Müh. Banu Tezcan", "banu.tezcan@konyateknokent.com.tr", "Scrum Master");
        appMerve.CommissionRejectReason = "Yüklenen SPAS Müstehaklık belgesinde e-Devlet barkod doğrulaması bulunmamaktadır. Barkodlu belge temin edip güncelleyiniz.";
        apps.Add(appMerve);

        // 5. Zeynep Kaya - Staj 1: Komisyon Kuyruğunda (Submitted)
        var zeynep = students.First(s => s.Email == "zeynep.kaya@selcuk.edu.tr");
        var wpHavelsan = workplaces.First(w => w.Name.Contains("HAVELSAN"));
        apps.Add(CreateApp(zeynep, staj1, wpHavelsan, InternshipType.Staj1, "Savunma Sanayiinde Gömülü Aviyonik Yazılım ve Test Süreçleri", 30, true,
            new DateTime(2026, 11, 9), ApplicationStatus.Submitted, "Dr. Selin Aksoy", "saksoy@havelsan.com.tr", "Kıdemli Sistem Mimarı"));

        // 6. Burak Özkan - Staj 1: Komisyon Kuyruğunda (Submitted)
        var burak = students.First(s => s.Email == "burak.ozkan@selcuk.edu.tr");
        var wpAselsan = workplaces.First(w => w.Name.Contains("ASELSAN"));
        apps.Add(CreateApp(burak, staj1, wpAselsan, InternshipType.Staj1, "Radar ve Sayısal Sinyal İşleme Donanımları Arayüz Yazılımı", 30, true,
            new DateTime(2026, 11, 9), ApplicationStatus.Submitted, "Müh. Levent Koç", "lkoc@aselsan.com.tr", "Başmühendis"));

        // 7. Kübra Yıldız - Staj 1: Komisyon Kuyruğunda (Submitted)
        var kubra = students.First(s => s.Email == "kubra.yildiz@selcuk.edu.tr");
        var wpBaykar = workplaces.First(w => w.Name.Contains("BAYKAR"));
        apps.Add(CreateApp(kubra, staj1, wpBaykar, InternshipType.Staj1, "İHA Otonom Uçuş Kontrol ve Güdüm Algoritmaları", 20, false,
            new DateTime(2026, 11, 9), ApplicationStatus.Submitted, "Müh. Tolga Eren", "tolga.eren@baykartech.com", "Uçuş Yazılımları Lideri"));

        // 8. Emre Aydın - Staj 2: Komisyon Kuyruğunda (Submitted)
        var emre = students.First(s => s.Email == "emre.aydin@selcuk.edu.tr");
        var wpTubitak = workplaces.First(w => w.Name.Contains("BİLGEM"));
        apps.Add(CreateApp(emre, staj2, wpTubitak, InternshipType.Staj2, "Post-Quantum Kriptografi ve Ağ Güvenliği Protokolleri", 20, false,
            new DateTime(2026, 11, 9), ApplicationStatus.Submitted, "Dr. Murat Aydın", "maydin@bilgem.tubitak.gov.tr", "Başuzman Araştırmacı"));

        // 9. Ahmet Yılmaz - Staj 1: Komisyon Onayladı, KPTO Sigorta Bekleniyor (ApprovedByCommission)
        var ahmet = students.First(s => s.Email == "ogrenci@selcuk.edu.tr");
        var appAhmetStaj1 = CreateApp(ahmet, staj1, wpTeknokent, InternshipType.Staj1, "Web Tabanlı Kurumsal Yönetim Sistemleri", 20, false,
            new DateTime(2026, 11, 2), ApplicationStatus.ApprovedByCommission, "Müh. Mustafa Kara", "mustafa.kara@konyateknokent.com.tr", "Yazılım Takım Lideri");
        appAhmetStaj1.CommissionDecision = CommissionDecisionType.Approved;
        appAhmetStaj1.CommissionDecisionDate = DateTime.UtcNow.AddDays(-2);
        apps.Add(appAhmetStaj1);

        // 10. Selin Karaca - Staj 1: Komisyon Onayladı, Sigorta Bekleniyor (ApprovedByCommission)
        var selin = students.First(s => s.Email == "selin.karaca@selcuk.edu.tr");
        var wpTusas = workplaces.First(w => w.Name.Contains("TUSAŞ"));
        var appSelin = CreateApp(selin, staj1, wpTusas, InternshipType.Staj1, "Milli Muharip Uçak Aviyonik Güç Dağıtım Kontrol Yazılımları", 30, true,
            new DateTime(2026, 11, 9), ApplicationStatus.ApprovedByCommission, "Müh. Ceyda Sezgin", "csezgin@tusas.com", "Sistem Mühendisi");
        appSelin.CommissionDecision = CommissionDecisionType.Approved;
        appSelin.CommissionDecisionDate = DateTime.UtcNow.AddDays(-1);
        apps.Add(appSelin);

        // 11. Hakan Aksu - Staj 2: Komisyon Onayladı, Sigorta Bekleniyor (ApprovedByCommission)
        var hakan = students.First(s => s.Email == "hakan.aksu@selcuk.edu.tr");
        var wpStm = workplaces.First(w => w.Name.Contains("STM"));
        var appHakan = CreateApp(hakan, staj2, wpStm, InternshipType.Staj2, "Askeri Simülasyon Sistemleri ve C++ ile Gerçek Zamanlı Modelleme", 20, false,
            new DateTime(2026, 11, 9), ApplicationStatus.ApprovedByCommission, "Müh. Onur Çetin", "ocetin@stm.com.tr", "Kıdemli Uzman");
        appHakan.CommissionDecision = CommissionDecisionType.Approved;
        appHakan.CommissionDecisionDate = DateTime.UtcNow.AddDays(-1);
        apps.Add(appHakan);

        // 12. Mehmet Demir - Staj 1: Sigorta Başlatıldı / Staj Sürüyor (InsuranceStarted)
        var mehmet = students.First(s => s.Email == "mehmet.demir@selcuk.edu.tr");
        var appMehmet = CreateApp(mehmet, staj1, wpLogo, InternshipType.Staj1, "Mikroservis Mimarileri ve Bulut Dağıtım Entegrasyonu", 20, false,
            new DateTime(2026, 11, 2), ApplicationStatus.InsuranceStarted, "Müh. Hakan Polat", "hakan.polat@logo.com.tr", "Teknik Lider");
        appMehmet.CommissionDecision = CommissionDecisionType.Approved;
        appMehmet.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 2),
            SgkExitDate = new DateTime(2026, 11, 27),
            SgkDocumentRegistrationNo = "SGK-2026-4A-883910",
            ProcessedAt = DateTime.UtcNow.AddDays(-3)
        };
        apps.Add(appMehmet);

        // 13. Zeynep Kaya - Staj 2: Sigorta Başlatıldı (InsuranceStarted)
        var appZeynep2 = CreateApp(zeynep, staj2, wpAselsan, InternshipType.Staj2, "Sayısal Haberleşme ve Kriptolu Telsiz Protokolleri", 20, false,
            new DateTime(2026, 11, 9), ApplicationStatus.InsuranceStarted, "Müh. Erkan Bayraktar", "ebayraktar@aselsan.com.tr", "Takım Lideri");
        appZeynep2.CommissionDecision = CommissionDecisionType.Approved;
        appZeynep2.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 9),
            SgkExitDate = new DateTime(2026, 12, 4),
            SgkDocumentRegistrationNo = "SGK-2026-4A-552190",
            ProcessedAt = DateTime.UtcNow.AddDays(-2)
        };
        apps.Add(appZeynep2);

        // 14. Elif Çelik - Staj 1: İşyeri Mühendisi Onayladı (AdvisorApproved)
        var elif = students.First(s => s.Email == "elif.celik@selcuk.edu.tr");
        var appElif = CreateApp(elif, staj1, wpTeknokent, InternshipType.Staj1, "Büyük Veri Analitiği ve İş Zekası Raporlama Sistemleri", 20, false,
            new DateTime(2026, 11, 2), ApplicationStatus.AdvisorApproved, "Müh. Burak Şen", "burak.sen@konyateknokent.com.tr", "Veri Mühendisi");
        appElif.CommissionDecision = CommissionDecisionType.Approved;
        appElif.Advisor!.HasApprovedDiary = true;
        appElif.Advisor.ApprovedAt = DateTime.UtcNow.AddDays(-1);
        appElif.Advisor.ApprovedIpAddress = "195.175.25.10";
        appElif.Diary!.IsApprovedByAdvisor = true;
        appElif.Diary.ApprovedAt = DateTime.UtcNow.AddDays(-1);
        appElif.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 2),
            SgkExitDate = new DateTime(2026, 11, 27),
            SgkDocumentRegistrationNo = "SGK-2026-4A-912044"
        };
        // 3 adet defter günü
        appElif.Diary.Entries.Add(new DiaryEntry { DayNumber = 1, EntryDate = new DateTime(2026, 11, 2), Title = "Büyük Veri Kümesi Kurulumu", Content = "Hadoop HDFS cluster konfigürasyonu ve Spark cluster ayağa kaldırıldı." });
        appElif.Diary.Entries.Add(new DiaryEntry { DayNumber = 2, EntryDate = new DateTime(2026, 11, 3), Title = "ETL Veri Boru Hattı", Content = "Kafka üzerinden akan sensör verileri PySpark ile işlenip PostgreSQL veri ambarına aktarıldı." });
        appElif.Diary.Entries.Add(new DiaryEntry { DayNumber = 3, EntryDate = new DateTime(2026, 11, 4), Title = "PowerBI Görselleştirme", Content = "Kurumsal KPI metrikleri için canlı gösterge paneli (dashboard) geliştirildi." });
        apps.Add(appElif);

        // 15. Kübra Yıldız - Staj 2: İşyeri Mühendisi Onayladı (AdvisorApproved)
        var appKubra2 = CreateApp(kubra, staj2, wpHavelsan, InternshipType.Staj2, "Güvenli Askeri Ağ Protokolleri ve Zero-Trust Mimari", 30, true,
            new DateTime(2026, 11, 2), ApplicationStatus.AdvisorApproved, "Dr. Selin Aksoy", "saksoy@havelsan.com.tr", "Kıdemli Sistem Mimarı");
        appKubra2.CommissionDecision = CommissionDecisionType.Approved;
        appKubra2.Advisor!.HasApprovedDiary = true;
        appKubra2.Advisor.ApprovedAt = DateTime.UtcNow.AddHours(-12);
        appKubra2.Advisor.ApprovedIpAddress = "212.156.40.18";
        appKubra2.Diary!.IsApprovedByAdvisor = true;
        appKubra2.Diary.ApprovedAt = DateTime.UtcNow.AddHours(-12);
        appKubra2.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 2),
            SgkExitDate = new DateTime(2026, 12, 7),
            SgkDocumentRegistrationNo = "SGK-2026-4A-732910"
        };
        apps.Add(appKubra2);

        // 16. Can Öztürk - Staj 1: Tamamlandı ve Başarıyla Değerlendirildi (Completed)
        var can = students.First(s => s.Email == "can.ozturk@selcuk.edu.tr");
        var appCan = CreateApp(can, staj1, wpHavelsan, InternshipType.Staj1, "Yapay Zeka ve Görüntü İşleme Uygulamaları", 20, false,
            new DateTime(2026, 11, 2), ApplicationStatus.Completed, "Dr. Selin Aksoy", "saksoy@havelsan.com.tr", "Kıdemli Sistem Mimarı");
        appCan.CommissionDecision = CommissionDecisionType.Approved;
        appCan.AcademicResult = AcademicResultType.Successful;
        appCan.AcceptedDaysCount = 20;
        appCan.AcademicNotes = "Öğrencinin sanal staj defteri, Form 4 işyeri değerlendirmesi ve savunma sanayii odaklı görüntü işleme projeleri incelenmiş olup 20 iş günü stajı tam başarıyla onaylanmıştır.";
        appCan.Advisor!.HasApprovedDiary = true;
        appCan.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 2),
            SgkExitDate = new DateTime(2026, 11, 27),
            SgkDocumentRegistrationNo = "SGK-2026-4A-774012"
        };
        apps.Add(appCan);

        // 17. Mehmet Demir - Staj 2: Tamamlandı ve Başarılı (Completed)
        var wpAkinsoft = workplaces.First(w => w.Name.Contains("AKINSOFT"));
        var appMehmet2 = CreateApp(mehmet, staj2, wpAkinsoft, InternshipType.Staj2, "Robotik Kol Kontrolü ve Gömülü C++ Sürücü Yazılımı", 20, false,
            new DateTime(2026, 11, 2), ApplicationStatus.Completed, "Müh. Serdar Keskin", "serdar.keskin@teknokent.com.tr", "Robotik Başmühendisi");
        appMehmet2.CommissionDecision = CommissionDecisionType.Approved;
        appMehmet2.AcademicResult = AcademicResultType.Successful;
        appMehmet2.AcceptedDaysCount = 20;
        appMehmet2.AcademicNotes = "Robotik yazılım sürücüleri ve ROS2 entegrasyonu başarıyla tamamlanmıştır. 20 gün tam kabul.";
        appMehmet2.Advisor!.HasApprovedDiary = true;
        appMehmet2.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 2),
            SgkExitDate = new DateTime(2026, 11, 27),
            SgkDocumentRegistrationNo = "SGK-2026-4A-331092"
        };
        apps.Add(appMehmet2);

        // 18. Oğuzhan Kurt - Staj 2: Kısmen Başarılı (Completed)
        var oguzhan = students.First(s => s.Email == "oguzhan.kurt@selcuk.edu.tr");
        var appOguzhan = CreateApp(oguzhan, staj2, wpTusas, InternshipType.Staj2, "Yapısal Sonlu Elemanlar Analizi ve CAD Otomasyonu", 30, true,
            new DateTime(2026, 11, 2), ApplicationStatus.Completed, "Müh. Fatih Yıldırım", "fyildirim@tusas.com", "Tasarım Şefi");
        appOguzhan.CommissionDecision = CommissionDecisionType.Approved;
        appOguzhan.AcademicResult = AcademicResultType.PartiallySuccessful;
        appOguzhan.AcceptedDaysCount = 24; // 6 gün eksik devamsızlık nedeniyle 24 gün kabul
        appOguzhan.AcademicNotes = "Sağlık mazereti sebebiyle 6 iş günü telafi edilememiştir. 24 iş günü kabul edilmiştir.";
        appOguzhan.Advisor!.HasApprovedDiary = true;
        appOguzhan.InsuranceRecord = new InsuranceRecord
        {
            Status = InsuranceStatus.Started,
            SgkEntryDate = new DateTime(2026, 11, 2),
            SgkExitDate = new DateTime(2026, 12, 7),
            SgkDocumentRegistrationNo = "SGK-2026-4A-110294"
        };
        apps.Add(appOguzhan);

        // 19. Tolga Yılmaz - Staj 1: Defteri Tamamlanmış ve İşyeri Onayı Bekleyen (AwaitingAdvisorApproval)
        var tolga = students.FirstOrDefault(s => s.Email == "tolga.yilmaz@selcuk.edu.tr");
        if (tolga != null)
        {
            var appTolga = CreateApp(tolga, staj1, wpHavelsan, InternshipType.Staj1, 
                "Savunma Sanayiinde Gerçek Zamanlı Komuta Kontrol Yazılımları ve Mikroservis Mimarileri", 20, false,
                new DateTime(2026, 7, 6), ApplicationStatus.AwaitingAdvisorApproval, "Dr. Selin Aksoy", "selin.aksoy@havelsan.com.tr", "Kıdemli Sistem & Yazılım Mimarı");
            appTolga.CommissionDecision = CommissionDecisionType.Approved;
            appTolga.CommissionDecisionDate = new DateTime(2026, 6, 25);
            appTolga.Advisor!.AccessToken = "havelsan-tolga-yilmaz-staj-defteri-onay-2026";
            appTolga.Advisor.GraduatedUniversityAndDepartment = "ODTÜ Bilgisayar Mühendisliği (Doktora)";
            appTolga.Advisor.PhoneNumber = "0312 219 5780";
            appTolga.Advisor.HasApprovedDiary = false;
            appTolga.Diary!.IsSubmittedToAdvisor = true;
            appTolga.Diary.SubmittedAt = DateTime.UtcNow.AddDays(-1);
            appTolga.Diary.IsApprovedByAdvisor = false;
            appTolga.Diary.TotalEmployees = "2500+";
            appTolga.InsuranceRecord = new InsuranceRecord
            {
                Status = InsuranceStatus.Started,
                SgkEntryDate = new DateTime(2026, 7, 6),
                SgkExitDate = new DateTime(2026, 7, 31),
                SgkDocumentRegistrationNo = "SGK-2026-4A-992318"
            };

            var diarySubjects = new (string Title, string Content)[]
            {
                ("Oryantasyon, Şirket Altyapısı ve Güvenlik Standartları", "Stajın ilk gününde şirket içi oryantasyon programına katıldım. Savunma sanayii bilgi güvenliği protokolleri, gizlilik sözleşmeleri ve çalışma prensipleri aktarıldı. Bilgisayarıma kurumsal Linux (Ubuntu 22.04 LTS) dağıtımı kuruldu, kurumsal GitLab, Jira ve Confluence erişim izinleri tanımlandı."),
                ("Savunma Yazılım Standartları ve C4ISR Mimari İncelemesi", "Komuta Kontrol (C4ISR) sistemlerinin yazılım mimarisi, askeri standartlar (DO-178C ve MIL-STD) ve MISRA C++ kodlama yönergeleri incelendi."),
                ("Gitflow Dallanma Stratejisi ve CI/CD Altyapısı", "Takımın benimsediği GitFlow dallanma modeli incelendi. main, develop, feature, release ve hotfix dallarının yaşam döngüsü öğrenildi."),
                ("Mikroservis Mimarisi ve Docker Konfigürasyonları", "Sistemin mikroservis mimarisinde çalışan servisleri Docker container'ları halinde incelendi. Dockerfile çok aşamalı derleme (multi-stage build) teknikleri uygulandı."),
                ("DDS (Data Distribution Service) Protokolü İncelemesi", "Gerçek zamanlı savunma sistemlerinin omurgasını oluşturan OMG DDS standardı ve FastDDS kütüphanesi incelendi. QoS profilleri analiz edildi."),
                ("DDS IDL Veri Modellerinin Tanımlanması", "Radar ve sensörlerden gelecek verilerin DDS veri tipleri (IDL) tasarlandı. FastDDS-Gen aracı ile derlenerek C++ sınıfları üretildi."),
                ("Telemetri Dağıtım Servisi Geliştirme (Publisher)", "C++20 standardında sensör telemetri verilerini DDS ağına periyodik olarak aktaran Publisher modülü kodlandı."),
                ("Koordinat Dönüşümü ve Veri Filtreleme Algoritmaları", "DDS üzerinden gelen telemetri verilerindeki GPS (WGS84) koordinatlarının UTM koordinat sistemine dönüştürülmesi için C++ fonksiyonları yazıldı."),
                ("Google Test (GTest) ile Birim Test Yazımı", "Yazılan koordinat dönüşüm algoritmaları için Google Test kütüphanesi kullanılarak birim testler yazıldı ve %92 kod kapsama oranına ulaşıldı."),
                ("gRPC ve RESTful API Gateway Mimarisi", "İç mikroservisler arasındaki haberleşmede kullanılan gRPC mimarisi incelendi. Protobuf dosyası oluşturularak telemetri RPC metotları tanımlandı."),
                ("Radar İz Akışı için gRPC Streaming Servisi", "Radar sunucusundan komuta kontrol gösterge paneline anlık veri akışı sağlamak amacıyla server-side streaming gRPC servisi geliştirildi."),
                ("TimescaleDB Zaman Serisi Veritabanı Modellemesi", "Yüksek hacimli sensör verilerinin saklanması amacıyla PostgreSQL üzerinde TimescaleDB yapılandırıldı."),
                ("Redis Önbellek Entegrasyonu ve Performans Testleri", "En son bilinen telemetri verilerini anlık hafızada tutmak için Redis in-memory veri tabanı entegre edildi."),
                ("Taktik Harita Arayüzü (GIS) Mimarisi İncelemesi", "React, TypeScript ve OpenLayers kütüphaneleri ile geliştirilen taktik harita gösterge paneli incelendi."),
                ("WebSocket Köprüsü ile Harita Entegrasyonu", "Backend gRPC yayınını tarayıcı tarafına aktarmak için WebSocket köprüsü kuruldu ve 60 FPS hızında radar izleri görselleştirildi."),
                ("Statik Kod Analizi ve Bellek Sızıntısı Taraması", "SonarQube statik analiz aracı ve Valgrind Memcheck ile bellek sızıntısı taraması yapıldı."),
                ("Dağıtık Sistem Yük Testi (k6 ve JMeter)", "Sistemin 10.000 eşzamanlı sensör izi altındaki kararlılığını test etmek için k6 yük test senaryoları çalıştırıldı."),
                ("Kubernetes (K8s) Dağıtım Dosyalarının Hazırlanması", "Geliştirilen servisler için Kubernetes Deployment ve Service YAML manifest dosyaları hazırlandı."),
                ("GitLab Merge Request ve Kod İncelemesi", "Geliştirilen telemetri işleme ve dağıtım modülü için GitLab üzerinde Merge Request açılarak kod incelemesi tamamlandı."),
                ("Staj Sonuç Raporu, Teknik Sunum ve Kapanış", "Stajın son gününde mimari diyagramlar özetlenerek staj sonuç raporu hazırlandı ve mühendislik ekibine teknik sunum yapıldı.")
            };

            for (int i = 0; i < diarySubjects.Length; i++)
            {
                appTolga.Diary.Entries.Add(new DiaryEntry
                {
                    DayNumber = i + 1,
                    EntryDate = new DateTime(2026, 7, 6).AddDays(i < 5 ? i : (i < 10 ? i + 2 : (i < 15 ? i + 4 : i + 6))),
                    Title = diarySubjects[i].Title,
                    Content = diarySubjects[i].Content,
                    IsDraft = false,
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                });
            }

            apps.Add(appTolga);
        }

        // 20. Esra SAĞDIÇ (Proje Ekibi / 4. Sınıf) - Staj 1: Sigortası Başlatılmış & Aktif Stajyer
        var esra = students.FirstOrDefault(s => s.Email == "esra.sagdic@selcuk.edu.tr");
        if (esra != null)
        {
            var wpAkinsoftRef = workplaces.First(w => w.Name.Contains("AKINSOFT"));
            var appEsra = CreateApp(esra, staj1, wpAkinsoftRef, InternshipType.Staj1,
                "Yapay Zeka Destekli Kurumsal Kaynak Planlama (ERP) ve Dağıtık Sistem Mimarileri", 20, false,
                new DateTime(2026, 11, 2), ApplicationStatus.InsuranceStarted, "Müh. Serdar Keskin", "serdar.keskin@akinsoft.com.tr", "Yazılım Direktörü");
            appEsra.CommissionDecision = CommissionDecisionType.Approved;
            appEsra.CommissionDecisionDate = DateTime.UtcNow.AddDays(-5);
            appEsra.InsuranceRecord = new InsuranceRecord
            {
                Status = InsuranceStatus.Started,
                SgkEntryDate = new DateTime(2026, 11, 2),
                SgkExitDate = new DateTime(2026, 11, 27),
                SgkDocumentRegistrationNo = "SGK-2026-4A-233311",
                ProcessedAt = DateTime.UtcNow.AddDays(-4)
            };
            appEsra.Diary!.Entries.Add(new DiaryEntry { DayNumber = 1, EntryDate = new DateTime(2026, 11, 2), Title = "Oryantasyon ve Kurumsal Mimari", Content = "Şirket içi oryantasyon tamamlandı. Proje reposu ve geliştirme ortamları kuruldu." });
            appEsra.Diary.Entries.Add(new DiaryEntry { DayNumber = 2, EntryDate = new DateTime(2026, 11, 3), Title = "Veritabanı Şeması Analizi", Content = "Kurumsal ERP veritabanı şeması ve ilişkisel tablolar incelendi." });
            appEsra.Diary.Entries.Add(new DiaryEntry { DayNumber = 3, EntryDate = new DateTime(2026, 11, 4), Title = "REST API Geliştirme", Content = ".NET 9 Web API üzerinde stok yönetim endpointleri kodlandı." });
            appEsra.Diary.Entries.Add(new DiaryEntry { DayNumber = 4, EntryDate = new DateTime(2026, 11, 5), Title = "Frontend Entegrasyonu", Content = "React arayüz bileşenleri API servisleri ile haberleştirildi." });
            appEsra.Diary.Entries.Add(new DiaryEntry { DayNumber = 5, EntryDate = new DateTime(2026, 11, 6), Title = "Birim Testler ve Kod İncelemesi", Content = "Geliştirilen servisler için xUnit testleri yazıldı ve PR onaylandı." });
            apps.Add(appEsra);
        }

        // 21. Betül ACAR (Proje Ekibi / 4. Sınıf) - Staj 2: Komisyon Onayında
        var betul = students.FirstOrDefault(s => s.Email == "betul.acar@selcuk.edu.tr");
        if (betul != null)
        {
            var appBetul = CreateApp(betul, staj2, workplaces.First(w => w.Name.Contains("HAVELSAN")), InternshipType.Staj2,
                "Bulut Bilişim ve Mikroservis Güvenlik Testleri", 20, false,
                new DateTime(2026, 11, 9), ApplicationStatus.ApprovedByCommission, "Dr. Selin Aksoy", "saksoy@havelsan.com.tr", "Kıdemli Sistem Mimarı");
            appBetul.CommissionDecision = CommissionDecisionType.Approved;
            appBetul.CommissionDecisionDate = DateTime.UtcNow.AddDays(-2);
            apps.Add(appBetul);
        }

        await context.InternshipApplications.AddRangeAsync(apps);
        await context.SaveChangesAsync();

        foreach (var a in apps.Where(x => x.HasExtensionRequest))
        {
            var ext = new InternshipExtensionRequest
            {
                InternshipApplicationId = a.Id,
                RequestedExtraDays = a.ExtensionExtraDays > 0 ? a.ExtensionExtraDays : 5,
                MissedDates = a.ExtensionMissedDates ?? $"{a.ExtensionExtraDays} İş Günü Telafi",
                Reason = a.ExtensionReason ?? "Staj telafisi",
                OriginalEndDate = a.CurrentEndDate,
                NewCalculatedEndDate = a.CurrentEndDate.AddDays(7),
                Status = a.IsExtensionApprovedByCommission ? ExtensionStatus.ApprovedByCommission : ExtensionStatus.PendingCommission,
                CreatedAt = a.ExtensionRequestedAt ?? DateTime.UtcNow,
                CommissionApprovedAt = a.ExtensionCommissionApprovedAt
            };
            context.InternshipExtensionRequests.Add(ext);
        }
        await context.SaveChangesAsync();

        // Başvurular için Örnek Bildirimler ve E-posta Kayıtları Oluştur
        await SeedInitialNotificationsAndEmailsAsync(context, apps);
    }

    private static async Task SeedDepartmentSpecificApplicationsAsync(AppDbContext context)
    {
        var staj1 = await context.InternshipPeriods.FirstOrDefaultAsync(p => p.Type == InternshipType.Staj1);
        var staj2 = await context.InternshipPeriods.FirstOrDefaultAsync(p => p.Type == InternshipType.Staj2);
        if (staj1 == null || staj2 == null) return;

        var workplaces = await context.Workplaces.ToListAsync();
        var students = await context.Users.Include(u => u.StudentProfile).Where(u => u.Role == UserRole.Student).ToListAsync();

        // 1. MAKİNE MÜHENDİSLİĞİ ÖĞRENCİLERİ VE BAŞVURULARI
        var serhat = students.FirstOrDefault(s => s.Email == "serhat.yilmaz@selcuk.edu.tr");
        if (serhat != null && !await context.InternshipApplications.AnyAsync(a => a.StudentId == serhat.Id))
        {
            var wpTumosan = workplaces.FirstOrDefault(w => w.Name.Contains("TÜMOSAN")) ?? workplaces.First();
            var appSerhat = CreateApp(serhat, staj1, wpTumosan, InternshipType.Staj1,
                "Dizel Motor Test, Dinamometre Ölçümleri ve Güç Aktarma Organları İmalat Analizi", 20, false,
                new DateTime(2026, 11, 16), ApplicationStatus.Submitted, "Müh. Halil Demir", "halil.demir@tumosan.com.tr", "Kıdemli Makine Tasarım Mühendisi");
            if (appSerhat.Advisor != null) appSerhat.Advisor.GraduatedUniversityAndDepartment = "Makine Mühendisliği";
            context.InternshipApplications.Add(appSerhat);
        }

        var berke = students.FirstOrDefault(s => s.Email == "berke.kaya@selcuk.edu.tr");
        if (berke != null && !await context.InternshipApplications.AnyAsync(a => a.StudentId == berke.Id))
        {
            var wpRoketsan = workplaces.FirstOrDefault(w => w.Name.Contains("ROKETSAN")) ?? workplaces.First();
            var appBerke = CreateApp(berke, staj1, wpRoketsan, InternshipType.Staj1,
                "Füze Gövde Mukavemet Hesaplamaları ve Aerodinamik Yüzey Modelleme", 30, true,
                new DateTime(2026, 11, 9), ApplicationStatus.Submitted, "Müh. Tayfun Korkmaz", "tkorkmaz@roketsan.com.tr", "Makine Başmühendisi");
            if (appBerke.Advisor != null) appBerke.Advisor.GraduatedUniversityAndDepartment = "Makine Mühendisliği";
            context.InternshipApplications.Add(appBerke);
        }

        var emreDemirtas = students.FirstOrDefault(s => s.Email == "emre.demirtas@selcuk.edu.tr");
        if (emreDemirtas != null && !await context.InternshipApplications.AnyAsync(a => a.StudentId == emreDemirtas.Id))
        {
            var wpTei = workplaces.FirstOrDefault(w => w.Name.Contains("TEI")) ?? workplaces.First();
            var appEmreD = CreateApp(emreDemirtas, staj1, wpTei, InternshipType.Staj1,
                "Havacılık Gaz Türbinli Motor İmalatı, Titanyum Talaşlı İmalat ve CMM Kalite Kontrol", 30, true,
                new DateTime(2026, 11, 9), ApplicationStatus.ApprovedByCommission, "Müh. Orhan Güven", "oguven@tei.com.tr", "İmalat Başmühendisi");
            appEmreD.CommissionDecision = CommissionDecisionType.Approved;
            appEmreD.CommissionDecisionDate = DateTime.UtcNow.AddDays(-1);
            if (appEmreD.Advisor != null) appEmreD.Advisor.GraduatedUniversityAndDepartment = "Makine Mühendisliği";
            context.InternshipApplications.Add(appEmreD);
        }

        var oguzhan = students.FirstOrDefault(s => s.Email == "oguzhan.kurt@selcuk.edu.tr");
        if (oguzhan != null)
        {
            oguzhan.Department = "Makine Mühendisliği";
            if (oguzhan.StudentProfile != null) oguzhan.StudentProfile.Department = "Makine Mühendisliği";

            if (!await context.InternshipApplications.AnyAsync(a => a.StudentId == oguzhan.Id && a.Type == InternshipType.Staj1))
            {
                var wpTusas = workplaces.FirstOrDefault(w => w.Name.Contains("TUSAŞ")) ?? workplaces.First();
                var appOguzhanStaj1 = CreateApp(oguzhan, staj1, wpTusas, InternshipType.Staj1,
                    "Milli Muharip Uçak Yapısal CAD Modelleme ve CNC Tezgâh İmalat Süreçleri", 20, false,
                    new DateTime(2026, 11, 2), ApplicationStatus.InsuranceStarted, "Müh. Fatih Yıldırım", "fyildirim@tusas.com", "Tasarım Şefi");
                appOguzhanStaj1.CommissionDecision = CommissionDecisionType.Approved;
                appOguzhanStaj1.InsuranceRecord = new InsuranceRecord
                {
                    Status = InsuranceStatus.Started,
                    SgkEntryDate = new DateTime(2026, 11, 2),
                    SgkExitDate = new DateTime(2026, 11, 27),
                    SgkDocumentRegistrationNo = "SGK-2026-MAK-441029",
                    ProcessedAt = DateTime.UtcNow.AddDays(-3)
                };
                appOguzhanStaj1.HasExtensionRequest = true;
                appOguzhanStaj1.ExtensionExtraDays = 4;
                appOguzhanStaj1.ExtensionMissedDates = "18.11.2026 - 21.11.2026 (4 İş Günü)";
                appOguzhanStaj1.ExtensionReason = "[Gelemeyeceği Tarihler: 18.11.2026 - 21.11.2026 (4 İş Günü)] Fabrika tezgâh revizyonu ve planlı bakım duruşu nedeniyle staj uzatımı talep edilmektedir.";
                appOguzhanStaj1.ExtensionRequestedAt = DateTime.UtcNow.AddHours(-18);
                appOguzhanStaj1.IsExtensionApprovedByCommission = false;
                if (appOguzhanStaj1.Advisor != null) appOguzhanStaj1.Advisor.GraduatedUniversityAndDepartment = "Makine Mühendisliği";
                context.InternshipApplications.Add(appOguzhanStaj1);
            }
        }

        // 2. ELEKTRİK-ELEKTRONİK MÜHENDİSLİĞİ ÖĞRENCİLERİ VE BAŞVURULARI
        var burak = students.FirstOrDefault(s => s.Email == "burak.ozkan@selcuk.edu.tr");
        if (burak != null)
        {
            burak.Department = "Elektrik-Elektronik Mühendisliği";
            if (burak.StudentProfile != null) burak.StudentProfile.Department = "Elektrik-Elektronik Mühendisliği";
        }

        var selin = students.FirstOrDefault(s => s.Email == "selin.karaca@selcuk.edu.tr");
        if (selin != null)
        {
            selin.Department = "Elektrik-Elektronik Mühendisliği";
            if (selin.StudentProfile != null) selin.StudentProfile.Department = "Elektrik-Elektronik Mühendisliği";
        }

        var alperen = students.FirstOrDefault(s => s.Email == "alperen.celik@selcuk.edu.tr");
        if (alperen != null && !await context.InternshipApplications.AnyAsync(a => a.StudentId == alperen.Id))
        {
            var wpHavelsan = workplaces.FirstOrDefault(w => w.Name.Contains("HAVELSAN")) ?? workplaces.First();
            var appAlperen = CreateApp(alperen, staj2, wpHavelsan, InternshipType.Staj2,
                "Akıllı Şebeke Güç İletimi, Sensör Düğümleri ve IoT Haberleşme Ağları", 20, false,
                new DateTime(2026, 11, 9), ApplicationStatus.Submitted, "Dr. Selin Aksoy", "saksoy@havelsan.com.tr", "Sistem & Donanım Lideri");
            if (appAlperen.Advisor != null) appAlperen.Advisor.GraduatedUniversityAndDepartment = "Elektrik-Elektronik Mühendisliği";
            context.InternshipApplications.Add(appAlperen);
        }

        var ezgi = students.FirstOrDefault(s => s.Email == "ezgi.arslan@selcuk.edu.tr");
        if (ezgi != null && !await context.InternshipApplications.AnyAsync(a => a.StudentId == ezgi.Id))
        {
            var wpTelekom = workplaces.FirstOrDefault(w => w.Name.Contains("Türk Telekomünikasyon")) ?? workplaces.First();
            var appEzgi = CreateApp(ezgi, staj1, wpTelekom, InternshipType.Staj1,
                "Fiber Optik İletim Hatları, 5G Baz İstasyonu RF Ölçümleri ve Spektrum Analizi", 20, false,
                new DateTime(2026, 11, 2), ApplicationStatus.InsuranceStarted, "Müh. Cenk Yılmaz", "cenk.yilmaz@turktelekom.com.tr", "Kıdemli RF Mühendisi");
            appEzgi.CommissionDecision = CommissionDecisionType.Approved;
            appEzgi.InsuranceRecord = new InsuranceRecord
            {
                Status = InsuranceStatus.Started,
                SgkEntryDate = new DateTime(2026, 11, 2),
                SgkExitDate = new DateTime(2026, 11, 27),
                SgkDocumentRegistrationNo = "SGK-2026-EE-551920",
                ProcessedAt = DateTime.UtcNow.AddDays(-3)
            };
            appEzgi.HasCancelRequest = true;
            appEzgi.CancelReason = "Ortopedik rahatsızlık ve resmî heyet sağlık istirahat raporu doğrultusunda 5510 sayılı kanun kapsamında stajımın iptalini ve SGK çıkışımın yapılmasını arz ederim.";
            appEzgi.CancelFormDocumentPath = "FORM7_Staj_Iptal_Formu.docx";
            appEzgi.CancelRequestedAt = DateTime.UtcNow.AddHours(-12);
            appEzgi.IsCancelApprovedByCommission = false;
            if (appEzgi.Advisor != null) appEzgi.Advisor.GraduatedUniversityAndDepartment = "Elektrik-Elektronik Mühendisliği";
            context.InternshipApplications.Add(appEzgi);
        }

        await context.SaveChangesAsync();
    }

    private static InternshipApplication CreateApp(
        User student,
        InternshipPeriod period,
        Workplace workplace,
        InternshipType type,
        string subject,
        int workDays,
        bool sat,
        DateTime startDate,
        ApplicationStatus status,
        string advisorName,
        string advisorEmail,
        string advisorTitle)
    {
        var endDate = startDate.AddDays(workDays + (sat ? 6 : 10));

        var app = new InternshipApplication
        {
            StudentId = student.Id,
            Student = student,
            PeriodId = period.Id,
            Period = period,
            WorkplaceId = workplace.Id,
            Workplace = workplace,
            Type = type,
            Subject = subject,
            RequiredWorkDays = workDays,
            IncludesSaturday = sat,
            StartDate = startDate,
            CalculatedEndDate = endDate,
            CurrentEndDate = endDate,
            Status = status,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            Advisor = new WorkplaceAdvisor
            {
                FullName = advisorName,
                Email = advisorEmail,
                PhoneNumber = "0532 999 8877",
                GraduatedUniversityAndDepartment = "Bilgisayar Mühendisliği",
                TitleOrPosition = advisorTitle,
                AccessToken = Guid.NewGuid().ToString("N")
            },
            Diary = new InternshipDiary(),
            Documents = new List<Document>
            {
                new()
                {
                    Type = DocumentType.Form2_KabulFormu,
                    Status = status >= ApplicationStatus.ApprovedByCommission ? DocumentStatus.Approved : DocumentStatus.Pending,
                    Versions = new List<DocumentVersion>
                    {
                        new()
                        {
                            VersionNumber = 1,
                            OriginalFileName = $"Form2_KabulFormu_{student.FullName.Replace(" ", "_")}.pdf",
                            StoredFileName = $"form2_{student.Id}_v1.pdf",
                            FileSizeBytes = 280000,
                            UploadedByUserId = student.Id,
                            UploadedAt = DateTime.UtcNow.AddDays(-10)
                        }
                    }
                },
                new()
                {
                    Type = DocumentType.Spas_Mustehaklik,
                    Status = status >= ApplicationStatus.ApprovedByCommission ? DocumentStatus.Approved : DocumentStatus.Pending,
                    Versions = new List<DocumentVersion>
                    {
                        new()
                        {
                            VersionNumber = 1,
                            OriginalFileName = $"SPAS_Mustehaklik_{student.FullName.Replace(" ", "_")}.pdf",
                            StoredFileName = $"spas_{student.Id}_v1.pdf",
                            FileSizeBytes = 185000,
                            UploadedByUserId = student.Id,
                            UploadedAt = DateTime.UtcNow.AddDays(-10)
                        }
                    }
                }
            }
        };

        return app;
    }

    private static async Task SeedInitialNotificationsAndEmailsAsync(AppDbContext context, List<InternshipApplication> apps)
    {
        var komisyon = await context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.CommissionMember);
        var kpto = await context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.KPTOOfficer);

        var notifications = new List<UserNotification>();
        var emails = new List<EmailLog>();

        foreach (var app in apps)
        {
            var periodName = app.Type == InternshipType.Staj2 ? "Staj 2" : "Staj 1";
            var studentName = app.Student?.FullName ?? "Öğrenci";
            var studentEmail = app.Student?.Email ?? "ogrenci@selcuk.edu.tr";
            var workplaceName = app.Workplace?.Name ?? "İlgili Kurum";
            var advisorName = app.Advisor?.FullName ?? "İşyeri Mühendisi";
            var advisorEmail = app.Advisor?.Email ?? "advisor@firma.com";
            var advisorToken = app.Advisor?.AccessToken ?? Guid.NewGuid().ToString("N");

            // --- BİLDİRİMLER ---
            if (app.Status == ApplicationStatus.Submitted)
            {
                if (komisyon != null)
                {
                    notifications.Add(new UserNotification
                    {
                        UserId = komisyon.Id,
                        Title = "Yeni Staj Başvurusu",
                        Message = $"{studentName} ({app.Student?.StudentProfile?.StudentNumber}) {workplaceName} firması için {periodName} onayı beklemektedir.",
                        Type = NotificationType.Info,
                        RelatedApplicationId = app.Id,
                        CreatedAt = DateTime.UtcNow.AddHours(-4)
                    });
                }
                notifications.Add(new UserNotification
                {
                    UserId = app.StudentId,
                    Title = "Başvurunuz Komisyon Onayına Sunuldu",
                    Message = $"{periodName} staj başvurunuz ve yüklenen evraklar Staj Komisyonu incelemesine iletilmiştir.",
                    Type = NotificationType.Info,
                    RelatedApplicationId = app.Id,
                    CreatedAt = DateTime.UtcNow.AddHours(-4)
                });
            }
            else if (app.Status == ApplicationStatus.ApprovedByCommission)
            {
                notifications.Add(new UserNotification
                {
                    UserId = app.StudentId,
                    Title = "Staj Başvurunuz Onaylandı",
                    Message = $"Tebrikler! {periodName} staj başvurunuz Staj Komisyonu tarafından ONAYLANDI. Sigorta tescili için KPTO'ya iletildi.",
                    Type = NotificationType.Success,
                    RelatedApplicationId = app.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                });
                if (kpto != null)
                {
                    notifications.Add(new UserNotification
                    {
                        UserId = kpto.Id,
                        Title = "SGK Girişi Bekleyen Öğrenci",
                        Message = $"{studentName} ({app.Student?.StudentProfile?.StudentNumber}) için {periodName} staj sigorta girişi yapılması gerekmektedir.",
                        Type = NotificationType.Info,
                        RelatedApplicationId = app.Id,
                        CreatedAt = DateTime.UtcNow.AddDays(-1)
                    });
                }
            }
            else if (app.Status == ApplicationStatus.InsuranceStarted)
            {
                notifications.Add(new UserNotification
                {
                    UserId = app.StudentId,
                    Title = "SGK Staj Sigortanız Başlatıldı",
                    Message = $"{periodName} staj sigortanız KPTO tarafından 5510 Sayılı Kanun 5/b kapsamında tescil edildi. Stajınıza başlayabilirsiniz.",
                    Type = NotificationType.Success,
                    RelatedApplicationId = app.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                });
            }
            else if (app.Status == ApplicationStatus.AdvisorApproved)
            {
                notifications.Add(new UserNotification
                {
                    UserId = app.StudentId,
                    Title = "Staj Defteriniz İşyeri Tarafından Onaylandı",
                    Message = $"İşyeri sorumlu mühendisi ({advisorName}) Sanal Staj Defterinizi onayladı. Komisyon nihai akademik değerlendirmesi bekleniyor.",
                    Type = NotificationType.Success,
                    RelatedApplicationId = app.Id,
                    CreatedAt = DateTime.UtcNow.AddHours(-10)
                });
                if (komisyon != null)
                {
                    notifications.Add(new UserNotification
                    {
                        UserId = komisyon.Id,
                        Title = "Defter Onayı Tamamlandı - Akademik Değerlendirme Bekliyor",
                        Message = $"{studentName} isimli öğrencinin staj defteri işyeri mühendisi tarafından onaylandı.",
                        Type = NotificationType.Info,
                        RelatedApplicationId = app.Id,
                        CreatedAt = DateTime.UtcNow.AddHours(-10)
                    });
                }
            }
            else if (app.Status == ApplicationStatus.Completed)
            {
                notifications.Add(new UserNotification
                {
                    UserId = app.StudentId,
                    Title = "Stajınız Başarıyla Tamamlandı",
                    Message = $"{periodName} stajınız Staj Komisyonu tarafından BAŞARILI olarak onaylandı ({app.AcceptedDaysCount} iş günü kabul edildi).",
                    Type = NotificationType.Success,
                    RelatedApplicationId = app.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-3)
                });
            }
            else if (app.Status == ApplicationStatus.RevisionRequired)
            {
                notifications.Add(new UserNotification
                {
                    UserId = app.StudentId,
                    Title = "Staj Başvurunuzda Düzeltme İstendi",
                    Message = $"Staj Komisyonu düzeltme talep etti: {app.CommissionRejectReason}",
                    Type = NotificationType.Warning,
                    RelatedApplicationId = app.Id,
                    CreatedAt = DateTime.UtcNow.AddHours(-8)
                });
            }

            // --- KURUMSAL E-POSTALAR (Her Öğrenci İçin Kendi Postaları) ---
            if (app.Status >= ApplicationStatus.Submitted)
            {
                var bodySub = EmailService.WrapSelcukTemplate(
                    title: $"{periodName} Başvurunuz Alındı",
                    subtitle: "Staj Başvuru ve Kabul Belgeleriniz Komisyona İletildi",
                    content: $@"
                        <p>Sayın <strong>{studentName}</strong>,</p>
                        <p><strong>{periodName}</strong> kapsamında <strong>{workplaceName}</strong> kurumu için sisteme yüklediğiniz Form 2 (İşyeri Staj Sözleşmesi) ve SPAS Müstehaklık Belgesi başarıyla kayıt altına alınmıştır.</p>
                        <div style='background: #f8fafc; border-left: 4px solid #1c458b; padding: 14px 18px; margin: 20px 0;'>
                            <p style='margin: 0 0 6px 0;'><strong>Başvuru No:</strong> #{app.Id}</p>
                            <p style='margin: 0 0 6px 0;'><strong>Staj Dönemi:</strong> {app.StartDate:dd.MM.yyyy} - {app.CurrentEndDate:dd.MM.yyyy} ({app.RequiredWorkDays} İş Günü)</p>
                            <p style='margin: 0;'><strong>Durum:</strong> Bölüm Staj Komisyonu Ön İncelemesinde</p>
                        </div>
                        <p>Komisyon evraklarınızı incelediğinde sistem içi bildirim ve e-posta ile tarafınıza bilgi verilecektir.</p>
                    "
                );

                emails.Add(new EmailLog
                {
                    ToEmail = studentEmail,
                    RecipientName = studentName,
                    Subject = $"[Selçuk Staj] {periodName} Başvurunuz Alındı",
                    TemplateType = "ApplicationSubmitted",
                    BodyHtml = bodySub,
                    RelatedApplicationId = app.Id,
                    Status = "Sent",
                    SentAt = DateTime.UtcNow.AddDays(-6)
                });
            }

            if (app.Status == ApplicationStatus.RevisionRequired)
            {
                var bodyRev = EmailService.WrapSelcukTemplate(
                    title: $"{periodName} Başvurunuzda Düzeltme İstendi",
                    subtitle: "Eksik / Hatalı Evrak veya Bilgi Güncellemesi Gerekmektedir",
                    content: $@"
                        <p>Sayın <strong>{studentName}</strong>,</p>
                        <p style='color: #b45309;'>Staj Komisyonu başvurunuzu incelemiş ve aşağıdaki gerekçeyle düzeltme talep etmiştir:</p>
                        <div style='background: #fffbeb; border-left: 4px solid #d97706; padding: 14px 18px; margin: 20px 0; color: #78350f;'>
                            <strong>Komisyon Düzeltme Gerekçesi:</strong><br/>
                            {app.CommissionRejectReason ?? "Belgelerdeki eksiklikleri gidererek başvurunuzu güncelleyiniz."}
                        </div>
                        <p>Lütfen sisteme giriş yaparak başvurunuzu güncelleyiniz ve tekrar onaya gönderiniz.</p>
                    ",
                    headerColor: "#d97706"
                );

                emails.Add(new EmailLog
                {
                    ToEmail = studentEmail,
                    RecipientName = studentName,
                    Subject = $"[Selçuk Staj] {periodName} Başvurunuzda Düzeltme İstendi",
                    TemplateType = "CommissionDecision",
                    BodyHtml = bodyRev,
                    RelatedApplicationId = app.Id,
                    Status = "Sent",
                    SentAt = DateTime.UtcNow.AddDays(-2)
                });
            }

            if (app.Status >= ApplicationStatus.ApprovedByCommission && app.Status != ApplicationStatus.RevisionRequired)
            {
                var bodyAppr = EmailService.WrapSelcukTemplate(
                    title: $"{periodName} Başvurunuz Onaylandı",
                    subtitle: "Staj Komisyonu İncelemesi Başarıyla Tamamlandı",
                    content: $@"
                        <p>Sayın <strong>{studentName}</strong>,</p>
                        <p style='color: #16a34a; font-weight: 600;'>Tebrikler! Staj başvurunuz ve teslim ettiğiniz evraklar Staj Komisyonu tarafından incelenmiş ve UYGUN bulunarak ONAYLANMIŞTIR.</p>
                        <div style='background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0;'>
                            <p style='margin: 0 0 6px 0;'><strong>Staj Dönemi:</strong> {periodName}</p>
                            <p style='margin: 0 0 6px 0;'><strong>Kabul Edilen Kurum:</strong> {workplaceName}</p>
                            <p style='margin: 0 0 6px 0;'><strong>Tarih Aralığı:</strong> {app.StartDate:dd.MM.yyyy} - {app.CurrentEndDate:dd.MM.yyyy}</p>
                            <p style='margin: 0;'><strong>Sıradaki Aşama:</strong> KPTO tarafından SGK staj sigortanızın başlatılması.</p>
                        </div>
                    ",
                    headerColor: "#16a34a"
                );

                emails.Add(new EmailLog
                {
                    ToEmail = studentEmail,
                    RecipientName = studentName,
                    Subject = $"[Selçuk Staj] {periodName} Başvurunuz ONAYLANDI",
                    TemplateType = "CommissionDecision",
                    BodyHtml = bodyAppr,
                    RelatedApplicationId = app.Id,
                    Status = "Sent",
                    SentAt = DateTime.UtcNow.AddDays(-5)
                });

                var bodyAdv = EmailService.WrapSelcukTemplate(
                    title: "Selçuk Üniversitesi Staj Danışmanlığı Bilgilendirmesi",
                    subtitle: "Öğrenci Sanal Staj Defteri Onay ve Değerlendirme Sistemi",
                    content: $@"
                        <p>Sayın <strong>{advisorName}</strong> ({app.Advisor?.TitleOrPosition ?? "Mühendis"}),</p>
                        <p>Selçuk Üniversitesi öğrencimiz <strong>{studentName}</strong>, kurumunuz ({workplaceName}) bünyesinde <strong>{app.StartDate:dd.MM.yyyy} - {app.CurrentEndDate:dd.MM.yyyy}</strong> tarihleri arasında zorunlu {periodName} çalışmasına başlayacaktır.</p>
                        <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;'>
                            <p style='margin: 0 0 10px 0; font-size: 14px; color: #334155;'>Sanal Staj Defterini incelemek ve onaylamak için doğrudan erişim bağlantısı:</p>
                            <a href='http://localhost:8080/advisor/review?token={advisorToken}' style='background: #1c458b; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;'>Sanal Staj Defterini İncele ve Onayla</a>
                        </div>
                    "
                );

                emails.Add(new EmailLog
                {
                    ToEmail = advisorEmail,
                    RecipientName = advisorName,
                    Subject = $"[Selçuk Üniversitesi] Staj Eğitici Personel Bilgilendirmesi - {studentName}",
                    TemplateType = "AdvisorInvitation",
                    BodyHtml = bodyAdv,
                    RelatedApplicationId = app.Id,
                    Status = "Sent",
                    SentAt = DateTime.UtcNow.AddDays(-5)
                });
            }

            if (app.Status >= ApplicationStatus.InsuranceStarted && app.Status != ApplicationStatus.RevisionRequired)
            {
                var bodyIns = EmailService.WrapSelcukTemplate(
                    title: "SGK Staj Sigortanız Başlatıldı",
                    subtitle: "5510 Sayılı Kanun 5/b Kapsamında İşe Giriş Bildirgesi Düzenlendi",
                    content: $@"
                        <p>Sayın <strong>{studentName}</strong>,</p>
                        <p><strong>{periodName}</strong> için üniversitemiz KPTO tarafından Sosyal Güvenlik Kurumu (SGK) staj sigorta giriş işlemleriniz tamamlanmıştır.</p>
                        <div style='background: #f0fdf4; border-left: 4px solid #1c458b; padding: 14px 18px; margin: 20px 0;'>
                            <p style='margin: 0 0 6px 0;'><strong>SGK Tescil No:</strong> SGK-2026-4A-{app.Id + 10482}</p>
                            <p style='margin: 0 0 6px 0;'><strong>Sigorta Başlangıç Tarihi:</strong> {app.StartDate:dd.MM.yyyy}</p>
                            <p style='margin: 0 0 6px 0;'><strong>İşyeri:</strong> {workplaceName}</p>
                            <p style='margin: 0;'><strong>Kapsam:</strong> 5510 Sayılı Kanun 5/b Maddesi</p>
                        </div>
                        <p>SGK İşe Giriş Bildirgenizi e-Devlet kapısı üzerinden görüntüleyebilir ve stajınıza başlayabilirsiniz.</p>
                    "
                );

                emails.Add(new EmailLog
                {
                    ToEmail = studentEmail,
                    RecipientName = studentName,
                    Subject = "[Selçuk Staj] SGK Staj Sigorta Girişiniz Yapıldı",
                    TemplateType = "InsuranceStarted",
                    BodyHtml = bodyIns,
                    RelatedApplicationId = app.Id,
                    Status = "Sent",
                    SentAt = DateTime.UtcNow.AddDays(-4)
                });
            }

            if (app.Status >= ApplicationStatus.AdvisorApproved && app.Status != ApplicationStatus.RevisionRequired)
            {
                var bodyAdvApp = EmailService.WrapSelcukTemplate(
                    title: "Sanal Staj Defteriniz İşyeri Tarafından Onaylandı",
                    subtitle: "Staj Defteri Değerlendirme Aşaması Başarıyla Tamamlandı",
                    content: $@"
                        <p>Sayın <strong>{studentName}</strong>,</p>
                        <p><strong>{periodName}</strong> kapsamında doldurduğunuz Sanal Staj Defteriniz, işyeri sorumlu personeli <strong>{advisorName}</strong> tarafından incelenmiş ve ONAYLANMIŞTIR.</p>
                        <div style='background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0;'>
                            <p style='margin: 0 0 6px 0;'><strong>Onaylayan:</strong> {advisorName}</p>
                            <p style='margin: 0;'><strong>Sıradaki Aşama:</strong> Staj Komisyonu tarafından nihai akademik değerlendirmenin yapılması.</p>
                        </div>
                    ",
                    headerColor: "#16a34a"
                );

                emails.Add(new EmailLog
                {
                    ToEmail = studentEmail,
                    RecipientName = studentName,
                    Subject = "[Selçuk Staj] Staj Defteriniz İşyeri Tarafından Onaylandı",
                    TemplateType = "AdvisorApprovedDiary",
                    BodyHtml = bodyAdvApp,
                    RelatedApplicationId = app.Id,
                    Status = "Sent",
                    SentAt = DateTime.UtcNow.AddDays(-2)
                });
            }

            if (app.Status == ApplicationStatus.Completed)
            {
                var bodyFin = EmailService.WrapSelcukTemplate(
                    title: $"{periodName} Nihai Akademik Değerlendirmeniz Açıklandı",
                    subtitle: "Staj Süreci Başarıyla Sonuçlanmıştır",
                    content: $@"
                        <p>Sayın <strong>{studentName}</strong>,</p>
                        <p>Staj Komisyonu tarafından yapılan akademik değerlendirme neticesinde <strong>{periodName}</strong> çalışmanız <strong>BAŞARILI</strong> bulunmuştur.</p>
                        <div style='background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 20px 0;'>
                            <p style='margin: 0 0 6px 0;'><strong>Sonuç:</strong> Başarılı</p>
                            <p style='margin: 0 0 6px 0;'><strong>Kabul Edilen İş Günü:</strong> {app.AcceptedDaysCount} / {app.RequiredWorkDays} Gün</p>
                            <p style='margin: 0;'><strong>Komisyon Notu:</strong> Çalışmalar eksiksiz tamamlanmış ve tam puanla kabul edilmiştir.</p>
                        </div>
                    ",
                    headerColor: "#16a34a"
                );

                emails.Add(new EmailLog
                {
                    ToEmail = studentEmail,
                    RecipientName = studentName,
                    Subject = $"[Selçuk Staj] {periodName} Değerlendirme Sonucunuz Açıklandı",
                    TemplateType = "FinalAcademicEvaluation",
                    BodyHtml = bodyFin,
                    RelatedApplicationId = app.Id,
                    Status = "Sent",
                    SentAt = DateTime.UtcNow.AddDays(-1)
                });
            }
        }

        if (!await context.UserNotifications.AnyAsync())
        {
            await context.UserNotifications.AddRangeAsync(notifications);
        }

        var existingAppIds = await context.EmailLogs.Where(e => e.RelatedApplicationId != null)
            .Select(e => e.RelatedApplicationId.Value).Distinct().ToListAsync();
        var newEmails = emails.Where(e => e.RelatedApplicationId == null || !existingAppIds.Contains(e.RelatedApplicationId.Value)).ToList();
        if (newEmails.Count > 0)
        {
            await context.EmailLogs.AddRangeAsync(newEmails);
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedArchiveApplicationsAsync(AppDbContext context)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("Selcuk123!");

        // 1. Geçmiş Akademik Yılların ve Dönemlerin Oluşturulması (2022 - 2026)
        var archiveYearDefs = new (string Title, DateTime StartDate, DateTime EndDate, int YearNum)[]
        {
            ("2025-2026", new DateTime(2025, 9, 1), new DateTime(2026, 8, 31), 2026),
            ("2024-2025", new DateTime(2024, 9, 1), new DateTime(2025, 8, 31), 2025),
            ("2023-2024", new DateTime(2023, 9, 1), new DateTime(2024, 8, 31), 2024),
            ("2022-2023", new DateTime(2022, 9, 1), new DateTime(2023, 8, 31), 2023)
        };

        foreach (var yd in archiveYearDefs)
        {
            var existingYear = await context.AcademicYears
                .Include(y => y.Periods)
                .FirstOrDefaultAsync(y => y.Title == yd.Title);

            if (existingYear == null)
            {
                existingYear = new AcademicYear
                {
                    Title = yd.Title,
                    StartDate = yd.StartDate,
                    EndDate = yd.EndDate,
                    IsActive = false,
                    Periods = new List<InternshipPeriod>
                    {
                        new()
                        {
                            Title = $"{yd.Title} Staj Dönemi - Staj 1",
                            Type = InternshipType.Staj1,
                            DefaultWorkDays = 20,
                            ApplicationStartDate = new DateTime(yd.YearNum - 1, 10, 1),
                            ApplicationEndDate = new DateTime(yd.YearNum - 1, 12, 31),
                            EarliestStartDate = new DateTime(yd.YearNum, 6, 1),
                            LatestEndDate = new DateTime(yd.YearNum, 9, 30),
                            DocumentDeadlineDate = new DateTime(yd.YearNum, 10, 15),
                            IsSaturdayAllowed = true,
                            IsActive = false
                        },
                        new()
                        {
                            Title = $"{yd.Title} Staj Dönemi - Staj 2",
                            Type = InternshipType.Staj2,
                            DefaultWorkDays = 20,
                            ApplicationStartDate = new DateTime(yd.YearNum - 1, 10, 1),
                            ApplicationEndDate = new DateTime(yd.YearNum - 1, 12, 31),
                            EarliestStartDate = new DateTime(yd.YearNum, 6, 1),
                            LatestEndDate = new DateTime(yd.YearNum, 9, 30),
                            DocumentDeadlineDate = new DateTime(yd.YearNum, 10, 15),
                            IsSaturdayAllowed = true,
                            IsActive = false
                        }
                    }
                };
                context.AcademicYears.Add(existingYear);
                await context.SaveChangesAsync();
            }
        }

        // 2. Geçmiş Yıllara Ait Arşiv Öğrenci ve Staj Başvurularını Ekle
        var workplaces = await context.Workplaces.ToListAsync();
        var wpAkinsoft = workplaces.FirstOrDefault(w => w.Name.Contains("AKINSOFT")) ?? workplaces[0];
        var wpHavelsan = workplaces.FirstOrDefault(w => w.Name.Contains("HAVELSAN")) ?? workplaces[0];
        var wpAselsan = workplaces.FirstOrDefault(w => w.Name.Contains("ASELSAN")) ?? workplaces[0];
        var wpBaykar = workplaces.FirstOrDefault(w => w.Name.Contains("BAYKAR")) ?? workplaces[0];
        var wpTusas = workplaces.FirstOrDefault(w => w.Name.Contains("TUSAŞ Motor") ? false : w.Name.Contains("TUSAŞ")) ?? workplaces[0];
        var wpTeknokent = workplaces.FirstOrDefault(w => w.Name.Contains("Teknokent")) ?? workplaces[0];
        var wpLogo = workplaces.FirstOrDefault(w => w.Name.Contains("Logo")) ?? workplaces[0];
        var wpTurkcell = workplaces.FirstOrDefault(w => w.Name.Contains("Turkcell")) ?? workplaces[0];
        var wpBilgem = workplaces.FirstOrDefault(w => w.Name.Contains("BİLGEM")) ?? workplaces[0];
        var wpStm = workplaces.FirstOrDefault(w => w.Name.Contains("STM")) ?? workplaces[0];
        var wpInnopark = workplaces.FirstOrDefault(w => w.Name.Contains("InnoPark")) ?? workplaces[0];
        var wpRoketsan = workplaces.FirstOrDefault(w => w.Name.Contains("ROKETSAN")) ?? workplaces[0];
        var wpTelekom = workplaces.FirstOrDefault(w => w.Name.Contains("Türk Telekom")) ?? workplaces[0];
        var wpSofttech = workplaces.FirstOrDefault(w => w.Name.Contains("Softtech")) ?? workplaces[0];
        var wpTei = workplaces.FirstOrDefault(w => w.Name.Contains("TEI")) ?? workplaces[0];

        var archiveData = new List<(
            string YearTitle,
            string StudentName,
            string StudentEmail,
            string StudentNo,
            string TcNo,
            Workplace Wp,
            InternshipType Type,
            int WorkDays,
            string Subject,
            DateTime StartDate,
            DateTime EndDate,
            string SgkNo,
            string AdvisorName,
            string AdvisorTitle,
            string AdvisorDept,
            AcademicResultType Result,
            int AcceptedDays,
            string CommissionNote
        )>
        {
            // === 2022-2023 AKADEMİK YILI ===
            ("2022-2023", "Alperen Yıldız", "alperen.yildiz@selcuk.edu.tr", "183301010", "11223344550", wpHavelsan, InternshipType.Staj1, 20, "Hava Savunma Taktik Simülasyon Yazılımları", new DateTime(2023, 7, 3), new DateTime(2023, 7, 28), "SGK-2023-4A-331001", "Dr. Selin Aksoy", "Kıdemli Sistem Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün eksiksiz yapılmış, simülasyon ve yazılım test raporları komisyon tarafından onaylanmıştır."),
            ("2022-2023", "Büşra Şahin", "busra.sahin@selcuk.edu.tr", "183301021", "22334455661", wpAselsan, InternshipType.Staj2, 30, "Sayısal Radar Sinyal İşleme ve FPGA Arayüzü", new DateTime(2023, 7, 3), new DateTime(2023, 8, 11), "SGK-2023-4A-331002", "Müh. Selin Erdem", "Başmühendis", "Elektrik-Elektronik Mühendisliği", AcademicResultType.Successful, 30, "30 gün tam kabul. Radar sinyal analiz algoritmaları ve VHDL kodlamaları başarılı bulunmuştur."),
            ("2022-2023", "Cengiz Han Kurt", "cengiz.kurt@selcuk.edu.tr", "183301032", "33445566772", wpAkinsoft, InternshipType.Staj1, 20, "İnsansı Robot Kontrol ve Motor Sürücü Arayüzü", new DateTime(2023, 8, 7), new DateTime(2023, 9, 1), "SGK-2023-4A-331003", "Müh. Can Demir", "Kıdemli Robotik Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün tam kabul. Robotik kinematik hesaplamalar defterde detaylı incelenmiştir."),
            ("2022-2023", "Damla Aksoy", "damla.aksoy@selcuk.edu.tr", "183301043", "44556677883", wpBaykar, InternshipType.Staj2, 20, "İHA Aviyonik Sensör Entegrasyonu ve Testi", new DateTime(2023, 7, 10), new DateTime(2023, 8, 4), "SGK-2023-4A-331004", "Müh. Tarık Sezgin", "Otonom Sistemler Lideri", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün tam kabul. İHA uçuş veri telemetrisi başarılı şekilde raporlanmıştır."),
            ("2022-2023", "Efe Can Bulut", "efe.bulut@selcuk.edu.tr", "183301054", "55667788994", wpTusas, InternshipType.Staj1, 20, "Havacılık Aviyonik Görev Bilgisayarı Yazılımı", new DateTime(2023, 7, 17), new DateTime(2023, 8, 11), "SGK-2023-4A-331005", "Müh. Fatih Yıldırım", "Tasarım Şefi", "Havacılık ve Yazılım Mühendisliği", AcademicResultType.Successful, 20, "20 gün tam kabul. DO-178C yazılım standartları ve aviyonik testler başarılı bulunmuştur."),
            ("2022-2023", "Fatma Zehra Güler", "fatma.guler@selcuk.edu.tr", "183301065", "66778899005", wpLogo, InternshipType.Staj2, 30, "Kurumsal Muhasebe ve e-Devlet API Servisleri", new DateTime(2023, 7, 3), new DateTime(2023, 8, 11), "SGK-2023-4A-331006", "Müh. Ahmet Kaya", "Başmühendis", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 30, "30 gün tam kabul. ERP entegrasyonu ve SQL optimizasyonları onaylandı."),
            ("2022-2023", "Görkem Vural", "gorkem.vural@selcuk.edu.tr", "183301076", "77889900116", wpTurkcell, InternshipType.Staj1, 20, "Bulut Tabanlı Mikroservis ve API Gateway", new DateTime(2023, 8, 7), new DateTime(2023, 9, 1), "SGK-2023-4A-331007", "Müh. Burak Şen", "Bulut Altyapı Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.PartiallySuccessful, 18, "Öğrencinin 2 günlük sağlık raporu ve devamsızlığı nedeniyle 20 günden 18 günü kabul edilmiştir."),
            ("2022-2023", "Hilal Koçak", "hilal.kocak@selcuk.edu.tr", "183301087", "88990011227", wpTeknokent, InternshipType.Staj2, 20, "Mobil E-Ticaret Uygulama Geliştirme", new DateTime(2023, 7, 3), new DateTime(2023, 7, 28), "SGK-2023-4A-331008", "Müh. Serdar Keskin", "Yazılım Direktörü", "Bilgisayar Mühendisliği", AcademicResultType.Unsuccessful, 0, "Staj defterindeki teknik açıklamalar yetersiz bulunmuş ve komisyon sözlü mülakatında başarısız sayılmıştır."),

            // === 2023-2024 AKADEMİK YILI ===
            ("2023-2024", "Kemal Arslan", "kemal.arslan@selcuk.edu.tr", "193301011", "21458963210", wpAkinsoft, InternshipType.Staj1, 20, "Web Tabanlı Muhasebe ve Veritabanı Mimarileri", new DateTime(2024, 7, 1), new DateTime(2024, 7, 26), "SGK-2024-4A-883492", "Müh. Cihan Aksoy", "Kıdemli Yazılım Mühendisi", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün eksiksiz onaylandı."),
            ("2023-2024", "Derya Tunç", "derya.tunc@selcuk.edu.tr", "193301025", "32541289654", wpHavelsan, InternshipType.Staj2, 20, "Aviyonik Simülasyon ve Gerçek Zamanlı Grafik Motorları", new DateTime(2024, 7, 15), new DateTime(2024, 8, 9), "SGK-2024-4A-883493", "Dr. Selin Aksoy", "Kıdemli Sistem Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün başarılı bulunmuştur."),
            ("2023-2024", "Berk Gök", "berk.gok@selcuk.edu.tr", "193301033", "45874123658", wpTeknokent, InternshipType.Staj1, 20, "Mobil Çapraz Platform Uygulama Geliştirme", new DateTime(2024, 8, 5), new DateTime(2024, 8, 30), "SGK-2024-4A-883494", "Müh. Serdar Keskin", "Yazılım Direktörü", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "Mobil mimari ve API testleri başarıyla tamamlandı."),
            ("2023-2024", "Seda Özkan", "seda.ozkan@selcuk.edu.tr", "193301042", "56987412365", wpLogo, InternshipType.Staj2, 30, "Kurumsal ERP Entegrasyonu ve Fintek API Servisleri", new DateTime(2024, 7, 1), new DateTime(2024, 8, 9), "SGK-2024-4A-883495", "Müh. Ahmet Kaya", "Başmühendis", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 30, "30 gün tam kabul."),
            ("2023-2024", "Onur Akça", "onur.akca@selcuk.edu.tr", "193301050", "63254178965", wpTusas, InternshipType.Staj1, 20, "Otonom Uçuş Seyrüsefer Algoritmaları", new DateTime(2024, 7, 8), new DateTime(2024, 8, 2), "SGK-2024-4A-883496", "Müh. Fatih Yıldırım", "Tasarım Şefi", "Havacılık ve Yazılım Mühendisliği", AcademicResultType.Successful, 20, "20 gün tam onay."),
            ("2023-2024", "Hande Yurt", "hande.yurt@selcuk.edu.tr", "193301058", "74125896325", wpBilgem, InternshipType.Staj2, 30, "Kriptografik Protokoller ve Ağ Güvenliği Analizi", new DateTime(2024, 7, 15), new DateTime(2024, 8, 23), "SGK-2024-4A-883497", "Dr. Hakan Demir", "Kıdemli Araştırmacı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 30, "30 gün kripto protokol doğrulaması onaylandı."),
            ("2023-2024", "İbrahim Çakır", "ibrahim.cakir@selcuk.edu.tr", "193301066", "85236974123", wpRoketsan, InternshipType.Staj1, 20, "Güdüm Kontrol Birimi Gerçek Zamanlı İşletim Sistemi", new DateTime(2024, 7, 8), new DateTime(2024, 8, 2), "SGK-2024-4A-883498", "Müh. Levent Koç", "Başmühendis", "Elektrik-Elektronik Mühendisliği", AcademicResultType.Successful, 20, "20 gün güdüm algoritması testleri başarılı bulunmuştur."),
            ("2023-2024", "Jale Korkut", "jale.korkut@selcuk.edu.tr", "193301077", "96325874102", wpTelekom, InternshipType.Staj2, 20, "5G Çekirdek Şebeke ve SDN Ağ Protokolleri", new DateTime(2024, 7, 22), new DateTime(2024, 8, 16), "SGK-2024-4A-883499", "Müh. Tolga Eren", "Şebeke Mimarı", "Haberleşme Mühendisliği", AcademicResultType.Successful, 20, "20 gün telekom paket analizi başarılı bulunmuştur."),
            ("2023-2024", "Kerem Balcı", "kerem.balci@selcuk.edu.tr", "193301088", "14725836901", wpSofttech, InternshipType.Staj1, 20, "Mobil Bankacılık API ve Güvenli Ödeme Geçitleri", new DateTime(2024, 8, 5), new DateTime(2024, 8, 30), "SGK-2024-4A-883500", "Müh. Banu Tezcan", "Yazılım Müdürü", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün bankacılık entegrasyonu onaylandı."),
            ("2023-2024", "Lale Dönmez", "lale.donmez@selcuk.edu.tr", "193301099", "25836914702", wpTei, InternshipType.Staj2, 30, "Gaz Türbini Sensör Telemetrisi ve Dijital İkiz", new DateTime(2024, 7, 1), new DateTime(2024, 8, 9), "SGK-2024-4A-883501", "Dr. Murat Aydın", "Başuzman Araştırmacı", "Makine ve Bilgisayar Mühendisliği", AcademicResultType.Successful, 30, "30 gün dijital ikiz yazılım doğrulaması onaylandı."),

            // === 2024-2025 AKADEMİK YILI ===
            ("2024-2025", "Tolga Yıldız", "tolga.yildiz@selcuk.edu.tr", "203301015", "12547896320", wpAselsan, InternshipType.Staj1, 20, "Radar Sinyal İşleme ve Sayısal Filtreleme", new DateTime(2025, 7, 7), new DateTime(2025, 8, 1), "SGK-2025-4A-552101", "Müh. Selin Erdem", "Başmühendis", "Elektrik-Elektronik Mühendisliği", AcademicResultType.Successful, 20, "20 gün tam kabul."),
            ("2024-2025", "Gizem Er", "gizem.er@selcuk.edu.tr", "203301022", "23658974120", wpBaykar, InternshipType.Staj2, 30, "İHA Uçuş Kontrol ve Gerçek Zamanlı Gömülü C++", new DateTime(2025, 7, 1), new DateTime(2025, 8, 8), "SGK-2025-4A-552102", "Müh. Tarık Sezgin", "Otonom Sistemler Lideri", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 30, "30 gün otonom uçuş algoritmaları onaylandı."),
            ("2024-2025", "Furkan Şen", "furkan.sen@selcuk.edu.tr", "203301035", "34789652140", wpTurkcell, InternshipType.Staj1, 20, "Bulut Dağıtık Servisler ve Kubernetes Mimarisi", new DateTime(2025, 8, 4), new DateTime(2025, 8, 29), "SGK-2025-4A-552103", "Müh. Burak Şen", "Bulut Altyapı Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün bulut mimarisi onaylandı."),
            ("2024-2025", "Burcu Demirtaş", "burcu.demirtas@selcuk.edu.tr", "203301048", "45896321470", wpStm, InternshipType.Staj2, 20, "Denizaltı Komuta Kontrol ve Sonar Veri Arayüzü", new DateTime(2025, 7, 14), new DateTime(2025, 8, 8), "SGK-2025-4A-552104", "Müh. Kerem Acar", "Sistem Mühendisi", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün sonar arayüzü onaylandı."),
            ("2024-2025", "Barış Korkmaz", "baris.korkmaz@selcuk.edu.tr", "203301055", "56987412300", wpInnopark, InternshipType.Staj1, 20, "Endüstri 4.0 IoT Gateway ve Sensör Telemetrisi", new DateTime(2025, 7, 21), new DateTime(2025, 8, 15), "SGK-2025-4A-552105", "Müh. Ozan Çelik", "IoT Takım Lideri", "Yazılım Mühendisliği", AcademicResultType.Successful, 20, "20 gün IoT protokolleri onaylandı."),
            ("2024-2025", "Selen Aydın", "selen.aydin@selcuk.edu.tr", "203301062", "67895412360", wpAkinsoft, InternshipType.Staj2, 20, "İnsansı Robot Kinematiği ve ROS2 Haberleşmesi", new DateTime(2025, 8, 4), new DateTime(2025, 8, 29), "SGK-2025-4A-552106", "Müh. Can Demir", "Kıdemli Robotik Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün robotik yazılım onaylandı."),
            ("2024-2025", "Murat Erdem", "murat.erdem@selcuk.edu.tr", "203301073", "78912345601", wpRoketsan, InternshipType.Staj2, 30, "Anti-Tank Füze Telemetrisi ve Şifreli Haberleşme", new DateTime(2025, 7, 1), new DateTime(2025, 8, 8), "SGK-2025-4A-552107", "Müh. Onur Çetin", "Kıdemli Uzman", "Elektronik ve Haberleşme", AcademicResultType.Successful, 30, "30 gün şifreli haberleşme protokolleri onaylandı."),
            ("2024-2025", "Nazlı Hilal", "nazli.hilal@selcuk.edu.tr", "203301084", "89123456712", wpBilgem, InternshipType.Staj1, 20, "Zararlı Yazılım Analizi ve Tersine Mühendislik", new DateTime(2025, 7, 7), new DateTime(2025, 8, 1), "SGK-2025-4A-552108", "Dr. Hakan Demir", "Kıdemli Araştırmacı", "Siber Güvenlik", AcademicResultType.Successful, 20, "20 gün tersine mühendislik raporları onaylandı."),
            ("2024-2025", "Oğuzhan Keskin", "oguzhan.keskin@selcuk.edu.tr", "203301095", "91234567823", wpHavelsan, InternshipType.Staj2, 20, "C4ISR Komuta Kontrol Coğrafi Bilgi Sistemi (GIS)", new DateTime(2025, 8, 4), new DateTime(2025, 8, 29), "SGK-2025-4A-552109", "Dr. Selin Aksoy", "Kıdemli Sistem Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün CBS arayüz entegrasyonu onaylandı."),
            ("2024-2025", "Pınar Çiftçi", "pinar.ciftci@selcuk.edu.tr", "203301106", "12345678934", wpBaykar, InternshipType.Staj1, 20, "İHA Aviyonik Kablaj ve Test Yazılımları", new DateTime(2025, 7, 14), new DateTime(2025, 8, 8), "SGK-2025-4A-552110", "Müh. Tolga Eren", "Uçuş Yazılımları Lideri", "Havacılık Mühendisliği", AcademicResultType.PartiallySuccessful, 17, "Öğrencinin devamsızlık günleri düşülerek 20 günden 17 günü kabul edilmiştir."),

            // === 2025-2026 AKADEMİK YILI ===
            ("2025-2026", "Batuhan Koç", "batuhan.koc@selcuk.edu.tr", "213301012", "78965412350", wpHavelsan, InternshipType.Staj1, 20, "Sanal Taktik Eğitim ve Ciddi Oyun Mimarisi", new DateTime(2026, 7, 6), new DateTime(2026, 7, 31), "SGK-2026-4A-119801", "Dr. Selin Aksoy", "Kıdemli Sistem Mimarı", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün taktik simülatör yazılımı onaylandı."),
            ("2025-2026", "İrem Çetin", "irem.cetin@selcuk.edu.tr", "213301026", "89654123690", wpAselsan, InternshipType.Staj2, 30, "Elektronik Harp Tehdit Kütüphanesi ve Sınıflandırma", new DateTime(2026, 7, 6), new DateTime(2026, 8, 14), "SGK-2026-4A-119802", "Müh. Selin Erdem", "Başmühendis", "Elektrik-Elektronik Mühendisliği", AcademicResultType.Successful, 30, "30 gün elektronik harp kütüphanesi onaylandı."),
            ("2025-2026", "Emre Güngör", "emre.gungor@selcuk.edu.tr", "213301038", "91234567890", wpTusas, InternshipType.Staj1, 20, "Milli Muharip Uçak Aviyonik Veri Yolu Test Yazılımı", new DateTime(2026, 7, 13), new DateTime(2026, 8, 7), "SGK-2026-4A-119803", "Müh. Fatih Yıldırım", "Tasarım Şefi", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün aviyonik test yazılımı onaylandı."),
            ("2025-2026", "Melisa Karaca", "melisa.karaca@selcuk.edu.tr", "213301044", "10234567891", wpBaykar, InternshipType.Staj2, 20, "Yer Kontrol İstasyonu Video Akış ve Telemetri Kodlayıcı", new DateTime(2026, 8, 3), new DateTime(2026, 8, 28), "SGK-2026-4A-119804", "Müh. Tarık Sezgin", "Otonom Sistemler Lideri", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün video kodlayıcı mimarisi onaylandı."),
            ("2025-2026", "Volkan Eren", "volkan.eren@selcuk.edu.tr", "213301052", "21345678902", wpTeknokent, InternshipType.Staj1, 20, "Açık Kaynak LLM Modelleri ile Kod Üretim Asistanı", new DateTime(2026, 7, 20), new DateTime(2026, 8, 14), "SGK-2026-4A-119805", "Müh. Serdar Keskin", "Yazılım Direktörü", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün LLM entegrasyonu onaylandı."),
            ("2025-2026", "Zehra Yalçın", "zehra.yalcin@selcuk.edu.tr", "213301060", "32456789013", wpLogo, InternshipType.Staj2, 30, "Mikroservis Tabanlı E-Fatura ve Fintek API'leri", new DateTime(2026, 7, 6), new DateTime(2026, 8, 14), "SGK-2026-4A-119806", "Müh. Ahmet Kaya", "Başmühendis", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 30, "30 gün fintek API servisleri onaylandı."),
            ("2025-2026", "Rıza Çetin", "riza.cetin@selcuk.edu.tr", "213301071", "43567890124", wpAselsan, InternshipType.Staj1, 20, "Haberleşme Güvenliği ve IP Kripto Cihazı Testi", new DateTime(2026, 7, 6), new DateTime(2026, 7, 31), "SGK-2026-4A-119807", "Müh. Levent Koç", "Başmühendis", "Elektrik-Elektronik Mühendisliği", AcademicResultType.Successful, 20, "20 gün kripto protokol testleri onaylandı."),
            ("2025-2026", "Sinem Akın", "sinem.akin@selcuk.edu.tr", "213301082", "54678901235", wpInnopark, InternshipType.Staj2, 20, "Tarım Teknolojileri Otonom Sulama ve Görüntü İşleme", new DateTime(2026, 7, 20), new DateTime(2026, 8, 14), "SGK-2026-4A-119808", "Müh. Ozan Çelik", "IoT Takım Lideri", "Yazılım Mühendisliği", AcademicResultType.Successful, 20, "20 gün görüntü işleme ve yapay zeka onaylandı."),
            ("2025-2026", "Tarık Buğra", "tarik.bugra@selcuk.edu.tr", "213301093", "65789012346", wpAkinsoft, InternshipType.Staj1, 20, "Çok Katmanlı ERP Veritabanı ve Yük Dengeleme", new DateTime(2026, 8, 3), new DateTime(2026, 8, 28), "SGK-2026-4A-119809", "Müh. Cihan Aksoy", "Kıdemli Yazılım Mühendisi", "Bilgisayar Mühendisliği", AcademicResultType.Successful, 20, "20 gün veritabanı optimizasyonu onaylandı."),
            ("2025-2026", "Umut Karahan", "umut.karahan@selcuk.edu.tr", "213301104", "76890123457", wpLogo, InternshipType.Staj2, 30, "Kurumsal Depo Otomasyonu ve Barkod Servisleri", new DateTime(2026, 7, 6), new DateTime(2026, 8, 14), "SGK-2026-4A-119810", "Müh. Orhan Veli", "Veritabanı Yöneticisi", "Bilgisayar Mühendisliği", AcademicResultType.Unsuccessful, 0, "Staj defteri teslim edilmemiş ve mazeret bildirilmemiştir.")
        };

        foreach (var item in archiveData)
        {
            var period = await context.InternshipPeriods
                .Include(p => p.AcademicYear)
                .FirstOrDefaultAsync(p => p.AcademicYear != null && p.AcademicYear.Title == item.YearTitle && p.Type == item.Type);

            if (period == null) continue;

            var user = await context.Users
                .Include(u => u.StudentProfile)
                .FirstOrDefaultAsync(u => u.Email == item.StudentEmail);

            if (user == null)
            {
                user = new User
                {
                    Email = item.StudentEmail,
                    PasswordHash = hash,
                    FullName = item.StudentName,
                    PhoneNumber = "0555 000 0000",
                    Role = UserRole.Student,
                    IsActive = true,
                    StudentProfile = new StudentProfile
                    {
                        StudentNumber = item.StudentNo,
                        NationalId = item.TcNo,
                        Faculty = "Teknoloji Fakültesi",
                        Department = "Bilgisayar Mühendisliği",
                        ClassLevel = 4,
                        Address = "Selçuklu / Konya",
                        HasAcceptedGuide = true
                    }
                };
                context.Users.Add(user);
                await context.SaveChangesAsync();
            }

            var existingApp = await context.InternshipApplications
                .Include(a => a.Diary).ThenInclude(d => d!.Entries)
                .FirstOrDefaultAsync(a => a.StudentId == user.Id && a.PeriodId == period.Id);

            if (existingApp == null)
            {
                var diaryEntries = GenerateArchiveDiaryEntries(item.StartDate, item.WorkDays, item.Subject);

                var app = new InternshipApplication
                {
                    StudentId = user.Id,
                    Student = user,
                    PeriodId = period.Id,
                    Period = period,
                    WorkplaceId = item.Wp.Id,
                    Workplace = item.Wp,
                    Type = item.Type,
                    Subject = item.Subject,
                    RequiredWorkDays = item.WorkDays,
                    IncludesSaturday = false,
                    StartDate = item.StartDate,
                    CalculatedEndDate = item.EndDate,
                    CurrentEndDate = item.EndDate,
                    Status = ApplicationStatus.Completed,
                    CommissionDecision = item.Result == AcademicResultType.Unsuccessful ? CommissionDecisionType.Rejected : CommissionDecisionType.Approved,
                    AcademicResult = item.Result,
                    AcceptedDaysCount = item.AcceptedDays,
                    AcademicNotes = item.CommissionNote,
                    CommissionDecisionDate = item.EndDate.AddDays(15),
                    CreatedAt = item.StartDate.AddMonths(-2),
                    Advisor = new WorkplaceAdvisor
                    {
                        FullName = item.AdvisorName,
                        Email = $"advisor_{item.StudentNo}@kurum.com.tr",
                        PhoneNumber = "0532 000 0000",
                        GraduatedUniversityAndDepartment = item.AdvisorDept,
                        TitleOrPosition = item.AdvisorTitle,
                        HasApprovedDiary = item.Result != AcademicResultType.Unsuccessful,
                        ApprovedAt = item.Result != AcademicResultType.Unsuccessful ? item.EndDate.AddDays(2) : null,
                        ApprovedIpAddress = "195.175.25.10"
                    },
                    InsuranceRecord = new InsuranceRecord
                    {
                        Status = InsuranceStatus.Started,
                        SgkEntryDate = item.StartDate,
                        SgkExitDate = item.EndDate,
                        SgkDocumentRegistrationNo = item.SgkNo,
                        ProcessedAt = item.StartDate.AddDays(-5)
                    },
                    Diary = new InternshipDiary
                    {
                        IsSubmittedToAdvisor = item.Result != AcademicResultType.Unsuccessful,
                        SubmittedAt = item.Result != AcademicResultType.Unsuccessful ? item.EndDate.AddDays(1) : null,
                        IsApprovedByAdvisor = item.Result != AcademicResultType.Unsuccessful,
                        ApprovedAt = item.Result != AcademicResultType.Unsuccessful ? item.EndDate.AddDays(2) : null,
                        TotalEmployees = "250+",
                        Entries = diaryEntries
                    }
                };

                context.InternshipApplications.Add(app);
            }
            else if (existingApp.Diary != null && existingApp.Diary.Entries.Count == 0 && item.Result != AcademicResultType.Unsuccessful)
            {
                var entries = GenerateArchiveDiaryEntries(item.StartDate, item.WorkDays, item.Subject);
                foreach (var entry in entries)
                {
                    existingApp.Diary.Entries.Add(entry);
                }
            }
        }

        await context.SaveChangesAsync();
    }

    private static List<DiaryEntry> GenerateArchiveDiaryEntries(DateTime startDate, int totalDays, string subject)
    {
        var entries = new List<DiaryEntry>();
        var cur = startDate;
        int dayNo = 1;

        string[] defenseTopics = new string[]
        {
            "Kurumsal oryantasyon, iş güvenliği ve savunma sanayii gizlilik protokolleri eğitimi",
            "Geliştirme ortamı kurulumu, Linux/RTOS yapılandırması ve Git repo klonlama",
            "Sistem mimarisi analizi ve veri akış diyagramlarının (DFD) incelenmesi",
            "Gerçek zamanlı sinyal işleme kütüphaneleri ve donanım arayüzleri incelemesi",
            "C++17 ve CMake derleme ortamı entegrasyonu, birim test çerçevesi kurulumu",
            "Sensör telemetri veri ayrıştırma (decoding) modülünün geliştirilmesi",
            "Haberleşme protokolleri (CAN-bus, MIL-STD-1553, UDP/IP) paket formatı tasarımı",
            "Paket alma ve tampon belleğe (buffer) yazma fonksiyonlarının kodlanması",
            "Veri doğrulama, CRC kontrolü ve hata ayıklama rutinlerinin yazılması",
            "Hata loglama ve durum bildirim mekanizmalarının entegrasyonu",
            "Alt modül simülatörü ile haberleşme hattının doğrulanması",
            "Thread havuzu ve eşzamanlı (concurrency) veri işleme optimizasyonu",
            "Gerçek zamanlı gecikme (latency) testleri ve performans profil çıkarma (profiling)",
            "Bellek sızıntısı (leak) analizleri - Valgrind ve AddressSanitizer araçları",
            "Donanım simülatörü üzerinde HIL (Hardware-in-the-Loop) test senaryoları",
            "Sistem güvenlik gereksinimleri ve MISRA-C/C++ uyumluluk denetimleri",
            "Uçuş/Görev yönetim arayüzü ile veri görselleştirme köprüsünün yazılması",
            "Entegrasyon testleri, regresyon testleri ve hata loglarının incelenmesi",
            "Kod inceleme (Code Review) süreci, dökümantasyon ve Doxygen üretimleri",
            "Staj sonu teknik sunumu, teslim tutanağının hazırlanması ve staj kapanışı",
            "Genişletilmiş telemetri filtreleme algoritmalarının matematiksel modellemesi",
            "Gerçek zamanlı uçuş kayıtlarının (Flight Data Recorder) veri tabanı şeması",
            "Aviyonik veri yolu simülasyon araçları ile yük testlerinin icra edilmesi",
            "Yedekli (redundant) mikrodenetleyici mimarisi ve failover mekanizmaları",
            "Sayısal sinyal işleme (DSP) algoritmalarının FFT hızlandırma analizleri",
            "MIL-STD-810 çevre koşulları test verilerinin analiz yazılımı",
            "Uçtan uca şifreleme ve kriptografik anahtar yönetim protokolleri",
            "Sistem kalibrasyon ve sensör ofset telafi algoritmalarının kodlanması",
            "Komisyon ve danışman değerlendirme raporlarının tanzimi",
            "Nihai savunma sanayii staj raporunun teslimi ve yönerge doğrulaması"
        };

        string[] generalTopics = new string[]
        {
            "Şirket içi oryantasyon, geliştirme ekibiyle tanışma ve çalışma takvimi planlaması",
            "Geliştirme ortamı (.NET / Node.js / Docker) ve IDE araçlarının kurulumu",
            "Kurumsal yazılım mimarisi, Clean Architecture ve mikroservis yapısının incelenmesi",
            "PostgreSQL / SQL Server veritabanı şemasının ve ilişkisel modellerin analizi",
            "Git akışı, branch stratejisi ve CI/CD pipeline süreçlerinin öğrenilmesi",
            "RESTful Web API controller uç noktalarının ve DTO yapılarının tasarlanması",
            "Entity Framework Core migrationlarının oluşturulması ve indeksleme optimizasyonu",
            "İş katmanı (Business Layer) servis ve validasyon kurallarının (FluentValidation) yazılması",
            "JWT tabanlı kimlik doğrulama ve rol bazlı yetkilendirme (RBAC) servisinin yazılması",
            "Önbellekleme mimarisi (Redis Cache) entegrasyonu ve performans optimizasyonu",
            "Frontend (React & TypeScript) arayüz bileşenlerinin tasarlanması",
            "Tailwind CSS ile responsive dashboard ve veri tablolarının oluşturulması",
            "Axios / Fetch ile API servislerinin frontend arayüzüne bağlanması",
            "Global state yönetimi (Context API / Redux) ve form validasyonlarının yapılması",
            "Unit testler (xUnit / Moq) ve entegrasyon testlerinin yazılması",
            "Hata yakalama (Exception Middleware) ve yapılandırılmış loglama (Serilog) kurulumu",
            "Docker Compose ile konteynerizasyon ve yerel sunucu ortamında ayağa kaldırma",
            "Son kullanıcı kabul testleri (UAT) ve regresyon senaryolarının koşturulması",
            "Yazılım teknik dokümantasyonu, API swagger rehberinin tamamlanması",
            "Staj defteri kapanış değerlendirmesi, amir değerlendirme formu ve staj sunumu",
            "Mikroservisler arası asenkron mesajlaşma (RabbitMQ / Kafka) entegrasyonu",
            "Elasticsearch ve Kibana ile merkezi log izleme altyapısının kurulması",
            "Grafana ve Prometheus ile servis metriklerinin görselleştirilmesi",
            "Veritabanı transaction yönetimi ve Unit of Work örüntüsünün optimizasyonu",
            "Güvenlik zafiyet taramaları (OWASP ZAP) ve kod kalitesi (SonarQube) analizleri",
            "S3 uyumlu nesne depolama (MinIO) servisi ve evrak yükleme modülü",
            "Mobil duyarlı (responsive) UI/UX iyileştirmeleri ve erişilebilirlik testleri",
            "Kritik API uç noktaları için yük testleri (JMeter / k6) ve darboğaz analizi",
            "Teknik borç (Technical Debt) temizliği, refactoring ve kod dokümantasyonu",
            "Staj defteri nihai kontrolü, onay formlarının imzalanması ve staj vedası"
        };

        var topics = (subject.Contains("Radar") || subject.Contains("Aviyonik") || subject.Contains("Savunma") || subject.Contains("İHA") || subject.Contains("Füze") || subject.Contains("Sonar"))
            ? defenseTopics
            : generalTopics;

        while (dayNo <= totalDays)
        {
            if (cur.DayOfWeek == DayOfWeek.Sunday)
            {
                cur = cur.AddDays(1);
                continue;
            }

            string title = topics[(dayNo - 1) % topics.Length];
            entries.Add(new DiaryEntry
            {
                DayNumber = dayNo,
                EntryDate = cur,
                Title = $"{dayNo}. Gün: {title}",
                Content = $"Bugün {cur:dd.MM.yyyy} tarihinde sorumlu mühendis gözetiminde '{title}' konusu üzerinde çalışmalar yürütüldü. Yapılan analizler, teknik şemalar ve yazılım uygulamaları şirket yönergelerine uygun olarak gerçekleştirildi.",
                IsDraft = false,
                CreatedAt = cur.AddHours(17),
                UpdatedAt = cur.AddHours(18)
            });

            dayNo++;
            cur = cur.AddDays(1);
        }

        return entries;
    }

    private static async Task SeedJobPostingsAsync(AppDbContext context)
    {
        if (!await context.CompanyJobPostings.AnyAsync(p => p.Department == "Makine Mühendisliği" && p.CompanyName.Contains("TÜMOSAN")))
        {
            context.CompanyJobPostings.Add(new CompanyJobPosting
            {
                CompanyName = "TÜMOSAN Motor ve Traktör Sanayii A.Ş.",
                Department = "Makine Mühendisliği",
                Title = "Güç Aktarma & Dizel Motor Tasarım Stajyeri",
                Sector = "Otomotiv / İmalat",
                City = "Konya",
                Quota = 4,
                Requirements = "SolidWorks, Sonlu Elemanlar Analizi (FEA) ve termodinamik temelleri.",
                ContactEmail = "ik@tumosan.com.tr",
                ApplicationDeadline = DateTime.UtcNow.AddMonths(2),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!await context.CompanyJobPostings.AnyAsync(p => p.Department == "Elektrik-Elektronik Mühendisliği" && p.CompanyName.Contains("ASELSAN")))
        {
            context.CompanyJobPostings.Add(new CompanyJobPosting
            {
                CompanyName = "ASELSAN Elektronik Sanayi A.Ş.",
                Department = "Elektrik-Elektronik Mühendisliği",
                Title = "Radar Sistemleri & Sayısal Donanım Stajyeri",
                Sector = "Savunma Sanayi",
                City = "Ankara",
                Quota = 5,
                Requirements = "FPGA, mikrodenetleyiciler, RF devreleri ve Altium Designer deneyimi.",
                ContactEmail = "staj@aselsan.com.tr",
                ApplicationDeadline = DateTime.UtcNow.AddMonths(2),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (await context.CompanyJobPostings.AnyAsync())
        {
            await context.SaveChangesAsync();
            return;
        }

        var postings = new List<CompanyJobPosting>
        {
            new()
            {
                CompanyName = "ASELSAN Elektronik Sanayi",
                Department = "Bilgisayar Mühendisliği",
                Title = "Yazılım & Gömülü Sistemler Stajyeri",
                Sector = "Savunma Sanayi",
                City = "Ankara",
                Quota = 5,
                Requirements = "C/C++, Linux, Veri Yapıları bilgisi. 3. veya 4. sınıf öğrencisi olmak.",
                ContactEmail = "staj@aselsan.com.tr",
                ApplicationDeadline = DateTime.UtcNow.AddMonths(2),
                IsActive = true
            },
            new()
            {
                CompanyName = "HAVELSAN A.Ş.",
                Department = "Bilgisayar Mühendisliği",
                Title = "Simülasyon & Yapay Zeka Stajyeri",
                Sector = "Yazılım / Bilişim",
                City = "Ankara",
                Quota = 4,
                Requirements = "Python, PyTorch veya C#/.NET bilgisi. Git versiyon kontrol deneyimi.",
                ContactEmail = "staj@havelsan.com.tr",
                ApplicationDeadline = DateTime.UtcNow.AddMonths(1),
                IsActive = true
            },
            new()
            {
                CompanyName = "AKINSOFT Robotik Teknolojileri",
                Department = "Bilgisayar Mühendisliği",
                Title = "Web & Mobil Uygulama Geliştirme Stajyeri",
                Sector = "Yazılım / Bilişim",
                City = "Konya",
                Quota = 6,
                Requirements = "React, C# ASP.NET Core veya Flutter tecrübesi olan adaylar.",
                ContactEmail = "ik@akinsoft.com.tr",
                ApplicationDeadline = DateTime.UtcNow.AddMonths(3),
                IsActive = true
            },
            new()
            {
                CompanyName = "BAYKAR Savunma ve Havacılık",
                Department = "Makine Mühendisliği",
                Title = "İHA Mekanik Tasarım & Aviyonik Stajyeri",
                Sector = "Havacılık / Uzay",
                City = "İstanbul",
                Quota = 4,
                Requirements = "SolidWorks, CATIA ve mekanik üretim teknikleri bilgisi.",
                ContactEmail = "ik@baykartech.com",
                ApplicationDeadline = DateTime.UtcNow.AddMonths(2),
                IsActive = true
            },
            new()
            {
                CompanyName = "TÜBİTAK BİLGEM",
                Department = "Elektrik-Elektronik Mühendisliği",
                Title = "Donanım Tasarımı & FPGA Stajyeri",
                Sector = "Ar-Ge / Kriptoloji",
                City = "Kocaeli / Gebze",
                Quota = 3,
                Requirements = "VHDL/Verilog, dijital devre tasarımı ve sinyal işleme temelleri.",
                ContactEmail = "bilgem.staj@tubitak.gov.tr",
                ApplicationDeadline = DateTime.UtcNow.AddMonths(2),
                IsActive = true
            }
        };

        await context.CompanyJobPostings.AddRangeAsync(postings);
        await context.SaveChangesAsync();
    }
}
