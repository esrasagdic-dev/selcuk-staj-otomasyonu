# Selçuk Üniversitesi Bilgisayar Mühendisliği
## Staj Süreç Yönetimi ve Otomasyon Sistemi (v2.1)

Bu proje, Selçuk Üniversitesi Bilgisayar Mühendisliği staj yönergesi ve Sürüm 2.1 (14 Ekim 2026) resmî teknik şartnamesi uyarınca geliştirilmiş tam teşekküllü bir bitirme projesidir.

---

## 🐳 Docker ile Tek Komutta Çalıştırma (Sanal Makine / VM Mimarisi)

Şartnamede belirtilen **"Tek bir sanal makinede (VM) çalışabilme"** şartını karşılamak üzere proje eksiksiz Docker ve Docker Compose desteğine sahiptir.

### 1. Çalıştırma:
Proje dizininde şu komutu çalıştırınız:
```bash
docker compose up --build -d
```

Bu komut:
1. `backend` servisini (.NET 9 Web API) derler ve başlatır (Port: 5000).
2. `frontend` servisini (React + Vite + Nginx Reverse Proxy) derler ve başlatır (Port: 80 / 8080).
3. `selcuk_staj_db_data` ve `selcuk_staj_file_uploads` kalıcı birimlerini (volumes) oluşturur.

### 2. Tarayıcıdan Erişim:
* **Frontend Web Uygulaması:** [http://localhost](http://localhost) veya [http://localhost:8080](http://localhost:8080)
* **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)

### 3. Durdurma:
```bash
docker compose down
```

---

## 💻 Yerel Olarak (Docker'sız) Çalıştırma

PowerShell üzerinden hazır başlatıcıyı çalıştırabilirsiniz:
```powershell
.\start.ps1
```
* **Frontend:** http://localhost:5173
* **Backend API:** http://localhost:5000

---

## 🔑 Hazır Test Kullanıcıları (Parola: `Selcuk123!`)
* 🎓 **Öğrenci:** `ogrenci@selcuk.edu.tr`
* 🏛️ **Komisyon & Bölüm Başkanı:** `komisyon@selcuk.edu.tr`
* 🛡️ **KPTO Sigorta Birimi:** `kpto@selcuk.edu.tr`
* 🏢 **İşyeri Advisor:** Ekranda *"İşyeri Advisor Görünümü"* butonuna basıp defteri inceleyebilirsiniz.
