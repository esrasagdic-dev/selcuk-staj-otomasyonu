# T.C. Selçuk Üniversitesi Teknoloji Fakültesi — Staj Yönetim ve Takip Sistemi

Bu proje; **Öğrenci**, **Staj Komisyonu & Bölüm Başkanı**, **Şirket Yetkilisi (Sorumlu Mühendis / Danışman)** ve **KPTO (Kariyer Planlama ve Sigorta Birimi)** olmak üzere 4 temel paneli uçtan uca entegre eden web tabanlı staj otomasyon sistemidir.

---

## 🌿 Git Dal Yapısı

| Dal Adı | Durum | Açıklama |
| :--- | :--- | :--- |
| **`birlesik`** | **Varsayılan (Aktif)** | Faz 0–3 birleştirmesi tamamlanmış, güçlendirilmiş güncel proje sürümü |
| **`main`** | Orijinal (Korunuyor) | Başlangıçtaki temel proje sürümü |
| **`esra`** | Orijinal (Korunuyor) | Referans proje sürümü |

---

## ✨ Öne Çıkan Özellikler (Panellere Göre)

### 1. Öğrenci Paneli
- **Staj 1 & Staj 2 Başvurusu:** Firma havuzundan seçim veya yeni firma kaydı (`webSite`, `taxNumber` dahil), sorumlu mühendis ve staj konusu girişi.
- **Gün-Gün İş Günü Hesaplayıcı:** Resmî tatiller ve dönem bazlı Cumartesi çalışma iznine göre bitiş tarihi hesabı ve gün bazlı detaylı döküm.
- **Otomatik Resmi PDF Üretimi & Zorunlu Belgeler:** Sistem üzerinden QR doğrulama kodlu **Form 2 (Staj Kabul Formu)**, **Form 3**, **Form 4**, **Form 7 (Staj İptal Formu)** ve **Staj Defteri PDF** üretimi; belge sürümleme (`v1`, `v2`, ...) ve komisyon revize taleplerinde yeni sürüm yükleme.
- **Sanal Staj Defteri (Word Rapor Görünümü):** Günlük staj kayıtları, her güne özel görsel yükleme/silme (`5 MB` limitli PNG/JPG/WEBP) ve PDF'e gömme, düzenlenebilir **Kapak Sayfa 2** (toplam çalışan sayısı, 5 faaliyet alanı, 10 kişilik personel tablosu), taslak/kilitleme kontrolleri.
- **İzin / Telafi & SGK Takibi:** Mazeret/rapor izni talepleri, onaylı staj bilgi ekranında **SGK İşe Giriş Tescil No**, **Ek Prim Tescili** ve **SGK Çıkış Belge No** rozetleri.
- **Firma İlanları & Resmi Evrak Rehberi:** Sektör, hedef bölüm ve kontenjan bilgili firma ilanlarından tek tıkla başvuru başlatma; **Resmi Evrak & e-Devlet SPAS Rehberi** sekmesi.

### 2. Staj Komisyonu & Bölüm Başkanı Paneli
- **Başvuru İnceleme & İstatistikler:** Dinamik durum kartları, hızlı belge önizleme (Form 2, SPAS, Form 7, Defter PDF), başvuru **Onay**, **Revize** ve **Red (`Rejected`)** akışı.
- **Belge Bazlı İnceleme & Sürüm Geçmişi:** Yüklenen her belge için ayrı durum güncelleme (`Pending`, `Approved`, `RevisionRequested`, `Rejected`) ve önceki sürümlere erişim.
- **3 Kademeli Akademik Değerlendirme:** Staj sonunda `Başarılı (Tam Kabul)`, `Kısmen Başarılı` (kabul edilen iş günü sayısı girilerek) veya `Başarısız (Kaldı)` kararı.
- **İzin/Telafi & Form 7 İptal Yönetimi:** İzin onayında staj bitiş tarihini otomatik öteleme ve KPTO ek prim sürecini tetikleme; Form 7 iptal taleplerini onaylama veya reddetme.
- **Takvim, Tatil, Simülatör & İletişim:** Dönem açma (Cumartesi izni + otomatik takvim duyurusu yayınlama seçeneği), resmî tatil tanımlama, firma ilanlarında sektör/bölüm/kontenjan yönetimi, **Tarih Simülatörü**, **HTML E-Posta Gönderim Geçmişi** (genel ve staja özel log inceleme) ve Yıllık Staj Arşivi.
- **Bölüm Başkanı Yetkileri:** Personel ve rol/yetki yönetimi.

### 3. Şirket Yetkilisi (Danışman / Sorumlu Mühendis) Paneli
- Başvuru onaylandığında otomatik e-posta ile erişim bilgisi gönderimi.
- Öğrencinin sanal staj defterini ve günlük eklediği görselleri inceleme, eksik/hatalı durumda revize isteme.
- **IP Adresi Damgalı Dijital Onay:** Staj defteri onaylandığında tarih ve danışman IP adresi (`AdvisorApprovedIpAddress`) ile kayıt altına alma.

### 4. KPTO / SGK Sigorta Birimi Paneli (7 Sekme)
1. **Gelenler (Sigorta Bekleyenler):** Opsiyonel **SGK İşe Giriş Tescil / Referans No** girerek sigorta başlatma veya gerekçeli red.
2. **Sigortası Başlatılanlar:** Aktif SGK ve tescil numarası takibi.
3. **Sigortası Başlatılmayanlar:** Tekrar Gelenler listesine alma.
4. **Ek Prim Tescilleri:** İzin/rapor nedeniyle staj süresi uzayan kayıtlar için ek bildirge/referans no ve not işleme.
5. **SGK Çıkış Masası:** Stajını tamamlayan veya Form 7 ile iptal edilen öğrenciler için SGK işten çıkış bildirimi (`SgkExitNo`) işleme.
6. **Maaş Dekontları:** Yüklenen dekontları indirme ve **KPTO Doğrulama** (`Dekontu Doğrula`) işlemi.
7. **SGK Arşivi (Salt Okunur):** Yıla göre (`2025`, `2026`, `2027` veya Tümü) tarihsel arşiv filtreleme ve Excel çıktısı.
- **Gelişmiş Excel / SPAS Dökümü (`.xlsx`):** SGK Tescil No, Ek Prim Tescili ve SGK Çıkış sütunlarını içeren liste ve arşiv dışa aktarma.

### 5. Ortak Güvenlik, Doğrulama & Otomasyon
- **JWT & Rol Bazlı Yetkilendirme:** `Student`, `CommitteeMember`, `DepartmentHead`, `CompanyAdvisor`, `KptoOfficer`, `Admin` politikaları ve yapılandırılabilir CORS ayarları.
- **QR Belge Doğrulama:** Üretilen resmi PDF'lerdeki QR kodu kamera (`html5-qrcode`) veya doğrulama kodu (`GET /api/verify/{code}`) ile anlık doğrulama.
- **Otomatik Süreç Hatırlatmaları:** Sigorta girişi ve rapor teslimi yaklaşan kayıtlar için sistem içi bildirim ve e-posta uyarıları.

---

## 🚀 Kullanılan Teknolojiler & Proje Yapısı

- **Backend (`backend/`):** ASP.NET Core 8 Web API — Clean Architecture (`Staj.Domain`, `Staj.Application`, `Staj.Infrastructure`, `Staj.Api`), Entity Framework Core 8
- **Veritabanı:** PostgreSQL 16 (Docker ortamında varsayılan) ve SQLite (lokal geliştirme desteği)
- **Frontend (`frontend/`):** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Axios, Lucide Icons
- **PDF & QR Kod:** QuestPDF + QRCoder (Backend), `html5-qrcode` (Frontend)
- **Excel (SPAS/SGK Dökümü):** ClosedXML (`.xlsx`)
- **E-Posta (SMTP Test & Loglama):** MailKit + MailHog (`http://localhost:8025`) ve HTML E-Posta log tablosu (`EmailLogs`)
- **Dosya Saklama:** Yüklenen evrak ve defter görselleri diskte (`uploads/` klasöründe) `GUID` isimle saklanır.

---

## 🐳 Docker ile Tek Komutta Çalıştırma (Önerilen)

İsteğe bağlı olarak `.env.example` dosyasını `.env` olarak kopyalayabilirsiniz:

```bash
cp .env.example .env
```

Ardından `staj-sistemi` klasöründe aşağıdaki komutu çalıştırın:

```bash
docker compose up --build -d
```

Servisler ayağa kalktığında:
- **Web Arayüzü (Frontend):** http://localhost:3000
- **Backend API & Swagger:** http://localhost:5000/swagger
- **MailHog (Giden Şifre ve Bildirim E-postaları):** http://localhost:8025
- **PostgreSQL Veritabanı:** `localhost:5432` (`staj_db`, kullanıcı: `postgres`, şifre: `postgres123`)

Durdurmak için:

```bash
docker compose down
```

Veritabanı ve yüklenen dosyaları sıfırlayarak temizlemek için:

```bash
docker compose down -v
```

---

## 💻 Geliştirme Ortamında (Lokal) Çalıştırma

1. Sadece PostgreSQL ve MailHog'u Docker ile başlatın:
   ```bash
   docker compose up -d db mailhog
   ```
2. **Backend'i çalıştırın:**
   ```bash
   cd backend
   dotnet run --project Staj.Api --urls http://localhost:5000
   ```
3. **Frontend'i çalıştırın:**
   ```bash
   cd frontend
   npm.cmd run dev
   ```
   *(Linux/macOS ortamında `npm run dev` kullanabilirsiniz.)*

   Tarayıcıdan http://localhost:3000 adresine gidin.

---

## 🔑 Hazır Sunum / Demo Hesapları (Şifre: `123456`)

Giriş ekranındaki **"Tek Tıkla Hızlı Giriş"** butonlarıyla veya aşağıdaki bilgilerle oturum açabilirsiniz:

| Panel | Rol | Adı / Açıklama | E-Posta | Şifre |
| :--- | :--- | :--- | :--- | :--- |
| **1. Öğrenci Paneli** | Öğrenci | Ahmet Özkan *(İlk giriş kılavuzu açık)* | `233311056@ogr.selcuk.edu.tr` | `123456` |
| **1b. Öğrenci Paneli** | Öğrenci | Zeynep Arslan | `zeynep@ogr.selcuk.edu.tr` | `123456` |
| **2. Komisyon Paneli** | Komisyon Üyesi | Doç. Dr. Ayşe Kaya | `komisyon@selcuk.edu.tr` | `123456` |
| **2b. Bölüm Başkanı** | Süper Yetkili | Prof. Dr. Mehmet Yılmaz | `bolumbaskani@selcuk.edu.tr` | `123456` |
| **3. Şirket Paneli** | İşyeri Danışmanı | Yük. Müh. Burak Çelik *(Aselsan Konya)* | `danisman@aselsankonya.com.tr` | `123456` |
| **4. KPTO Paneli** | Sigorta Birimi | Mustafa Demir *(KPTO Sigorta)* | `kpto@selcuk.edu.tr` | `123456` |
