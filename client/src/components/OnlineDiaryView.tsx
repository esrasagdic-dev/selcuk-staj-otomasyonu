import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Save, 
  Send, 
  AlertCircle, 
  Info, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Lock, 
  Image as ImageIcon, 
  UploadCloud, 
  Trash2, 
  ZoomIn, 
  X, 
  Camera,
  Printer,
  Building2,
  Users,
  Plus,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { DiaryEntry, InternshipApplication, DiaryCoverInfo, WorkplaceStaff } from '../types';
import { apiRequest } from '../services/api';
import { PrintableOfficialDiary } from './PrintableOfficialDiary';

export const OnlineDiaryView: React.FC = () => {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'diary' | 'cover'>('diary');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentImageCaption, setCurrentImageCaption] = useState<string>('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Cover Page 2 (İşyeri & Personel Bilgileri) State
  const [coverInfo, setCoverInfo] = useState<DiaryCoverInfo>({
    totalEmployees: '250+',
    workplacePhone: '',
    workplaceEmail: '',
    workplaceWebSite: '',
    workplaceAddress: '',
    workplaceCity: '',
    activityAreas: [
      'Yazılım Geliştirme, Sistem Analizi ve Kurumsal Bilişim Çözümleri',
      'Web, Mobil ve Bulut Tabanlı Dağıtık Servis Mimarileri',
      'Veri Tabanı Yönetim Sistemleri ve İş Zekâsı / Analitik',
      'Yapay Zekâ, Makine Öğrenmesi ve Otomasyon Teknolojileri',
      'Bilgi Güvenliği, Ağ Altyapısı ve DevOps Süreçleri'
    ],
    staffMembers: []
  });
  const [savingCover, setSavingCover] = useState(false);
  const [coverStatusMsg, setCoverStatusMsg] = useState<string | null>(null);

  const loadMyApplications = async () => {
    try {
      const res: any = await apiRequest('/applications/my');
      if (Array.isArray(res) && res.length > 0) {
        setApplications(res);
        if (!selectedAppId) {
          setSelectedAppId(res[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMyApplications();
  }, []);

  const loadDiary = async (appId: number) => {
    try {
      const res: any = await apiRequest(`/diary/${appId}`);
      if (Array.isArray(res)) {
        setEntries(res);
        const entry = res.find((e: DiaryEntry) => e.dayNumber === activeDay);
        if (entry) {
          setCurrentTitle(entry.title || '');
          setCurrentContent(entry.content || '');
          setCurrentImageCaption(entry.imageCaption || '');
          setCurrentImageUrl(entry.imageUrlFull || (entry.imageUrl ? `/api/diary/${appId}/entry/${entry.dayNumber}/image` : null));
        } else {
          setCurrentTitle('');
          setCurrentContent('');
          setCurrentImageCaption('');
          setCurrentImageUrl(null);
        }
      }
    } catch {
      setEntries([]);
    }
  };

  const loadCoverInfo = async (appId: number) => {
    try {
      const res: any = await apiRequest(`/diary/${appId}/cover-info`);
      if (res) {
        setCoverInfo(res);
      }
    } catch (err) {
      console.error('Kapak bilgileri yüklenemedi:', err);
    }
  };

  useEffect(() => {
    if (selectedAppId) {
      loadDiary(selectedAppId);
      loadCoverInfo(selectedAppId);
    }
  }, [selectedAppId]);

  useEffect(() => {
    const entry = entries.find((e) => e.dayNumber === activeDay);
    if (entry) {
      setCurrentTitle(entry.title || '');
      setCurrentContent(entry.content || '');
      setCurrentImageCaption(entry.imageCaption || '');
      setCurrentImageUrl(entry.imageUrlFull || (entry.imageUrl ? `/api/diary/${selectedAppId}/entry/${entry.dayNumber}/image` : null));
    } else {
      setCurrentTitle('');
      setCurrentContent('');
      setCurrentImageCaption('');
      setCurrentImageUrl(null);
    }
  }, [activeDay, entries, selectedAppId]);

  const activeApp = applications.find(a => a.id === selectedAppId);
  const totalDays = activeApp?.requiredWorkDays || 20;
  const completedDays = entries.filter(e => !e.isDraft).length;
  const isAllDaysCompleted = completedDays >= totalDays;
  const missingDays = Math.max(0, totalDays - completedDays);
  const isApproved = activeApp?.status === 'AdvisorApproved' || activeApp?.status === 'Completed';
  const isAwaitingApproval = activeApp?.status === 'AwaitingAdvisorApproval';
  const isLocked = activeApp?.diary?.isLocked || isApproved;
  const lockReason = activeApp?.diary?.lockReason || (isApproved ? 'İş yeri yetkilisi tarafından onaylandığı için defter kilitlidir.' : 'Staj süresi dolduğu için sistem tarafından kilitlenmiştir.');
  const isRevisionRequested = activeApp?.diary?.isRevisionRequestedByAdvisor || false;
  const advisorRevisionNotes = activeApp?.diary?.advisorRevisionNotes || '';

  const handleSaveEntry = async (isDraft: boolean) => {
    if (!selectedAppId) return;
    if (isLocked) {
      alert(`Staj defteri kilitlidir: ${lockReason}`);
      return;
    }
    if (!currentTitle.trim() || !currentContent.trim()) {
      alert('Lütfen günün başlığını ve staj içeriğini giriniz.');
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      await apiRequest(`/diary/${selectedAppId}/entry`, {
        method: 'POST',
        body: JSON.stringify({
          dayNumber: activeDay,
          entryDate: new Date().toISOString(),
          title: currentTitle,
          content: currentContent,
          isDraft,
          imageCaption: currentImageCaption
        })
      });

      setStatusMsg(`${activeDay}. gün kaydı başarıyla kaydedildi!`);
      await loadDiary(selectedAppId);
    } catch (err: any) {
      alert(err.message || 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAppId || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Format & boyut kontrolü
    if (!file.type.startsWith('image/')) {
      alert('Lütfen yalnızca PNG, JPG, JPEG veya WEBP formatında bir görsel seçiniz.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Görsel boyutu 10 MB\'dan küçük olmalıdır.');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (currentImageCaption) {
        formData.append('caption', currentImageCaption);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/diary/${selectedAppId}/entry/${activeDay}/upload-image`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Görsel yüklenemedi.');
      }

      const res = await response.json();
      setStatusMsg(`${activeDay}. gün için çalışma görseli başarıyla yüklendi!`);
      await loadDiary(selectedAppId);
    } catch (err: any) {
      alert(err.message || 'Görsel yükleme başarısız.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async () => {
    if (!selectedAppId) return;
    if (!window.confirm(`${activeDay}. gün için eklenen görseli silmek istediğinize emin misiniz?`)) return;

    try {
      await apiRequest(`/diary/${selectedAppId}/entry/${activeDay}/image`, {
        method: 'DELETE'
      });
      setStatusMsg(`${activeDay}. gün görseli kaldırıldı.`);
      setCurrentImageUrl(null);
      setCurrentImageCaption('');
      await loadDiary(selectedAppId);
    } catch (err: any) {
      alert(err.message || 'Görsel silinemedi.');
    }
  };

  const handleSaveCoverInfo = async () => {
    if (!selectedAppId) return;
    if (isApproved) {
      alert('İş yeri tarafından onaylanan staj defteri değiştirilemez.');
      return;
    }

    setSavingCover(true);
    setCoverStatusMsg(null);
    try {
      const res: any = await apiRequest(`/diary/${selectedAppId}/cover-info`, {
        method: 'POST',
        body: JSON.stringify(coverInfo)
      });
      setCoverStatusMsg(res.message || 'İş yeri ve personel tanıtım bilgileri başarıyla kaydedildi!');
      setTimeout(() => setCoverStatusMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Kapak bilgileri kaydedilemedi.');
    } finally {
      setSavingCover(false);
    }
  };

  const handleAddStaffMember = () => {
    const currentStaff = coverInfo.staffMembers || [];
    if (currentStaff.length >= 10) {
      alert('Resmî şablona göre en fazla 10 personel eklenebilir.');
      return;
    }
    const newStaff: WorkplaceStaff = {
      rowNo: currentStaff.length + 1,
      fullName: '',
      graduatedUniversityAndDepartment: '',
      titleOrPosition: ''
    };
    setCoverInfo({
      ...coverInfo,
      staffMembers: [...currentStaff, newStaff]
    });
  };

  const handleRemoveStaffMember = (index: number) => {
    if (!coverInfo.staffMembers) return;
    const updated = coverInfo.staffMembers.filter((_, idx) => idx !== index);
    setCoverInfo({
      ...coverInfo,
      staffMembers: updated
    });
  };

  const handleStaffChange = (index: number, field: keyof WorkplaceStaff, value: string) => {
    if (!coverInfo.staffMembers) return;
    const updated = [...coverInfo.staffMembers];
    updated[index] = { ...updated[index], [field]: value };
    setCoverInfo({
      ...coverInfo,
      staffMembers: updated
    });
  };

  const handleActivityChange = (index: number, value: string) => {
    const updated = [...(coverInfo.activityAreas || [])];
    updated[index] = value;
    setCoverInfo({
      ...coverInfo,
      activityAreas: updated
    });
  };

  const handleSubmitToAdvisor = async () => {
    if (!selectedAppId) return;
    if (completedDays < totalDays) {
      alert(`Staj defteriniz eksiktir! Zorunlu iş günü sayısı: ${totalDays}, doldurulan gün: ${completedDays}. Kalan ${missingDays} günü doldurmadan iş yeri onayına gönderemezsiniz.`);
      return;
    }

    const confirmMsg = 
      `Tebrikler! ${totalDays} iş günlük staj defterinizin tamamını eksiksiz doldurdunuz.\n\nStaj defterinizi iş yeri yetkilisi onayına göndermek istiyor musunuz?\n\nİş yeri yetkilisine bilgilendirme e-postası ve güvenli erişim kodu iletilecektir.`;
    
    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const res: any = await apiRequest(`/diary/${selectedAppId}/submit-to-advisor`, {
        method: 'POST'
      });
      alert(res.message || 'Staj defteri başarıyla iş yeri yetkilisinin onayına gönderildi!');
      await loadMyApplications();
      await loadDiary(selectedAppId);
    } catch (err: any) {
      alert(err.message || 'Gönderim başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* Interactive web portal UI wrapped cleanly in print:hidden */}
      <div data-no-print="true" className="space-y-6 print:hidden">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-[#1c458b]">
            <BookOpen className="w-6 h-6" />
            <h1 className="text-xl font-bold text-slate-900">Sanal Staj Defteri Yazım Alanı</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Her resmî iş günü için yaptığınız teknik faaliyetleri yazabilir, her gün için ayrı çalışma görseli / mimari şema yükleyebilir ve iş yeri onayına sunabilirsiniz.
          </p>
        </div>

        {/* Application selector if multiple */}
        {applications.length > 1 && (
          <select
            value={selectedAppId || ''}
            onChange={(e) => setSelectedAppId(Number(e.target.value))}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.type} - {app.workplaceName || 'Firma'} ({app.requiredWorkDays} Gün)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KİLİTLENME VE DÜZELTME BİLDİRİM BANNERLARI */}
      {activeApp?.diary?.isLocked && (
        <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-2xl text-xs text-rose-950 flex items-start gap-3 shadow-xs print:hidden">
          <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-sm block text-rose-900">🔒 Sanal Staj Defteriniz Kilitlenmiştir</span>
            <p className="mt-1 leading-relaxed">{lockReason}</p>
          </div>
        </div>
      )}

      {isRevisionRequested && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs print:hidden">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold text-sm block text-amber-900">✏️ İşyeri Danışman Mühendisi Defter Düzeltmesi İstedi</span>
            <p className="mt-1 leading-relaxed font-semibold">"{advisorRevisionNotes}"</p>
            <p className="text-[11px] text-amber-800 mt-1">Lütfen ilgili günlerdeki teknik faaliyetleri güncelleyip tekrar danışman onayına sununuz.</p>
          </div>
        </div>
      )}

      {/* Strict Completeness & Submission Card (20 Gün ise 20, 30 Gün ise 30 Gün Zorunluluğu) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="space-y-1.5 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Staj Defteri Doluluk Durumu:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${isAllDaysCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {completedDays} / {totalDays} İş Günü Dolduruldu
            </span>
          </div>

          <div className="w-full md:w-80 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${isAllDaysCompleted ? 'bg-emerald-600' : 'bg-[#1c458b]'}`}
              style={{ width: `${Math.min(100, Math.round((completedDays / totalDays) * 100))}%` }}
            />
          </div>

          {!isAllDaysCompleted ? (
            <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>Yönerge Kuralı:</strong> {totalDays} günlük staj için tam <strong>{totalDays} iş günü</strong> defter yazılmalıdır. {missingDays} gün eksik olduğu için iş yeri onayına <u>gönderilemez</u>.
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{totalDays} iş gününün tamamı doldurulmuştur. Staj defteriniz iş yeri onayına sunulmaya hazırdır.</span>
            </p>
          )}
        </div>

        <div className="shrink-0 w-full md:w-auto flex flex-wrap items-center justify-end gap-2.5">
          {completedDays > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#1c458b] font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer print:hidden"
              title="Doldurulan staj defterini resmî kapak ve formatta yazdır veya PDF olarak kaydet"
            >
              <Printer className="w-4 h-4 text-[#1c458b]" />
              <span>Defteri Yazdır / PDF İndir</span>
            </button>
          )}

          {isApproved ? (
            <div className="px-5 py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>İş Yeri Yetkilisi Tarafından Onaylandı</span>
            </div>
          ) : isAwaitingApproval ? (
            <div className="px-5 py-2.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>İş Yeri Onayı Bekleniyor</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isAllDaysCompleted || submitting}
              onClick={handleSubmitToAdvisor}
              className={`w-full md:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md print:hidden ${
                isAllDaysCompleted 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-emerald-200' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {submitting 
                  ? 'Gönderiliyor...' 
                  : isAllDaysCompleted 
                    ? 'Staj Defterini İş Yeri Onayına Gönder' 
                    : `${missingDays} Gün Eksik - Gönderilemez`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* View Tabs Selector */}
      <div className="bg-slate-200/80 p-1.5 rounded-2xl flex flex-col sm:flex-row items-center gap-2 border border-slate-300 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('diary')}
          className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'diary'
              ? 'bg-[#1c458b] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Günlük Rapor Yazımı ({completedDays} / {totalDays} İş Günü Dolduruldu)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cover')}
          className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'cover'
              ? 'bg-[#1c458b] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. İş Yeri & Personel Tanıtımı (Kapak 2. Sayfa)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'cover' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
          }`}>
            {(coverInfo.staffMembers && coverInfo.staffMembers.length > 0) ? `${coverInfo.staffMembers.length} Mühendis/Personel` : 'Doldur'}
          </span>
        </button>
      </div>

      {/* Guide Checklist Box (Visible only on Diary tab) */}
      {activeTab === 'diary' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3 print:hidden">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Bölüm Rehberi Rapor Standartları Kontrol Listesi:</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700">
              <span>✓ Yazı Tipi: Arial 12 punto</span>
              <span>✓ Hizalama: İki yana yaslı</span>
              <span>✓ Satır Aralığı: Tek satır</span>
              <span>✓ Her gün için ayrı teknik görsel / şema eklenebilir</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Work Area: Left Sidebar (Days) + Right Editor */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
        {/* Days Nav */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          {/* Quick Tab to Cover 2nd Page */}
          <button
            type="button"
            onClick={() => setActiveTab('cover')}
            className={`w-full p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
              activeTab === 'cover'
                ? 'bg-[#1c458b] text-white shadow border-[#1c458b]'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>İş Yeri & Personel (2. Sayfa)</span>
            </div>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
              {coverInfo.staffMembers?.length || 5} Kişi
            </span>
          </button>

          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Staj Günleri (1 - {totalDays}):
          </div>

          <div className="grid grid-cols-4 md:grid-cols-2 gap-2 max-h-[550px] overflow-y-auto pr-1">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const matchingEntry = entries.find(e => e.dayNumber === day);
              const isFilled = matchingEntry && !matchingEntry.isDraft;
              const hasImage = matchingEntry && !!matchingEntry.imageUrl;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setActiveTab('diary');
                    setActiveDay(day);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    activeTab === 'diary' && activeDay === day
                      ? 'bg-[#1c458b] text-white shadow'
                      : isFilled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{day}. Gün</span>
                    {hasImage && (
                      <span title="Görsel / Şema Eklendi" className="text-[11px]">📷</span>
                    )}
                  </div>
                  {isFilled && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Daily Report Editor Area */}
        {activeTab === 'diary' && (
        <div className="md:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-blue-100 text-[#1c458b] font-bold text-xs">
                {activeDay}. Gün Günlüğü
              </span>
              <span className="text-xs text-slate-400">
                (Doldurulan: {completedDays} / {totalDays} Gün)
              </span>
            </div>

            {statusMsg && (
              <span className="text-xs text-emerald-700 font-semibold animate-pulse">
                {statusMsg}
              </span>
            )}
          </div>

          {isApproved && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Bu staj defteri iş yeri yetkilisi tarafından onaylandığı için kilitlenmiştir, düzenleme yapılamaz.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Günün Konusu / Yapılan İşin Başlığı:
            </label>
            <input
              type="text"
              disabled={isApproved}
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              placeholder="Örn: Veritabanı Mimarisi ve API Entegrasyonu"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#1c458b] disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Ayrıntılı Günlük Rapor Metni:
            </label>
            <textarea
              disabled={isApproved}
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              placeholder="Bugün işyerinde gerçekleştirilen faaliyetleri, öğrenilen teknolojileri, yazılan kodları ve tasarım adımlarını detaylıca açıklayınız..."
              rows={10}
              className="w-full p-4 rounded-xl border border-slate-300 text-sm text-slate-800 leading-relaxed font-sans focus:ring-2 focus:ring-[#1c458b] disabled:bg-slate-100 disabled:text-slate-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Karakter Sayısı: {currentContent.length}</span>
              <span>Tahmini Sayfa: {Math.max(1, Math.round(currentContent.length / 1500))} Sayfa</span>
            </div>
          </div>

          {/* HER GÜNÜN AYRI GÖRSEL EKLEME KISMI */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1c458b] flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-[#1c458b]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {activeDay}. Gün Çalışma Görseli / Şeması (İsteğe Bağlı)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Günün teknik çalışmasına ait mimari şema, kod akış diyagramı, ekran görüntüsü veya devre şeması ekleyebilirsiniz.
                  </p>
                </div>
              </div>

              {currentImageUrl && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Görsel Yüklü</span>
                </span>
              )}
            </div>

            {currentImageUrl ? (
              <div className="space-y-3 pt-1">
                <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                  <div 
                    onClick={() => setPreviewModalUrl(currentImageUrl)}
                    className="relative cursor-pointer shrink-0 w-full sm:w-52 h-36 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 group"
                  >
                    <img 
                      src={currentImageUrl} 
                      alt={`Gün ${activeDay} Görseli`} 
                      className="w-full h-full object-cover transition duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                      <ZoomIn className="w-4 h-4" />
                      <span>Tam Ekran Büyüt</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 w-full">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Görsel Açıklaması / Şekil Başlığı:
                      </label>
                      <input 
                        type="text"
                        disabled={isApproved}
                        value={currentImageCaption}
                        onChange={(e) => setCurrentImageCaption(e.target.value)}
                        placeholder="Örn: Şekil 1: Mikroservis Mimarisi ve Veritabanı ER Diyagramı"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#1c458b] disabled:bg-slate-100"
                      />
                    </div>

                    {!isApproved && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <label className="px-3.5 py-2 rounded-xl bg-blue-50 text-[#1c458b] hover:bg-blue-100 text-xs font-bold cursor-pointer transition flex items-center gap-1.5 border border-blue-200">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{uploadingImage ? 'Yükleniyor...' : 'Görseli Değiştir'}</span>
                          <input 
                            type="file" 
                            accept="image/png,image/jpeg,image/jpg,image/webp" 
                            disabled={uploadingImage}
                            onChange={handleImageUpload} 
                            className="hidden" 
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleDeleteImage}
                          className="px-3.5 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition flex items-center gap-1.5 border border-red-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Görseli Kaldır</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-white space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1c458b] flex items-center justify-center mx-auto border border-blue-100">
                  <Camera className="w-6 h-6 text-[#1c458b]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">
                    {activeDay}. Gün İçin Çalışma Görseli Ekleyin
                  </p>
                  <p className="text-[11px] text-slate-500">
                    PNG, JPG, JPEG veya WEBP formatında (Maksimum 10 MB)
                  </p>
                </div>

                {!isApproved && (
                  <div className="max-w-md mx-auto space-y-2.5 pt-1">
                    <input 
                      type="text"
                      value={currentImageCaption}
                      onChange={(e) => setCurrentImageCaption(e.target.value)}
                      placeholder="Görsel açıklaması (Örn: Şekil 1: Docker Konteyner Mimarisi)..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 text-center focus:ring-2 focus:ring-[#1c458b]"
                    />
                    <div>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1c458b] hover:bg-blue-800 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm">
                        <UploadCloud className="w-4 h-4" />
                        <span>{uploadingImage ? 'Yükleniyor...' : `${activeDay}. Gün İçin Görsel Seç ve Yükle`}</span>
                        <input 
                          type="file" 
                          accept="image/png,image/jpeg,image/jpg,image/webp" 
                          disabled={uploadingImage}
                          onChange={handleImageUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isApproved && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleSaveEntry(true)}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                Taslak Kaydet
              </button>

              <button
                type="button"
                onClick={() => handleSaveEntry(false)}
                disabled={saving}
                className="px-6 py-2.5 bg-[#1c458b] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Kaydediliyor...' : `${activeDay}. Günü Onayla ve Kaydet`}
              </button>
            </div>
          )}
        </div>
        )}

        {/* Tab 2: Cover Page 2 (İş Yeri ve Personel Tanıtımı) Editor Area */}
        {activeTab === 'cover' && (
          <div className="md:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-[#1c458b]">
                    <Building2 className="w-5 h-5" />
                    <h2 className="text-base font-bold text-slate-900">
                      Resmî Staj Raporu 2. Sayfa (İş Yeri Bilgileri ve Personel Tanıtımı)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Selçuk Üniversitesi Bilgisayar Mühendisliği staj yönergesi uyarınca firmanızdaki çalışan sayısını, 5 temel faaliyet alanını ve teknik kadroyu (mühendisleri) buradan doldurunuz.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCoverInfo}
                  disabled={savingCover || isApproved}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCover ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}</span>
                </button>
              </div>

              {coverStatusMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{coverStatusMsg}</span>
                </div>
              )}

              {/* Bölüm 1: İşyeri Resmî İletişim & Toplam Çalışan Sayısı */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#1c458b]" />
                  <span>1. İş Yeri Künyesi ve Çalışan Sayısı</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Toplam Çalışan Sayısı:
                    </label>
                    <input
                      type="text"
                      disabled={isApproved}
                      value={coverInfo.totalEmployees || ''}
                      onChange={(e) => setCoverInfo({ ...coverInfo, totalEmployees: e.target.value })}
                      placeholder="Örn: 250+, 50, 85"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-[#1c458b]"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {['10-50', '50-100', '250+', '500+'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCoverInfo({ ...coverInfo, totalEmployees: preset })}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      İş Yeri Telefonu:
                    </label>
                    <input
                      type="text"
                      disabled={isApproved}
                      value={coverInfo.workplacePhone || ''}
                      onChange={(e) => setCoverInfo({ ...coverInfo, workplacePhone: e.target.value })}
                      placeholder="Örn: 0332 000 00 00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-[#1c458b]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      İş Yeri E-Postası:
                    </label>
                    <input
                      type="text"
                      disabled={isApproved}
                      value={coverInfo.workplaceEmail || ''}
                      onChange={(e) => setCoverInfo({ ...coverInfo, workplaceEmail: e.target.value })}
                      placeholder="Örn: info@firma.com.tr"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-[#1c458b]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      İş Yeri Web Sitesi:
                    </label>
                    <input
                      type="text"
                      disabled={isApproved}
                      value={coverInfo.workplaceWebSite || ''}
                      onChange={(e) => setCoverInfo({ ...coverInfo, workplaceWebSite: e.target.value })}
                      placeholder="Örn: www.firma.com.tr"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-[#1c458b]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      İş Yeri Açık Adresi:
                    </label>
                    <input
                      type="text"
                      disabled={isApproved}
                      value={coverInfo.workplaceAddress || ''}
                      onChange={(e) => setCoverInfo({ ...coverInfo, workplaceAddress: e.target.value })}
                      placeholder="Örn: Beyhekim Mah. Şehit Halis Şişman Cad. No:1/A Selçuklu"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-[#1c458b]"
                    />
                  </div>
                </div>
              </div>

              {/* Bölüm 2: İş Yeri Faaliyet Alanları (5 Madde) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[#1c458b]" />
                    <span>2. İş Yeri Faaliyet Alanları (5 Temel Alan)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">Resmî şablondaki 1-5 faaliyet alanı</span>
                </h3>

                <div className="space-y-2">
                  {(coverInfo.activityAreas || []).slice(0, 5).map((act, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-700 shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        disabled={isApproved}
                        value={act}
                        onChange={(e) => handleActivityChange(idx, e.target.value)}
                        placeholder={`Faaliyet Alanı ${idx + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#1c458b]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bölüm 3: Personel Tanıtımı (Mühendis ve Teknik Kadro) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#1c458b]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      3. Personel Tanıtımı (Mühendis ve Teknik Kadro)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddStaffMember}
                    disabled={isApproved || (coverInfo.staffMembers && coverInfo.staffMembers.length >= 10)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1c458b] hover:bg-blue-100 font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-blue-200 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Yeni Mühendis / Personel Ekle</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Resmî şablonda en fazla 10 satır personel yer almaktadır. 1. sırada staj sorumlusu mühendis yer alır. Firmada çalıştığınız birimdeki diğer mühendis ve uzmanları ekleyebilirsiniz.
                </p>

                <div className="space-y-2.5">
                  {(coverInfo.staffMembers || []).map((staff, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center text-xs"
                    >
                      <div className="md:col-span-1 flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-[#1c458b] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] bg-blue-100 text-[#1c458b] font-bold px-1 rounded md:hidden">
                            Sorumlu
                          </span>
                        )}
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 md:hidden mb-0.5">
                          Adı Soyadı:
                        </label>
                        <input
                          type="text"
                          disabled={isApproved}
                          value={staff.fullName}
                          onChange={(e) => handleStaffChange(idx, 'fullName', e.target.value)}
                          placeholder="Adı Soyadı (Örn: Müh. Can Demir)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                        />
                      </div>

                      <div className="md:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 md:hidden mb-0.5">
                          Mezun Olduğu Üniversite / Fakülte / Bölüm:
                        </label>
                        <input
                          type="text"
                          disabled={isApproved}
                          value={staff.graduatedUniversityAndDepartment}
                          onChange={(e) => handleStaffChange(idx, 'graduatedUniversityAndDepartment', e.target.value)}
                          placeholder="Mezun Olduğu Üniversite ve Bölüm"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 md:hidden mb-0.5">
                          Görevi:
                        </label>
                        <input
                          type="text"
                          disabled={isApproved}
                          value={staff.titleOrPosition}
                          onChange={(e) => handleStaffChange(idx, 'titleOrPosition', e.target.value)}
                          placeholder="Görevi (Örn: Kıdemli Yazılım Mimarı)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                        />
                      </div>

                      <div className="md:col-span-1 text-right">
                        {idx > 0 && !isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveStaffMember(idx)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Personeli Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : idx === 0 ? (
                          <span className="hidden md:inline-block text-[10px] text-slate-400 font-semibold">
                            (Sorumlu)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('diary')}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  ← Günlük Rapor Yazımına Dön
                </button>

                <button
                  type="button"
                  onClick={handleSaveCoverInfo}
                  disabled={savingCover || isApproved}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCover ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Görsel Büyütme Lightbox Modalı */}
      {previewModalUrl && (
        <div 
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out print:hidden"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2.5 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center cursor-pointer transition border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewModalUrl} 
              alt="Büyütülmüş Çalışma Görseli" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
            />
            {currentImageCaption && (
              <p className="text-center text-xs text-slate-200 py-3 font-semibold tracking-wide">
                {currentImageCaption}
              </p>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Resmî Selçuk Üniversitesi Orijinal Şablonlu Yazdırma / PDF Çıktısı (Kapak ve 1 Sayfa/Gün) */}
      <PrintableOfficialDiary
        studentName={activeApp?.studentName || 'Ahmet Yılmaz'}
        studentNumber={activeApp?.studentNumber || '203301001'}
        internshipType={activeApp?.type === 'Staj2' ? 'Staj 2' : 'Staj 1'}
        workplaceName={activeApp?.workplaceName || 'AKINSOFT Yazılım Teknolojileri A.Ş.'}
        workplaceAddress={coverInfo.workplaceAddress || 'Beyhekim Mah. Şehit Halis Şişman Cad. No:1/A Selçuklu'}
        workplaceCity={coverInfo.workplaceCity || 'Konya'}
        workplaceWebSite={coverInfo.workplaceWebSite || 'www.akinsoft.com.tr'}
        workplacePhone={coverInfo.workplacePhone || '0332 000 00 00'}
        workplaceEmail={coverInfo.workplaceEmail || activeApp?.advisor?.email || ''}
        workplaceSector={activeApp?.subject || 'ERP ve Robotik Yazılımları'}
        totalEmployees={coverInfo.totalEmployees || '250+'}
        activityAreas={coverInfo.activityAreas}
        staffMembers={coverInfo.staffMembers}
        advisorName={activeApp?.advisor?.fullName || 'Müh. Serdar Keskin'}
        advisorTitle={activeApp?.advisor?.titleOrPosition || 'Kıdemli Bulut Mimarı'}
        advisorDepartment={activeApp?.advisor?.graduatedUniversityAndDepartment || 'Selçuk Üniversitesi Bilgisayar Mühendisliği'}
        advisorEmail={activeApp?.advisor?.email || 'serdar.keskin@teknokent.com.tr'}
        hasApproved={isApproved}
        approvedAt={new Date().toISOString()}
        entries={entries}
      />
    </div>
  );
};
