import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Shield, 
  Calendar, 
  UserCheck, 
  AlertTriangle, 
  ArrowLeft, 
  Printer, 
  Check, 
  Clock, 
  Briefcase,
  GraduationCap,
  Lock,
  ExternalLink,
  Image as ImageIcon,
  ZoomIn,
  X
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { SelcukLogo } from './SelcukLogo';
import { PrintableOfficialDiary } from './PrintableOfficialDiary';

interface AdvisorDiaryReviewProps {
  initialToken?: string;
  onBackToHome?: () => void;
}

export const AdvisorDiaryReview: React.FC<AdvisorDiaryReviewProps> = ({
  initialToken,
  onBackToHome
}) => {
  const [tokenInput, setTokenInput] = useState<string>(initialToken || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [zoomCaption, setZoomCaption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check URL query param or initialToken on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const tokenToVerify = initialToken || urlToken;
    if (tokenToVerify) {
      setTokenInput(tokenToVerify);
      verifyToken(tokenToVerify);
    }
  }, [initialToken]);

  const verifyToken = async (token: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiRequest(`/advisor/verify?token=${encodeURIComponent(token.trim())}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Geçersiz veya süresi dolmuş erişim bağlantısı. Lütfen kurumsal e-postanıza iletilen tokeni kontrol ediniz.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!tokenInput || !data) return;
    const confirmMsg = 
      `Öğrenci ${data.studentName} (${data.studentNumber}) için hazırlanan ${data.requiredWorkDays} iş günlük Sanal Staj Defterini onaylamak üzeresiniz.\n\nOnaylama işleminin ardından defter kilitlenecek ve Selçuk Üniversitesi Staj Komisyonu masasına aktarılacaktır.\n\nOnaylıyor musunuz?`;
    
    if (!window.confirm(confirmMsg)) return;

    setApproving(true);
    try {
      await apiRequest('/advisor/approve', {
        method: 'POST',
        body: JSON.stringify({ token: tokenInput.trim() })
      });
      alert('Staj defteri başarıyla onaylandı. Selçuk Üniversitesi Staj Komisyonuna resmi bildirim iletildi.');
      await verifyToken(tokenInput.trim());
    } catch (err: any) {
      alert(err.message || 'Onaylama işlemi gerçekleştirilemedi.');
    } finally {
      setApproving(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput || !data || !revisionNotes.trim()) {
      alert('Lütfen düzeltme talep notunu giriniz.');
      return;
    }
    setRequestingRevision(true);
    try {
      const res: any = await apiRequest('/advisor/request-revision', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenInput.trim(),
          revisionNotes: revisionNotes.trim()
        })
      });
      alert(res.message || 'Düzeltme talebiniz öğrenciye iletildi.');
      setShowRevisionModal(false);
      setRevisionNotes('');
      await verifyToken(tokenInput.trim());
    } catch (err: any) {
      alert(err.message || 'Düzeltme talebi iletilemedi.');
    } finally {
      setRequestingRevision(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-['Montserrat',sans-serif] pb-16 print:bg-white print:p-0 print:m-0 print:min-h-0">
      
      {/* Top Institutional Header */}
      <header data-no-print="true" className="bg-[#1c458b] text-white border-b-2 border-[#c5a880] shadow-md sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="px-3 py-1.5 rounded-lg bg-blue-900/70 hover:bg-blue-900 text-blue-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-blue-400/30 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ana Sayfaya Dön</span>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <SelcukLogo size={40} variant="badge" className="drop-shadow-sm" />
              <div>
                <h1 className="text-sm font-bold tracking-wide text-white">
                  İş Yeri Staj Sorumlusu Defter İnceleme ve Onay Portalı
                </h1>
                <p className="text-[11px] text-[#c5a880] font-medium">
                  T.C. Selçuk Üniversitesi • Resmî Sanal Staj Defteri Doğrulama Masası
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-400/20 text-[11px] text-blue-200">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Güvenli Token Doğrulaması</span>
            </span>
            {data && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-white text-[#1c458b] hover:bg-slate-100 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#1c458b]" />
                <span>Defteri Yazdır</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full">

        {/* Token Input Gate (Rendered when no verified token is loaded) */}
        {!data && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-200 max-w-xl mx-auto space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1c458b] mx-auto flex items-center justify-center border border-blue-100 shadow-sm">
              <Lock className="w-8 h-8 text-[#1c458b]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-serif">
                Güvenli Erişim Kodu Doğrulama
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Sayın İş Yeri Staj Sorumlusu, stajyerinizin sunduğu Sanal Staj Defterini incelemek 
                ve onaylamak için Form 2 sözleşmesinde beyan edilen kurumsal e-postanıza gönderilen 
                tek kullanımlık güvenli erişim kodunu (token) giriniz.
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                verifyToken(tokenInput);
              }}
              className="space-y-4"
            >
              <div className="text-left space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Erişim Bağlantı Kodu / Token:
                </label>
                <input
                  type="text"
                  placeholder="Örn: e5ab4384195746be8e6503577f69c731"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-[#1c458b] focus:border-[#1c458b] transition"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !tokenInput.trim()}
                className="w-full py-3.5 bg-[#1c458b] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Doğrulanıyor...' : 'Staj Defterini Getir ve İncele'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Loaded and Verified Advisor Screen */}
        {data && (
          <div className="space-y-6">
            <div data-no-print="true" className="space-y-6 print:hidden">

            {/* Status Notification Banner */}
            {data.hasApproved ? (
              <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 sm:p-6 rounded-2xl shadow-md border-2 border-emerald-400/40 relative overflow-hidden print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-300/30 text-[11px] font-bold text-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>STAJ DEFTERİ ONAYLANDI</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold tracking-wide">
                      Bu Staj Defteri İş Yeri Yetkilisi Tarafından Onaylanmıştır
                    </h2>
                    <p className="text-xs text-emerald-100 leading-relaxed">
                      Sayın <strong>{data.advisorName}</strong> ({data.advisorTitle || 'İş Yeri Yetkilisi'}), öğrencinin 
                      {' '}<strong>{data.requiredWorkDays} iş günlük</strong> sanal staj defterini 
                      {' '}<strong>{new Date(data.approvedAt).toLocaleString('tr-TR')}</strong> tarihinde inceleyip onayladınız. 
                      Defter kilitlenmiş olup Selçuk Üniversitesi Bölüm Staj Komisyonu masasına iletilmiştir.
                    </p>
                    <div className="text-[11px] text-emerald-200/80 pt-1 flex flex-wrap items-center gap-3">
                      <span>🔒 IP Mührü: {data.approvedIpAddress || '195.175.25.10'}</span>
                      <span>•</span>
                      <span>🏛️ Komisyon Arşivine İletildi</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer shrink-0 print:hidden"
                  >
                    <Printer className="w-4 h-4 text-emerald-800" />
                    <span>İmzalı Defteri Yazdır</span>
                  </button>
                </div>
              </div>
            ) : !data.isDiaryComplete ? (
              <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white p-5 sm:p-6 rounded-2xl shadow-md border-2 border-amber-400/60 relative overflow-hidden print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-300/40 text-[11px] font-bold text-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                      <span>STAJ DEFTERİ EKSİK - ONAYLANAMAZ</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-amber-100">
                      Staj Defteri Henüz Tamamlanmamıştır ({data.filledDaysCount || 0} / {data.requiredWorkDays} Gün)
                    </h2>
                    <p className="text-xs text-amber-100/90 leading-relaxed">
                      Sayın <strong>{data.advisorName}</strong>, öğrencinin staj yönergesi uyarınca tam <strong>{data.requiredWorkDays} iş günü</strong> defter doldurması zorunludur. Defterde şu an <strong>{data.missingDaysCount} iş günü eksiktir</strong>. Eksik staj defterleri mevzuat gereğince iş yeri tarafından onaylanamaz. Lütfen öğrencinin eksik günleri tamamlamasını bekleyiniz.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={true}
                    className="px-6 py-3 bg-amber-950/60 text-amber-300 font-bold text-xs rounded-xl shadow border border-amber-500/50 flex items-center gap-2 cursor-not-allowed shrink-0 print:hidden opacity-80"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{data.missingDaysCount} Gün Eksik - Onaylanamaz</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-[#0b234b] to-[#1c458b] text-white p-5 sm:p-6 rounded-2xl shadow-md border-2 border-[#c5a880]/40 relative overflow-hidden print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/70 border border-[#c5a880]/30 text-[11px] font-bold text-[#c5a880]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>ONAY BEKLEYEN EKSİKSİZ STAJ DEFTERİ</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold">
                      Staj Defteri İnceleme ve Onay Masası
                    </h2>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      Sayın <strong>{data.advisorName}</strong>, stajyeriniz <strong>{data.requiredWorkDays} iş gününün tamamını</strong> eksiksiz olarak doldurmuştur. Lütfen yapılan teknik faaliyetleri inceleyiniz ve onay butonuna basarak defteri komisyon masasına aktarınız.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() => setShowRevisionModal(true)}
                      className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer border border-amber-300"
                    >
                      <span>✏️ Düzeltme İste</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer border border-emerald-400"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{approving ? 'Onaylanıyor...' : 'Staj Defterini Onayla'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Düzeltme İstendi Bildirimi (varsa) */}
            {data.isRevisionRequestedByAdvisor && (
              <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs print:hidden">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-sm block">✏️ Öğrenciden Düzeltme Talep Edildi</span>
                  <p className="mt-1">İlettiğiniz Not: "{data.advisorRevisionNotes}"</p>
                </div>
              </div>
            )}

            {/* Revision Modal */}
            {showRevisionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-[#002b49] text-base">Defter İçin Düzeltme / Revizyon İste</h3>
                    <button type="button" onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleRequestRevision} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Düzeltme Talep Gerekçesi / Notunuz:</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Örn: 5. ve 6. gün açıklamaları yetersiz, yapılan teknik çalışmalar ve mimari şema detaylandırılmalı..."
                        value={revisionNotes}
                        onChange={(e) => setRevisionNotes(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                      ></textarea>
                    </div>
                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowRevisionModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        disabled={requestingRevision}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                      >
                        {requestingRevision ? 'Gönderiliyor...' : 'Düzeltme Talebini İlet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Dossier Card: Student and Workplace Details */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 print:hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#1c458b]" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Staj ve Kurum Bilgileri
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-md">
                  {data.internshipType || 'Staj 1'} • {data.requiredWorkDays} İş Günü
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                {/* Öğrenci */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold text-[11px] block">Stajyer Öğrenci:</span>
                  <div className="font-bold text-slate-900 text-sm">{data.studentName}</div>
                  <div className="text-slate-600 font-medium">Öğrenci No: {data.studentNumber}</div>
                  <div className="text-[11px] text-[#1c458b] font-semibold">{data.department}</div>
                </div>

                {/* Firma */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold text-[11px] block">Staj Yapılan Firma:</span>
                  <div className="font-bold text-slate-900 text-sm line-clamp-1">{data.workplaceName}</div>
                  <div className="text-slate-600 font-medium">{data.workplaceCity || 'Konya'}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{data.workplaceAddress || 'Teknoloji Geliştirme Bölgesi'}</div>
                </div>

                {/* Sorumlu Mühendis */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold text-[11px] block">İş Yeri Yetkilisi (Siz):</span>
                  <div className="font-bold text-slate-900 text-sm">{data.advisorName}</div>
                  <div className="text-[#1c458b] font-semibold">{data.advisorTitle || 'Sorumlu Mühendis'}</div>
                  <div className="text-slate-500 text-[11px]">{data.advisorEmail}</div>
                </div>

                {/* Takvim */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold text-[11px] block">Staj Süresi & Takvim:</span>
                  <div className="font-bold text-slate-900 text-sm">{data.requiredWorkDays} İş Günü</div>
                  <div className="text-slate-600">
                    Başlangıç: <strong>{new Date(data.startDate).toLocaleDateString('tr-TR')}</strong>
                  </div>
                  <div className="text-slate-600">
                    Bitiş: <strong>{new Date(data.currentEndDate).toLocaleDateString('tr-TR')}</strong>
                  </div>
                </div>

              </div>

              {data.subject && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-700">
                  <span className="font-bold text-[#1c458b]">Staj Konusu:</span> {data.subject}
                </div>
              )}
            </div>

            {/* Sanal Staj Defteri Sayfaları */}
            <div className="space-y-4 print:hidden">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1c458b] flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5 text-[#1c458b]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Sanal Staj Defteri Raporları ({data.diaryEntries?.length || 0} Gün Yazıldı)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Öğrencinin her resmî iş günü için sisteme kaydettiği teknik çalışma metinleri
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-[#1c458b] bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                  {data.diaryEntries?.length || 0} / {data.requiredWorkDays} İş Günü
                </span>
              </div>

              {/* Entries list */}
              {data.diaryEntries?.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  Öğrenci henüz staj defteri sayfası girmemiştir.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.diaryEntries?.map((entry: any) => (
                    <div 
                      key={entry.dayNumber} 
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 break-inside-avoid"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-md bg-[#1c458b] text-white font-bold text-xs">
                            {entry.dayNumber}. GÜN
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {entry.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">
                            {new Date(entry.entryDate).toLocaleDateString('tr-TR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200">
                            Resmî İş Günü
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-0.5">
                        {entry.content}
                      </p>

                      {/* Her Güne Ait Çalışma Görseli / Şeması */}
                      {entry.imageUrlFull && (
                        <div className="pt-2">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-xl">
                            <div 
                              onClick={() => {
                                setZoomImageUrl(entry.imageUrlFull);
                                setZoomCaption(entry.imageCaption || `${entry.dayNumber}. Gün Çalışma Görseli`);
                              }}
                              className="relative cursor-pointer rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center max-h-72 group border border-slate-200"
                            >
                              <img 
                                src={entry.imageUrlFull} 
                                alt={`Gün ${entry.dayNumber} Çalışma Görseli`}
                                className="max-h-72 w-auto object-contain transition duration-200 group-hover:scale-[1.02]"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white text-xs font-bold print:hidden">
                                <ZoomIn className="w-4 h-4" />
                                <span>Görseli Büyüt ve İncele</span>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium pt-2 text-center flex items-center justify-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-[#1c458b] shrink-0" />
                              <span>{entry.imageCaption || `Şekil ${entry.dayNumber}: Günlük Çalışma Görseli`}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] text-slate-400">
                        <span>Kontrol Kodu: SÜ-STJ-{entry.dayNumber.toString().padStart(2, '0')}</span>
                        {data.hasApproved && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            İş Yeri Yetkilisi Tarafından Onaylandı
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Approval Action Button (if not approved) */}
            {!data.hasApproved && (
              data.isDiaryComplete ? (
                <div className="bg-white p-6 rounded-2xl border-2 border-emerald-400/80 shadow-lg text-center space-y-3 print:hidden">
                  <div className="max-w-lg mx-auto space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Staj Defteri İncelemesini Tamamla ve Onayla
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Yukarıdaki çalışma raporlarını okuduysanız, onay butonuna basarak defteri dijital olarak imzalayabilirsiniz. 
                      Onaylanan defter Selçuk Üniversitesi Staj Komisyonu incelemesine gönderilecektir.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving}
                      className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{approving ? 'Onaylanıyor...' : 'Staj Defterini Resmî Olarak Onayla'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    🔒 Onay işlemi 6698 Sayılı KVKK ve YÖK bilişim yönergeleri uyarınca IP adresi ve zaman damgasıyla mühürlenmektedir.
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-300 text-center space-y-2 print:hidden">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Eksik Staj Defteri Nedeniyle Onay Kilitlidir</span>
                  </div>
                  <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                    Stajyer öğrenci {data.requiredWorkDays} iş gününün yalnızca {data.filledDaysCount || 0} gününü doldurmuştur. 
                    Üniversite mevzuatına göre {data.missingDaysCount} gün eksik olan staj defterleri iş yeri yetkilisi tarafından onaylanamaz.
                  </p>
                </div>
              )
            )}
            </div>

            {/* Resmî Selçuk Üniversitesi Orijinal Şablonlu Yazdırma / PDF Çıktısı (Kapak ve 1 Sayfa/Gün) */}
            <PrintableOfficialDiary
              studentName={data.studentName}
              studentNumber={data.studentNumber}
              department={data.department || 'Bilgisayar Mühendisliği'}
              faculty={data.faculty || 'Teknoloji Fakültesi'}
              internshipType={data.internshipType || 'Staj 1'}
              workplaceName={data.workplaceName}
              workplaceAddress={data.workplaceAddress}
              workplaceCity={data.workplaceCity || 'Konya'}
              workplaceSector={data.workplaceSector}
              totalEmployees={data.totalEmployees || data.coverInfo?.totalEmployees || '250+'}
              activityAreas={data.activityAreas || data.coverInfo?.activityAreas}
              staffMembers={data.staffMembers || data.coverInfo?.staffMembers}
              advisorName={data.advisorName}
              advisorTitle={data.advisorTitle || 'Sorumlu Mühendis'}
              advisorDepartment={data.advisorDepartment || 'Bilgisayar Mühendisliği'}
              advisorEmail={data.advisorEmail}
              advisorPhone={data.advisorPhone}
              hasApproved={data.hasApproved}
              approvedAt={data.approvedAt}
              entries={data.diaryEntries || []}
            />

          </div>
        )}

      </div>

      {/* İş Yeri Yetkilisi Görsel Büyütme Lightbox Modalı */}
      {zoomImageUrl && (
        <div 
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out print:hidden"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2.5 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setZoomImageUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center cursor-pointer transition border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={zoomImageUrl} 
              alt="Büyütülmüş Çalışma Görseli" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
            />
            {zoomCaption && (
              <p className="text-center text-xs text-slate-200 py-3 font-semibold tracking-wide">
                {zoomCaption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
