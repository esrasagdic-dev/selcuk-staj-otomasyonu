import React from 'react';
import { DiaryEntry } from '../types';
import selcukHeaderLogo from '../assets/selcuk_header_logo.png';
import selcukKapakLogo from '../assets/selcuk_kapak_logo.png';

export interface PrintableOfficialDiaryProps {
  studentName?: string;
  studentNumber?: string;
  department?: string;
  faculty?: string;
  internshipType?: string; // 'Staj 1' | 'Staj 2'
  academicYear?: string;
  workplaceName?: string;
  workplaceAddress?: string;
  workplaceCity?: string;
  workplacePhone?: string;
  workplaceEmail?: string;
  workplaceWebSite?: string;
  workplaceSector?: string;
  totalEmployees?: string;
  activityAreas?: string[];
  staffMembers?: Array<{
    rowNo?: number;
    fullName: string;
    graduatedUniversityAndDepartment: string;
    titleOrPosition: string;
  }>;
  advisorName?: string;
  advisorTitle?: string;
  advisorDepartment?: string;
  advisorEmail?: string;
  advisorPhone?: string;
  hasApproved?: boolean;
  approvedAt?: string;
  entries: DiaryEntry[];
}

export const PrintableOfficialDiary: React.FC<PrintableOfficialDiaryProps> = ({
  studentName = 'Öğrenci Adı Soyadı',
  studentNumber = 'Öğrenci No',
  department = 'Bilgisayar Mühendisliği Bölümü',
  faculty = 'Teknoloji Fakültesi',
  internshipType = 'Staj 1',
  academicYear = '2026 - 2027',
  workplaceName = 'Kurum / Firma Adı',
  workplaceAddress = 'İş Yeri Adresi',
  workplaceCity = 'Konya',
  workplacePhone = '0332 000 00 00',
  workplaceEmail = '',
  workplaceWebSite = 'www.kurum.com.tr',
  workplaceSector = 'Yazılım ve Bilgi Teknolojileri',
  totalEmployees = '50+',
  advisorName = 'Müh. Serdar Keskin',
  advisorTitle = 'Sorumlu Mühendis',
  advisorDepartment = 'Bilgisayar Mühendisliği',
  advisorEmail = '',
  activityAreas,
  staffMembers,
  hasApproved = false,
  approvedAt,
  entries = []
}) => {
  const sortedEntries = [...entries]
    .filter(e => !e.isDraft)
    .sort((a, b) => a.dayNumber - b.dayNumber);

  const displayType = internshipType.includes('2') ? 'Staj II' : 'Staj I';

  const defaultActivities = [
    'Yazılım Geliştirme, Sistem Analizi ve Kurumsal Bilişim Çözümleri',
    'Web, Mobil ve Bulut Tabanlı Dağıtık Servis Mimarileri',
    'Veri Tabanı Yönetim Sistemleri ve İş Zekâsı / Analitik',
    'Yapay Zekâ, Makine Öğrenmesi ve Otomasyon Teknolojileri',
    'Bilgi Güvenliği, Ağ Altyapısı ve DevOps Süreçleri'
  ];

  const displayActivities = (activityAreas && activityAreas.length === 5)
    ? activityAreas
    : defaultActivities;

  const defaultStaff = [
    {
      fullName: advisorName,
      graduatedUniversityAndDepartment: advisorDepartment || 'Selçuk Üniversitesi Bilgisayar Mühendisliği',
      titleOrPosition: advisorTitle || 'Sorumlu Mühendis'
    },
    {
      fullName: 'Müh. Can Demir',
      graduatedUniversityAndDepartment: 'Selçuk Üniversitesi Bilgisayar Mühendisliği',
      titleOrPosition: 'Kıdemli Yazılım Mimarı'
    },
    {
      fullName: 'Müh. Ayşe Çelik',
      graduatedUniversityAndDepartment: 'Hacettepe Üniversitesi Bilgisayar Mühendisliği',
      titleOrPosition: 'Veri Tabanı Yöneticisi'
    },
    {
      fullName: 'Müh. Emre Yılmaz',
      graduatedUniversityAndDepartment: 'ODTÜ Bilgisayar Mühendisliği',
      titleOrPosition: 'DevOps ve Bulut Mühendisi'
    },
    {
      fullName: 'Müh. Selin Doğan',
      graduatedUniversityAndDepartment: 'İTÜ Yazılım Mühendisliği',
      titleOrPosition: 'Mobil Yazılım Uzmanı'
    }
  ];

  const displayStaff = (staffMembers && staffMembers.length > 0)
    ? staffMembers
    : defaultStaff;

  return (
    <div className="hidden print:block font-serif text-slate-900 bg-white">
      {/* 
        Print Specific CSS Rules:
        - Exact A4 Size: 210mm x 297mm
        - Margins: 10mm top/bottom, 12mm left/right
        - Strict 1 Page Per Day Guarantee via .print-page-exact 
      */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, nav, footer, .navbar, .no-print, [data-no-print="true"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page-exact {
            page-break-before: always !important;
            page-break-after: always !important;
            break-before: page !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 266mm !important;
            max-height: 266mm !important;
            min-height: 266mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-page-exact:first-of-type {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
          .print-page-exact:last-of-type {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* SAYFA 1: SELÇUK ÜNİVERSİTESİ ORİJİNAL STAJ RAPOR KAPAĞI (kapak.docx)      */}
      {/* ========================================================================= */}
      <div className="print-page-exact border-[2.5px] border-black p-8 text-center flex flex-col justify-between">
        
        {/* Üst Üniversite ve Logo Alanı */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-center">
            <img 
              src={selcukHeaderLogo} 
              alt="Selçuk Üniversitesi Amblemi" 
              className="h-24 w-auto object-contain mx-auto"
            />
          </div>
          
          <div className="space-y-1 tracking-wider">
            <div className="text-base font-bold">T.C.</div>
            <div className="text-xl font-bold">SELÇUK ÜNİVERSİTESİ</div>
            <div className="text-base font-bold uppercase">{faculty.toUpperCase()}</div>
            <div className="text-base font-bold uppercase">{department.toUpperCase()}</div>
          </div>
        </div>

        {/* Orta Öğrenci ve Staj Başlık Alanı */}
        <div className="space-y-8 my-auto py-8">
          <div className="border-y-2 border-black py-4 max-w-md mx-auto">
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-700">
              Öğrenci Numarası, Adı ve Soyadı
            </div>
            <div className="text-lg font-bold mt-1.5 tracking-wide">
              {studentNumber} • {studentName}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-3xl font-extrabold tracking-widest uppercase">
              {displayType}
            </div>
            <div className="text-2xl font-bold tracking-widest uppercase">
              RAPORU
            </div>
          </div>
        </div>

        {/* Alt Tarih ve Şehir Alanı */}
        <div className="pb-6 space-y-1 font-bold text-sm tracking-widest">
          <div>{academicYear}</div>
          <div>KONYA</div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SAYFA 2: İŞYERİ VE PERSONEL TANITIM TABLOLARI (kapak.docx Sayfa 2)        */}
      {/* ========================================================================= */}
      <div className="print-page-exact border-[2px] border-black p-6 text-xs flex flex-col justify-between">
        
        <div className="space-y-4">
          <div className="text-center font-bold text-sm tracking-wider uppercase border-b-2 border-black pb-2">
            İŞYERİ BİLGİLERİ VE PERSONEL TANITIM FORMU
          </div>

          {/* İŞYERİ BİLGİLERİ TABLOSU */}
          <table className="w-full border-collapse border border-black text-xs">
            <tbody>
              <tr>
                <td className="w-1/3 border border-black p-2 font-bold bg-slate-100">İŞYERİ ADI</td>
                <td className="border border-black p-2 font-semibold">{workplaceName}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold bg-slate-100">İŞYERİ YETKİLİSİ</td>
                <td className="border border-black p-2">{advisorName} ({advisorTitle})</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold bg-slate-100">ADRESİ</td>
                <td className="border border-black p-2">{workplaceAddress}, {workplaceCity}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold bg-slate-100">WEB ADRESİ</td>
                <td className="border border-black p-2">{workplaceWebSite}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold bg-slate-100">TELEFONU</td>
                <td className="border border-black p-2">{workplacePhone}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold bg-slate-100">E-POSTA</td>
                <td className="border border-black p-2">{workplaceEmail || advisorEmail || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold bg-slate-100">TOPLAM ÇALIŞAN SAYISI</td>
                <td className="border border-black p-2">{totalEmployees}</td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black p-2 font-bold bg-slate-100 text-center uppercase">
                  İŞYERİ FAALİYET ALANLARI
                </td>
              </tr>
              {displayActivities.slice(0, 5).map((act, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1.5">{act}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PERSONEL TANITIMI TABLOSU */}
          <div className="space-y-1 pt-1">
            <div className="font-bold text-center border-t border-black pt-1 uppercase text-[11px]">
              PERSONEL TANITIMI (Mühendis ve Teknik Kadro)
            </div>
            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-black p-1.5 w-12">SIRA NO</th>
                  <th className="border border-black p-1.5 w-44">ADI SOYADI</th>
                  <th className="border border-black p-1.5">MEZUN OLDUĞU ÜNİVERSİTE / FAKÜLTE / BÖLÜM BİLGİLERİ</th>
                  <th className="border border-black p-1.5 w-40">GÖREVİ</th>
                </tr>
              </thead>
              <tbody>
                {displayStaff.slice(0, 10).map((staff, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-bold">{staff.fullName}</td>
                    <td className="border border-black p-1.5">{staff.graduatedUniversityAndDepartment}</td>
                    <td className="border border-black p-1.5 font-semibold">{staff.titleOrPosition}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 10 - displayStaff.length) }, (_, i) => displayStaff.length + i + 1).map(num => (
                  <tr key={num}>
                    <td className="border border-black p-1.5 text-center font-bold">{num}</td>
                    <td className="border border-black p-1.5 text-slate-400">..............................</td>
                    <td className="border border-black p-1.5 text-slate-400">....................................................................................</td>
                    <td className="border border-black p-1.5 text-slate-400">..............................</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Onay Mührü */}
        <div className="border-t border-black pt-2 flex justify-between items-center text-[10px] text-slate-500">
          <span>Selçuk Üniversitesi Staj Bilgi Sistemi • Resmî İş Yeri Künyesi</span>
          <span>Kaşe / İmza Onayı</span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SAYFALAR: HER İŞ GÜNÜ İÇİN TAM 1 SAYFA (sayfa.docx Orijinal Şablonu)       */}
      {/* ========================================================================= */}
      {sortedEntries.map((entry) => (
        <div 
          key={entry.dayNumber} 
          className="print-page-exact border-[2px] border-black p-5 flex flex-col justify-between"
        >
          {/* 1. ÜST BİLGİ TABLOSU (sayfa.docx Orijinal Header Tablosu) */}
          <table className="w-full border-collapse border-[1.5px] border-black text-xs">
            <tbody>
              <tr>
                {/* Logo Hücresi (Sol) */}
                <td rowSpan={2} className="border border-black p-2 w-[22%] text-center align-middle bg-white">
                  <img 
                    src={selcukHeaderLogo} 
                    alt="Logo" 
                    className="h-14 w-auto object-contain mx-auto"
                  />
                </td>

                {/* Kurum ve Bölüm Başlığı (Orta) */}
                <td rowSpan={2} className="border border-black p-2 text-center align-middle w-[52%]">
                  <div className="font-bold text-[10pt] leading-tight">
                    T.C.<br />
                    SELÇUK ÜNİVERSİTESİ<br />
                    {faculty.toUpperCase()}<br />
                    {department.toUpperCase()}<br />
                    <span className="text-[10.5pt] tracking-widest mt-0.5 inline-block">STAJ RAPORU</span>
                  </div>
                </td>

                {/* Tarih Etiketi */}
                <td className="border border-black p-1 font-bold text-center w-[12%] bg-slate-100 text-[9.5pt]">
                  Tarih
                </td>
                {/* Tarih Değeri */}
                <td className="border border-black p-1 text-center w-[14%] font-semibold text-[9.5pt]">
                  {new Date(entry.entryDate).toLocaleDateString('tr-TR')}
                </td>
              </tr>
              <tr>
                {/* Sayfa No Etiketi */}
                <td className="border border-black p-1 font-bold text-center bg-slate-100 text-[9.5pt]">
                  Sayfa No:
                </td>
                {/* Sayfa No Değeri */}
                <td className="border border-black p-1 text-center font-bold text-[10.5pt]">
                  {entry.dayNumber}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 2. GÜNLÜK ÇALIŞMA RAPOR ALANI (sayfa.docx Belge Gövdesi) */}
          <div className="flex-1 flex flex-col justify-between border-x-[1.5px] border-black p-3.5 overflow-hidden my-0">
            {/* Konu Başlığı */}
            <div className="pb-1.5 border-b border-black text-xs font-bold uppercase tracking-wide">
              <span>Konu / Yapılan Çalışma: </span>
              <span className="font-serif normal-case">{entry.title}</span>
            </div>

            {/* Çalışma Raporu Metni (Arial / Times New Roman standart hizalama) */}
            <div className="text-[10.5pt] leading-[1.55] text-justify whitespace-pre-line pt-2.5 font-serif flex-1 overflow-hidden">
              {entry.content}
            </div>

            {/* Her Güne Ait Teknik Şema / Görsel (Eğer o gün için görsel eklenmişse) */}
            {entry.imageUrlFull && (
              <div className="pt-2 pb-1 text-center mt-auto border-t border-slate-200">
                <div className="max-h-36 flex items-center justify-center overflow-hidden border border-slate-300 p-1 rounded bg-slate-50 mx-auto max-w-md">
                  <img 
                    src={entry.imageUrlFull} 
                    alt={`Gün ${entry.dayNumber}`}
                    className="max-h-32 w-auto object-contain mx-auto"
                  />
                </div>
                <div className="text-[9pt] text-slate-700 italic pt-0.5 font-serif">
                  {entry.imageCaption || `Şekil ${entry.dayNumber}: ${entry.title}`}
                </div>
              </div>
            )}
          </div>

          {/* 3. ALT BİLGİ ONAY TABLOSU (sayfa.docx Orijinal Footer Tablosu) */}
          <table className="w-full border-collapse border-[1.5px] border-black text-xs">
            <tbody>
              <tr>
                {/* Sol Sistem Takip Kodu */}
                <td className="border border-black p-2 text-left align-middle w-[55%] text-[9.5pt] text-slate-600 bg-slate-50/80">
                  <div className="font-semibold text-slate-800">
                    {displayType} • {studentNumber} - {studentName}
                  </div>
                  <div className="text-[9pt] text-slate-500">
                    Kontrol Kodu: SÜ-STJ-{entry.dayNumber.toString().padStart(2, '0')} • Bilgisayar Mühendisliği Bölümü
                  </div>
                </td>

                {/* Sağ Staj Sorumlusu Onay Kutusu */}
                <td className="border border-black p-2 text-center align-middle w-[45%] bg-white space-y-1">
                  <div className="font-bold text-[10pt] uppercase tracking-wider">
                    STAJ SORUMLUSU
                  </div>
                  <div className="text-[9pt] text-slate-600 font-semibold">
                    Onay (İmza & Kaşe)
                  </div>
                  <div className="text-[9.5pt] font-semibold text-slate-800 pt-0.5">
                    {hasApproved ? (
                      <span className="text-emerald-800">
                        ✓ Dijital Olarak Onaylandı ({new Date(approvedAt || entry.entryDate).toLocaleDateString('tr-TR')})
                      </span>
                    ) : (
                      <span className="text-slate-500 tracking-wider">
                        ....... / …… / 20…..
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      ))}
    </div>
  );
};
