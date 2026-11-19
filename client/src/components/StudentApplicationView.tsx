import React, { useState, useEffect } from 'react';
import { 
  Calendar, Building2, UploadCloud, FileCheck, CheckCircle2, 
  AlertCircle, Download, Clock, Info, ShieldCheck, ChevronDown, ChevronUp,
  Printer, X, Bell
} from 'lucide-react';
import { 
  Workplace, InternshipPeriod, WorkDayCalculationResult, 
  InternshipApplication, User 
} from '../types';
import { apiRequest } from '../services/api';
import { SelcukLogo } from './SelcukLogo';

interface Props {
  currentUser: User;
  initialType?: 'Staj1' | 'Staj2';
  onBackToTracker?: () => void;
}

export const StudentApplicationView: React.FC<Props> = ({ currentUser, initialType, onBackToTracker }) => {
  const [selectedType, setSelectedType] = useState<'Staj1' | 'Staj2'>(initialType || 'Staj1');
  const [activePeriods, setActivePeriods] = useState<InternshipPeriod[]>([]);
  const [myApplications, setMyApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields
  const [requiredDays, setRequiredDays] = useState<number>(20); // 20 veya 30 gün bağımsız
  const [subject, setSubject] = useState<string>('Web ve Mobil Uygulama Geliştirme');
  const [startDate, setStartDate] = useState<string>('');
  const [includesSaturday, setIncludesSaturday] = useState<boolean>(false);
  
  // Dynamic Calculation Result
  const [calcResult, setCalcResult] = useState<WorkDayCalculationResult | null>(null);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  // Workplace selection
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [workplaceResults, setWorkplaceResults] = useState<Workplace[]>([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState<Workplace | null>(null);
  const [isNewWorkplace, setIsNewWorkplace] = useState<boolean>(false);
  const [newWorkplaceData, setNewWorkplaceData] = useState({
    name: '',
    city: 'Konya',
    address: '',
    webSite: '',
    phoneNumber: '',
    companyEmail: '',
    sector: 'Yazılım / Bilişim'
  });

  // Advisor Fields
  const [advisorName, setAdvisorName] = useState<string>('');
  const [advisorEmail, setAdvisorEmail] = useState<string>('');
  const [advisorPhone, setAdvisorPhone] = useState<string>('');
  const [advisorDepartment, setAdvisorDepartment] = useState<string>('Mühendislik');
  const [advisorTitle, setAdvisorTitle] = useState<string>('Yazılım Takım Lideri');

  // File Upload states
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Form 2 Printable Modal
  const [showForm2Modal, setShowForm2Modal] = useState<boolean>(false);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const periodsRes: any = await apiRequest('/periods/active');
      if (periodsRes && periodsRes.periods) {
        setActivePeriods(periodsRes.periods);
      }

      const appsRes: any = await apiRequest('/applications/my');
      if (Array.isArray(appsRes)) {
        setMyApplications(appsRes);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Current application for selected tab
  const currentApp = myApplications.find(a => a.type === selectedType);
  const currentPeriod = activePeriods.find(p => p.type === selectedType) || activePeriods[0];

  // When tab or application changes, populate fields
  useEffect(() => {
    if (currentApp) {
      setRequiredDays(currentApp.requiredWorkDays);
      setSubject(currentApp.subject || 'Web ve Mobil Uygulama Geliştirme');
      setStartDate(currentApp.startDate.split('T')[0]);
      setIncludesSaturday(currentApp.includesSaturday);
      if (currentApp.workplaceId) {
        setSelectedWorkplace({
          id: currentApp.workplaceId,
          name: currentApp.workplaceName || '',
          city: currentApp.workplaceCity || 'Konya',
          address: '',
          sector: ''
        });
      }
      if (currentApp.advisor) {
        setAdvisorName(currentApp.advisor.fullName || '');
        setAdvisorEmail(currentApp.advisor.email || '');
        setAdvisorPhone(currentApp.advisor.phoneNumber || '');
        setAdvisorDepartment(currentApp.advisor.graduatedUniversityAndDepartment || '');
        setAdvisorTitle(currentApp.advisor.titleOrPosition || '');
      }
    } else {
      setSelectedWorkplace(null);
      setAdvisorName('');
      setAdvisorEmail('');
      setAdvisorPhone('');
      if (currentPeriod?.earliestStartDate) {
        setStartDate(currentPeriod.earliestStartDate.split('T')[0]);
      }
    }
  }, [selectedType, currentApp, currentPeriod]);

  // Recalculate dates whenever startDate, requiredDays or includesSaturday changes
  useEffect(() => {
    const runCalculation = async () => {
      if (!startDate) return;
      try {
        const res: WorkDayCalculationResult = await apiRequest('/calculator/calculate', {
          method: 'POST',
          body: JSON.stringify({
            startDate,
            requiredWorkDays: requiredDays,
            includesSaturday
          })
        });
        setCalcResult(res);
      } catch (err) {
        console.error(err);
      }
    };
    runCalculation();
  }, [startDate, requiredDays, includesSaturday]);

  // Search workplaces autocomplete
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const search = async () => {
        try {
          const res: Workplace[] = await apiRequest(`/workplaces/search?q=${encodeURIComponent(searchQuery)}`);
          setWorkplaceResults(res);
        } catch (err) {
          console.error(err);
        }
      };
      search();
    } else {
      setWorkplaceResults([]);
    }
  }, [searchQuery]);

  // Check application window constraints
  const now = new Date();
  const appStart = currentPeriod ? new Date(currentPeriod.applicationStartDate) : null;
  const appEnd = currentPeriod ? new Date(currentPeriod.applicationEndDate) : null;
  const isWithinWindow = appStart && appEnd ? (now >= appStart && now <= new Date(appEnd.getTime() + 86400000)) : true;
  const daysRemaining = appEnd ? Math.ceil((appEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Check if calculated end date exceeds latest end date
  const latestEndDateObj = currentPeriod ? new Date(currentPeriod.latestEndDate) : null;
  const isEndDateExceeded = calcResult && latestEndDateObj ? new Date(calcResult.calculatedEndDate) > latestEndDateObj : false;

  // Save draft
  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const activePeriod = activePeriods.find(p => p.type === selectedType) || activePeriods[0];
      if (!activePeriod) throw new Error('Aktif staj dönemi bulunamadı.');

      const payload = {
        id: currentApp?.id || null,
        periodId: activePeriod.id,
        workplaceId: isNewWorkplace ? 0 : selectedWorkplace?.id || 0,
        newWorkplace: isNewWorkplace ? newWorkplaceData : null,
        advisorFullName: advisorName,
        advisorEmail: advisorEmail,
        advisorPhoneNumber: advisorPhone,
        advisorGraduatedDepartment: advisorDepartment,
        advisorTitle: advisorTitle,
        internshipTypeStr: selectedType,
        subject: subject,
        requiredWorkDays: requiredDays,
        includesSaturday: includesSaturday,
        startDate: startDate
      };

      await apiRequest('/applications/save-draft', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setStatusMessage({ type: 'success', text: 'Başvuru taslağı başarıyla kaydedildi.' });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Taslak kaydedilirken hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  // Upload Document
  const handleFileUpload = async (docType: string, file: File) => {
    if (!currentApp?.id) {
      alert('Lütfen önce formu taslak olarak kaydediniz.');
      return;
    }
    setUploadingDoc(docType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);

      await apiRequest(`/applications/${currentApp.id}/upload-document`, {
        method: 'POST',
        body: formData
      });

      await loadData();
      setStatusMessage({ type: 'success', text: 'Belge başarıyla yüklendi.' });
    } catch (err: any) {
      alert(err.message || 'Belge yüklenemedi.');
    } finally {
      setUploadingDoc(null);
    }
  };

  // Submit to Commission
  const handleSubmitToCommission = async () => {
    if (!currentApp?.id) return;
    if (!isWithinWindow) {
      alert('Başvuru kabul tarihleri dışında olduğunuz için komisyona gönderim yapılamaz.');
      return;
    }
    if (isEndDateExceeded) {
      alert('Hesaplanan staj bitiş tarihiniz komisyonun belirlediği en geç staj bitiş tarihini aştığı için başvuru gönderilemez.');
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      await apiRequest(`/applications/${currentApp.id}/submit`, { method: 'POST' });
      setStatusMessage({ type: 'success', text: 'Başvurunuz başarıyla komisyon onayına gönderildi!' });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Başvuru gönderilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  // Check if documents are uploaded
  const hasForm2 = currentApp?.documents?.some(d => d.type === 'Form2_KabulFormu');
  const hasSpas = currentApp?.documents?.some(d => d.type === 'Spas_Mustehaklik');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-['Montserrat',sans-serif]">
      {/* Top Header & Tab Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            {onBackToTracker && (
              <button
                type="button"
                onClick={onBackToTracker}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1c458b] hover:text-blue-900 transition mb-1 cursor-pointer"
              >
                <span>← Süreç Takibine Geri Dön</span>
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-900">Staj Başvuru ve Evrak Merkezi</h1>
            <p className="text-sm text-slate-500">
              Selçuk Üniversitesi Staj 1 ve Staj 2 başvurusu için dönem, kurum ve evrak bilgilerinizi tamamlayınız.
            </p>
          </div>

          {/* Staj 1 / Staj 2 Tabs - STRICTLY "Staj 1" and "Staj 2", NO parentheses */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-fit">
            <button
              onClick={() => setSelectedType('Staj1')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                selectedType === 'Staj1'
                  ? 'bg-white text-[#1c458b] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Staj 1</span>
              {myApplications.find(a => a.type === 'Staj1')?.status && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
            <button
              onClick={() => setSelectedType('Staj2')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                selectedType === 'Staj2'
                  ? 'bg-white text-[#1c458b] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Staj 2</span>
              {myApplications.find(a => a.type === 'Staj2')?.status && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </div>
        </div>

        {/* Commission Official Period Dates Banner */}
        {currentPeriod && (
          <div className="mt-5 p-4 rounded-xl bg-[#002b49] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
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
                    <span className="text-slate-400">Başvuru Tarihleri: </span>
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
                    <span className="text-slate-400">Defter Teslim: </span>
                    <strong className="text-white">
                      {new Date(currentPeriod.documentDeadlineDate).toLocaleDateString('tr-TR')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-right shrink-0">
              <span className={`px-2.5 py-1 rounded-lg font-bold ${currentPeriod.isSaturdayAllowed ? 'bg-blue-900/60 text-blue-200' : 'bg-rose-900/40 text-rose-200'}`}>
                {currentPeriod.isSaturdayAllowed ? '✓ Cumartesi İzni Var' : '✕ Cumartesi İzni Yok'}
              </span>
            </div>
          </div>
        )}

        {/* Status Bar */}
        {currentApp && (
          <div className="mt-5 p-4 rounded-xl flex items-center justify-between bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-xs text-slate-500 font-medium">Mevcut Başvuru Durumu:</span>
                <div className="text-sm font-bold text-slate-900">
                  {currentApp.status === 'Draft' && '📝 Taslak (İmzalar ve Evraklar Bekleniyor)'}
                  {currentApp.status === 'Submitted' && '⏳ Komisyon İncelemesinde'}
                  {currentApp.status === 'RevisionRequired' && '⚠️ Düzeltme İstendi (Lütfen Evrakları Güncelleyiniz)'}
                  {currentApp.status === 'ApprovedByCommission' && '✅ Komisyon Onayladı • KPTO Sigorta Bekleniyor'}
                  {currentApp.status === 'InsuranceStarted' && '🛡️ Sigorta Başlatıldı • Staja Başlayabilirsiniz'}
                  {currentApp.status === 'InProgress' && '🚀 Stajınız Devam Ediyor'}
                  {currentApp.status === 'Completed' && '🎉 Staj Tamamlandı ve Değerlendirildi'}
                  {currentApp.status === 'Rejected' && '❌ Başvuru Reddedildi'}
                </div>
              </div>
            </div>

            {currentApp.commissionRejectReason && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-800 max-w-md">
                <strong>Komisyon Açıklaması:</strong> {currentApp.commissionRejectReason}
              </div>
            )}
          </div>
        )}

        {/* Visual Stepper Timeline & Next Action Guidance */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Staj Süreci Takip Çizelgesi:
            </span>
            <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {currentApp?.status === 'Completed' ? 'Adım 7/7: Tamamlandı' :
               currentApp?.status === 'AdvisorApproved' ? 'Adım 6/7: Kapalı Zarf Teslimi' :
               currentApp?.status === 'InProgress' ? 'Adım 5/7: Staj Devam Ediyor' :
               currentApp?.status === 'InsuranceStarted' ? 'Adım 4/7: Sigorta Başlatıldı' :
               currentApp?.status === 'ApprovedByCommission' ? 'Adım 3/7: Komisyon Onayladı' :
               currentApp?.status === 'Submitted' ? 'Adım 2/7: Komisyon İncelemesinde' :
               'Adım 1/7: Başvuru & Evrak Hazırlığı'}
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-[11px]">
            <div className={`p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 ${
              currentApp ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
            }`}>
              <span>1. Bilgi & Tarih</span>
              <span className="text-[10px] font-normal">{currentApp ? 'Tamamlandı' : 'Aktif'}</span>
            </div>

            <div className={`p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 ${
              hasForm2 && hasSpas ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
              currentApp ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-500/20' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span>2. Form 2 & SPAS</span>
              <span className="text-[10px] font-normal">{hasForm2 && hasSpas ? 'Yüklendi' : 'Bekleniyor'}</span>
            </div>

            <div className={`p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 ${
              currentApp?.status === 'ApprovedByCommission' || currentApp?.status === 'InsuranceStarted' || currentApp?.status === 'InProgress' || currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : currentApp?.status === 'Submitted'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span>3. Komisyon Onayı</span>
              <span className="text-[10px] font-normal">{currentApp?.status === 'Submitted' ? 'İnceleniyor' : currentApp?.status === 'ApprovedByCommission' ? 'Onaylandı' : 'Beklemede'}</span>
            </div>

            <div className={`p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 ${
              currentApp?.status === 'InsuranceStarted' || currentApp?.status === 'InProgress' || currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : currentApp?.status === 'ApprovedByCommission'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span>4. KPTO Sigorta</span>
              <span className="text-[10px] font-normal">{currentApp?.status === 'InsuranceStarted' ? 'SGK Aktif' : 'Beklemede'}</span>
            </div>

            <div className={`p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 ${
              currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : currentApp?.status === 'InProgress'
                ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span>5. Sanal Defter</span>
              <span className="text-[10px] font-normal">{currentApp?.status === 'InProgress' ? 'Yazılıyor' : 'Beklemede'}</span>
            </div>

            <div className={`p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 ${
              currentApp?.status === 'AdvisorApproved' || currentApp?.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span>6. İşyeri Onayı</span>
              <span className="text-[10px] font-normal">{currentApp?.status === 'AdvisorApproved' ? 'Onaylandı' : 'Beklemede'}</span>
            </div>

            <div className={`p-2 rounded-xl border font-bold flex flex-col items-center gap-0.5 ${
              currentApp?.status === 'Completed'
                ? 'bg-purple-50 border-purple-300 text-purple-900'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span>7. Nihai Karar</span>
              <span className="text-[10px] font-normal">{currentApp?.status === 'Completed' ? 'Tamamlandı' : 'Beklemede'}</span>
            </div>
          </div>

          {/* Thoughtful Action Guidance Card */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 text-xs space-y-1 shadow">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>💡 Sıradaki Yapmanız Gereken İşlem:</span>
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              {!currentApp || currentApp.status === 'Draft' ? (
                <span>
                  1. Aşağıdan staj konusu, firma ve sorumlu mühendis bilgilerinizi giriniz.<br />
                  2. <strong>"Ön Doldurulmuş Form 2 İndir / Yazdır"</strong> butonuna basıp yazdırarak işyerinize kaşe ve imza yaptırınız.<br />
                  3. e-Devlet'ten temin ettiğiniz <strong>SPAS Müstehaklık Belgesi</strong> ile imzalı Form 2'yi yükleyip <strong>"Komisyona Gönder"</strong> butonuna basınız.
                </span>
              ) : currentApp.status === 'Submitted' ? (
                <span>Başvurunuz ve yüklediğiniz evraklar Staj Komisyonu inceleme kuyruğuna alınmıştır. Komisyon belgelerinizi inceleyip onayladığında dosyanız otomatik olarak KPTO Sigorta masasına aktarılacaktır.</span>
              ) : currentApp.status === 'RevisionRequired' ? (
                <span>⚠️ Komisyon evrakınızda düzeltme istedi! Gerekçe: "{currentApp.commissionRejectReason}". Lütfen eksiklikleri giderip yeni belge sürümünü yükleyiniz.</span>
              ) : currentApp.status === 'ApprovedByCommission' ? (
                <span>Komisyon başvurunuzu onayladı! İşyeri mühendisinize güvenli staj defteri onay bağlantısı iletildi. Şu an KPTO sigorta birimi tarafından SGK girişiniz yapılmaktadır.</span>
              ) : currentApp.status === 'InsuranceStarted' ? (
                <span>🛡️ Sigortanız başlatıldı! Staj gününüz geldiğinde üst menüdeki "Sanal Staj Defteri" sekmesinden günü gününe çalışmalarınızı yazabilirsiniz.</span>
              ) : currentApp.status === 'AdvisorApproved' ? (
                <span>İşyeri yetkiliniz sanal defterinizi onayladı! Şimdi kapalı ve mühürlü zarftaki Form 4 belgenizi ve ciltli defter çıktınızı son teslim tarihine kadar elden veya kargo ile bölüme ulaştırınız.</span>
              ) : (
                <span>🎉 Tebrikler! Stajınız komisyon tarafından incelenmiş ve başarıyla sonuçlandırılmıştır.</span>
              )}
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <Info className="w-4 h-4" />
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* SECTION 1: DATES & WORK DAY CALCULATOR */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2.5 text-[#1c458b] border-b border-slate-100 pb-3">
          <Calendar className="w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-900">1. Staj Süresi ve Dinamik Tarih Hesaplama</h2>
        </div>

        {/* Warning if outside application window */}
        {!isWithinWindow && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <strong>Başvuru Kabul Dönemi Dışındasınız:</strong> Komisyon tarafından belirlenen staj başvuru tarih aralığı{' '}
              {currentPeriod && (
                <strong>
                  {new Date(currentPeriod.applicationStartDate).toLocaleDateString('tr-TR')} - {new Date(currentPeriod.applicationEndDate).toLocaleDateString('tr-TR')}
                </strong>
              )}{' '}
              tarihleridir. Taslak kaydedebilirsiniz ancak komisyona gönderim yapılamaz.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Day count selection (20 or 30 days) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Staj Süresi (İş Günü):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRequiredDays(20)}
                className={`py-3 rounded-xl border text-center font-bold text-sm transition cursor-pointer ${
                  requiredDays === 20
                    ? 'border-[#1c458b] bg-blue-50/50 text-[#1c458b] ring-2 ring-[#1c458b]/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                20 İş Günü
              </button>
              <button
                type="button"
                onClick={() => setRequiredDays(30)}
                className={`py-3 rounded-xl border text-center font-bold text-sm transition cursor-pointer ${
                  requiredDays === 30
                    ? 'border-[#1c458b] bg-blue-50/50 text-[#1c458b] ring-2 ring-[#1c458b]/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                30 İş Günü
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              * Staj 1 ve Staj 2 için bağımsız olarak 20 veya 30 iş günü seçilebilir.
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Staj Başlangıç Tarihi:
            </label>
            <input
              type="date"
              value={startDate}
              min={currentPeriod?.earliestStartDate?.split('T')[0]}
              max={currentPeriod?.latestEndDate?.split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#1c458b] focus:border-transparent text-sm font-semibold text-slate-800"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              * Komisyon aralığı:{' '}
              {currentPeriod && (
                <span className="font-semibold text-slate-700">
                  {new Date(currentPeriod.earliestStartDate).toLocaleDateString('tr-TR')} – {new Date(currentPeriod.latestEndDate).toLocaleDateString('tr-TR')}
                </span>
              )}
            </p>
          </div>

          {/* Saturday Work Rule */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              İşyeri Çalışma Düzeni:
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-xl border transition ${
              currentPeriod && !currentPeriod.isSaturdayAllowed
                ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                : 'border-slate-200 cursor-pointer hover:bg-slate-50'
            }`}>
              <input
                type="checkbox"
                checked={includesSaturday}
                disabled={currentPeriod && !currentPeriod.isSaturdayAllowed}
                onChange={(e) => setIncludesSaturday(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-900">Cumartesi Günleri Çalışılıyor</div>
                <div className="text-slate-500">
                  {currentPeriod && !currentPeriod.isSaturdayAllowed
                    ? 'Bu dönemde komisyon cumartesi izni vermemiştir'
                    : 'Haftada 6 gün hesabı yapılır'}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Calculation Summary Box */}
        {calcResult && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-blue-700">Otomatik Hesaplanan Bitiş Tarihi:</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {new Date(calcResult.calculatedEndDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  <span>📅 Toplam: <strong>{calcResult.totalCalendarDays} takvim günü</strong></span>
                  <span>🚫 Atlanan Pazar: <strong>{calcResult.totalSkippedSundays} gün</strong></span>
                  <span>🏖️ Atlanan Resmî Tatil: <strong>{calcResult.totalSkippedHolidays} gün</strong></span>
                  {!calcResult.includesSaturday && (
                    <span>⏸️ Atlanan Cumartesi: <strong>{calcResult.totalSkippedSaturdays} gün</strong></span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="px-4 py-2 bg-white text-blue-900 text-xs font-bold rounded-lg border border-blue-200 shadow-sm hover:bg-blue-50 flex items-center gap-1.5 transition self-start sm:self-center cursor-pointer"
              >
                <span>{showBreakdown ? 'Gün Dökümünü Gizle' : 'Gün Gün Dökümü Gör'}</span>
                {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Warning if calculated end date exceeds commission latest end date */}
            {isEndDateExceeded && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  ⚠️ Dikkat: Hesaplanan bitiş tarihi ({new Date(calcResult.calculatedEndDate).toLocaleDateString('tr-TR')}), komisyonun belirlediği en geç staj bitiş tarihini ({new Date(currentPeriod.latestEndDate).toLocaleDateString('tr-TR')}) aşmaktadır! Lütfen staj başlangıç tarihinizi öne çekiniz.
                </span>
              </div>
            )}

            {/* Expandable Breakdown Table */}
            {showBreakdown && (
              <div className="mt-4 pt-4 border-t border-blue-200/60 overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-blue-200 text-blue-950 font-bold">
                      <th className="py-2">Tarih</th>
                      <th className="py-2">Gün</th>
                      <th className="py-2">Durum</th>
                      <th className="py-2">Gerekçe / Sayım</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    {calcResult.breakdown.map((item, idx) => (
                      <tr key={idx} className={item.isCounted ? 'bg-white/60' : 'bg-amber-50/50 text-slate-500'}>
                        <td className="py-1.5 font-medium">{new Date(item.date).toLocaleDateString('tr-TR')}</td>
                        <td className="py-1.5">{item.dayName}</td>
                        <td className="py-1.5">
                          {item.isCounted ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Sayılıyor</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">Sayılmıyor</span>
                          )}
                        </td>
                        <td className="py-1.5">
                          {item.isCounted ? `İş Günü #${item.cumulativeDayCount}` : item.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: WORKPLACE & ADVISOR DETAILS */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-[#1c458b]">
            <Building2 className="w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-900">2. İşyeri ve Sorumlu Mühendis Bilgileri</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsNewWorkplace(!isNewWorkplace);
              setSelectedWorkplace(null);
            }}
            className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
          >
            {isNewWorkplace ? 'Kayıtlı Listeden Firma Seç' : '+ Yeni Firma Kaydet'}
          </button>
        </div>

        {/* Staj Konusu / Alanı (Form 2 Kuralı) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Stajın Konusu ve Çalışma Alanı * (FORM 2'deki gibi):
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Örn: Web ve Mobil Yazılım Geliştirme, Gömülü Sistemler, Veritabanı ve Bulut Mimarisi..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#1c458b]"
            required
          />
          <div className="bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Resmî Bölüm Kuralı:</strong>
              <span>
                Bir öğrenci Staj 1 ve Staj 2'yi aynı firmada yapabilir; ancak her iki stajın konularının veya çalıştığı birimlerin farklı olması zorunludur (Örn: Staj 1 = Ön Yüz Geliştirme, Staj 2 = Sunucu ve API Mimarisi).
              </span>
            </div>
          </div>
        </div>

        {/* Workplace Picker */}
        {!isNewWorkplace ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kayıtlı Firma Havuzundan Arama:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Firma adını yazmaya başlayın (örn: Havelsan, Logo, Akınsoft...)"
                value={selectedWorkplace ? selectedWorkplace.name : searchQuery}
                onChange={(e) => {
                  setSelectedWorkplace(null);
                  setSearchQuery(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#1c458b] focus:border-transparent font-medium"
              />
              {workplaceResults.length > 0 && !selectedWorkplace && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {workplaceResults.map((wp) => (
                    <div
                      key={wp.id}
                      onClick={() => {
                        setSelectedWorkplace(wp);
                        setSearchQuery('');
                        setWorkplaceResults([]);
                      }}
                      className="p-3 hover:bg-blue-50 cursor-pointer text-xs"
                    >
                      <div className="font-bold text-slate-900">{wp.name}</div>
                      <div className="text-slate-500">{wp.city} • {wp.sector}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedWorkplace && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <span>Seçilen Firma: <strong>{selectedWorkplace.name} ({selectedWorkplace.city})</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedWorkplace(null)}
                  className="text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
                >
                  Değiştir
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Yeni Firma Adı *</label>
              <input
                type="text"
                value={newWorkplaceData.name}
                onChange={(e) => setNewWorkplaceData({ ...newWorkplaceData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                placeholder="Örn: ABC Teknoloji Ltd. Şti."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Şehir</label>
              <input
                type="text"
                value={newWorkplaceData.city}
                onChange={(e) => setNewWorkplaceData({ ...newWorkplaceData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Faaliyet Alanı / Sektör</label>
              <input
                type="text"
                value={newWorkplaceData.sector}
                onChange={(e) => setNewWorkplaceData({ ...newWorkplaceData, sector: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Şirket Web Sitesi</label>
              <input
                type="text"
                value={newWorkplaceData.webSite}
                onChange={(e) => setNewWorkplaceData({ ...newWorkplaceData, webSite: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {/* Advisor Details */}
        <div className="border-t border-slate-100 pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Öğrenciden Sorumlu Mühendis / Yetkili Bilgileri:</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mühendisin Adı Soyadı *</label>
              <input
                type="text"
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                placeholder="Örn: Müh. Ayşe Demir"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mühendisin E-posta Adresi * <span className="text-blue-600 font-normal">(Onay gidecek)</span>
              </label>
              <input
                type="email"
                value={advisorEmail}
                onChange={(e) => setAdvisorEmail(e.target.value)}
                placeholder="ayse.demir@sirket.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefon Numarası</label>
              <input
                type="text"
                value={advisorPhone}
                onChange={(e) => setAdvisorPhone(e.target.value)}
                placeholder="0532 ..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mezun Olduğu Fakülte/Bölüm *</label>
              <input
                type="text"
                value={advisorDepartment}
                onChange={(e) => setAdvisorDepartment(e.target.value)}
                placeholder="Örn: Mühendislik Fakültesi"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Görevi / Unvanı</label>
              <input
                type="text"
                value={advisorTitle}
                onChange={(e) => setAdvisorTitle(e.target.value)}
                placeholder="Örn: Kıdemli Yazılım Mühendisi"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowForm2Modal(true)}
                className="w-full py-2.5 px-3 bg-[#1c458b] text-white hover:bg-blue-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Ön Doldurulmuş Form 2 İndir / Yazdır
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: UNIFIED DOCUMENT UPLOADS (FORM 2 + SPAS) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center gap-2.5 text-[#1c458b] border-b border-slate-100 pb-3">
          <UploadCloud className="w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-900">3. Islak İmzalı Evraklar ve SPAS Yükleme Alanı</h2>
        </div>

        <p className="text-xs text-slate-600">
          Selçuk Üniversitesi güncel staj duyurusu uyarınca, staja başlayabilmeniz için taranmış 
          <strong> Islak İmzalı Form 2</strong> ve <strong>e-Devlet SPAS Müstehaklık Belgesi</strong> zorunludur.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form 2 Upload Box */}
          <div className={`p-5 rounded-2xl border-2 transition ${
            hasForm2 ? 'border-emerald-300 bg-emerald-50/40' : 'border-dashed border-slate-300 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCheck className={`w-5 h-5 ${hasForm2 ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-bold text-sm text-slate-900">Islak İmzalı Form 2 (Staj Kabul Formu)</span>
              </div>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">ZORUNLU</span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              İşyeri ve sorumlu personel kaşe/imzası tamamlanmış belgenin taranmış PDF veya yüksek kaliteli resim nüshası.
            </p>

            {hasForm2 ? (
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-900">Yüklendi (Sürüm 1)</span>
                </div>
                <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                  Yeni Sürüm Yükle
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload('Form2_KabulFormu', e.target.files[0])}
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 bg-white border border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  {uploadingDoc === 'Form2_KabulFormu' ? 'Yükleniyor...' : 'Form 2 Dosyasını Seç (PDF)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('Form2_KabulFormu', e.target.files[0])}
                />
              </label>
            )}
          </div>

          {/* SPAS Upload Box */}
          <div className={`p-5 rounded-2xl border-2 transition ${
            hasSpas ? 'border-emerald-300 bg-emerald-50/40' : 'border-dashed border-slate-300 bg-slate-50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCheck className={`w-5 h-5 ${hasSpas ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-bold text-sm text-slate-900">e-Devlet SPAS Müstehaklık Belgesi</span>
              </div>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">ZORUNLU</span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              e-Devlet kapısından alınan barkodlu SGK Sağlık Provizyon Aktivasyon Sistemi (SPAS) belgesi (PDF).
            </p>

            {hasSpas ? (
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-900">Yüklendi (Sürüm 1)</span>
                </div>
                <label className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">
                  Yeni Sürüm Yükle
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload('Spas_Mustehaklik', e.target.files[0])}
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 bg-white border border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">
                  {uploadingDoc === 'Spas_Mustehaklik' ? 'Yükleniyor...' : 'SPAS Belgesini Seç (PDF)'}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('Spas_Mustehaklik', e.target.files[0])}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: ACTIONS */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          {!hasForm2 || !hasSpas ? (
            <span className="text-amber-700 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Komisyona gönderebilmek için Form 2 ve SPAS belgelerini yüklemeniz gerekmektedir.
            </span>
          ) : !isWithinWindow ? (
            <span className="text-rose-700 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Komisyonun belirlediği staj başvuru dönemi dışındasınız.
            </span>
          ) : isEndDateExceeded ? (
            <span className="text-rose-700 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Hesaplanan staj bitiş tarihi komisyonun izin verdiği son staj tarihini aşmaktadır.
            </span>
          ) : (
            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Tüm zorunlu alanlar ve belgeler tamamlandı. Başvurunuzu komisyona iletebilirsiniz.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {saving ? 'Kaydediliyor...' : 'Taslak Kaydet'}
          </button>

          <button
            type="button"
            onClick={handleSubmitToCommission}
            disabled={saving || !hasForm2 || !hasSpas || !isWithinWindow || isEndDateExceeded || currentApp?.status === 'Submitted' || currentApp?.status === 'ApprovedByCommission'}
            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-xs text-white transition shadow cursor-pointer ${
              hasForm2 && hasSpas && isWithinWindow && !isEndDateExceeded && currentApp?.status !== 'Submitted' && currentApp?.status !== 'ApprovedByCommission'
                ? 'bg-[#1c458b] hover:bg-blue-800'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {saving ? 'Gönderiliyor...' : 'Komisyona Gönder'}
          </button>
        </div>
      </div>

      {/* FORM 2 PRINTABLE MODAL */}
      {showForm2Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col">
            {/* Modal Action Bar */}
            <div className="bg-[#1c458b] text-white px-6 py-3.5 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#c5a880]" />
                <span className="font-bold text-sm">Resmî Form 2 (Staj Kabul Formu) Ön İzleme</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-[#c5a880] hover:bg-[#b0946d] text-slate-900 font-extrabold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Yazdır / PDF Olarak Kaydet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm2Modal(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Form Content */}
            <div className="p-8 sm:p-10 text-slate-900 font-serif space-y-6 bg-white print:p-0">
              {/* Official Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="w-20 h-20 shrink-0">
                  <SelcukLogo className="w-20 h-20" />
                </div>
                <div className="text-center flex-1 px-4">
                  <h3 className="font-bold text-base sm:text-lg uppercase tracking-wide">T.C.</h3>
                  <h2 className="font-black text-lg sm:text-xl uppercase tracking-wider">SELÇUK ÜNİVERSİTESİ</h2>
                  <h4 className="font-semibold text-xs sm:text-sm mt-0.5">STAJ BAŞVURU VE KABUL FORMU (FORM-2)</h4>
                </div>
                <div className="text-right text-xs shrink-0 font-sans">
                  <div><strong>Tarih:</strong> {new Date().toLocaleDateString('tr-TR')}</div>
                  <div><strong>Staj Kodu:</strong> {selectedType === 'Staj1' ? 'Staj 1' : 'Staj 2'}</div>
                </div>
              </div>

              {/* Section 1: Student Information */}
              <div className="font-sans text-xs space-y-2">
                <div className="bg-slate-100 font-bold p-2 text-slate-900 border border-slate-300 uppercase">
                  1. ÖĞRENCİ KİMLİK VE İLETİŞİM BİLGİLERİ
                </div>
                <div className="grid grid-cols-2 gap-2 border border-slate-300 p-3">
                  <div><strong>T.C. Kimlik No:</strong> {currentUser.studentProfile?.nationalId || '—'}</div>
                  <div><strong>Öğrenci Numarası:</strong> {currentUser.studentProfile?.studentNumber || '—'}</div>
                  <div><strong>Adı ve Soyadı:</strong> {currentUser.fullName}</div>
                  <div><strong>Fakülte:</strong> {currentUser.studentProfile?.faculty || 'Fakülte'}</div>
                  <div><strong>Bölüm:</strong> {currentUser.studentProfile?.department || 'Bölüm'}</div>
                  <div><strong>Sınıfı:</strong> {currentUser.studentProfile?.classLevel || 3}. Sınıf</div>
                  <div><strong>Telefon:</strong> {currentUser.phoneNumber || '—'}</div>
                  <div><strong>E-posta:</strong> {currentUser.email}</div>
                  <div className="col-span-2"><strong>İkametgâh Adresi:</strong> {currentUser.studentProfile?.address || '—'}</div>
                </div>
              </div>

              {/* Section 2: Workplace Information */}
              <div className="font-sans text-xs space-y-2">
                <div className="bg-slate-100 font-bold p-2 text-slate-900 border border-slate-300 uppercase">
                  2. STAJ YAPILACAK İŞ YERİ / KURULUŞ BİLGİLERİ
                </div>
                <div className="grid grid-cols-2 gap-2 border border-slate-300 p-3">
                  <div className="col-span-2"><strong>Kurum / Şirket Adı:</strong> {selectedWorkplace ? selectedWorkplace.name : (newWorkplaceData.name || '—')}</div>
                  <div><strong>Şehir:</strong> {selectedWorkplace ? selectedWorkplace.city : (newWorkplaceData.city || '—')}</div>
                  <div><strong>Faaliyet Alanı / Sektör:</strong> {selectedWorkplace ? selectedWorkplace.sector : (newWorkplaceData.sector || '—')}</div>
                  <div><strong>Web Sitesi:</strong> {selectedWorkplace?.webSite || newWorkplaceData.webSite || '—'}</div>
                  <div><strong>Kurum E-posta:</strong> {selectedWorkplace?.companyEmail || newWorkplaceData.companyEmail || '—'}</div>
                </div>
              </div>

              {/* Section 3: Internship Period & Plan */}
              <div className="font-sans text-xs space-y-2">
                <div className="bg-slate-100 font-bold p-2 text-slate-900 border border-slate-300 uppercase">
                  3. STAJ DÖNEMİ, SÜRESİ VE KONUSU
                </div>
                <div className="grid grid-cols-2 gap-2 border border-slate-300 p-3">
                  <div><strong>Staj Türü:</strong> {selectedType === 'Staj1' ? 'Staj 1' : 'Staj 2'}</div>
                  <div><strong>Staj Süresi:</strong> {requiredDays} İş Günü</div>
                  <div><strong>Başlangıç Tarihi:</strong> {startDate ? new Date(startDate).toLocaleDateString('tr-TR') : '—'}</div>
                  <div>
                    <strong>Bitiş Tarihi:</strong>{' '}
                    {calcResult ? new Date(calcResult.calculatedEndDate).toLocaleDateString('tr-TR') : '—'}
                  </div>
                  <div><strong>Cumartesi Çalışması:</strong> {includesSaturday ? 'Dahil (Haftada 6 Gün)' : 'Hariç (Haftada 5 Gün)'}</div>
                  <div><strong>Takvim Günü:</strong> {calcResult?.totalCalendarDays || '—'} Gün</div>
                  <div className="col-span-2"><strong>Stajın Konusu ve Alanı:</strong> {subject}</div>
                </div>
              </div>

              {/* Section 4: Advisor Engineer Information */}
              <div className="font-sans text-xs space-y-2">
                <div className="bg-slate-100 font-bold p-2 text-slate-900 border border-slate-300 uppercase">
                  4. ÖĞRENCİDEN SORUMLU MÜHENDİS / İŞ YERİ YETKİLİSİ BİLGİLERİ
                </div>
                <div className="grid grid-cols-2 gap-2 border border-slate-300 p-3">
                  <div><strong>Adı ve Soyadı:</strong> {advisorName || '—'}</div>
                  <div><strong>Unvanı / Görevi:</strong> {advisorTitle || '—'}</div>
                  <div><strong>Mezuniyet Bölümü:</strong> {advisorDepartment || '—'}</div>
                  <div><strong>Kurumsal E-posta:</strong> {advisorEmail || '—'}</div>
                  <div><strong>Telefon No:</strong> {advisorPhone || '—'}</div>
                </div>
              </div>

              {/* Section 5: Signature & Seal Boxes */}
              <div className="font-sans text-xs pt-4">
                <div className="grid grid-cols-3 gap-4 border border-slate-300 p-4 text-center">
                  <div className="space-y-12">
                    <div className="font-bold">Öğrenci İmzası</div>
                    <div className="text-[11px] text-slate-500">Adı Soyadı / İmza</div>
                  </div>
                  <div className="space-y-12 border-x border-slate-300 px-2">
                    <div className="font-bold">İş Yeri Yetkilisi / Mühendis</div>
                    <div className="text-[11px] text-slate-500">Kaşe ve Islak İmza</div>
                  </div>
                  <div className="space-y-12">
                    <div className="font-bold">Staj Komisyonu Onayı</div>
                    <div className="text-[11px] text-slate-500">Mühür ve İmza</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
