# T.C. Selçuk Üniversitesi — Staj Yönetim ve Takip Sistemi

Bu proje; **Öğrenci**, **Staj Komisyonu / Bölüm Başkanı**, **Şirket Yetkilisi (Advisor)** ve **KPTO (Sigorta Birimi)** olmak üzere 4 temel paneli uçtan uca entegre eden web tabanlı staj otomasyon sistemidir.

## 🚀 Kullanılan Teknolojiler

- **Backend:** ASP.NET Core 8 Web API (Clean Architecture: `Domain`, `Application`, `Infrastructure`, `Api`), Entity Framework Core 8, PostgreSQL 16
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Axios, Lucide Icons
- **PDF & QR Kod:** QuestPDF + QRCoder (Backend), `html5-qrcode` (Frontend)
- **Excel (SPAS/SGK Dökümü):** ClosedXML (`.xlsx`)
- **E-Posta (SMTP Test):** MailKit + MailHog (`http://localhost:8025`)
- **Dosya Saklama:** Veritabanını şişirmemek için PDF ve görseller diskte (`uploads/` klasöründe) `GUID` isimle saklanır.

---

## 🐳 Docker ile Tek Komutta Çalıştırma (Önerilen)

`staj-sistemi` klasöründe terminali açıp aşağıdaki komutu çalıştırın:

```bash
docker compose up --build -d
```

Servisler ayağa kalktığında:
- **Web Arayüzü (Frontend):** http://localhost:3000
- **Backend API & Swagger:** http://localhost:5000/swagger
- **MailHog (Giden Şifre ve Bildirim E-postaları):** http://localhost:8025
- **PostgreSQL Veritabanı:** `localhost:5432` (`staj_db`, kullanıcı: `postgres`, şifre: `postgres123`)

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
   Tarayıcıdan http://localhost:3000 adresine gidin.

---

## 🔑 Hazır Sunum / Demo Hesapları (Şifre: `123456`)

Giriş ekranındaki **"Tek Tıkla Hızlı Giriş"** butonlarıyla veya aşağıdaki bilgilerle oturum açabilirsiniz:

| Panel | Rol | E-Posta | Şifre |
| :--- | :--- | :--- | :--- |
| **1. Öğrenci Paneli** | Öğrenci (Ahmet Özkan) | `ahmet@ogr.selcuk.edu.tr` | `123456` |
| **2. Komisyon Paneli** | Komisyon Üyesi | `komisyon@selcuk.edu.tr` | `123456` |
| **2b. Bölüm Başkanı** | Süper Yetkili | `bolumbaskani@selcuk.edu.tr` | `123456` |
| **3. Şirket Paneli** | İşyeri Danışmanı | `danisman@aselsankonya.com.tr` | `123456` |
| **4. KPTO Paneli** | Sigorta Birimi | `kpto@selcuk.edu.tr` | `123456` |
