import React from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FolderCheck,
  ShieldCheck,
} from 'lucide-react';
import { downloadBlob, type InternshipDetailDto } from '../api';

interface Props {
  selectedInternship: InternshipDetailDto | null;
  studentNo: string;
  onGoToDocuments?: () => void;
}

export const OfficialDocumentsView: React.FC<Props> = ({
  selectedInternship,
  studentNo,
  onGoToDocuments,
}) => {
  const spasSteps = [
    'e-Devlet Kapısı (turkiye.gov.tr) hesabınıza T.C. Kimlik Numaranız ve şifreniz ile giriş yapınız.',
    'Arama çubuğuna "SPAS Müstehaklık Sorgulama (Sağlık Provizyon Aktivasyon Sistemi)" yazarak ilgili hizmete giriniz.',
    'Kendi kimlik bilgileriniz için sorgulama yapınız; ekranda "Sağlık hizmetinden yararlanabilir / Müstehaktır" ibaresinin yer aldığını kontrol ediniz.',
    'Sayfanın sağ üst köşesinde bulunan "Barkodlu Belge Oluştur" ve "Dosyayı İndir (PDF)" butonunu kullanarak resmi barkodlu PDF belgesini cihazınıza indiriniz.',
    'İndirdiğiniz barkodlu SPAS PDF belgesini Zorunlu Belgeler Panelinden Form 2 ile birlikte sisteme yükleyiniz.',
  ];

  const rules = [
    {
      title: 'Zorunlu Staj Süresi (Staj 1 & Staj 2)',
      desc: 'Selçuk Üniversitesi Teknoloji Fakültesi Bilgisayar Mühendisliği öğrencileri mezuniyet için Staj 1 (min. 20 iş günü) ve Staj 2 (min. 20 iş günü) olmak üzere toplam 40 iş günü staj yapmak zorundadır.',
    },
    {
      title: '5510 Sayılı Kanun 5/b SGK Sigortası',
      desc: 'KPTO (Kariyer Planlama ve Sigorta Birimi) tarafından tüm öğrencilerin İş Kazası ve Meslek Hastalığı sigortası staj başlangıcından önce yapılır. Sigorta onayı gelmeden fiilen staja başlanamaz.',
    },
    {
      title: 'Cumartesi Çalışması ve Resmi Tatiller',
      desc: 'İşyeri Cumartesi günleri açık ise (ve ilgili dönemde Komisyon tarafından izin verildiyse) Cumartesi iş günü sayılır. Pazar günleri ve resmî tatiller sistem hesaplayıcısı tarafından otomatik olarak düşülür.',
    },
    {
      title: 'İzin / Rapor Telafisi & Ek Prim Tescili',
      desc: 'Sağlık raporu veya mazeret izni alınan günler staj süresinden sayılmaz; Komisyon onayı ile staj bitiş tarihine eklenir ve KPTO SGK ek prim tescili yapar.',
    },
    {
      title: 'Sanal Staj Defteri & Sorumlu Mühendis Onayı',
      desc: 'Her iş günü için rapor sayfası doldurulur ve gerekirse günlük teknik şema/görsel eklenir. Tüm günler "Tamamlandı" durumuna getirilmeden sorumlu mühendis onayına gönderilemez.',
    },
    {
      title: 'Evrak Doğrulama (QR Kod)',
      desc: 'Sistem üzerinden üretilen Form 2 ve Sanal Staj Defteri belgeleri benzersiz QR doğrulama kodu taşır; kurumlar tarafından herkese açık doğrulama ekranından teyit edilebilir.',
    },
  ];

  const catalog = [
    {
      code: 'FORM-2 • TF-BM-SF-02',
      title: 'Staj Kabul Formu (Form 2)',
      stage: 'Başvuru Aşaması',
      desc: 'Öğrenci, işyeri, sorumlu mühendis ve bölüm onaylarının yer aldığı temel kabul formu. Islak imzalı/kaşeli olarak SPAS ile yüklenir.',
      endpoint: selectedInternship ? `/internships/${selectedInternship.id}/pdf/form2` : null,
      fileName: `Form2_${studentNo}_${selectedInternship?.type ?? 'Staj'}.pdf`,
    },
    {
      code: 'FORM-3 • TF-BM-SF-03',
      title: 'Staj Devamlılık Formu (Form 3)',
      stage: 'Staj Süreci / Sonu',
      desc: 'İşyeri yetkilisi tarafından günlük devam durumunun takip edildiği ve staj sonunda imzalandığı devam çizelgesi.',
      endpoint: selectedInternship ? `/internships/${selectedInternship.id}/pdf/form3` : null,
      fileName: `Form3_Devamlilik_${studentNo}.pdf`,
    },
    {
      code: 'FORM-4 • TF-BM-SF-04',
      title: 'İşyeri Staj Değerlendirme Formu (Form 4)',
      stage: 'Staj Sonu',
      desc: 'Sorumlu mühendis / işyeri yetkilisi tarafından stajyer performansını değerlendirmek için doldurulup onaylanan resmi sonuç formu.',
      endpoint: selectedInternship ? `/internships/${selectedInternship.id}/pdf/form4` : null,
      fileName: `Form4_Degerlendirme_${studentNo}.pdf`,
    },
    {
      code: 'TF-BM-SF-02a',
      title: 'Sanal Staj Defteri (Kapak + Tanıtım + Günler)',
      stage: 'Staj Süreci / Sonu',
      desc: 'Kapak Sayfası, İşyeri & 10 Satırlık Personel Tanıtımı ve günlük görselli staj sayfalarından oluşan birleştirilmiş PDF.',
      endpoint: selectedInternship ? `/internships/${selectedInternship.id}/pdf/logbook` : null,
      fileName: `StajDefteri_${studentNo}_${selectedInternship?.type ?? 'Staj'}.pdf`,
    },
    {
      code: 'FORM-7 • TF-BM-SF-07',
      title: 'Staj İptal Formu (Form 7)',
      stage: 'İptal Talebi Halinde',
      desc: 'Mücbir sebeple stajını sonlandırmak isteyen öğrenciler tarafından mazeret belirtilerek Komisyona ve KPTO çıkış masasına iletilen dilekçe.',
      endpoint: selectedInternship ? `/internships/${selectedInternship.id}/pdf/form7` : null,
      fileName: `Form7_Staj_Iptal_${studentNo}.pdf`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. e-Devlet SPAS Belgesi Alma Rehberi */}
      <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                e-Devlet SPAS Müstehaklık Belgesi Nasıl Alınır?
              </h3>
              <p className="text-xs text-slate-500">
                SGK staj sigortası girişiniz için zorunlu olan barkodlu SPAS belgesi alma adımları
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.turkiye.gov.tr/spas-mustahaklik-sorgulama"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              e-Devlet SPAS Sayfasına Git
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {onGoToDocuments && (
              <button
                type="button"
                onClick={onGoToDocuments}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
              >
                <FolderCheck className="h-3.5 w-3.5" />
                Belge Yükleme Ekranına Geç
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
          {spasSteps.map((step, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-700 text-xs font-extrabold text-white">
                {idx + 1}
              </span>
              <p className="text-slate-700 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            <b>Önemli Uyarı:</b> Ekran görüntüsü (screenshot) veya barkodsuz sorgu çıktıları KPTO Sigorta Birimi tarafından kabul edilmemektedir. Lütfen mutlaka <b>"Barkodlu Belge Oluştur"</b> ile indirdiğiniz orijinal PDF dosyasını yükleyiniz.
          </span>
        </div>
      </div>

      {/* 2. Resmi Staj Yönergesi Özeti */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Selçuk Üniversitesi Teknoloji Fakültesi Resmi Staj Yönergesi Özeti
            </h3>
            <p className="text-xs text-slate-500">
              Başvuru, sigorta, devamlılık ve değerlendirme aşamalarında uyulması gereken temel esaslar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rules.map((r, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-blue-950">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{r.title}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Resmi Formlar ve Şablonlar Kataloğu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Resmi Staj Formları ve PDF Şablonları Kataloğu
              </h3>
              <p className="text-xs text-slate-500">
                {selectedInternship
                  ? `Aktif seçili başvurunuz (${selectedInternship.type === 'Staj1' ? 'Staj 1' : 'Staj 2'} — ${selectedInternship.companyName}) bilgileriyle hazır PDF'leri indirebilirsiniz.`
                  : 'İndirme butonlarını kullanmak için önce bir staj başvurusu oluşturunuz.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {catalog.map((item) => (
            <div
              key={item.code}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                    {item.code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">{item.stage}</span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="mt-1 text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!item.endpoint}
                  onClick={() => {
                    if (item.endpoint) downloadBlob(item.endpoint, item.fileName);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download className="h-3.5 w-3.5" />
                  {item.endpoint ? 'Hazır PDF İndir' : 'Başvuru Gerekli'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
