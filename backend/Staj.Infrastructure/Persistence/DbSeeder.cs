using Microsoft.EntityFrameworkCore;
using Staj.Application.Common;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Infrastructure.Persistence;

/// <summary>
/// Uygulama ilk kez ayağa kalktığında veritabanı şemasını oluşturur ve sunum/test için hazır başlangıç verilerini yükler:
/// <list type="bullet">
/// <item>5 rol için test kullanıcıları (Ahmet öğrenci, Komisyon, Bölüm Başkanı, KPTO, örnek Şirket Danışmanı)</item>
/// <item>2026 ve 2027 Türkiye resmi tatilleri (15 Temmuz, bayramlar vb.)</item>
/// <item>Açık Staj 1 ve Staj 2 dönemleri</item>
/// <item>Firma havuzu ve örnek stajyer ilanları</item>
/// </list>
/// </summary>
public static class DbSeeder
{
    /// <summary>
    /// Veritabanını hazırlar ve başlangıç verilerini ekler.
    /// </summary>
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher)
    {
        await db.Database.EnsureCreatedAsync();

        if (db.Database.IsNpgsql())
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS \"IX_LogbookEntries_InternshipId_Date\";");
                await db.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS \"IX_LogbookEntries_InternshipId_Date\" ON \"LogbookEntries\" (\"InternshipId\", \"Date\");");
                await db.Database.ExecuteSqlRawAsync("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'Announcements' AND column_name = 'IsActive' AND data_type = 'integer'
                        ) THEN
                            DROP TABLE "Announcements";
                        END IF;
                    END $$;
                    CREATE TABLE IF NOT EXISTS "Announcements" (
                        "Id" uuid NOT NULL CONSTRAINT "PK_Announcements" PRIMARY KEY,
                        "Title" text NOT NULL,
                        "Content" text NOT NULL,
                        "Category" text NOT NULL,
                        "IsPinned" boolean NOT NULL DEFAULT FALSE,
                        "IsActive" boolean NOT NULL DEFAULT TRUE,
                        "CreatedById" uuid NULL,
                        "CreatedAt" timestamp with time zone NOT NULL
                    );
                    """);

                await db.Database.ExecuteSqlRawAsync("""
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "WorksOnSaturday" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "LogbookSubmittedToAdvisorAt" timestamp with time zone NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "LogbookRevisionRequested" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "LogbookRevisionNote" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AdvisorEmailSentAt" timestamp with time zone NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AdvisorEmailStatus" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AdvisorLastLoginAt" timestamp with time zone NULL;
                    DO $$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Internships' AND column_name = 'WorksOnSaturday' AND data_type = 'integer') THEN
                            ALTER TABLE "Internships" ALTER COLUMN "WorksOnSaturday" DROP DEFAULT;
                            ALTER TABLE "Internships" ALTER COLUMN "WorksOnSaturday" TYPE boolean USING ("WorksOnSaturday" <> 0);
                            ALTER TABLE "Internships" ALTER COLUMN "WorksOnSaturday" SET DEFAULT FALSE;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Internships' AND column_name = 'LogbookRevisionRequested' AND data_type = 'integer') THEN
                            ALTER TABLE "Internships" ALTER COLUMN "LogbookRevisionRequested" DROP DEFAULT;
                            ALTER TABLE "Internships" ALTER COLUMN "LogbookRevisionRequested" TYPE boolean USING ("LogbookRevisionRequested" <> 0);
                            ALTER TABLE "Internships" ALTER COLUMN "LogbookRevisionRequested" SET DEFAULT FALSE;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Internships' AND column_name = 'LogbookSubmittedToAdvisorAt' AND data_type = 'text') THEN
                            ALTER TABLE "Internships" ALTER COLUMN "LogbookSubmittedToAdvisorAt" TYPE timestamp with time zone USING NULLIF("LogbookSubmittedToAdvisorAt", '')::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Internships' AND column_name = 'AdvisorEmailSentAt' AND data_type = 'text') THEN
                            ALTER TABLE "Internships" ALTER COLUMN "AdvisorEmailSentAt" TYPE timestamp with time zone USING NULLIF("AdvisorEmailSentAt", '')::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Internships' AND column_name = 'AdvisorLastLoginAt' AND data_type = 'text') THEN
                            ALTER TABLE "Internships" ALTER COLUMN "AdvisorLastLoginAt" TYPE timestamp with time zone USING NULLIF("AdvisorLastLoginAt", '')::timestamptz;
                        END IF;
                    END $$;
                    """);
            }
            catch
            {
                // Yoksay
            }
        }
        else
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync("DROP INDEX IF EXISTS \"IX_LogbookEntries_InternshipId_Date\";");
                await db.Database.ExecuteSqlRawAsync("CREATE INDEX IF NOT EXISTS \"IX_LogbookEntries_InternshipId_Date\" ON \"LogbookEntries\" (\"InternshipId\", \"Date\");");
                await db.Database.ExecuteSqlRawAsync("""
                    CREATE TABLE IF NOT EXISTS "Announcements" (
                        "Id" TEXT NOT NULL CONSTRAINT "PK_Announcements" PRIMARY KEY,
                        "Title" TEXT NOT NULL,
                        "Content" TEXT NOT NULL,
                        "Category" TEXT NOT NULL,
                        "IsPinned" INTEGER NOT NULL DEFAULT 0,
                        "IsActive" INTEGER NOT NULL DEFAULT 1,
                        "CreatedById" TEXT NULL,
                        "CreatedAt" TEXT NOT NULL
                    );
                    """);
            }
            catch
            {
                // SQLite veya farklı sağlayıcıda hata verirse yoksay
            }

            string[] alterColumns =
            {
                "ALTER TABLE \"Internships\" ADD COLUMN \"WorksOnSaturday\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"LogbookSubmittedToAdvisorAt\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"LogbookRevisionRequested\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"LogbookRevisionNote\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AdvisorEmailSentAt\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AdvisorEmailStatus\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AdvisorLastLoginAt\" TEXT NULL;"
            };
            foreach (var sql in alterColumns)
            {
                try { await db.Database.ExecuteSqlRawAsync(sql); }
                catch { /* Sütun zaten varsa yoksay */ }
            }
        }

        if (!await db.Users.AnyAsync(u => u.Email == "233311056@ogr.selcuk.edu.tr"))
        {
            var existingAhmet = await db.Users.FirstOrDefaultAsync(u => u.Email == "ahmet@ogr.selcuk.edu.tr");
            if (existingAhmet is not null)
            {
                existingAhmet.Email = "233311056@ogr.selcuk.edu.tr";
                existingAhmet.StudentNo = "233311056";
                await db.SaveChangesAsync();
            }
        }

        if (!await db.Users.AnyAsync())
        {
            var pw = hasher.Hash("123456");

            var company1 = new Company
            {
                Name = "Aselsan Konya Silah Sistemleri A.Ş.",
                Sector = "Savunma Sanayi",
                City = "Konya",
                Address = "Konya Teknoloji Endüstri Bölgesi, Selçuklu / Konya",
                Phone = "0332 502 00 00",
                Email = "ik@aselsankonya.com.tr",
                IsVerified = true
            };
            var company2 = new Company
            {
                Name = "Havelsan Hava Elektronik Sanayi A.Ş.",
                Sector = "Yazılım ve Siber Güvenlik",
                City = "Ankara",
                Address = "Mustafa Kemal Mah. 2120 Cad. No:39 Çankaya / Ankara",
                Phone = "0312 219 57 87",
                Email = "staj@havelsan.com.tr",
                IsVerified = true
            };
            var company3 = new Company
            {
                Name = "Innova Bilişim Çözümleri A.Ş.",
                Sector = "Bilişim / FinTech",
                City = "İstanbul",
                Address = "İTÜ Ayazağa Kampüsü Teknokent, Maslak / İstanbul",
                Phone = "0212 329 70 00",
                Email = "kariyer@innova.com.tr",
                IsVerified = true
            };
            var company4 = new Company
            {
                Name = "Konya Teknokent Yazılım A.Ş.",
                Sector = "Kurumsal Yazılım",
                City = "Konya",
                Address = "Selçuk Üniversitesi Alaeddin Keykubat Kampüsü Teknokent, Selçuklu / Konya",
                Phone = "0332 241 05 00",
                Email = "staj@konyateknokent.com.tr",
                IsVerified = true
            };
            db.Companies.AddRange(company1, company2, company3, company4);

            var head = new User
            {
                Email = "bolumbaskani@selcuk.edu.tr",
                PasswordHash = pw,
                FullName = "Prof. Dr. Mehmet Yılmaz",
                Department = "Bilgisayar Mühendisliği",
                Phone = "0332 223 10 01",
                Role = UserRole.DepartmentHead,
                HasAcceptedGuide = true
            };
            var committee = new User
            {
                Email = "komisyon@selcuk.edu.tr",
                PasswordHash = pw,
                FullName = "Doç. Dr. Ayşe Kaya",
                Department = "Bilgisayar Mühendisliği",
                Phone = "0332 223 10 02",
                Role = UserRole.CommitteeMember,
                HasAcceptedGuide = true
            };
            var kpto = new User
            {
                Email = "kpto@selcuk.edu.tr",
                PasswordHash = pw,
                FullName = "Mustafa Demir (KPTO Sigorta)",
                Department = "Kariyer Planlama ve Sigorta Birimi",
                Phone = "0332 223 10 50",
                Role = UserRole.KptoOfficer,
                HasAcceptedGuide = true
            };
            var advisor = new User
            {
                Email = "danisman@aselsankonya.com.tr",
                PasswordHash = pw,
                FullName = "Yük. Müh. Burak Çelik",
                Phone = "0532 100 20 30",
                Role = UserRole.CompanyAdvisor,
                Company = company1,
                HasAcceptedGuide = true
            };
            var ahmet = new User
            {
                Email = "233311056@ogr.selcuk.edu.tr",
                PasswordHash = pw,
                FullName = "Ahmet Özkan",
                StudentNo = "233311056",
                NationalId = "12345678901",
                Department = "Bilgisayar Mühendisliği",
                Phone = "0555 111 22 33",
                Role = UserRole.Student,
                HasAcceptedGuide = false // İlk girişte Staj Kılavuzu karşılama ekranı görsün
            };
            var zeynep = new User
            {
                Email = "zeynep@ogr.selcuk.edu.tr",
                PasswordHash = pw,
                FullName = "Zeynep Arslan",
                StudentNo = "221213015",
                NationalId = "10987654321",
                Department = "Bilgisayar Mühendisliği",
                Phone = "0555 444 55 66",
                Role = UserRole.Student,
                HasAcceptedGuide = true
            };

            db.Users.AddRange(head, committee, kpto, advisor, ahmet, zeynep);

            db.CompanyListings.AddRange(
                new CompanyListing
                {
                    Company = company1,
                    CompanyName = company1.Name,
                    Title = "Gömülü Sistemler ve C++ Yaz Stajyeri (Staj 1 / Staj 2)",
                    Description = "Savunma sanayi projelerinde RTOS, C/C++ ve mikrodenetleyici geliştirme süreçlerinde görev alacak 3. veya 4. sınıf Bilgisayar Mühendisliği öğrencileri aranmaktadır. Servis ve öğle yemeği imkanı mevcuttur.",
                    Contact = "ik@aselsankonya.com.tr",
                    City = "Konya",
                    Deadline = new DateOnly(2027, 6, 15),
                    IsActive = true,
                    CreatedById = committee.Id
                },
                new CompanyListing
                {
                    Company = company4,
                    CompanyName = company4.Name,
                    Title = "Full-Stack (.NET Core & React) Stajyeri",
                    Description = "Kampüs içi Teknokent ofisimizde kurumsal web projelerinde ASP.NET Core Web API, PostgreSQL ve React/TypeScript teknolojileriyle çalışacak stajyer arıyoruz. Stajyer maaşı ödenmektedir.",
                    Contact = "staj@konyateknokent.com.tr",
                    City = "Konya",
                    Deadline = new DateOnly(2027, 6, 20),
                    IsActive = true,
                    CreatedById = committee.Id
                },
                new CompanyListing
                {
                    Company = company2,
                    CompanyName = company2.Name,
                    Title = "Siber Güvenlik ve Ağ Teknolojileri Staj Programı",
                    Description = "Ağ güvenliği, sızma testi ve SIEM operasyonları alanında yaz dönemi stajyer programı.",
                    Contact = "staj@havelsan.com.tr",
                    City = "Ankara",
                    Deadline = new DateOnly(2027, 5, 30),
                    IsActive = true,
                    CreatedById = head.Id
                });
        }

        if (!await db.Holidays.AnyAsync())
        {
            var holidays = new (DateOnly Date, string Name)[]
            {
                // 2026 Resmi Tatilleri
                (new(2026, 1, 1), "Yılbaşı"),
                (new(2026, 3, 20), "Ramazan Bayramı 1. Gün"),
                (new(2026, 3, 21), "Ramazan Bayramı 2. Gün"),
                (new(2026, 3, 22), "Ramazan Bayramı 3. Gün"),
                (new(2026, 4, 23), "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"),
                (new(2026, 5, 1), "1 Mayıs Emek ve Dayanışma Günü"),
                (new(2026, 5, 19), "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı"),
                (new(2026, 5, 27), "Kurban Bayramı 1. Gün"),
                (new(2026, 5, 28), "Kurban Bayramı 2. Gün"),
                (new(2026, 5, 29), "Kurban Bayramı 3. Gün"),
                (new(2026, 5, 30), "Kurban Bayramı 4. Gün"),
                (new(2026, 7, 15), "15 Temmuz Demokrasi ve Milli Birlik Günü"),
                (new(2026, 8, 30), "30 Ağustos Zafer Bayramı"),
                (new(2026, 10, 29), "29 Ekim Cumhuriyet Bayramı"),
                // 2027 Resmi Tatilleri
                (new(2027, 1, 1), "Yılbaşı"),
                (new(2027, 3, 9), "Ramazan Bayramı 1. Gün"),
                (new(2027, 3, 10), "Ramazan Bayramı 2. Gün"),
                (new(2027, 3, 11), "Ramazan Bayramı 3. Gün"),
                (new(2027, 4, 23), "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"),
                (new(2027, 5, 1), "1 Mayıs Emek ve Dayanışma Günü"),
                (new(2027, 5, 16), "Kurban Bayramı 1. Gün"),
                (new(2027, 5, 17), "Kurban Bayramı 2. Gün"),
                (new(2027, 5, 18), "Kurban Bayramı 3. Gün"),
                (new(2027, 5, 19), "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı / Kurban Bayramı 4. Gün"),
                (new(2027, 7, 15), "15 Temmuz Demokrasi ve Milli Birlik Günü"),
                (new(2027, 8, 30), "30 Ağustos Zafer Bayramı"),
                (new(2027, 10, 29), "29 Ekim Cumhuriyet Bayramı")
            };
            foreach (var h in holidays)
                db.Holidays.Add(new Holiday { Date = h.Date, Name = h.Name });
        }

        if (!await db.Terms.AnyAsync())
        {
            db.Terms.AddRange(
                new Term
                {
                    Name = "2026-2027 Yaz Stajı - Staj 1",
                    AcademicYear = "2026",
                    InternshipType = InternshipType.Staj1,
                    EarliestStartDate = new DateOnly(2026, 6, 15),
                    LatestEndDate = new DateOnly(2027, 9, 30),
                    ApplicationDeadline = new DateOnly(2027, 9, 1),
                    ReportDeadline = new DateOnly(2027, 10, 30),
                    MinWorkDays = 20,
                    MaxWorkDays = 30,
                    IsActive = true
                },
                new Term
                {
                    Name = "2026-2027 Yaz Stajı - Staj 2",
                    AcademicYear = "2026",
                    InternshipType = InternshipType.Staj2,
                    EarliestStartDate = new DateOnly(2026, 6, 15),
                    LatestEndDate = new DateOnly(2027, 9, 30),
                    ApplicationDeadline = new DateOnly(2027, 9, 1),
                    ReportDeadline = new DateOnly(2027, 10, 30),
                    MinWorkDays = 20,
                    MaxWorkDays = 30,
                    IsActive = true
                });
        }

        if (!await db.Announcements.AnyAsync())
        {
            db.Announcements.AddRange(
                new Announcement
                {
                    Title = "📅 2026-2027 Akademik Yılı Yaz Dönemi Staj Başvuru ve Başlama Takvimi",
                    Content = "Staj 1 ve Staj 2 başvuruları başlamıştır. Son Başvuru Tarihi: 01.09.2027 | En Erken Staj Başlama: 15.06.2026 | En Geç Staj Bitiş: 30.09.2027 | Staj Defteri ve Rapor Teslim Son Tarihi: 30.10.2027. Öğrencilerimizin staj başlangıç tarihinden en az 10 gün önce ıslak imzalı Form 2 ve SPAS Müstehaklık belgelerini sisteme yükleyerek Komisyon onayına göndermeleri zorunludur.",
                    Category = "Calendar",
                    IsPinned = true,
                    IsActive = true
                },
                new Announcement
                {
                    Title = "📌 Staj Defteri Doldurma, Sorumlu Mühendis Onayı ve Zorunlu Belgeler Hakkında",
                    Content = "Staj süresince her iş günü Sanal Staj Defteri (Word Rapor Sayfası formatında) eksiksiz doldurulmalıdır. Tüm iş günleri (20/20 veya 30/30) tamamlanmadan defter sorumlu mühendise gönderilemez ve onaylanamaz. Staj bitiminde Kapak + Rapor sayfalarını tek PDF olarak indirebilirsiniz.",
                    Category = "General",
                    IsPinned = true,
                    IsActive = true
                },
                new Announcement
                {
                    Title = "📢 Stajyer Arayan Firma İlanı: Aselsan Konya Silah Sistemleri A.Ş. — Gömülü Sistemler ve C++ Yaz Stajyeri",
                    Content = "Savunma sanayi projelerinde RTOS, C/C++ ve mikrodenetleyici geliştirme süreçlerinde görev alacak 3. veya 4. sınıf Bilgisayar Mühendisliği öğrencileri aranmaktadır. (Son Başvuru: 15.06.2027) • İletişim: ik@aselsankonya.com.tr",
                    Category = "CompanyListing",
                    IsPinned = false,
                    IsActive = true
                },
                new Announcement
                {
                    Title = "📢 Stajyer Arayan Firma İlanı: Konya Teknokent Yazılım A.Ş. — Full-Stack (.NET Core & React) Stajyeri",
                    Content = "Kampüs içi Teknokent ofisimizde kurumsal web projelerinde ASP.NET Core Web API, PostgreSQL ve React/TypeScript teknolojileriyle çalışacak stajyer arıyoruz. (Son Başvuru: 20.06.2027) • İletişim: staj@konyateknokent.com.tr",
                    Category = "CompanyListing",
                    IsPinned = false,
                    IsActive = true
                });
        }

        await db.SaveChangesAsync();

        // 2025 (10 öğrenci) ve 2026 (10 öğrenci) Yıllık Arşiv Kayıtlarını Oluştur
        await SeedArchiveRecordsAsync(db, hasher);
    }

    /// <summary>
    /// 2025 yılı için 10 öğrenci ve 2026 yılı için 10 öğrenci olmak üzere toplam 20 adet tamamlanmış (Passed & IsArchived)
    /// yıllık arşiv staj kaydını (ve örnek sanal defter sayfalarını) oluşturur.
    /// </summary>
    public static async Task SeedArchiveRecordsAsync(AppDbContext db, IPasswordHasher hasher)
    {
        var count2025 = await db.Internships.CountAsync(i => i.IsArchived && i.ArchiveYear == "2025");
        var count2026 = await db.Internships.CountAsync(i => i.IsArchived && i.ArchiveYear == "2026");
        if (count2025 >= 10 && count2026 >= 10) return;

        var companies = await db.Companies.ToListAsync();
        if (companies.Count == 0) return;

        var terms = await db.Terms.ToListAsync();
        if (terms.Count == 0) return;
        var staj1Term = terms.FirstOrDefault(t => t.InternshipType == InternshipType.Staj1) ?? terms[0];
        var staj2Term = terms.FirstOrDefault(t => t.InternshipType == InternshipType.Staj2) ?? terms[0];

        var pw = hasher.Hash("123456");

        var students2025 = new (string No, string Name, string Dept, InternshipType Type)[]
        {
            ("213311001", "Emre Kılıç", "Gömülü Sistemler", InternshipType.Staj1),
            ("213311002", "Elif Demirci", "Siber Güvenlik", InternshipType.Staj2),
            ("213311003", "Burak Şahin", "Kurumsal Yazılım / .NET", InternshipType.Staj1),
            ("213311004", "Selin Yıldırım", "Yapay Zeka ve Veri Bilimi", InternshipType.Staj2),
            ("213311005", "Furkan Aydın", "Mobil Uygulama Geliştirme", InternshipType.Staj1),
            ("213311006", "Merve Çetin", "Bulut Bilişim ve DevOps", InternshipType.Staj2),
            ("213311007", "Oğuzhan Koç", "Savunma Yazılımları", InternshipType.Staj1),
            ("213311008", "Büşra Aksoy", "Web Teknolojileri (Full-Stack)", InternshipType.Staj2),
            ("213311009", "Kaan Polat", "Ağ ve Sistem Yönetimi", InternshipType.Staj1),
            ("213311010", "Gizem Kurt", "Veritabanı ve ERP Sistemleri", InternshipType.Staj2)
        };

        var students2026 = new (string No, string Name, string Dept, InternshipType Type)[]
        {
            ("223311011", "Mert Can Özdemir", "Savunma Sanayi / RTOS", InternshipType.Staj1),
            ("223311012", "Ayşenur Doğan", "Full-Stack (.NET & React)", InternshipType.Staj2),
            ("223311013", "Kerem Arslan", "Siber Güvenlik ve SOC", InternshipType.Staj1),
            ("223311014", "Beyza Nur Güneş", "Derin Öğrenme & Görüntü İşleme", InternshipType.Staj2),
            ("223311015", "Enes Bozkurt", "Gömülü Linux & C++", InternshipType.Staj1),
            ("223311016", "İrem Korkmaz", "FinTech & Mikroservis Mimarisi", InternshipType.Staj2),
            ("223311017", "Tolga Çelik", "Kurumsal Kaynak Planlama (ERP)", InternshipType.Staj1),
            ("223311018", "Sude Naz Yalçın", "Bulut Altyapı & Kubernetes", InternshipType.Staj2),
            ("223311019", "Yusuf Eren Taş", "Oyun ve Simülasyon Teknolojileri", InternshipType.Staj1),
            ("223311020", "Dilara Tekin", "Büyük Veri ve İş Zekası", InternshipType.Staj2)
        };

        async Task CreateYearArchiveAsync(string year, int yearInt, (string No, string Name, string Dept, InternshipType Type)[] rows)
        {
            var existingInYear = await db.Internships.CountAsync(i => i.IsArchived && i.ArchiveYear == year);
            if (existingInYear >= 10) return;

            for (int idx = 0; idx < rows.Length; idx++)
            {
                var r = rows[idx];
                var email = $"{r.No}@ogr.selcuk.edu.tr";
                var student = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (student is null)
                {
                    student = new User
                    {
                        Email = email,
                        PasswordHash = pw,
                        FullName = r.Name,
                        StudentNo = r.No,
                        NationalId = $"10000000{(yearInt == 2025 ? 10 + idx : 30 + idx):D3}",
                        Department = "Bilgisayar Mühendisliği",
                        Phone = $"0532 500 {(yearInt == 2025 ? 10 + idx : 30 + idx):D2} {(10 + idx):D2}",
                        Role = UserRole.Student,
                        HasAcceptedGuide = true
                    };
                    db.Users.Add(student);
                }

                var comp = companies[idx % companies.Count];
                var startDate = new DateOnly(yearInt, 7, 1).AddDays((idx % 3) * 7);
                var endDate = startDate.AddDays(27);

                var intern = new Internship
                {
                    Student = student,
                    StudentId = student.Id,
                    TermId = r.Type == InternshipType.Staj1 ? staj1Term.Id : staj2Term.Id,
                    Company = comp,
                    CompanyId = comp.Id,
                    AdvisorName = "Yük. Müh. Burak Çelik",
                    AdvisorEmail = comp.Email ?? "danisman@aselsankonya.com.tr",
                    Type = r.Type,
                    WorkDays = 20,
                    StartDate = startDate,
                    EndDate = endDate,
                    OriginalEndDate = endDate,
                    Department = r.Dept,
                    WorksOnSaturday = idx % 2 == 0,
                    ReceivesSalary = idx % 3 == 0,
                    Status = InternshipStatus.Passed,
                    KptoStatus = KptoInsuranceStatus.InsuranceActive,
                    SubmittedAt = new DateTime(yearInt, 6, 10, 10, 0, 0, DateTimeKind.Utc),
                    ApprovedAt = new DateTime(yearInt, 6, 15, 14, 0, 0, DateTimeKind.Utc),
                    InsuranceStartedAt = new DateTime(yearInt, 6, 25, 9, 0, 0, DateTimeKind.Utc),
                    AdvisorLogbookApproved = true,
                    AdvisorApprovedAt = new DateTime(yearInt, 8, 5, 16, 0, 0, DateTimeKind.Utc),
                    EvaluatedAt = new DateTime(yearInt, 8, 15, 11, 0, 0, DateTimeKind.Utc),
                    EvaluationNote = $"{year} yaz dönemi stajı komisyon tarafından incelendi ve başarılı (GEÇTİ) bulundu.",
                    AdvisorEmailSentAt = new DateTime(yearInt, 6, 15, 14, 0, 0, DateTimeKind.Utc),
                    AdvisorEmailStatus = $"Şirket danışmanı staj defterini inceledi ve onayladı ({year}).",
                    IsArchived = true,
                    ArchiveYear = year
                };
                db.Internships.Add(intern);

                for (int d = 1; d <= 20; d++)
                {
                    db.LogbookEntries.Add(new LogbookEntry
                    {
                        Internship = intern,
                        InternshipId = intern.Id,
                        DayNumber = d,
                        Date = startDate.AddDays(d - 1),
                        Title = $"{d}. İş Günü — {r.Dept} Çalışması",
                        Content = $"{comp.Name} bünyesinde {r.Dept} departmanında {d}. iş günü yazılım geliştirme, test ve dokümantasyon çalışmaları gerçekleştirildi."
                    });
                }
            }
        }

        await CreateYearArchiveAsync("2025", 2025, students2025);
        await CreateYearArchiveAsync("2026", 2026, students2026);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Temel kullanıcı hesaplarına, 2025-2026 yıllık arşiv kayıtlarına, dönemlere ve firma havuzuna zarar vermeden
    /// yalnızca aktif/test staj başvurularını (Ahmet'in geçmiş test verileri dahil) sıfırlar.
    /// </summary>
    public static async Task ResetInternshipsAsync(AppDbContext db, IFileStorage storage)
    {
        var nonArchivedInternships = await db.Internships
            .Include(i => i.Documents)
            .Include(i => i.LogbookEntries)
            .Include(i => i.LeaveRequests)
            .Where(i => !i.IsArchived)
            .ToListAsync();

        foreach (var i in nonArchivedInternships)
        {
            foreach (var doc in i.Documents)
            {
                if (!string.IsNullOrWhiteSpace(doc.StoredFileName))
                    storage.Delete(doc.StoredFileName);
            }
            db.Documents.RemoveRange(i.Documents);
            db.LogbookEntries.RemoveRange(i.LogbookEntries);
            db.LeaveRequests.RemoveRange(i.LeaveRequests);
            db.Internships.Remove(i);
        }

        await db.Database.ExecuteSqlRawAsync("DELETE FROM \"Notifications\";");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM \"AuditLogs\";");
        await db.SaveChangesAsync();
    }
}
