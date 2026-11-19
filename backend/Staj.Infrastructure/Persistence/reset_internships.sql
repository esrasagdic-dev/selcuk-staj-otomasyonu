-- ============================================================================
-- STAJ YÖNETİM SİSTEMİ - TEST STAJ VERİLERİNİ SIFIRLAMA BETİĞİ (SQLite & PostgreSQL)
-- ============================================================================
-- Bu betik; temel kullanıcı hesaplarına (Users), staj dönemlerine (Terms),
-- resmi tatillere (Holidays), firma havuzuna (Companies) ve firma ilanlarına (CompanyListings)
-- DOKUNMADAN, yalnızca tüm staj başvurularını, bunlara bağlı üretilmiş test belgelerini
-- (Form 2, Form 7, SPAS vb.), sanal staj defteri sayfalarını, izin taleplerini ve
-- staj bildirim/denetim geçmişini tamamen temizler.
-- ============================================================================

BEGIN TRANSACTION;

-- 1. Staj başvurularına bağlı yüklenen/üretilen belge kayıtlarını (Form 2, Form 7, SPAS, Dekont, Sonuç Formu) temizle
DELETE FROM "Documents";

-- 2. Sanal staj defteri (günlük rapor sayfası) kayıtlarını temizle
DELETE FROM "LogbookEntries";

-- 3. Staj izin ve sağlık raporu / telafi taleplerini temizle
DELETE FROM "LeaveRequests";

-- 4. Staj süreç bildirimlerini ve denetim geçmişini temizle
DELETE FROM "Notifications";
DELETE FROM "AuditLogs";

-- 5. Tüm staj başvuru ve onay kayıtlarını temizle
DELETE FROM "Internships";

COMMIT;
