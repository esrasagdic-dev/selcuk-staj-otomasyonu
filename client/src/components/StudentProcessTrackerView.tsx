import React, { useState, useEffect } from 'react';
import { User, InternshipApplication, InternshipPeriod } from '../types';
import { apiRequest } from '../services/api';
import { 
  Clock, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  PlusCircle, 
  BookOpen,
  CheckCircle2,
  Bell,
  Download,
  Ban,
  CreditCard,
  UploadCloud,
  X,
  Check,
  Lock,
  Edit3
} from 'lucide-react';

interface StudentProcessTrackerViewProps {
  currentUser: User;
  onNavigateToApplication: (type: 'Staj1' | 'Staj2') => void;
  onNavigateToDiary: () => void;
  onNavigateToDocuments: () => void;
  onNavigateToAnnouncements: () => void;
}

export const StudentProcessTrackerView: React.FC<StudentProcessTrackerViewProps> = ({
  currentUser,
  onNavigateToApplication,
  onNavigateToDiary,
  onNavigateToDocuments,
  onNavigateToAnnouncements
}) => {
  const [selectedType, setSelectedType] = useState<'Staj1' | 'Staj2'>('Staj1');
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [activePeriods, setActivePeriods] = useState<InternshipPeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Staj Uzatma Modal states
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [absenceStartDate, setAbsenceStartDate] = useState('');
  const [absenceEndDate, setAbsenceEndDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  // Staj İptal Modal states (Form 7)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFile, setCancelFile] = useState<File | null>(null);

  // Staj Dekont Yükleme Modal states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsData, periodsData]: any = await Promise.all([
        apiRequest('/applications/my'),
        apiRequest('/periods/active')
      ]);
      setApplications(Array.isArray(appsData) ? appsData : []);
      if (periodsData && Array.isArray(periodsData.periods)) {
        setActivePeriods(periodsData.periods);
      }
    } catch (err) {
      console.error('Veriler yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentApp = applications.find(a => a.type === selectedType);
  const staj1App = applications.find(a => a.type === 'Staj1');
  const staj2App = applications.find(a => a.type === 'Staj2');
  const currentPeriod = activePeriods.find(p => p.type === selectedType) || activePeriods[0];

  const hasForm2 = currentApp?.documents?.some(d => d.type === 'Form2_KabulFormu');
  const hasSpas = currentApp?.documents?.some(d => d.type === 'Spas_Mustehaklik');

  // Check if today is within application window
  const now = new Date();
  const appStart = currentPeriod ? new Date(currentPeriod.applicationStartDate) : null;
  const appEnd = currentPeriod ? new Date(currentPeriod.applicationEndDate) : null;
  const isWithinWindow = appStart && appEnd ? (now >= appStart && now <= new Date(appEnd.getTime() + 86400000)) : true;
  const daysRemaining = appEnd ? Math.ceil((appEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const docDeadline = currentPeriod ? new Date(currentPeriod.documentDeadlineDate) : null;
  const docDaysRemaining = docDeadline ? Math.ceil((docDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const showAppDeadlineWarning = isWithinWindow && daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0 && (!currentApp || currentApp.status === 'Draft' || currentApp.status === 'RevisionRequired');
  const showDocDeadlineWarning = docDaysRemaining !== null && docDaysRemaining <= 10 && docDaysRemaining >= 0 && currentApp && (currentApp.status === 'InsuranceStarted' || currentApp.status === 'InProgress' || currentApp.status === 'AdvisorApproved');

  const stajEndDate = currentApp?.currentEndDate ? new Date(currentApp.currentEndDate) : null;
  const daysUntilStajEnd = stajEndDate ? Math.ceil((stajEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const showStajEndWarning = daysUntilStajEnd !== null && daysUntilStajEnd <= 7 && daysUntilStajEnd >= 0 && (currentApp?.status === 'InProgress' || currentApp?.status === 'InsuranceStarted');

  const calculateWorkDays = (startStr: string, endStr: string, includesSat: boolean) => {
    if (!startStr || !endStr) return 0;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;

    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay(); // 0: Sunday, 6: Saturday
      if (day !== 0 && (includesSat || day !== 6)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  };

  const calculateNewEndDate = (currentEndStr: string | undefined, extraDays: number, includesSat: boolean) => {
    if (!currentEndStr || extraDays <= 0) return '';
    const cur = new Date(currentEndStr);
    if (isNaN(cur.getTime())) return '';
    let added = 0;
    while (added < extraDays) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && (includesSat || day !== 6)) {
        added++;
      }
    }
    return cur.toISOString().split('T')[0];
  };

  const handleSubmitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp) return;

    // Temel Mevzuat Kuralı: Komisyon ve KPTO SGK onayı tamamlanmadan ve staj başlamadan izin/uzatma talep edilemez
    if (currentApp.status !== 'InsuranceStarted' && currentApp.status !== 'InProgress') {
      alert('Staj süresi uzatma ve mazeret izni talebi, ancak Staj Komisyonu ve KPTO Sigorta Masası onayları tamamlanıp SGK girişi yapılarak staj fiilen başladıktan sonra verilebilir.');
      return;
    }

    if (!absenceStartDate || !absenceEndDate) {
      alert('Lütfen staja katılamayacağınız / gelemeyeceğiniz tarihleri seçiniz.');
      return;
    }

    const calculatedDays = calculateWorkDays(absenceStartDate, absenceEndDate, !!currentApp.includesSaturday);
    if (calculatedDays <= 0) {
      alert('Seçilen tarih aralığında geçerli iş günü bulunamadı. Lütfen geçerli bir tarih aralığı seçiniz.');
      return;
    }

    const formattedDates = absenceStartDate === absenceEndDate
      ? `${new Date(absenceStartDate).toLocaleDateString('tr-TR')} (1 İş Günü)`
      : `${new Date(absenceStartDate).toLocaleDateString('tr-TR')} - ${new Date(absenceEndDate).toLocaleDateString('tr-TR')} (${calculatedDays} İş Günü)`;

    setActionLoading(true);
    try {
      const res: any = await apiRequest(`/applications/${currentApp.id}/extension-request`, {
        method: 'POST',
        body: JSON.stringify({
          absenceStartDate,
          absenceEndDate,
          missedDates: formattedDates,
          requestedExtraDays: calculatedDays,
          extraDays: calculatedDays,
          reason: extensionReason.trim()
        })
      });
      alert(res.message || `Staj uzatma talebiniz (+${calculatedDays} gün) komisyon onayına iletildi.`);
      setShowExtensionModal(false);
      setExtensionReason('');
      setAbsenceStartDate('');
      setAbsenceEndDate('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Uzatma talebi iletilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp || !cancelFile) {
      alert('Lütfen imzalı Form 7 staj iptal dilekçenizi yükleyiniz.');
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('reason', cancelReason.trim());
      formData.append('cancelForm', cancelFile);
      formData.append('cancelFormDocument', cancelFile);

      const res: any = await apiRequest(`/applications/${currentApp.id}/cancel-request`, {
        method: 'POST',
        body: formData
      });
      alert(res.message || 'Staj iptal başvurunuz komisyona iletildi.');
      setShowCancelModal(false);
      setCancelReason('');
      setCancelFile(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'İptal başvurusu iletilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentApp || !receiptFile) {
      alert('Lütfen katkı payı / dekont dosyasını seçiniz.');
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('receiptDocument', receiptFile);

      const res: any = await apiRequest(`/applications/${currentApp.id}/upload-receipt`, {
        method: 'POST',
        body: formData
      });
      alert(res.message || 'Dekont başarıyla yüklendi ve KPTO sigorta masasına iletildi.');
      setShowReceiptModal(false);
      setReceiptFile(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Dekont yüklenemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-['Montserrat',sans-serif]">
      {/* Top Welcome & Navigation Hub */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#1c458b] text-xs font-bold">
              <span>Öğrenci Portalı</span>
              <span>•</span>
              <span>{currentUser.studentProfile?.studentNumber || '203301001'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002b49] font-serif">
              Staj Süreç Takibi
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Sayın <strong>{currentUser.fullName}</strong>, staj başvurularınızın anlık onay, sigorta ve değerlendirme durumunu bu ekrandan takip edebilirsiniz.
            </p>
          </div>

          {/* Staj 1 / Staj 2 Tabs - STRICTLY "Staj 1" and "Staj 2", NO parentheses */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setSelectedType('Staj1')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                selectedType === 'Staj1'
                  ? 'bg-white text-[#1c458b] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Staj 1</span>
              {staj1App?.status && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Kayıt Mevcut"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('Staj2')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                selectedType === 'Staj2'
                  ? 'bg-white text-[#1c458b] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Staj 2</span>
              {staj2App?.status && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Kayıt Mevcut"></span>
              )}
            </button>
          </div>
        </div>

        {/* Commission Official Calendar Banner */}
        {currentPeriod && (
          <div className="mt-5 p-4 rounded-xl bg-[#002b49] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-[#c5a880]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#c5a880]">
                    Komisyon Tarafından Belirlenen {selectedType === 'Staj1' ? 'Staj 1' : 'Staj 2'} Takvimi
                  </span>
                  {isWithinWindow ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                      Başvurular Açık {daysRemaining !== null && daysRemaining >= 0 ? `• Son ${daysRemaining} Gün` : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-bold">
                      Başvuru Dönemi Dışında
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs mt-1.5 text-slate-200">
                  <div>
                    <span className="text-slate-400">Başvuru Kabul Aralığı: </span>
                    <strong className="text-white">
                      {new Date(currentPeriod.applicationStartDate).toLocaleDateString('tr-TR')} – {new Date(currentPeriod.applicationEndDate).toLocaleDateString('tr-TR')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Staj Yapılabilecek Tarihler: </span>
                    <strong className="text-[#c5a880]">
                      {new Date(currentPeriod.earliestStartDate).toLocaleDateString('tr-TR')} – {new Date(currentPeriod.latestEndDate).toLocaleDateString('tr-TR')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Defter Son Teslim: </span>
                    <strong className="text-white">
                      {new Date(currentPeriod.documentDeadlineDate).toLocaleDateString('tr-TR')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToAnnouncements}
              className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center gap-1.5 shrink-0 self-start lg:self-center cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Duyuru Detayı</span>
            </button>
          </div>
        )}

        {/* Urgent Application Deadline Countdown Warning Banner */}
        {showAppDeadlineWarning && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md flex items-start sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg text-white shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base">
                  ⏳ Başvuru Süresi Sona Eriyor! (Son {daysRemaining} Gün)
                </div>
                <div className="text-xs text-amber-100 mt-0.5">
                  {selectedType === 'Staj1' ? 'Staj 1' : 'Staj 2'} başvuruları {new Date(currentPeriod!.applicationEndDate).toLocaleDateString('tr-TR')} tarihinde kapanacaktır. Stajınızın yanmaması için başvurunuzu ve Form 2 kabul belgenizi ivedilikle tamamlayıp onaya gönderiniz.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToApplication(selectedType)}
              className="px-4 py-2 bg-white text-amber-900 font-extrabold text-xs rounded-lg shadow hover:bg-amber-50 transition shrink-0 cursor-pointer"
            >
              Başvuruyu Tamamla →
            </button>
          </div>
        )}

        {/* Urgent Document Deadline Warning Banner */}
        {showDocDeadlineWarning && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-md flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg text-white shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base">
                  ⚠️ Staj Evrak ve Defter Teslim Süresi Doluyor! (Son {docDaysRemaining} Gün)
                </div>
                <div className="text-xs text-rose-100 mt-0.5">
                  Sanal staj defterinizin işyeri sorumlu personeli tarafından onaylanması ve Form 3-4 evraklarınızın en geç {new Date(currentPeriod!.documentDeadlineDate).toLocaleDateString('tr-TR')} tarihine kadar Bölüm Sekreterliğine teslim edilmesi zorunludur.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToDocuments}
              className="px-4 py-2 bg-white text-rose-900 font-extrabold text-xs rounded-lg shadow hover:bg-rose-50 transition shrink-0 cursor-pointer"
            >
              Evrakları İncele →
            </button>
          </div>
        )}

        {/* Current Status Banner */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
              <Clock className="w-5 h-5 text-[#1c458b]" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                {selectedType === 'Staj1' ? 'Staj 1' : 'Staj 2'} Başvuru Durumu
              </span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {!currentApp && 'Henüz Başvuru Yapılmadı'}
                {currentApp?.status === 'Draft' && '📝 Taslak (İmzalı Form 2 ve SPAS Bekleniyor)'}
                {currentApp?.status === 'Submitted' && '⏳ Komisyon Ön İncelemesinde'}
                {currentApp?.status === 'RevisionRequired' && '⚠️ Düzeltme İstendi (Lütfen Evrakları Güncelleyiniz)'}
                {currentApp?.status === 'ApprovedByCommission' && '✅ Komisyon Onayladı • KPTO Sigorta Bekleniyor'}
                {currentApp?.status === 'InsuranceStarted' && '🛡️ Sigorta Başlatıldı • Staja Başlayabilirsiniz'}
                {currentApp?.status === 'InProgress' && '🚀 Stajınız Devam Ediyor (Sanal Defter Aktif)'}
                {currentApp?.status === 'AdvisorApproved' && '🏢 İş Yeri Sorumlusu Onayladı • Zarf Teslimi'}
                {currentApp?.status === 'Completed' && '🎉 Staj Tamamlandı ve Başarıyla Değerlendirildi'}
                {currentApp?.status === 'Rejected' && '❌ Başvuru Reddedildi'}
                {currentApp?.status === 'Cancelled' && '🚫 Staj İptal Edildi (SGK Çıkışı Bildirildi)'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!currentApp || currentApp.status === 'Draft' || currentApp.status === 'RevisionRequired' ? (
              <button
                type="button"
                onClick={() => onNavigateToApplication(selectedType)}
                className="px-5 py-2.5 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{!currentApp ? 'Staj Başvurusu Yap' : 'Başvuruyu Düzenle & Gönder'}</span>
              </button>
            ) : currentApp.status === 'InsuranceStarted' || currentApp.status === 'InProgress' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onNavigateToDiary}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Sanal Deftere Git</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowExtensionModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Staj süresini uzatmak için komisyona talep gönder"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Uzatma İste</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Mazeret veya sağlık gerekçesiyle Form 7 iptal dilekçesi yükle"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Staj İptali</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Staj katkı payı / dekont yükleme"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Dekont Yükle</span>
                </button>
              </div>
            ) : currentApp.status === 'ApprovedByCommission' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToApplication(selectedType)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs shadow-sm transition cursor-pointer"
                >
                  Başvuru Detayını Gör
                </button>
                <div 
                  className="px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 font-semibold rounded-xl text-xs flex items-center gap-1.5 select-none cursor-not-allowed"
                  title="Staj süresi uzatma ve izin talepleri, Staj Komisyonu ve KPTO sigorta onayı tamamlandıktan sonra aktifleşir."
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>İzin/Uzatma (KPTO Onayı Bekleniyor)</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateToApplication(selectedType)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                Başvuru Detayını Gör
              </button>
            )}
          </div>
        </div>

        {/* Resmî Belge İndirme Hızlı Erişim Çubuğu */}
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Download className="w-4 h-4 text-[#1c458b]" />
            <span>Resmî Boş Belge Şablonları (Kaşe / İmza İçin):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/documents/blank/form2"
              download="FORM2_Staj_Kabul_Formu.docx"
              className="px-3 py-1.5 bg-white hover:bg-blue-50 text-[#1c458b] border border-blue-200 rounded-lg font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Boş Form 2 (Staj Kabul Belgesi)</span>
            </a>
            <a
              href="/api/documents/blank/form7"
              download="FORM7_Staj_Iptal_Formu.docx"
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Resmî Form 7 (Staj İptal Dilekçesi)</span>
            </a>
          </div>
        </div>

        {/* CRITICAL ALERTS: DEADBURN WARNING, LOCK NOTIFICATION, REVISION REQUEST, EXTENSION & CANCEL STATUS */}
        {currentApp?.diary?.isLocked && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-400 text-xs text-rose-950 flex items-start gap-3 shadow-xs">
            <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm text-rose-900">🔒 Sanal Staj Defteriniz Kilitlenmiştir</div>
              <p className="mt-1 leading-relaxed">
                {currentApp.diary.lockReason || 'Staj süreniz sona erdiği için yönerge kuralları uyarınca staj defteri kilitlenmiştir. Yeni giriş veya düzenleme yapılamaz.'}
              </p>
            </div>
          </div>
        )}

        {currentApp?.diary?.isRevisionRequestedByAdvisor && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
            <Edit3 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm text-amber-900">✏️ İşyeri Danışman Mühendisi Defter Düzeltmesi İstedi</div>
              <p className="mt-1 leading-relaxed">
                Danışman Mühendis Notu: <strong>"{currentApp.diary.advisorRevisionNotes}"</strong>
              </p>
              <p className="text-[11px] text-amber-800 mt-1">Lütfen defterinize giderek belirtilen günlerdeki teknik açıklamaları güncelleyip tekrar onaya sununuz.</p>
            </div>
          </div>
        )}

        {showStajEndWarning && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500 text-white text-xs flex items-center justify-between gap-3 shadow-md animate-pulse">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-extrabold text-sm">⏰ Stajınızın Bitmesine Son {daysUntilStajEnd} Gün!</span>
                <span className="block text-amber-100 text-[11px]">Staj bitiminde defteriniz otomatik olarak kilitlenecek ve yeni giriş yapılamayacaktır. Günlerinizi doldurmayı unutmayınız.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToDiary}
              className="px-3 py-1.5 bg-white text-amber-950 font-bold rounded-lg text-xs shrink-0 hover:bg-amber-50 cursor-pointer"
            >
              Deftere Git →
            </button>
          </div>
        )}

        {/* KPTO Sigorta Bekleniyor & İzin Kuralı Bilgilendirme Kartı */}
        {currentApp?.status === 'ApprovedByCommission' && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-[#1c458b] shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-extrabold text-sm text-[#002b49] flex items-center gap-2">
                <span>✅ Bölüm Staj Komisyonu Onayı Tamamlandı • KPTO Sigorta Masasında</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">Aşama 3/7</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                Staj başvurunuz Bölüm Staj Komisyonu tarafından başarıyla onaylanmıştır. Başvuru dosyanız şu an <strong>Kariyer Planlama ve Temel Eğitim Masası (KPTO)</strong> sigorta servisine iletilmiş olup SGK İşe Giriş Bildirgenizin düzenlenmesi beklenmektedir.
              </p>
              <div className="p-2.5 rounded-lg bg-white border border-blue-100 text-[11px] text-slate-700 flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <span><strong>Mazeret İzni ve Staj Süresi Uzatma Kuralı:</strong> İzin ve süre uzatma modülü; Komisyon ve KPTO onayları tamamlanıp SGK sigortanız fiilen başladıktan (4. Aşama) sonra aktif hale gelecektir.</span>
              </div>
            </div>
          </div>
        )}

        {currentApp?.hasExtensionRequest && (
          <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3">
            <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>⏱️ Staj Süresi Uzatma Talebiniz Bulunuyor (+{currentApp.extensionExtraDays} İş Günü)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  currentApp.isExtensionApprovedByCommission 
                    ? (currentApp.isExtensionSgkProcessedByKPTO ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {currentApp.isExtensionApprovedByCommission 
                    ? (currentApp.isExtensionSgkProcessedByKPTO ? '✅ SGK Prim Tescili Tamamlandı' : 'Komisyon Onayladı • KPTO Masasında')
                    : 'Komisyon Heyeti Onayı Bekliyor'}
                </span>
              </div>
              {currentApp.extensionMissedDates && (
                <div className="text-xs font-semibold text-indigo-900 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-200 inline-block">
                  📅 Mazeretli / Gelemeyeceğiniz Tarihler: <strong>{currentApp.extensionMissedDates}</strong>
                </div>
              )}
              <p className="text-slate-600 italic">Gerekçeniz: "{currentApp.extensionReason}"</p>
            </div>
          </div>
        )}

        {currentApp?.hasCancelRequest && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-3">
            <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>🚫 Staj İptal Dilekçeniz Alındı (Resmî FORM 7)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                  currentApp.isCancelApprovedByCommission ? 'bg-rose-200 text-rose-900' : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentApp.isCancelApprovedByCommission ? '🚫 Staj İptal Edildi (SGK Çıkışı Yapıldı)' : 'Komisyon Onayı Bekliyor'}
                </span>
              </div>
              <p className="text-slate-600 italic">Mazeret: "{currentApp.cancelReason}"</p>
            </div>
          </div>
        )}

        {currentApp?.receiptDocumentPath && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">💳 Staj Katkı Payı / Ücret Dekontunuz Yüklendi</span>
                <span className="block text-[11px] text-emerald-800">
                  {currentApp.isReceiptVerifiedByKPTO ? '✅ KPTO Sigorta Masası Tarafından İncelendi ve Doğrulandı' : '⏳ KPTO Masası Doğrulama Sürecinde'}
                </span>
              </div>
            </div>
            <a
              href={`/api/documents/download?filePath=${encodeURIComponent(currentApp.receiptDocumentPath)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-white border border-emerald-300 text-emerald-800 font-bold rounded-lg text-xs hover:bg-emerald-100"
            >
              Dekontu Görüntüle
            </a>
          </div>
        )}

        {/* Commission Reject Reason Alert (if any) */}
        {currentApp?.commissionRejectReason && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Staj Komisyonu Notu:</strong> {currentApp.commissionRejectReason}
            </div>
          </div>
        )}

        {/* 7-Step Stepper Timeline */}
        <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#002b49] uppercase tracking-wider">
              7 Aşamalı Staj Süreç Takip Çizelgesi:
            </span>
            <span className="text-xs font-bold text-[#1c458b] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {currentApp?.status === 'Completed' ? 'Aşama 7/7: Tamamlandı' :
               currentApp?.status === 'AdvisorApproved' ? 'Aşama 6/7: İş Yeri Onayladı' :
               currentApp?.status === 'InProgress' ? 'Aşama 5/7: Staj Devam Ediyor' :
               currentApp?.status === 'InsuranceStarted' ? 'Aşama 4/7: Sigorta Başlatıldı' :
               currentApp?.status === 'ApprovedByCommission' ? 'Aşama 3/7: Komisyon Onayladı' :
               currentApp?.status === 'Submitted' ? 'Aşama 2/7: Komisyon İncelemesinde' :
               currentApp ? 'Aşama 1/7: Evrak Tamamlama' : 'Aşama 0/7: Başvuru Bekleniyor'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 text-center text-xs">
            {/* Step 1 */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              currentApp 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                : 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
            }`}>
              <span className="font-bold">1. Tarih & Kurum</span>
              <span className="text-[10px] text-slate-500">{currentApp ? 'Tamamlandı' : 'Bekleniyor'}</span>
            </div>

            {/* Step 2 */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              hasForm2 && hasSpas 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                : currentApp 
                ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-500/20' 
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className="font-bold">2. Form 2 & SPAS</span>
              <span className="text-[10px] text-slate-500">{hasForm2 && hasSpas ? 'Yüklendi' : 'Yüklenmeli'}</span>
            </div>

            {/* Step 3 */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              currentApp?.status === 'ApprovedByCommission' || currentApp?.status === 'InsuranceStarted' || currentApp?.status === 'InProgress' || currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : currentApp?.status === 'Submitted'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className="font-bold">3. Komisyon Onayı</span>
              <span className="text-[10px] text-slate-500">
                {currentApp?.status === 'Submitted' ? 'İnceleniyor' :
                 currentApp?.status === 'ApprovedByCommission' || currentApp?.status === 'InsuranceStarted' || currentApp?.status === 'InProgress' || currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed' ? 'Onaylandı' : 'Bekleniyor'}
              </span>
            </div>

            {/* Step 4 */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              currentApp?.status === 'InsuranceStarted' || currentApp?.status === 'InProgress' || currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : currentApp?.status === 'ApprovedByCommission'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className="font-bold">4. KPTO Sigorta</span>
              <span className="text-[10px] text-slate-500">
                {currentApp?.status === 'InsuranceStarted' || currentApp?.status === 'InProgress' || currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                  ? 'SGK Aktif' : 'Bekleniyor'}
              </span>
            </div>

            {/* Step 5 */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              currentApp?.status === 'InProgress' || currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : currentApp?.status === 'InsuranceStarted'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className="font-bold">5. Staj Defteri</span>
              <span className="text-[10px] text-slate-500">
                {currentApp?.status === 'InProgress' ? 'Yazılıyor' :
                 currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed' ? 'Tamamlandı' : 'Bekleniyor'}
              </span>
            </div>

            {/* Step 6 */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : currentApp?.status === 'InProgress'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className="font-bold">6. İş Yeri Onayı</span>
              <span className="text-[10px] text-slate-500">
                {currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed' ? 'Onaylandı' : 'Bekleniyor'}
              </span>
            </div>

            {/* Step 7 */}
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : currentApp?.status === 'AdvisorApproved'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className="font-bold">7. Nihai Not</span>
              <span className="text-[10px] text-slate-500">{currentApp?.status === 'Completed' ? 'Başarılı' : 'Bekleniyor'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Application Summary Cards (if application exists) */}
      {currentApp ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Internship & Period Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5">
              <Calendar className="w-4 h-4 text-[#1c458b]" />
              <span>Staj Süresi ve Takvim</span>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Staj Kodu:</span>
                <span className="font-bold text-slate-800">{selectedType === 'Staj1' ? 'Staj 1' : 'Staj 2'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">İş Günü Süresi:</span>
                <span className="font-bold text-[#1c458b] bg-blue-50 px-2 py-0.5 rounded">
                  {currentApp.requiredWorkDays || 20} İş Günü
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Başlangıç Tarihi:</span>
                <span className="font-semibold text-slate-800">
                  {currentApp.startDate ? new Date(currentApp.startDate).toLocaleDateString('tr-TR') : 'Belirtilmedi'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bitiş Tarihi:</span>
                <span className="font-semibold text-slate-800">
                  {currentApp.calculatedEndDate 
                    ? new Date(currentApp.calculatedEndDate).toLocaleDateString('tr-TR') 
                    : (currentApp.currentEndDate ? new Date(currentApp.currentEndDate).toLocaleDateString('tr-TR') : 'Hesaplanıyor')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cumartesi Çalışması:</span>
                <span className="font-semibold text-slate-800">{currentApp.includesSaturday ? 'Dahil' : 'Hariç'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Workplace & Subject */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5">
              <Building2 className="w-4 h-4 text-[#1c458b]" />
              <span>Kurum ve Danışman</span>
            </div>
            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-500 block">Staj Konusu:</span>
                <span className="font-bold text-slate-800 line-clamp-1">
                  {currentApp.subject || 'Konu henüz belirtilmedi'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">İş Yeri / Kurum Adı:</span>
                <span className="font-semibold text-slate-800">
                  {currentApp.workplaceName || 'Kurum belirtilmedi'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">İş Yeri Sorumlusu:</span>
                <span className="font-semibold text-slate-800">
                  {currentApp.advisor?.fullName || 'Danışman belirtilmedi'}
                </span>
              </div>
              <div className="text-slate-500 text-[11px]">
                {currentApp.advisor?.email && `E-posta: ${currentApp.advisor.email}`}
              </div>
            </div>
          </div>

          {/* Card 3: Documents & SGK Insurance */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5">
              <ShieldCheck className="w-4 h-4 text-[#1c458b]" />
              <span>Evrak & Sigorta Durumu</span>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Form 2 (Sözleşme):</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  hasForm2 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {hasForm2 ? 'Yüklendi' : 'Eksik'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">e-Devlet SPAS:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  hasSpas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {hasSpas ? 'Yüklendi' : 'Eksik'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">SGK İşe Giriş Bildirgesi:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  currentApp.status === 'InsuranceStarted' || currentApp.status === 'InProgress' || currentApp.status === 'AdvisorApproved' || currentApp.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {currentApp.status === 'InsuranceStarted' || currentApp.status === 'InProgress' || currentApp.status === 'AdvisorApproved' || currentApp.status === 'Completed'
                    ? 'Tescil Edildi'
                    : 'KPTO Onayı Bekleniyor'}
                </span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateToApplication(selectedType)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#1c458b] font-bold rounded-lg text-center transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Belgeleri Görüntüle / Güncelle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1c458b] flex items-center justify-center mx-auto shadow-inner">
            <PlusCircle className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-slate-900 text-base">
              {selectedType === 'Staj1' ? 'Staj 1' : 'Staj 2'} Başvurusu Bulunmuyor
            </h3>
            <p className="text-slate-500 text-xs">
              Komisyonun belirlediği tarih aralığında staj döneminizi seçip iş günü takviminizi hesaplamak, iş yeri bilgilerinizi girmek ve 
              Form 2 ile SPAS belgenizi yüklemek için hemen başvuru yapabilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToApplication(selectedType)}
            className="px-6 py-3 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md transition inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Yeni Staj Başvurusu Başlat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Helpful Action Links Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          onClick={onNavigateToAnnouncements}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1c458b] flex items-center justify-center font-bold">
              📢
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Staj Duyuruları ve Takvimi</h4>
              <p className="text-slate-500 text-xs">Komisyonun ilan ettiği başvuru tarihleri ve uygulama esasları</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        <div 
          onClick={onNavigateToDocuments}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              📑
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Resmî Belgeler ve Formlar</h4>
              <p className="text-slate-500 text-xs">Form 1, 2, 3, 4, 5 ve staj uygulama yönergeleri</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* MODAL 1: STAJ UZATMA / MAZERET TELAFİ TALEBİ */}
      {showExtensionModal && (() => {
        const isEligible = currentApp?.status === 'InsuranceStarted' || currentApp?.status === 'InProgress';
        const calculatedDays = calculateWorkDays(absenceStartDate, absenceEndDate, !!currentApp?.includesSaturday);
        const predictedEndDate = calculateNewEndDate(currentApp?.currentEndDate, calculatedDays, !!currentApp?.includesSaturday);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-[#002b49] text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>Mazeret Telafi & Staj Uzatma Talebi</span>
                </h3>
                <button type="button" onClick={() => setShowExtensionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isEligible ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Uzatma & İzin Talebi Henüz Kullanılamaz</span>
                    <span className="text-[11px] font-normal leading-relaxed text-amber-800">
                      Selçuk Üniversitesi Staj Yönergesi (Madde 7-h) uyarınca staj süresi uzatma ve mazeret izni talepleri; hem <strong>Bölüm Staj Komisyonu</strong> hem de <strong>KPTO Sigorta Masası</strong> onayları tamamlanıp SGK işe giriş bildirgeniz düzenlenerek stajınız fiilen başladıktan (4. Aşama) sonra aktif hale gelmektedir.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-700 leading-relaxed bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200/80 space-y-1.5">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <span>🏛️ Selçuk Üniversitesi Staj Yönergesi (Madde 9-f & 9-g ve Form 3) Hükmü:</span>
                  </div>
                  <p className="text-[11px] text-indigo-900">
                    Öğrenci zorunlu olmadıkça izin alamaz. Sağlık raporu veya zorunlu izin alınan günler <strong>staj süresinden sayılmaz</strong>. Eksik kalan iş günlerinin staj sonuna eklenerek <strong>telafisi ve KPTO tarafından 5510 Sayılı Kanun (5/b) kapsamında ek prim günü tescil edilmesi zorunludur</strong>. Rapor alan öğrenci aynı gün durumu bildirmekle yükümlüdür.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitExtension} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      <span>Gelemeyeceğiniz İlk Gün:</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={absenceStartDate}
                      min={currentApp?.startDate ? currentApp.startDate.split('T')[0] : undefined}
                      max={currentApp?.currentEndDate ? currentApp.currentEndDate.split('T')[0] : undefined}
                      onChange={(e) => {
                        setAbsenceStartDate(e.target.value);
                        if (!absenceEndDate || e.target.value > absenceEndDate) {
                          setAbsenceEndDate(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      <span>Gelemeyeceğiniz Son Gün:</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={absenceEndDate}
                      min={absenceStartDate || (currentApp?.startDate ? currentApp.startDate.split('T')[0] : undefined)}
                      max={currentApp?.currentEndDate ? currentApp.currentEndDate.split('T')[0] : undefined}
                      onChange={(e) => setAbsenceEndDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white"
                    />
                  </div>
                </div>

                {/* Hızlı Seçim Butonları */}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400 font-medium">Hızlı Seçim:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      setAbsenceStartDate(todayStr);
                      setAbsenceEndDate(todayStr);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition cursor-pointer"
                  >
                    Bugün (Tek Gün)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (absenceStartDate) {
                        setAbsenceEndDate(absenceStartDate);
                      }
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold transition cursor-pointer"
                  >
                    Tek Gün Olarak Ayarla
                  </button>
                </div>

                {/* Canlı Hesaplama Sonucu Kartı */}
                {absenceStartDate && absenceEndDate && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 p-4 rounded-xl border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900">Hesaplanan Mazeretli İş Günü:</span>
                      <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-extrabold text-sm shadow-xs">
                        +{calculatedDays} İş Günü
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600 border-t border-indigo-100">
                      <div>
                        <span className="text-slate-400 block">Gelemeyeceğiniz Aralık:</span>
                        <strong className="text-slate-800">
                          {new Date(absenceStartDate).toLocaleDateString('tr-TR')} – {new Date(absenceEndDate).toLocaleDateString('tr-TR')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Yeni Staj Bitiş Tarihiniz:</span>
                        <strong className="text-emerald-700">
                          {predictedEndDate ? new Date(predictedEndDate).toLocaleDateString('tr-TR') : 'Hesaplanıyor...'}
                        </strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-700 leading-snug">
                      ℹ️ Hafta sonları (Pazar{currentApp?.includesSaturday ? '' : ' ve Cumartesi'}) hesaplamaya dahil edilmemiştir. Yalnızca gelemeyeceğiniz resmî iş günleri kadar staj süreniz uzatılacaktır.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mazeret ve Telafi Gerekçesi:</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Örnek: Üniversite vize sınavları veya sağlık raporu mazereti sebebiyle işyerinden izin alınmış olup telafisi talep edilmektedir..."
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  ></textarea>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowExtensionModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || calculatedDays <= 0 || !isEligible}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{actionLoading ? 'İletiliyor...' : !isEligible ? 'Onaylar Bekleniyor' : `Talebi Gönder (+${calculatedDays} Gün)`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: STAJ İPTAL TALEBİ (FORM 7 YÜKLE) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#002b49] text-base flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <span>Staj İptal Talebi (Resmî FORM 7)</span>
              </h3>
              <button type="button" onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200/80 text-xs space-y-2">
              <p className="text-rose-950 font-medium leading-relaxed">
                Stajı iptal etmek için Selçuk Üniversitesi resmî <strong>FORM 7 Staj İptal Dilekçesini</strong> doldurup imzalayarak buraya yüklemeniz gerekmektedir.
              </p>
              <a
                href="/api/documents/blank/form7"
                download="FORM7_Staj_Iptal_Formu.docx"
                className="inline-flex items-center gap-1.5 text-[#1c458b] font-bold underline text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Resmî Form 7 Şablonunu Buradan İndirin</span>
              </a>
            </div>
            <form onSubmit={handleSubmitCancel} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mazeret / İptal Gerekçesi:</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Sağlık raporu, mücbir sebep veya kurum değişikliği..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                ></textarea>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">İmzalı Form 7 Belgesi (Word / PDF):</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                  onChange={(e) => setCancelFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Gönderiliyor...' : 'İptal Dilekçesini Komisyona Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STAJ DEKONTU YÜKLEME */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-[#002b49] text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <span>Staj Dekontu / Katkı Payı Belgesi Yükle</span>
              </h3>
              <button type="button" onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-200/60">
              3308 Sayılı Mesleki Eğitim Kanunu kapsamındaki devlet katkısı ve staj ücreti ödeme dekontunuz doğrudan <strong>KPTO Sigorta Masasına</strong> iletilecektir.
            </p>
            <form onSubmit={handleSubmitReceipt} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dekont Dosyası (PDF / Görsel):</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Yükleniyor...' : 'Dekontu KPTO Masasına İlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
