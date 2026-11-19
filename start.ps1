Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Selçuk Üniversitesi Staj Takip ve Otomasyon Sistemi v2.1" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Backend API (ASP.NET Core Web API) baslatiliyor..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\SelcukStaj.Api'; dotnet run --urls http://localhost:5000"

Start-Sleep -Seconds 3

Write-Host "[2/2] Frontend (React + Vite) baslatiliyor..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; npm run dev"

Write-Host ""
Write-Host "Sistem basariyla baslatildi!" -ForegroundColor Cyan
Write-Host "Tarayicinizdan asagidaki adresi acabilirsiniz:" -ForegroundColor Yellow
Write-Host "👉 http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Demo Giris Bilgileri (Sifre: Selcuk123!):" -ForegroundColor Magenta
Write-Host "• Ogrenci: ogrenci@selcuk.edu.tr" -ForegroundColor White
Write-Host "• Komisyon: komisyon@selcuk.edu.tr" -ForegroundColor White
Write-Host "• KPTO Sigorta: kpto@selcuk.edu.tr" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
