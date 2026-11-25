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
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher, IPdfService? pdf = null)
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
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "Subject" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AdvisorTitle" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AdvisorGraduatedDepartment" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AcademicResult" integer NOT NULL DEFAULT 0;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AcceptedDaysCount" integer NOT NULL DEFAULT 0;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "AdvisorApprovedIpAddress" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "IsLogbookLocked" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "LogbookLockReason" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "CoverPageDataJson" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "SgkRegistrationNo" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "ExtensionSgkProcessed" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "ExtensionSgkProcessedAt" timestamp with time zone NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "ExtensionSgkNote" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "SgkExitProcessed" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "SgkExitProcessedAt" timestamp with time zone NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "SgkExitNo" text NULL;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "ReportDeadlineNotified" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Internships" ADD COLUMN IF NOT EXISTS "InsuranceReminderNotified" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Terms" ADD COLUMN IF NOT EXISTS "ApplicationStartDate" date NULL;
                    ALTER TABLE "Terms" ADD COLUMN IF NOT EXISTS "IsSaturdayAllowed" boolean NOT NULL DEFAULT TRUE;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "Status" integer NOT NULL DEFAULT 0;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "CommissionFeedback" text NULL;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "VersionNumber" integer NOT NULL DEFAULT 1;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "ReviewedAt" timestamp with time zone NULL;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "ReviewedById" uuid NULL;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "IsVerifiedByKpto" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "VerifiedByKptoAt" timestamp with time zone NULL;
                    ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "VerifiedByKptoUserId" uuid NULL;
                    ALTER TABLE "Companies" ADD COLUMN IF NOT EXISTS "WebSite" text NULL;
                    ALTER TABLE "Companies" ADD COLUMN IF NOT EXISTS "TaxNumber" text NULL;
                    ALTER TABLE "CompanyListings" ADD COLUMN IF NOT EXISTS "Quota" integer NULL;
                    ALTER TABLE "CompanyListings" ADD COLUMN IF NOT EXISTS "Sector" text NULL;
                    ALTER TABLE "CompanyListings" ADD COLUMN IF NOT EXISTS "Department" text NULL;
                    CREATE TABLE IF NOT EXISTS "EmailLogs" (
                        "Id" uuid NOT NULL CONSTRAINT "PK_EmailLogs" PRIMARY KEY,
                        "InternshipId" uuid NULL,
                        "ToEmail" text NOT NULL,
                        "Subject" text NOT NULL,
                        "HtmlBody" text NOT NULL,
                        "IsSuccess" boolean NOT NULL DEFAULT TRUE,
                        "ErrorMessage" text NULL,
                        "SentAt" timestamp with time zone NOT NULL
                    );
                    CREATE TABLE IF NOT EXISTS "DocumentVersions" (
                        "Id" uuid NOT NULL CONSTRAINT "PK_DocumentVersions" PRIMARY KEY,
                        "DocumentId" uuid NOT NULL REFERENCES "Documents"("Id") ON DELETE CASCADE,
                        "VersionNumber" integer NOT NULL DEFAULT 1,
                        "OriginalFileName" text NOT NULL,
                        "StoredFileName" text NOT NULL,
                        "ContentType" text NOT NULL,
                        "SizeBytes" bigint NOT NULL DEFAULT 0,
                        "UploadedById" uuid NOT NULL,
                        "UploadedAt" timestamp with time zone NOT NULL
                    );
                    ALTER TABLE "LogbookEntries" ADD COLUMN IF NOT EXISTS "IsDraft" boolean NOT NULL DEFAULT FALSE;
                    ALTER TABLE "LogbookEntries" ADD COLUMN IF NOT EXISTS "ImageStoredFileName" text NULL;
                    ALTER TABLE "LogbookEntries" ADD COLUMN IF NOT EXISTS "ImageOriginalFileName" text NULL;
                    ALTER TABLE "LogbookEntries" ADD COLUMN IF NOT EXISTS "ImageContentType" text NULL;
                    ALTER TABLE "LogbookEntries" ADD COLUMN IF NOT EXISTS "ImageCaption" text NULL;
                    UPDATE "Internships" SET "AcademicResult" = 1, "AcceptedDaysCount" = "WorkDays" WHERE "Status" = 7 AND "AcademicResult" = 0;
                    UPDATE "Internships" SET "AcademicResult" = 3, "AcceptedDaysCount" = 0 WHERE "Status" = 8 AND "AcademicResult" = 0;
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
                    CREATE TABLE IF NOT EXISTS "DocumentVersions" (
                        "Id" TEXT NOT NULL CONSTRAINT "PK_DocumentVersions" PRIMARY KEY,
                        "DocumentId" TEXT NOT NULL,
                        "VersionNumber" INTEGER NOT NULL DEFAULT 1,
                        "OriginalFileName" TEXT NOT NULL,
                        "StoredFileName" TEXT NOT NULL,
                        "ContentType" TEXT NOT NULL,
                        "SizeBytes" INTEGER NOT NULL DEFAULT 0,
                        "UploadedById" TEXT NOT NULL,
                        "UploadedAt" TEXT NOT NULL
                    );
                    CREATE TABLE IF NOT EXISTS "EmailLogs" (
                        "Id" TEXT NOT NULL CONSTRAINT "PK_EmailLogs" PRIMARY KEY,
                        "InternshipId" TEXT NULL,
                        "ToEmail" TEXT NOT NULL,
                        "Subject" TEXT NOT NULL,
                        "HtmlBody" TEXT NOT NULL,
                        "IsSuccess" INTEGER NOT NULL DEFAULT 1,
                        "ErrorMessage" TEXT NULL,
                        "SentAt" TEXT NOT NULL
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
                "ALTER TABLE \"Internships\" ADD COLUMN \"AdvisorLastLoginAt\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"Subject\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AdvisorTitle\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AdvisorGraduatedDepartment\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AcademicResult\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AcceptedDaysCount\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"AdvisorApprovedIpAddress\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"IsLogbookLocked\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"LogbookLockReason\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"CoverPageDataJson\" TEXT NULL;",
                "ALTER TABLE \"Terms\" ADD COLUMN \"ApplicationStartDate\" TEXT NULL;",
                "ALTER TABLE \"Terms\" ADD COLUMN \"IsSaturdayAllowed\" INTEGER NOT NULL DEFAULT 1;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"Status\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"CommissionFeedback\" TEXT NULL;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"VersionNumber\" INTEGER NOT NULL DEFAULT 1;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"ReviewedAt\" TEXT NULL;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"ReviewedById\" TEXT NULL;",
                "ALTER TABLE \"LogbookEntries\" ADD COLUMN \"IsDraft\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"LogbookEntries\" ADD COLUMN \"ImageStoredFileName\" TEXT NULL;",
                "ALTER TABLE \"LogbookEntries\" ADD COLUMN \"ImageOriginalFileName\" TEXT NULL;",
                "ALTER TABLE \"LogbookEntries\" ADD COLUMN \"ImageContentType\" TEXT NULL;",
                "ALTER TABLE \"LogbookEntries\" ADD COLUMN \"ImageCaption\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"SgkRegistrationNo\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"ExtensionSgkProcessed\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"ExtensionSgkProcessedAt\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"ExtensionSgkNote\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"SgkExitProcessed\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"SgkExitProcessedAt\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"SgkExitNo\" TEXT NULL;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"ReportDeadlineNotified\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Internships\" ADD COLUMN \"InsuranceReminderNotified\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"IsVerifiedByKpto\" INTEGER NOT NULL DEFAULT 0;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"VerifiedByKptoAt\" TEXT NULL;",
                "ALTER TABLE \"Documents\" ADD COLUMN \"VerifiedByKptoUserId\" TEXT NULL;",
                "ALTER TABLE \"Companies\" ADD COLUMN \"WebSite\" TEXT NULL;",
                "ALTER TABLE \"Companies\" ADD COLUMN \"TaxNumber\" TEXT NULL;",
                "ALTER TABLE \"CompanyListings\" ADD COLUMN \"Quota\" INTEGER NULL;",
                "ALTER TABLE \"CompanyListings\" ADD COLUMN \"Sector\" TEXT NULL;",
                "ALTER TABLE \"CompanyListings\" ADD COLUMN \"Department\" TEXT NULL;"
            };
            foreach (var sql in alterColumns)
            {
                try { await db.Database.ExecuteSqlRawAsync(sql); }
                catch { /* Sütun zaten varsa yoksay */ }
            }
            try
            {
                await db.Database.ExecuteSqlRawAsync("UPDATE \"Internships\" SET \"AcademicResult\" = 1, \"AcceptedDaysCount\" = \"WorkDays\" WHERE \"Status\" = 7 AND \"AcademicResult\" = 0;");
                await db.Database.ExecuteSqlRawAsync("UPDATE \"Internships\" SET \"AcademicResult\" = 3, \"AcceptedDaysCount\" = 0 WHERE \"Status\" = 8 AND \"AcademicResult\" = 0;");
                await db.Database.ExecuteSqlRawAsync("UPDATE \"LogbookEntries\" SET \"Title\" = \"DayNumber\" || '. İş Günü — Kurumsal Yazılım ve Sistem Geliştirme Çalışması', \"Content\" = 'Kurumsal yazılım mimarisi kapsamında ASP.NET Core Web API, veritabanı modelleme, React/TypeScript arayüz entegrasyonu ve birim test çalışmaları gerçekleştirildi.' WHERE \"Content\" LIKE '%safsd%';");
            }
            catch
            {
                // Yoksay
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
                WebSite = "https://www.aselsankonya.com.tr",
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
                WebSite = "https://www.havelsan.com.tr",
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
                WebSite = "https://www.innova.com.tr",
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
                WebSite = "https://www.konyateknokent.com.tr",
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
                Email = "221213015@ogr.selcuk.edu.tr",
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
                    Quota = 6,
                    Sector = "Savunma Sanayi",
                    Department = "Gömülü Sistemler",
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
                    Quota = 4,
                    Sector = "Kurumsal Yazılım",
                    Department = "Web & Bulut Yazılım",
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
                    Quota = 5,
                    Sector = "Yazılım ve Siber Güvenlik",
                    Department = "Siber Güvenlik / SOC",
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
                    ApplicationStartDate = new DateOnly(2026, 5, 1),
                    EarliestStartDate = new DateOnly(2026, 6, 15),
                    LatestEndDate = new DateOnly(2027, 9, 30),
                    ApplicationDeadline = new DateOnly(2027, 9, 1),
                    ReportDeadline = new DateOnly(2027, 10, 30),
                    MinWorkDays = 20,
                    MaxWorkDays = 30,
                    IsSaturdayAllowed = true,
                    IsActive = true
                },
                new Term
                {
                    Name = "2026-2027 Yaz Stajı - Staj 2",
                    AcademicYear = "2026",
                    InternshipType = InternshipType.Staj2,
                    ApplicationStartDate = new DateOnly(2026, 5, 1),
                    EarliestStartDate = new DateOnly(2026, 6, 15),
                    LatestEndDate = new DateOnly(2027, 9, 30),
                    ApplicationDeadline = new DateOnly(2027, 9, 1),
                    ReportDeadline = new DateOnly(2027, 10, 30),
                    MinWorkDays = 20,
                    MaxWorkDays = 30,
                    IsSaturdayAllowed = true,
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

        // Makine Mühendisliği ve Elektrik-Elektronik Mühendisliği Komisyon, Bölüm Başkanı, Öğrenci ve Staj Süreçlerini Oluştur
        await SeedMultiDepartmentsAsync(db, hasher, pdf);
    }

    /// <summary>
    /// Bilgisayar, Makine ve Elektrik-Elektronik Mühendisliği bölümleri için ayrı komisyon üyeleri, bölüm başkanları,
    /// farklı öğrenciler ve her bölüme özgü aktif/arşivlenmiş staj süreçleri oluşturur.
    /// </summary>
    public static async Task SeedMultiDepartmentsAsync(AppDbContext db, IPasswordHasher hasher, IPdfService? pdf = null)
    {
        var pw = hasher.Hash("123456");

        // 1) Mevcut Bilgisayar Mühendisliği komisyon ve bölüm başkanı kullanıcılarının bölüm bilgisini garanti altına al
        var bilgUsers = await db.Users.Where(u => u.Email == "komisyon@selcuk.edu.tr" || u.Email == "bolumbaskani@selcuk.edu.tr").ToListAsync();
        foreach (var bu in bilgUsers)
        {
            if (string.IsNullOrWhiteSpace(bu.Department)) bu.Department = "Bilgisayar Mühendisliği";
        }

        // 2) Makine ve Elektrik-Elektronik Mühendisliği Komisyon & Bölüm Başkanı hesapları
        var staffSeeds = new (string Email, string FullName, string Dept, UserRole Role, string Phone)[]
        {
            ("komisyon.makine@selcuk.edu.tr", "Doç. Dr. Hasan Çetin", "Makine Mühendisliği", UserRole.CommitteeMember, "0332 223 20 01"),
            ("bolumbaskani.makine@selcuk.edu.tr", "Prof. Dr. Kemal Demir", "Makine Mühendisliği", UserRole.DepartmentHead, "0332 223 20 00"),
            ("komisyon.ee@selcuk.edu.tr", "Doç. Dr. Murat Yıldız", "Elektrik-Elektronik Mühendisliği", UserRole.CommitteeMember, "0332 223 30 01"),
            ("bolumbaskani.ee@selcuk.edu.tr", "Prof. Dr. Serkan Aydın", "Elektrik-Elektronik Mühendisliği", UserRole.DepartmentHead, "0332 223 30 00")
        };

        foreach (var s in staffSeeds)
        {
            var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == s.Email);
            if (existing is null)
            {
                db.Users.Add(new User
                {
                    Email = s.Email,
                    PasswordHash = pw,
                    FullName = s.FullName,
                    Department = s.Dept,
                    Phone = s.Phone,
                    Role = s.Role,
                    HasAcceptedGuide = true
                });
            }
            else
            {
                existing.Department = s.Dept;
                existing.FullName = s.FullName;
            }
        }

        // 3) Farklı sektör firmaları ve her öğrencinin kendine özel şirketi / sorumlu mühendisi
        async Task<Company> EnsureCompanyAsync(string name, string sector, string city, string address, string phone, string email, string web)
        {
            var comp = await db.Companies.FirstOrDefaultAsync(c => c.Name == name);
            if (comp is null)
            {
                comp = new Company
                {
                    Name = name,
                    Sector = sector,
                    City = city,
                    Address = address,
                    Phone = phone,
                    Email = email,
                    WebSite = web,
                    IsVerified = true
                };
                db.Companies.Add(comp);
                await db.SaveChangesAsync();
            }
            return comp;
        }

        async Task<User> EnsureAdvisorUserAsync(string email, string fullName, Company comp, string phone)
        {
            var normEmail = email.Trim().ToLowerInvariant();
            var u = await db.Users.FirstOrDefaultAsync(x => x.Email == normEmail);
            if (u is null)
            {
                u = new User
                {
                    Email = normEmail,
                    PasswordHash = pw,
                    FullName = fullName,
                    Phone = phone,
                    Role = UserRole.CompanyAdvisor,
                    CompanyId = comp.Id,
                    MustChangePassword = false,
                    HasAcceptedGuide = true
                };
                db.Users.Add(u);
                await db.SaveChangesAsync();
            }
            else
            {
                u.FullName = fullName;
                u.CompanyId = comp.Id;
                u.MustChangePassword = false;
            }
            return u;
        }

        var aselsanComp = await db.Companies.FirstOrDefaultAsync(c => c.Name.Contains("Aselsan"))
            ?? await EnsureCompanyAsync("Aselsan Konya Silah Sistemleri A.Ş.", "Savunma Sanayi", "Konya", "Konya Teknoloji Endüstri Bölgesi, Selçuklu / Konya", "0332 502 00 00", "ik@aselsankonya.com.tr", "https://www.aselsankonya.com.tr");
        var havelsanComp = await db.Companies.FirstOrDefaultAsync(c => c.Name.Contains("Havelsan"))
            ?? await EnsureCompanyAsync("Havelsan Hava Elektronik Sanayi A.Ş.", "Yazılım ve Siber Güvenlik", "Ankara", "Mustafa Kemal Mah. 2120 Cad. No:39 Çankaya / Ankara", "0312 219 57 87", "staj@havelsan.com.tr", "https://www.havelsan.com.tr");
        var innovaComp = await db.Companies.FirstOrDefaultAsync(c => c.Name.Contains("Innova"))
            ?? await EnsureCompanyAsync("Innova Bilişim Çözümleri A.Ş.", "Bilişim / FinTech", "İstanbul", "İTÜ Ayazağa Kampüsü Teknokent, Maslak / İstanbul", "0212 329 70 00", "kariyer@innova.com.tr", "https://www.innova.com.tr");
        var teknoComp = await db.Companies.FirstOrDefaultAsync(c => c.Name.Contains("Teknokent"))
            ?? await EnsureCompanyAsync("Konya Teknokent Yazılım A.Ş.", "Kurumsal Yazılım", "Konya", "Selçuk Üniversitesi Alaeddin Keykubat Kampüsü Teknokent, Selçuklu / Konya", "0332 241 05 00", "staj@konyateknokent.com.tr", "https://www.konyateknokent.com.tr");
        var roketsanComp = await EnsureCompanyAsync("Roketsan Roket Sanayii ve Ticaret A.Ş.", "Savunma ve Havacılık", "Ankara", "Kemalpaşa Mah. Şehit Yüzbaşı Adem Kutlu Sk. Elmadağ / Ankara", "0312 860 55 00", "ik@roketsan.com.tr", "https://www.roketsan.com.tr");
        var tusaComp = await EnsureCompanyAsync("TUSAŞ - Türk Havacılık ve Uzay Sanayii A.Ş.", "Havacılık ve Uzay", "Ankara", "Fethiye Mah. Havacılık Blv. No:17 Kahramankazan / Ankara", "0312 811 18 00", "kariyer@tusas.com", "https://www.tusas.com");

        var makineComp = await EnsureCompanyAsync("Tümosan Motor ve Traktör Sanayi A.Ş.", "Otomotiv ve Makine İmalat", "Konya", "Konya Organize Sanayi Bölgesi, Selçuklu / Konya", "0332 239 05 40", "ik@tumosan.com.tr", "https://www.tumosan.com.tr");
        var hidrokonComp = await EnsureCompanyAsync("Hidrokon Hidrolik Makina Sanayi A.Ş.", "Hidrolik Vinç ve Makine İmalat", "Konya", "3. Organize Sanayi Bölgesi İhsandede Cad. Selçuklu / Konya", "0332 239 18 76", "ik@hidrokon.com", "https://www.hidrokon.com");
        var imasComp = await EnsureCompanyAsync("İmaş Makina Sanayi A.Ş.", "Endüstriyel Değirmen ve Şerit Testere Makineleri", "Konya", "4. Organize Sanayi Bölgesi 405. Sk. Selçuklu / Konya", "0332 239 01 41", "ik@imas.com.tr", "https://www.imas.com.tr");
        var mpgComp = await EnsureCompanyAsync("MPG Makine Prodüksiyon Grubu A.Ş.", "Savunma ve Özel Amaçlı Araç İmalatı", "Konya", "3. Organize Sanayi Bölgesi T.Ziyaeddin Cad. Selçuklu / Konya", "0332 239 00 84", "ik@mpg.com.tr", "https://www.mpg.com.tr");

        var eeComp = await EnsureCompanyAsync("Meram Elektrik Dağıtım A.Ş. (MEDAŞ)", "Enerji ve Elektrik Dağıtım", "Konya", "Konevi Mah. Nalçacı Cad. Karatay / Konya", "0332 221 88 00", "staj@meramedas.com.tr", "https://www.meramedas.com.tr");
        var AstorComp = await EnsureCompanyAsync("Astor Enerji A.Ş.", "Yüksek Gerilim Transformatör ve Anahtarlama", "Ankara", "ASO 2. ve 3. OSB Alcı Mah. 2009 Cad. Sincan / Ankara", "0312 267 01 56", "ik@astorenerji.com.tr", "https://www.astorenerji.com.tr");
        var siemensComp = await EnsureCompanyAsync("Siemens Sanayi ve Ticaret A.Ş.", "Endüstriyel Otomasyon ve Güç Sistemleri", "İstanbul", "Yakacık Cad. No:111 Kartal / İstanbul", "0216 459 20 00", "tr.hr@siemens.com", "https://www.siemens.com.tr");
        var vestelComp = await EnsureCompanyAsync("Vestel Elektronik Sanayi ve Ticaret A.Ş.", "Elektronik Donanım ve Gömülü Sistemler", "Manisa", "Organize Sanayi Bölgesi 45030 Yunusemre / Manisa", "0236 233 01 31", "kariyer@vestel.com.tr", "https://www.vestel.com.tr");

        var terms = await db.Terms.ToListAsync();
        if (terms.Count == 0) return;
        var staj1Term = terms.FirstOrDefault(t => t.InternshipType == InternshipType.Staj1) ?? terms[0];
        var staj2Term = terms.FirstOrDefault(t => t.InternshipType == InternshipType.Staj2) ?? terms[0];

        // Zeynep Arslan'ın e-postasını öğrenci numarası formatına (221213015@ogr.selcuk.edu.tr) normalize et ve Staj 1 / Staj 2 sorumlu mühendislerini birbirinden ayır
        var oldZeynep = await db.Users.FirstOrDefaultAsync(u => u.Email == "zeynep@ogr.selcuk.edu.tr");
        var newZeynep = await db.Users.FirstOrDefaultAsync(u => u.Email == "221213015@ogr.selcuk.edu.tr");
        if (newZeynep is not null)
        {
            newZeynep.FullName = "Zeynep Arslan";
            newZeynep.StudentNo = "221213015";
            newZeynep.NationalId = "10987654321";
            newZeynep.Department = "Bilgisayar Mühendisliği";
            newZeynep.Phone = "0555 444 55 66";
            newZeynep.HasAcceptedGuide = true;
            await db.SaveChangesAsync();
        }
        if (oldZeynep is not null && newZeynep is not null && oldZeynep.Id != newZeynep.Id)
        {
            var oldInterns = await db.Internships.Where(i => i.StudentId == oldZeynep.Id).ToListAsync();
            foreach (var oi in oldInterns) oi.StudentId = newZeynep.Id;
            db.Users.Remove(oldZeynep);
            await db.SaveChangesAsync();
        }
        else if (oldZeynep is not null && newZeynep is null)
        {
            oldZeynep.Email = "221213015@ogr.selcuk.edu.tr";
            oldZeynep.StudentNo = "221213015";
            await db.SaveChangesAsync();
        }

        // Zeynep Arslan'ın tüm kayıtlarındaki Konya Teknokent stajına Selim Aydın'ı ata
        var teknoAdv = await EnsureAdvisorUserAsync("selim.aydin@konyateknokent.com.tr", "Yük. Müh. Selim Aydın", teknoComp, "0532 210 30 40");
        var zeynepTeknoInterns = await db.Internships.Include(i => i.Student)
            .Where(i => i.Student.FullName == "Zeynep Arslan" && i.Type == InternshipType.Staj1)
            .ToListAsync();
        foreach (var zi in zeynepTeknoInterns)
        {
            zi.CompanyId = teknoComp.Id;
            zi.AdvisorId = teknoAdv.Id;
            zi.AdvisorName = teknoAdv.FullName;
            zi.AdvisorEmail = teknoAdv.Email;
            zi.AdvisorTitle = "Yazılım Mimarı / Takım Lideri";
            zi.AdvisorGraduatedDepartment = "Bilgisayar Mühendisliği";
        }
        await db.SaveChangesAsync();

        // 4) Her öğrencinin kendi başvurduğu şirket ve kendi sorumlu mühendisi (AdvisorName, AdvisorEmail, AdvisorTitle) ile staj süreçleri
        var deptInternships = new (
            string StudentNo, string FullName, string AcademicDept, string NationalId,
            Company Comp, string AdvName, string AdvEmail, string AdvTitle,
            InternshipType Type, string UnitDept, string Subject,
            InternshipStatus Status, KptoInsuranceStatus? KptoStatus,
            DateOnly StartDate, DateOnly EndDate, bool LogbookReady, bool AdvisorApproved, bool IsArchived, string? ArchiveYear,
            bool HasPendingLeave
        )[]
        {
            // ===================== BİLGİSAYAR MÜHENDİSLİĞİ =====================
            ("233311081", "Mustafa Berkay Yıldırım", "Bilgisayar Mühendisliği", "23331108101",
                roketsanComp, "Dr. Müh. Kaan Özdemir", "kaan.ozdemir@roketsan.com.tr", "Gömülü Sistemler Başmühendisi",
                InternshipType.Staj1, "Gömülü Yazılım ve Gerçek Zamanlı Sistemler",
                "STM32 ve FreeRTOS Tabanlı Savunma Sanayi Görev Bilgisayarı Haberleşme Modülü Geliştirilmesi",
                InternshipStatus.Submitted, null,
                new DateOnly(2026, 12, 7), new DateOnly(2027, 1, 4), false, false, false, null, false),

            ("233311082", "Elif Sena Öztürk", "Bilgisayar Mühendisliği", "23331108202",
                innovaComp, "Yük. Müh. Deniz Karahan", "deniz.karahan@innova.com.tr", "Bulut Mimarisi ve FinTech Direktörü",
                InternshipType.Staj1, "Bulut Bilişim ve Mikroservis Mimarisi",
                "ASP.NET Core 8 Web API, Docker ve PostgreSQL ile Kurumsal Süreç Otomasyonu",
                InternshipStatus.ApprovedByCommittee, KptoInsuranceStatus.Pending,
                new DateOnly(2026, 12, 14), new DateOnly(2027, 1, 11), false, false, false, null, false),

            ("223311083", "Emirhan Demirtaş", "Bilgisayar Mühendisliği", "22331108303",
                tusaComp, "Yük. Müh. Gökhan Yılmaz", "gokhan.yilmaz@tusas.com", "Yapay Zeka ve Otonom Sistemler Lideri",
                InternshipType.Staj2, "Yapay Zeka ve Bilgisayarlı Görü Ar-Ge",
                "YOLOv8 ve PyTorch Kullanarak İHA Kamera Görüntülerinde Gerçek Zamanlı Hedef Tespiti",
                InternshipStatus.InProgress, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 10, 19), new DateOnly(2026, 11, 17), true, false, false, null, true),

            ("223311084", "Zehra Betül Kaya", "Bilgisayar Mühendisliği", "22331108404",
                havelsanComp, "Müh. Sinan Kurtuluş", "sinan.kurtulus@havelsan.com.tr", "Siber Güvenlik Operasyon (SOC) Yöneticisi",
                InternshipType.Staj1, "Siber Güvenlik ve Ağ Operasyonları (SOC)",
                "Kurumsal Web Uygulamalarında OWASP Top-10 Sızma Testi ve SIEM Log Analizi",
                InternshipStatus.CancellationRequested, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 11, 9), new DateOnly(2026, 12, 7), false, false, false, null, false),

            // ===================== MAKİNE MÜHENDİSLİĞİ =====================
            ("233322010", "Hakan Yılmaz", "Makine Mühendisliği", "23332201011",
                makineComp, "Mak. Yük. Müh. Serdar Çelik", "serdar.celik@tumosan.com.tr", "Motor Ar-Ge ve Tasarım Müdürü",
                InternshipType.Staj1, "Motor Tasarım ve CAD/CAM Ar-Ge",
                "Dizel Motor Bloklarının SolidWorks ile 3B Modellenmesi ve ANSYS Termal Analizi",
                InternshipStatus.Submitted, null,
                new DateOnly(2026, 12, 7), new DateOnly(2027, 1, 4), false, false, false, null, false),

            ("233322012", "Burak Can Soylu", "Makine Mühendisliği", "23332201291",
                mpgComp, "Mak. Müh. Oğuzhan Güler", "oguzhan.guler@mpg.com.tr", "Yapısal Analiz ve Şasi Başmühendisi",
                InternshipType.Staj1, "Otomotiv Şasi ve Mukavemet Analizi",
                "Ağır Hizmet Savunma Araçları Şasi Bağlantı Elemanlarının Sonlu Elemanlar Yöntemi (FEM) ile Yorulma Analizi",
                InternshipStatus.ApprovedByCommittee, KptoInsuranceStatus.Pending,
                new DateOnly(2026, 12, 14), new DateOnly(2027, 1, 11), false, false, false, null, false),

            ("223322015", "Seda Nur Karaca", "Makine Mühendisliği", "22332201522",
                imasComp, "Mak. Yük. Müh. Levent Aksoy", "levent.aksoy@imas.com.tr", "CNC İmalat ve Kalite Güvence Şefi",
                InternshipType.Staj2, "CNC Talaşlı İmalat ve Kalite Kontrol",
                "5 Eksenli CNC İşleme Merkezlerinde Takım Yolu Optimizasyonu ve CMM Ölçüm Kalibrasyonu",
                InternshipStatus.InProgress, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 10, 19), new DateOnly(2026, 11, 17), true, false, false, null, true),

            ("223322018", "Onur Gökçe", "Makine Mühendisliği", "22332201833",
                hidrokonComp, "Mak. Yük. Müh. Tarık Bozkurt", "tarik.bozkurt@hidrokon.com", "Hidrolik Sistemler Tasarım Yöneticisi",
                InternshipType.Staj1, "Hidrolik-Pnömatik Sistemler",
                "Hidrolik Kaldırma Mekanizmalarının Basınç Dayanım Testleri ve Montaj Hattı İyileştirmesi",
                InternshipStatus.CompletedPendingReview, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 6, 15), new DateOnly(2026, 7, 13), true, true, false, null, false),

            ("223322021", "Alperen Çakır", "Makine Mühendisliği", "22332202192",
                makineComp, "Mak. Yük. Müh. Serdar Çelik", "serdar.celik@tumosan.com.tr", "Üretim Otomasyonu ve Kaynak Şefi",
                InternshipType.Staj2, "Robotik Kaynak ve Üretim Otomasyonu",
                "Endüstriyel Robotik Gazaltı Kaynak Hücrelerinde Fikstür Tasarımı ve Çevrim Süresi İyileştirmesi",
                InternshipStatus.Passed, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 29), true, true, false, "2026", false),

            ("213322005", "Volkan Şen", "Makine Mühendisliği", "21332200544",
                imasComp, "Mak. Yük. Müh. Levent Aksoy", "levent.aksoy@imas.com.tr", "Termodinamik Sistemler Başmühendisi",
                InternshipType.Staj2, "Termodinamik ve Isı Transferi",
                "Endüstriyel Eşanjör Sistemlerinde Isı Verimliliği Hesaplamaları",
                InternshipStatus.Passed, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2025, 7, 1), new DateOnly(2025, 7, 29), true, true, true, "2025", false),

            ("213322007", "Meliha Güler", "Makine Mühendisliği", "21332200793",
                hidrokonComp, "Mak. Yük. Müh. Tarık Bozkurt", "tarik.bozkurt@hidrokon.com", "Akışkanlar Mekaniği Test Yöneticisi",
                InternshipType.Staj1, "Akışkanlar Mekaniği ve Pompa Testleri",
                "Santrifüj Su Pompalarında Kavitasyon Testleri ve Çark Geometrisi Doğrulaması",
                InternshipStatus.Passed, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2025, 8, 1), new DateOnly(2025, 8, 29), true, true, true, "2025", false),

            // ===================== ELEKTRİK-ELEKTRONİK MÜHENDİSLİĞİ =====================
            ("233333012", "Caner Kurt", "Elektrik-Elektronik Mühendisliği", "23333301255",
                eeComp, "Elk. Yük. Müh. İbrahim Polat", "ibrahim.polat@meramedas.com.tr", "SCADA ve Şebeke İşletme Müdürü",
                InternshipType.Staj1, "Yüksek Gerilim ve Trafo Merkezleri",
                "154/31.5 kV İndirici Trafo Merkezlerinde Röle Koordinasyonu ve SCADA İzleme Sistemleri",
                InternshipStatus.Submitted, null,
                new DateOnly(2026, 12, 7), new DateOnly(2027, 1, 4), false, false, false, null, false),

            ("233333015", "Selinay Koçak", "Elektrik-Elektronik Mühendisliği", "23333301594",
                AstorComp, "Elk. Müh. Haluk Şahin", "haluk.sahin@astorenerji.com.tr", "Yüksek Gerilim Test ve Kalite Müdürü",
                InternshipType.Staj1, "Akıllı Şebekeler ve Enerji Kalitesi",
                "Orta Gerilim Güç Transformatörlerinde Kısmi Deşarj Testleri ve Reaktif Güç Kompanzasyonu",
                InternshipStatus.ApprovedByCommittee, KptoInsuranceStatus.Pending,
                new DateOnly(2026, 12, 14), new DateOnly(2027, 1, 11), false, false, false, null, false),

            ("223333019", "Ceren Yıldız", "Elektrik-Elektronik Mühendisliği", "22333301966",
                siemensComp, "Elk.-Elkt. Yük. Müh. Erdem Yalçın", "erdem.yalcin@siemens.com", "Endüstriyel Otomasyon ve PLC Grup Lideri",
                InternshipType.Staj2, "PLC Otomasyon ve Güç Elektroniği",
                "Endüstriyel Dağıtım Panolarında Siemens S7-1500 PLC Programlama ve Harmonik Filtre Tasarımı",
                InternshipStatus.InProgress, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 10, 19), new DateOnly(2026, 11, 17), true, false, false, null, true),

            ("223333024", "Barış Aktaş", "Elektrik-Elektronik Mühendisliği", "22333302477",
                vestelComp, "Elkt. Yük. Müh. Tolga Ergin", "tolga.ergin@vestel.com.tr", "Donanım Ar-Ge ve PCB Tasarım Yöneticisi",
                InternshipType.Staj1, "Gömülü Donanım ve PCB Tasarımı",
                "Altium Designer ile Çok Katmanlı PCB Tasarımı ve STM32 Tabanlı Akıllı Sayaç Haberleşmesi",
                InternshipStatus.CompletedPendingReview, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 6, 15), new DateOnly(2026, 7, 13), true, true, false, null, false),

            ("223333027", "Furkan Talha Erdem", "Elektrik-Elektronik Mühendisliği", "22333302795",
                aselsanComp, "Yük. Müh. Burak Çelik", "danisman@aselsankonya.com.tr", "RF ve Haberleşme Sistemleri Başmühendisi",
                InternshipType.Staj2, "Haberleşme Sistemleri ve RF Tasarım",
                "Endüstriyel IoT Sensör Ağlarında LoRaWAN Anten Empedans Uyumlama ve Sinyal Gürültü Analizi",
                InternshipStatus.Passed, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 29), true, true, false, "2026", false),

            ("213333008", "Tuğba Korkmaz", "Elektrik-Elektronik Mühendisliği", "21333300888",
                eeComp, "Elk. Yük. Müh. İbrahim Polat", "ibrahim.polat@meramedas.com.tr", "Yenilenebilir Enerji Şebeke Entegrasyon Şefi",
                InternshipType.Staj2, "Yenilenebilir Enerji ve GES Sistemleri",
                "Güneş Enerji Santrallerinde Evirici (Inverter) Verimlilik Analizi ve Şebeke Senkronizasyonu",
                InternshipStatus.Passed, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2025, 7, 7), new DateOnly(2025, 8, 4), true, true, true, "2025", false),

            ("213333011", "Harun Reşit Uçar", "Elektrik-Elektronik Mühendisliği", "21333301196",
                siemensComp, "Elk.-Elkt. Yük. Müh. Erdem Yalçın", "erdem.yalcin@siemens.com", "Sürücü Sistemleri Başmühendisi",
                InternshipType.Staj1, "Elektrik Makineleri ve Sürücü Sistemleri",
                "Asenkron Motor Sürücülerinde Vektör Kontrol (FOC) Algoritması ve Tork Dalgalanması Analizi",
                InternshipStatus.Passed, KptoInsuranceStatus.InsuranceActive,
                new DateOnly(2025, 8, 4), new DateOnly(2025, 9, 1), true, true, true, "2025", false)
        };

        foreach (var item in deptInternships)
        {
            var email = $"{item.StudentNo}@ogr.selcuk.edu.tr";
            var student = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (student is null)
            {
                student = new User
                {
                    Email = email,
                    PasswordHash = pw,
                    FullName = item.FullName.Replace("Korkماز", "Korkmaz"),
                    StudentNo = item.StudentNo,
                    NationalId = item.NationalId,
                    Department = item.AcademicDept,
                    Phone = "0535 400 20 30",
                    Role = UserRole.Student,
                    HasAcceptedGuide = true
                };
                db.Users.Add(student);
                await db.SaveChangesAsync();
            }
            else if (student.Department != item.AcademicDept)
            {
                student.Department = item.AcademicDept;
                await db.SaveChangesAsync();
            }

            var itemAdvisor = await EnsureAdvisorUserAsync(item.AdvEmail, item.AdvName, item.Comp, "0532 410 50 60");

            var defaultCoverJson = System.Text.Json.JsonSerializer.Serialize(new Staj.Application.DTOs.CoverPageDataDto(
                "250+ (85 Mühendis)",
                new List<string>
                {
                    $"{item.Comp.Sector} ve Kurumsal Ar-Ge Çözümleri",
                    $"{item.UnitDept} Tasarım ve Uygulama Geliştirme",
                    item.Subject,
                    "Sistem Entegrasyonu, Kalite Güvence ve Doğrulama Testleri",
                    "Teknik Dokümantasyon ve Mühendislik Standartları"
                },
                new List<Staj.Application.DTOs.CoverStaffMemberDto>
                {
                    new(1, item.AdvName, $"Selçuk Üniversitesi / Teknoloji Fakültesi / {item.AcademicDept}", item.AdvTitle),
                    new(2, "Yük. Müh. Kerem Bozdağ", $"ODTÜ / Mühendislik Fakültesi / {item.AcademicDept}", "Kıdemli Sistem ve Ar-Ge Mühendisi"),
                    new(3, "Müh. Elif Nur Akın", $"İTÜ / Mühendislik Fakültesi / {item.AcademicDept}", "Kalite Güvence ve Test Mühendisi")
                }));

            var existingIntern = await db.Internships.Include(x => x.LogbookEntries).FirstOrDefaultAsync(i => i.StudentId == student.Id);
            if (existingIntern is not null)
            {
                existingIntern.CompanyId = item.Comp.Id;
                existingIntern.AdvisorId = itemAdvisor.Id;
                existingIntern.AdvisorName = item.AdvName;
                existingIntern.AdvisorEmail = itemAdvisor.Email;
                existingIntern.AdvisorTitle = item.AdvTitle;
                existingIntern.AdvisorGraduatedDepartment = item.AcademicDept;
                existingIntern.Department = item.UnitDept;
                existingIntern.Subject = item.Subject;
                existingIntern.StartDate = item.StartDate;
                existingIntern.EndDate = item.EndDate;
                existingIntern.OriginalEndDate = item.EndDate;
                if (item.LogbookReady && string.IsNullOrWhiteSpace(existingIntern.CoverPageDataJson))
                {
                    existingIntern.CoverPageDataJson = defaultCoverJson;
                }
                if (item.LogbookReady && existingIntern.LogbookEntries.Count > 0)
                {
                    foreach (var le in existingIntern.LogbookEntries)
                    {
                        le.Date = item.StartDate.AddDays(Math.Max(0, le.DayNumber - 1));
                    }
                }
                if (!existingIntern.IsArchived)
                {
                    existingIntern.Status = item.Status;
                    existingIntern.KptoStatus = item.KptoStatus;
                }
                existingIntern.AdvisorEmailSentAt ??= item.Status != InternshipStatus.Submitted ? DateTime.UtcNow.AddDays(-22) : null;
                existingIntern.AdvisorEmailStatus = item.AdvisorApproved
                    ? $"Sorumlu mühendis ({item.AdvName} - {itemAdvisor.Email}) staj defterini inceledi ve onayladı."
                    : item.LogbookReady
                        ? $"Staj defteri tamamlandı (20/20 gün) ve geçici şifre (123456) ile sorumlu mühendise ({itemAdvisor.Email}) inceleme e-postası gönderildi."
                        : item.Status != InternshipStatus.Submitted
                            ? $"Şirket danışmanı hesabı oluşturuldu ve geçici şifre (123456) {itemAdvisor.Email} adresine e-posta ile gönderildi."
                            : null;
                if (existingIntern.Status == InternshipStatus.CancellationRequested &&
                    !await db.Documents.AnyAsync(d => d.InternshipId == existingIntern.Id && d.Type == DocumentType.Form7))
                {
                    db.Documents.Add(new Document
                    {
                        Internship = existingIntern,
                        InternshipId = existingIntern.Id,
                        Type = DocumentType.Form7,
                        OriginalFileName = $"Form7_Staj_Iptal_{item.StudentNo}_{item.Type}.pdf",
                        StoredFileName = $"Form7_Staj_Iptal_{item.StudentNo}_{item.Type}.pdf",
                        ContentType = "application/pdf",
                        SizeBytes = 42100,
                        UploadedById = student.Id,
                        Status = DocumentStatus.Pending
                    });
                }
                if (existingIntern.ReceivesSalary && existingIntern.Status == InternshipStatus.InProgress &&
                    !await db.Documents.AnyAsync(d => d.InternshipId == existingIntern.Id && d.Type == DocumentType.SalaryReceipt))
                {
                    db.Documents.Add(new Document
                    {
                        Internship = existingIntern,
                        InternshipId = existingIntern.Id,
                        Type = DocumentType.SalaryReceipt,
                        OriginalFileName = $"Maas_Dekontu_{item.StudentNo}.pdf",
                        StoredFileName = $"Maas_Dekontu_{item.StudentNo}.pdf",
                        ContentType = "application/pdf",
                        SizeBytes = 38500,
                        UploadedById = student.Id,
                        Status = DocumentStatus.Pending
                    });
                }
                continue;
            }

            var intern = new Internship
            {
                StudentId = student.Id,
                TermId = item.Type == InternshipType.Staj1 ? staj1Term.Id : staj2Term.Id,
                CompanyId = item.Comp.Id,
                AdvisorId = itemAdvisor.Id,
                AdvisorName = item.AdvName,
                AdvisorEmail = itemAdvisor.Email,
                AdvisorTitle = item.AdvTitle,
                AdvisorGraduatedDepartment = item.AcademicDept,
                Type = item.Type,
                WorkDays = 20,
                StartDate = item.StartDate,
                EndDate = item.EndDate,
                OriginalEndDate = item.EndDate,
                Department = item.UnitDept,
                Subject = item.Subject,
                WorksOnSaturday = false,
                ReceivesSalary = true,
                Status = item.Status,
                KptoStatus = item.KptoStatus,
                SubmittedAt = DateTime.UtcNow.AddDays(-25),
                ApprovedAt = item.Status != InternshipStatus.Submitted ? DateTime.UtcNow.AddDays(-22) : null,
                InsuranceStartedAt = item.KptoStatus == KptoInsuranceStatus.InsuranceActive ? DateTime.UtcNow.AddDays(-20) : null,
                SgkRegistrationNo = item.KptoStatus == KptoInsuranceStatus.InsuranceActive ? $"SGK-2026-{item.StudentNo}" : null,
                LogbookSubmittedToAdvisorAt = item.LogbookReady ? DateTime.UtcNow.AddDays(-2) : null,
                AdvisorLogbookApproved = item.AdvisorApproved,
                AdvisorApprovedAt = item.AdvisorApproved ? DateTime.UtcNow.AddDays(-1) : null,
                AdvisorEmailSentAt = item.Status != InternshipStatus.Submitted ? DateTime.UtcNow.AddDays(-22) : null,
                AdvisorEmailStatus = item.AdvisorApproved
                    ? $"Sorumlu mühendis ({item.AdvName} - {itemAdvisor.Email}) staj defterini inceledi ve onayladı."
                    : item.LogbookReady
                        ? $"Staj defteri tamamlandı (20/20 gün) ve geçici şifre (123456) ile sorumlu mühendise ({itemAdvisor.Email}) inceleme e-postası gönderildi."
                        : item.Status != InternshipStatus.Submitted
                            ? $"Şirket danışmanı hesabı oluşturuldu ve geçici şifre (123456) {itemAdvisor.Email} adresine e-posta ile gönderildi."
                            : null,
                AcademicResult = item.Status == InternshipStatus.Passed ? AcademicResultType.Successful : AcademicResultType.None,
                AcceptedDaysCount = item.Status == InternshipStatus.Passed ? 20 : 0,
                EvaluatedAt = item.Status == InternshipStatus.Passed ? DateTime.UtcNow.AddDays(-1) : null,
                EvaluationNote = item.Status == InternshipStatus.Passed
                    ? $"{item.AcademicDept} Staj Komisyonu tarafından incelendi ve başarılı bulundu."
                    : item.Status == InternshipStatus.CancellationRequested
                        ? "Sağlık sorunları ve ailevi nedenlerden dolayı mevcut dönemdeki stajımın Form 7 kapsamında iptal edilmesini arz ederim."
                        : null,
                IsArchived = item.IsArchived,
                ArchiveYear = item.ArchiveYear ?? "2026",
                CoverPageDataJson = item.LogbookReady ? defaultCoverJson : null
            };
            db.Internships.Add(intern);

            // Resmi başvuru belgeleri
            db.Documents.Add(new Document
            {
                Internship = intern,
                InternshipId = intern.Id,
                Type = DocumentType.Form2,
                OriginalFileName = $"Form2_Kabul_{item.StudentNo}.pdf",
                StoredFileName = $"Form2_Kabul_{item.StudentNo}.pdf",
                ContentType = "application/pdf",
                SizeBytes = 48200,
                UploadedById = student.Id,
                Status = item.Status == InternshipStatus.Submitted ? DocumentStatus.Pending : DocumentStatus.Approved
            });
            db.Documents.Add(new Document
            {
                Internship = intern,
                InternshipId = intern.Id,
                Type = DocumentType.Spas,
                OriginalFileName = $"SPAS_Mustehaklik_{item.StudentNo}.pdf",
                StoredFileName = $"SPAS_Mustehaklik_{item.StudentNo}.pdf",
                ContentType = "application/pdf",
                SizeBytes = 35100,
                UploadedById = student.Id,
                Status = item.Status == InternshipStatus.Submitted ? DocumentStatus.Pending : DocumentStatus.Approved
            });

            if (item.Status == InternshipStatus.CancellationRequested)
            {
                db.Documents.Add(new Document
                {
                    Internship = intern,
                    InternshipId = intern.Id,
                    Type = DocumentType.Form7,
                    OriginalFileName = $"Form7_Staj_Iptal_{item.StudentNo}_{item.Type}.pdf",
                    StoredFileName = $"Form7_Staj_Iptal_{item.StudentNo}_{item.Type}.pdf",
                    ContentType = "application/pdf",
                    SizeBytes = 42100,
                    UploadedById = student.Id,
                    Status = DocumentStatus.Pending
                });
            }

            if (item.Status == InternshipStatus.InProgress)
            {
                db.Documents.Add(new Document
                {
                    Internship = intern,
                    InternshipId = intern.Id,
                    Type = DocumentType.SalaryReceipt,
                    OriginalFileName = $"Maas_Dekontu_{item.StudentNo}.pdf",
                    StoredFileName = $"Maas_Dekontu_{item.StudentNo}.pdf",
                    ContentType = "application/pdf",
                    SizeBytes = 38500,
                    UploadedById = student.Id,
                    Status = DocumentStatus.Pending
                });
            }

            if (item.AdvisorApproved)
            {
                db.Documents.Add(new Document
                {
                    Internship = intern,
                    InternshipId = intern.Id,
                    Type = DocumentType.ResultForm,
                    OriginalFileName = $"Form4_Degerlendirme_{item.StudentNo}.pdf",
                    StoredFileName = $"Form4_Degerlendirme_{item.StudentNo}.pdf",
                    ContentType = "application/pdf",
                    SizeBytes = 51400,
                    UploadedById = itemAdvisor.Id,
                    Status = DocumentStatus.Approved
                });
            }

            if (item.LogbookReady)
            {
                for (int d = 1; d <= 20; d++)
                {
                    db.LogbookEntries.Add(new LogbookEntry
                    {
                        Internship = intern,
                        InternshipId = intern.Id,
                        DayNumber = d,
                        Date = item.StartDate.AddDays(d - 1),
                        Title = $"{d}. İş Günü — {item.UnitDept} Uygulaması",
                        Content = $"{item.Comp.Name} bünyesinde {item.Subject} kapsamında {d}. iş günü mühendislik hesaplamaları, saha uygulama testleri ve teknik raporlama çalışmaları eksiksiz gerçekleştirildi.",
                        IsDraft = false
                    });
                }
            }

            if (item.HasPendingLeave)
            {
                db.LeaveRequests.Add(new LeaveRequest
                {
                    Internship = intern,
                    InternshipId = intern.Id,
                    Type = LeaveType.MedicalReport,
                    StartDate = item.StartDate.AddDays(10),
                    Days = 2,
                    Reason = $"{item.AcademicDept} teknik saha gezisi ve mazeret izni talebi.",
                    Status = LeaveRequestStatus.Pending
                });
            }
        }

        await db.SaveChangesAsync();

        // 4.5) Makine ve Elektrik-Elektronik Mühendisliği komisyonlarına özel başlangıç duyuruları ve firma staj ilanları
        var makineCommUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "komisyon.makine@selcuk.edu.tr");
        if (makineCommUser is not null && !await db.Announcements.AnyAsync(a => a.CreatedById == makineCommUser.Id))
        {
            db.Announcements.AddRange(
                new Announcement
                {
                    Title = "📅 Makine Mühendisliği — 2026-2027 Yaz Dönemi Staj Başvuru ve İmalat/Tasarım İlkeleri",
                    Content = "Makine Mühendisliği bölümü öğrencilerimizin Staj 1 (Talaşlı İmalat / Üretim) ve Staj 2 (Tasarım / Ar-Ge / Enerji) başvurularında kabul formunu (Form 2) ve SPAS müstehaklık belgesini staj başlangıcından en az 10 gün önce yüklemeleri zorunludur.",
                    Category = "Calendar",
                    IsPinned = true,
                    IsActive = true,
                    CreatedById = makineCommUser.Id
                },
                new Announcement
                {
                    Title = "📢 Stajyer Arayan Firma İlanı: Tümosan Motor ve Traktör Sanayi A.Ş. — CAD/CAM ve Motor Ar-Ge Stajyeri",
                    Content = "Dizel motor tasarımı, SolidWorks 3B modelleme, ANSYS termal analizi ve CNC imalat süreçlerinde görev alacak Makine Mühendisliği öğrencileri aranmaktadır. (Son Başvuru: 15.06.2027) • İletişim: ik@tumosan.com.tr",
                    Category = "CompanyListing",
                    IsPinned = false,
                    IsActive = true,
                    CreatedById = makineCommUser.Id
                });

            db.CompanyListings.Add(new CompanyListing
            {
                Company = makineComp,
                CompanyName = makineComp.Name,
                Title = "CAD/CAM, SolidWorks ve Motor Ar-Ge Yaz Stajyeri",
                Description = "Konya OSB fabrikamızda motor blok tasarımı, CNC talaşlı imalat ve kalite kontrol süreçlerinde görev alacak 3. ve 4. sınıf Makine Mühendisliği stajyerleri aranmaktadır.",
                Contact = "ik@tumosan.com.tr",
                City = "Konya",
                Deadline = new DateOnly(2027, 6, 15),
                Quota = 8,
                Sector = "Otomotiv ve Makine İmalat",
                Department = "Motor Ar-Ge ve Talaşlı İmalat",
                IsActive = true,
                CreatedById = makineCommUser.Id
            });
            await db.SaveChangesAsync();
        }

        var eeCommUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "komisyon.ee@selcuk.edu.tr");
        if (eeCommUser is not null && !await db.Announcements.AnyAsync(a => a.CreatedById == eeCommUser.Id))
        {
            db.Announcements.AddRange(
                new Announcement
                {
                    Title = "📅 Elektrik-Elektronik Mühendisliği — 2026-2027 Yaz Dönemi Staj Başvuru ve Laboratuvar/Saha İlkeleri",
                    Content = "Elektrik-Elektronik Mühendisliği bölümü öğrencilerimizin güç sistemleri, yüksek gerilim, PLC otomasyon veya gömülü donanım staj başvurularında sorumlu mühendisin Elektrik / Elektronik Mühendisi unvanına sahip olması zorunludur.",
                    Category = "Calendar",
                    IsPinned = true,
                    IsActive = true,
                    CreatedById = eeCommUser.Id
                },
                new Announcement
                {
                    Title = "📢 Stajyer Arayan Firma İlanı: Meram Elektrik Dağıtım A.Ş. (MEDAŞ) — Yüksek Gerilim ve SCADA Stajyeri",
                    Content = "İndirici trafo merkezleri, röle koordinasyonu, SCADA uzaktan izleme ve enerji dağıtım şebekelerinde görev alacak Elektrik-Elektronik Mühendisliği stajyerleri aranmaktadır. (Son Başvuru: 20.06.2027) • İletişim: staj@meramedas.com.tr",
                    Category = "CompanyListing",
                    IsPinned = false,
                    IsActive = true,
                    CreatedById = eeCommUser.Id
                });

            db.CompanyListings.Add(new CompanyListing
            {
                Company = eeComp,
                CompanyName = eeComp.Name,
                Title = "Yüksek Gerilim, SCADA ve Enerji Dağıtım Stajyeri",
                Description = "MEDAŞ Konya Bölge Müdürlüğü bünyesinde trafo merkezleri, SCADA otomasyon ve akıllı şebeke projelerinde yer alacak Elektrik-Elektronik Mühendisliği stajyerleri aranmaktadır.",
                Contact = "staj@meramedas.com.tr",
                City = "Konya",
                Deadline = new DateOnly(2027, 6, 20),
                Quota = 6,
                Sector = "Enerji ve Elektrik Dağıtım",
                Department = "SCADA ve Şebeke İşletme",
                IsActive = true,
                CreatedById = eeCommUser.Id
            });
            await db.SaveChangesAsync();
        }

        // Mükerrer açılmış ve başvurusu olmayan (0 başvuru) fazlalık dönem kayıtlarını temizle
        var allTermsWithInterns = await db.Terms.Include(t => t.Internships).ToListAsync();
        foreach (var group in allTermsWithInterns.GroupBy(t => t.InternshipType))
        {
            if (group.Count() > 1)
            {
                foreach (var emptyDup in group.Where(t => t.Internships.Count == 0).ToList())
                {
                    if (group.Count(t => t.Id != emptyDup.Id) >= 1)
                    {
                        db.Terms.Remove(emptyDup);
                    }
                }
            }
        }
        await db.SaveChangesAsync();

        // 5) Tüm belgelerin (Form 2, SPAS, Form 4, Form 7, Maaş Dekontu) diskte (uploads klasörü) gerçek PDF dosyalarının varlığını garanti altına al
        if (pdf is not null)
        {
            var uploadsDir = Path.GetFullPath("uploads");
            Directory.CreateDirectory(uploadsDir);
            var allDocs = await db.Documents
                .Include(d => d.Internship).ThenInclude(i => i.Student)
                .Include(d => d.Internship).ThenInclude(i => i.Company)
                .Include(d => d.Internship).ThenInclude(i => i.Term)
                .ToListAsync();

            foreach (var doc in allDocs)
            {
                var safeName = Path.GetFileName(doc.StoredFileName);
                var fullPath = Path.Combine(uploadsDir, safeName);
                var needsGen = !File.Exists(fullPath) || new FileInfo(fullPath).Length < 2000;
                if (needsGen && doc.Internship is not null)
                {
                    try
                    {
                        var pdfBytes = doc.Type switch
                        {
                            DocumentType.Form2 => pdf.GenerateForm2(doc.Internship),
                            DocumentType.Form3 => pdf.GenerateForm3(doc.Internship),
                            DocumentType.ResultForm => pdf.GenerateForm4(doc.Internship),
                            DocumentType.Form7 => pdf.GenerateForm7(doc.Internship, doc.Internship.EvaluationNote ?? "Staj iptal talebi.", "NÖ", DateOnly.FromDateTime(DateTime.Today)),
                            _ => pdf.GenerateForm2(doc.Internship)
                        };
                        await File.WriteAllBytesAsync(fullPath, pdfBytes);
                        doc.SizeBytes = pdfBytes.LongLength;
                    }
                    catch
                    {
                        // Yoksay
                    }
                }
            }
            await db.SaveChangesAsync();
        }
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
                    AcademicResult = AcademicResultType.Successful,
                    AcceptedDaysCount = 20,
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
            .Include(i => i.Documents).ThenInclude(d => d.Versions)
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
                foreach (var ver in doc.Versions)
                {
                    if (!string.IsNullOrWhiteSpace(ver.StoredFileName))
                        storage.Delete(ver.StoredFileName);
                }
            }
            foreach (var entry in i.LogbookEntries)
            {
                if (!string.IsNullOrWhiteSpace(entry.ImageStoredFileName))
                    storage.Delete(entry.ImageStoredFileName);
            }
            db.Documents.RemoveRange(i.Documents);
            db.LogbookEntries.RemoveRange(i.LogbookEntries);
            db.LeaveRequests.RemoveRange(i.LeaveRequests);
            db.Internships.Remove(i);
        }

        await db.Database.ExecuteSqlRawAsync("DELETE FROM \"Notifications\";");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM \"AuditLogs\";");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM \"EmailLogs\";");
        await db.SaveChangesAsync();
    }
}
