import React from 'react';
import { 
  FileText, Download, ExternalLink, ShieldCheck, 
  BookOpen, HelpCircle, FileCheck2, Info, AlertTriangle
} from 'lucide-react';

export const OfficialDocumentsView: React.FC = () => {
  const forms = [
    {
      code: 'FORM 1',
      title: 'Staj Başvuru Formu',
      description: 'Zorunlu staj belgesi isteyen firmalara verilmek üzere öğrencinin bölüme başvururken kullanabileceği formdur.',
      format: 'DOCX',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/20cc07d5-2b6d-4d06-bf49-bc75137e0e1f.docx',
      isMandatory: false
    },
    {
      code: 'FORM 2',
      title: 'Staj Kabul Formu (Temel Belge)',
      description: 'Öğrencinin ve firmanın doldurarak karşılıklı kaşe ve imza altına aldığı en temel başvuru evrakıdır. Staj I ve II için ayrı düzenlenir.',
      format: 'DOCX',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/acc5d186-86ba-4b72-a545-75190ef6779d.docx',
      isMandatory: true
    },
    {
      code: 'FORM 3',
      title: 'Staj Devam Formu',
      description: 'Staj süresince öğrencinin işe devam durumunun günlük olarak sorumlu yetkiliye imzalatıldığı devam çizelgesidir.',
      format: 'DOCX',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/4f290463-91e7-4a35-9494-51affddd584d.docx',
      isMandatory: true
    },
    {
      code: 'FORM 4',
      title: 'Staj Değerlendirme Formu (Kapalı Zarf)',
      description: 'Staj bitiminde işyeri yetkilisinin puanlama yaparak kaşe/imzalı kapalı ve mühürlü zarf içerisine koyup teslim ettiği resmi not formudur.',
      format: 'DOCX',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/539add46-aa67-4b17-a221-0a71e14adbbc.docx',
      isMandatory: true
    },
    {
      code: 'FORM 7',
      title: 'Staj İptal Formu',
      description: 'Stajı yapmaktan vazgeçen, bırakan veya işyeri değişikliği yapan öğrencilerin sigorta çıkışının yapılması için doldurduğu formdur.',
      format: 'DOCX',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/9dba9da2-4169-478a-8883-5ea06aa854e2.docx',
      isMandatory: false
    },
    {
      code: 'RAPOR-01',
      title: 'Staj Raporu Kapak Sayfası Şablonu',
      description: 'Resmi staj defteri ciltlenirken en başa eklenecek Selçuk Üniversitesi onaylı standart kapak sayfası.',
      format: 'DOCX',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/ecae205b-13fd-41f4-a8f0-39a7edee25e7.docx',
      isMandatory: true
    },
    {
      code: 'RAPOR-02',
      title: 'Staj Günlük Rapor Sayfası Formatı',
      description: 'Arial 12 punto, iki yana hizalı, tek satır aralığı ve kaşe/imza alanı içeren resmi sayfa düzeni.',
      format: 'DOCX',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/06953fec-166b-4cd0-9f19-1c7b9ca0e74c.docx',
      isMandatory: true
    }
  ];

  const regulations = [
    {
      title: 'Teknoloji Fakültesi Staj Yönergesi (01)',
      description: 'Fakültenin staj genel esaslarını, sigorta yükümlülüklerini ve yasal çerçeveyi tanımlar.',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/6b6f356f-f2c7-481b-b7ce-9b8878b65d4f.pdf'
    },
    {
      title: 'Staj Uygulama Esasları (02)',
      description: 'Staj iş günü kuralları, staj konuları, cumartesi çalışması ve değerlendirme ölçütleri.',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/22919a2f-300e-4bad-a2e1-e23273f568b5.pdf'
    },
    {
      title: 'Staj İş Akış Diyagramı (03)',
      description: 'Başvurudan kabule, sigortadan evrak teslimine kadar adımların şematik gösterimi.',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/448cca21-bb17-4afc-a614-dc65b7bec4e6.pdf'
    },
    {
      title: 'Staj Rehberi & Rapor Yazım Kılavuzu (04)',
      description: 'Defter sayfalarının nasıl yazılacağı, izin kuralları ve örnek günlük formatı.',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/76d04734-c876-413b-b571-ac1d98a90a20.pdf'
    },
    {
      title: 'Sıkça Sorulan Sorular (05)',
      description: 'Öğrencilerin en çok karşılaştığı durumlar ve komisyonun resmi cevapları.',
      url: 'https://webadmin.selcuk.edu.tr/uploads//Contents/teknoloji-bilgisayar_muhendisligi/icerik-serbest/73908/ae750b15-fa52-476a-9713-35358e60f431.pdf'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 text-[#002b49] border-b border-slate-100 pb-3">
          <BookOpen className="w-6 h-6 text-[#c5a880]" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Resmî Belgeler ve İndirme Merkezi</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Selçuk Üniversitesi güncel staj formları, yönergeleri ve resmî şablonları.
            </p>
          </div>
        </div>

        {/* e-Devlet SPAS Info Card */}
        <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">e-Devlet SPAS Müstehaklık Belgesi Nasıl Alınır?</span>
              <p className="text-slate-600 mt-0.5">
                turkiye.gov.tr adresine girip arama kutusuna <strong>"SPAS Müstehaklık Belgesi Sorgulama"</strong> yazınız. 
                Barkodlu belgenizi PDF olarak indirip sistemdeki başvuru alanına yükleyiniz.
              </p>
            </div>
          </div>

          <a
            href="https://www.turkiye.gov.tr/spas-mustehaklik-sorgulama"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-lg shrink-0 flex items-center gap-1.5 transition shadow-sm text-xs"
          >
            <span>e-Devlet'e Git</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Section 1: Official Forms */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <FileCheck2 className="w-5 h-5 text-blue-600" />
          <h2>Resmî Staj Formları ve Şablonları</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forms.map((form) => (
            <div
              key={form.code}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 text-[#1c458b] font-bold text-xs tracking-wider">
                    {form.code}
                  </span>
                  {form.isMandatory ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                      ZORUNLU
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      İSTEĞE BAĞLI
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{form.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{form.description}</p>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">Format: {form.format}</span>
                <a
                  href={form.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-[#1c458b] hover:text-white text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>İndir ({form.format})</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Regulations and Guidelines */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h2>Yönergeler, Esaslar ve Kılavuzlar (PDF)</h2>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {regulations.map((reg, idx) => (
            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-slate-900">{reg.title}</div>
                <div className="text-xs text-slate-500">{reg.description}</div>
              </div>

              <a
                href={reg.url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-blue-50 text-[#1c458b] hover:bg-[#1c458b] hover:text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Olarak Görüntüle</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
