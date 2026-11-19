import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Download, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  Archive, 
  Calendar, 
  Filter, 
  Users, 
  Award, 
  FileSpreadsheet,
  Check,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '../services/api';

export const KPTOView: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = (urlParams.get('kptoTab') as any) || 'insurance';
  const initialFilter = urlParams.get('statusFilter') || 'Pending';

  // Main Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<'insurance' | 'extensions' | 'cancellations' | 'receipts' | 'archive'>(
    ['insurance', 'extensions', 'cancellations', 'receipts', 'archive'].includes(initialTab) ? initialTab : 'insurance'
  );

  // Insurance Active Tab State
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // KPTO Ek Modül Durumları (Uzatma, İptal/Çıkış, Dekont)
  const [pendingExtensions, setPendingExtensions] = useState<any[]>([]);
  const [pendingCancellations, setPendingCancellations] = useState<any[]>([]);
  const [studentReceipts, setStudentReceipts] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  // Archive Tab State
  const [archiveYears, setArchiveYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [archiveStudents, setArchiveStudents] = useState<any[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState<string>('');

  const loadExtensions = async () => {
    try {
      setSubLoading(true);
      const res: any = await apiRequest('/kpto/extensions/pending');
      if (Array.isArray(res)) setPendingExtensions(res);
    } catch (err) {
      console.error('Uzatma bildirimleri alınamadı:', err);
    } finally {
      setSubLoading(false);
    }
  };

  const loadCancellations = async () => {
    try {
      setSubLoading(true);
      const res: any = await apiRequest('/kpto/cancellations/pending');
      if (Array.isArray(res)) setPendingCancellations(res);
    } catch (err) {
      console.error('İptal bildirimleri alınamadı:', err);
    } finally {
      setSubLoading(false);
    }
  };

  const loadReceipts = async () => {
    try {
      setSubLoading(true);
      const res: any = await apiRequest('/kpto/receipts');
      if (Array.isArray(res)) setStudentReceipts(res);
    } catch (err) {
      console.error('Dekontlar alınamadı:', err);
    } finally {
      setSubLoading(false);
    }
  };

  const handleProcessExtension = async (id: number) => {
    try {
      const res: any = await apiRequest(`/kpto/process-extension/${id}`, { 
        method: 'POST',
        body: JSON.stringify({ notes: 'KPTO Sigorta Masasınca ek prim bildirimi onaylandı.' })
      });
      alert(res.message || 'Ek SGK prim günü tescil edildi.');
      await loadExtensions();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    }
  };

  const handleProcessCancellation = async (id: number) => {
    try {
      const res: any = await apiRequest(`/kpto/process-cancellation/${id}`, { method: 'POST' });
      alert(res.message || 'SGK sigorta çıkışı yapıldı ve kayda işlendi.');
      await loadCancellations();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    }
  };

  const handleVerifyReceipt = async (id: number) => {
    try {
      const res: any = await apiRequest(`/kpto/verify-receipt/${id}`, { method: 'POST' });
      alert(res.message || 'Dekont onaylandı ve doğrulandı.');
      await loadReceipts();
    } catch (err: any) {
      alert(err.message || 'Doğrulama başarısız.');
    }
  };

  // Load Active Insurance Students
  const loadStudents = async () => {
    try {
      setLoading(true);
      const res: any = await apiRequest(`/kpto/students?statusFilter=${statusFilter}`);
      if (Array.isArray(res)) {
        setStudents(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load Archive Years
  const loadArchiveYears = async () => {
    try {
      const res: any = await apiRequest('/kpto/archive-years');
      if (Array.isArray(res)) {
        setArchiveYears(res);
      }
    } catch (err) {
      console.error('Arşiv yılları alınamadı:', err);
    }
  };

  // Load Archive Students
  const loadArchiveStudents = async () => {
    try {
      setArchiveLoading(true);
      const params = new URLSearchParams();
      if (selectedYear && selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedType && selectedType !== 'all') params.append('type', selectedType);
      if (archiveSearchTerm) params.append('search', archiveSearchTerm);

      const res: any = await apiRequest(`/kpto/archive?${params.toString()}`);
      if (Array.isArray(res)) {
        setArchiveStudents(res);
      }
    } catch (err) {
      console.error('Arşiv kayıtları alınamadı:', err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [statusFilter]);

  useEffect(() => {
    loadArchiveYears();
  }, []);

  useEffect(() => {
    if (activeMainTab === 'archive') {
      loadArchiveStudents();
    } else if (activeMainTab === 'extensions') {
      loadExtensions();
    } else if (activeMainTab === 'cancellations') {
      loadCancellations();
    } else if (activeMainTab === 'receipts') {
      loadReceipts();
    }
  }, [activeMainTab, selectedYear, selectedType]);

  const handleStartInsurance = async (appId: number) => {
    setActionLoading(appId);
    try {
      await apiRequest(`/kpto/${appId}/start-insurance`, {
        method: 'POST',
        body: JSON.stringify({
          registrationNo: `SGK-${Math.floor(100000 + Math.random() * 900000)}`
        })
      });
      alert('Öğrencinin stajyer sigortası başarıyla başlatıldı ve SGK kaydı oluşturuldu.');
      await loadStudents();
      await loadArchiveYears();
    } catch (err: any) {
      alert(err.message || 'Sigorta başlatılamadı.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/kpto/export-csv', '_blank');
  };

  const handleExportArchiveCsv = () => {
    const url = selectedYear && selectedYear !== 'all' 
      ? `/api/kpto/archive/export-csv?year=${selectedYear}` 
      : '/api/kpto/archive/export-csv';
    window.open(url, '_blank');
  };

  // Total summary statistics across archive
  const totalArchiveCount = archiveYears.reduce((sum, y) => sum + (y.totalCount || 0), 0);
  const totalCompletedCount = archiveYears.reduce((sum, y) => sum + (y.completedCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-[#1c458b]">
            <Building2 className="w-6 h-6" />
            <h1 className="text-xl font-bold text-slate-900">KPTO Sigorta & Staj Arşiv Masası</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kariyer Planlama ve Takibi Ofisi • SGK 5510 5/b Sigorta Girişleri ve Senelere Göre Üniversite Staj Arşivi
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeMainTab === 'insurance' ? (
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Toplu SGK Excel / CSV Dökümü Al
            </button>
          ) : (
            <button
              onClick={handleExportArchiveCsv}
              className="px-4 py-2.5 bg-[#1c458b] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {selectedYear === 'all' ? 'Tüm Yılların Arşiv CSV Dökümünü İndir' : `${selectedYear} Arşiv CSV Dökümünü İndir`}
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Selector: 5-Stage KPTO Operational Hub */}
      <div className="bg-slate-200/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-300">
        <button
          type="button"
          onClick={() => setActiveMainTab('insurance')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMainTab === 'insurance'
              ? 'bg-[#1c458b] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>SGK Giriş Masası</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('extensions')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMainTab === 'extensions'
              ? 'bg-[#1c458b] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Ek Prim Tescilleri (Uzatma)</span>
          {pendingExtensions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-orange-500 text-white animate-pulse">
              {pendingExtensions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('cancellations')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMainTab === 'cancellations'
              ? 'bg-[#1c458b] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>SGK Çıkış Masası (İptal)</span>
          {pendingCancellations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
              {pendingCancellations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('receipts')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMainTab === 'receipts'
              ? 'bg-[#1c458b] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Dekont Doğrulama</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('archive')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMainTab === 'archive'
              ? 'bg-[#1c458b] text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Yıllık SGK Arşivi</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
            {totalArchiveCount}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SEÇENEK: AKTİF DÖNEM SİGORTA İŞLEMLERİ                                */}
      {/* ========================================================================= */}
      {activeMainTab === 'insurance' && (
        <div className="space-y-4">
          {/* Filter Tabs and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('Pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Pending' ? 'bg-[#1c458b] text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Gelenler / Sigortası Bekleyenler
              </button>
              <button
                onClick={() => setStatusFilter('Started')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'Started' ? 'bg-[#1c458b] text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sigortası Başlatılanlar
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Öğrenci, TC veya firma ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1c458b]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Öğrenci No / Adı</th>
                    <th className="py-3 px-4">TC Kimlik No</th>
                    <th className="py-3 px-4">Firma</th>
                    <th className="py-3 px-4">SGK Giriş - Çıkış Tarihi</th>
                    <th className="py-3 px-4">SPAS Belgesi</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = students.filter(s => 
                      !searchTerm ||
                      (s.studentName && s.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (s.studentNumber && s.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      (s.nationalId && s.nationalId.includes(searchTerm)) ||
                      (s.workplaceName && s.workplaceName.toLowerCase().includes(searchTerm.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            Filtreye uygun öğrenci kaydı bulunamadı.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{s.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{s.studentNumber}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">{s.nationalId}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{s.workplaceName}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {new Date(s.startDate).toLocaleDateString('tr-TR')} - {new Date(s.currentEndDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-3.5 px-4">
                          {s.hasSpasDocument ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Var (Yüklendi)
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Eksik
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                            s.insuranceStatus === 'Started' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.insuranceStatus === 'Started' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Başlatıldı</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Beklemede</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {s.insuranceStatus !== 'Started' ? (
                            <button
                              type="button"
                              onClick={() => handleStartInsurance(s.id)}
                              disabled={actionLoading === s.id}
                              className="px-3.5 py-1.5 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 text-xs flex items-center gap-1.5 ml-auto"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{actionLoading === s.id ? 'İşleniyor...' : 'Sigortayı Başlat'}</span>
                            </button>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-emerald-700 font-extrabold text-xs flex items-center justify-end gap-1">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Başlatıldı
                              </span>
                              {s.registrationNo ? (
                                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="SGK Belge Tescil No">
                                  {s.registrationNo}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">Tescil Aktif</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SEÇENEK: STAJ SÜRESİ UZATMA / EK SGK PRİM TESCİLLERİ                  */}
      {/* ========================================================================= */}
      {activeMainTab === 'extensions' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[#002b49] flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Komisyon Onaylı Staj Uzatmaları & Ek SGK Prim Bildirimleri ({pendingExtensions.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Staj komisyonu tarafından onaylanan ve 5510 Sayılı Kanun gereğince ek prim günü tescil edilmesi gereken öğrenci listesi.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Öğrenci Bilgisi</th>
                    <th className="py-3 px-4">Bölüm</th>
                    <th className="py-3 px-4">İş Yeri</th>
                    <th className="py-3 px-4">Mevcut Bitiş Tarihi</th>
                    <th className="py-3 px-4">Ek Talep</th>
                    <th className="py-3 px-4">Gerekçe</th>
                    <th className="py-3 px-4 text-right">SGK Tescil İşlemi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingExtensions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Şu anda ek prim tescili bekleyen staj uzatma kaydı bulunmamaktadır.
                      </td>
                    </tr>
                  ) : (
                    pendingExtensions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.studentName}</div>
                          <div className="text-[11px] text-slate-500">TC: {item.nationalId} • No: {item.studentNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{item.department}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.workplaceName}</td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {new Date(item.currentEndDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                            +{item.extensionExtraDays} İş Günü
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic max-w-xs truncate" title={item.extensionReason}>
                          "{item.extensionReason}"
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleProcessExtension(item.id)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm text-xs cursor-pointer"
                          >
                            Ek Prim Gününü Tescil Et
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEÇENEK: İPTAL EDİLEN STAJLAR & SGK ÇIKIŞ MASASI                       */}
      {/* ========================================================================= */}
      {activeMainTab === 'cancellations' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[#002b49] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>İptal Edilen Stajlar & 5510 S.K. SGK Çıkış Masası ({pendingCancellations.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Komisyon tarafından FORM 7 ile iptali onaylanan ve SGK sigorta çıkış bildirgesi düzenlenmesi gereken öğrenciler.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Öğrenci Bilgisi</th>
                    <th className="py-3 px-4">Bölüm</th>
                    <th className="py-3 px-4">İş Yeri</th>
                    <th className="py-3 px-4">İptal Gerekçesi</th>
                    <th className="py-3 px-4">Komisyon Notu</th>
                    <th className="py-3 px-4 text-right">SGK Çıkış İşlemi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingCancellations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Şu anda SGK çıkışı bekleyen iptal edilmiş staj kaydı bulunmamaktadır.
                      </td>
                    </tr>
                  ) : (
                    pendingCancellations.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.studentName}</div>
                          <div className="text-[11px] text-slate-500">TC: {item.nationalId} • No: {item.studentNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{item.department}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.workplaceName}</td>
                        <td className="py-3 px-4 text-slate-600 italic">"{item.cancelReason}"</td>
                        <td className="py-3 px-4 text-slate-500">{item.cancelCommissionNotes || 'Komisyon Onayladı'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleProcessCancellation(item.id)}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-sm text-xs cursor-pointer"
                          >
                            SGK Çıkışını Tamamla
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SEÇENEK: ÖĞRENCİ DEKONT DOĞRULAMA                                      */}
      {/* ========================================================================= */}
      {activeMainTab === 'receipts' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-[#002b49] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <span>Öğrenci Katkı Payı & Ücret Dekontu Doğrulama Masası ({studentReceipts.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Öğrencilerin yüklediği staj ücreti ve katkı payı dekontlarının incelenmesi ve onaylanması.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Öğrenci Bilgisi</th>
                    <th className="py-3 px-4">Bölüm</th>
                    <th className="py-3 px-4">İş Yeri</th>
                    <th className="py-3 px-4">Yükleme Tarihi</th>
                    <th className="py-3 px-4">Dekont Belgesi</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4 text-right">Doğrulama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Şu anda doğrulanacak staj dekontu bulunmamaktadır.
                      </td>
                    </tr>
                  ) : (
                    studentReceipts.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.studentName}</div>
                          <div className="text-[11px] text-slate-500">TC: {item.nationalId} • No: {item.studentNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{item.department}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.workplaceName}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {item.receiptUploadedAt ? new Date(item.receiptUploadedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                        </td>
                        <td className="py-3 px-4">
                          {item.receiptDocumentPath ? (
                            <a
                              href={`/api/documents/download?filePath=${encodeURIComponent(item.receiptDocumentPath)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[#1c458b] hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Dekontu Aç</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Belge yok</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.isReceiptVerifiedByKPTO ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.isReceiptVerifiedByKPTO ? 'Doğrulandı' : 'İnceleniyor'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!item.isReceiptVerifiedByKPTO ? (
                            <button
                              type="button"
                              onClick={() => handleVerifyReceipt(item.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm text-xs cursor-pointer"
                            >
                              Dekontu Doğrula
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-bold text-xs">✅ Onaylı</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SEÇENEK: SENELERE GÖRE STAJ ARŞİVİ                                     */}
      {/* ========================================================================= */}
      {activeMainTab === 'archive' && (
        <div className="space-y-6">
          {/* Top Archive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1c458b] flex items-center justify-center font-bold">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Toplam Arşiv Kaydı</div>
                <div className="text-xl font-black text-slate-900">{totalArchiveCount} Öğrenci</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Başarıyla Tamamlanan</div>
                <div className="text-xl font-black text-emerald-800">{totalCompletedCount} Öğrenci</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Arşivdeki Akademik Yıl</div>
                <div className="text-xl font-black text-purple-900">{archiveYears.length} Yıl</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">SGK Tescili Yapılan</div>
                <div className="text-xl font-black text-amber-900">{totalArchiveCount} Prim Kaydı</div>
              </div>
            </div>
          </div>

          {/* Academic Years Pill Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1c458b]" />
                Akademik Yıla Göre Filtrele:
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Seçili: {selectedYear === 'all' ? 'Tüm Yıllar' : `${selectedYear} Yılı`} ({archiveStudents.length} Kayıt)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedYear === 'all'
                    ? 'bg-[#1c458b] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Tüm Yıllar</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedYear === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {totalArchiveCount}
                </span>
              </button>

              {archiveYears.map((ay) => (
                <button
                  key={ay.year}
                  type="button"
                  onClick={() => setSelectedYear(ay.year)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedYear === ay.year
                      ? 'bg-[#1c458b] text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{ay.year}</span>
                  {ay.isActive && (
                    <span className="text-[10px] text-emerald-400 font-extrabold">• Aktif</span>
                  )}
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedYear === ay.year ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {ay.totalCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Filters: Type Selector & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 mr-1">Staj Türü:</span>
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedType === 'all' ? 'bg-[#1c458b] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('Staj1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedType === 'Staj1' ? 'bg-[#1c458b] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Staj 1
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('Staj2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedType === 'Staj2' ? 'bg-[#1c458b] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Staj 2
              </button>
            </div>

            {/* Archive Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Öğrenci adı, no, TC, firma veya SGK no..."
                value={archiveSearchTerm}
                onChange={(e) => setArchiveSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadArchiveStudents();
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1c458b]"
              />
            </div>
          </div>

          {/* Archive Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Öğrenci Bilgileri</th>
                    <th className="py-3 px-4">TC Kimlik No</th>
                    <th className="py-3 px-4">Akademik Yıl & Dönem</th>
                    <th className="py-3 px-4">Staj Türü & Gün</th>
                    <th className="py-3 px-4">Firma & Şehir</th>
                    <th className="py-3 px-4">SGK Kaydı & Tarihler</th>
                    <th className="py-3 px-4 text-right">Sonuç / Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {archiveLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Arşiv verileri yükleniyor...
                      </td>
                    </tr>
                  ) : archiveStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Seçilen kriterlere uygun arşiv kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    archiveStudents.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{item.studentNumber}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          {item.nationalId}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-[#1c458b] font-bold text-[11px] mb-0.5">
                            {item.academicYear}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.periodTitle}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{item.internshipType}</div>
                          <div className="text-[11px] text-slate-500">{item.requiredWorkDays} İş Günü</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{item.workplaceName}</div>
                          <div className="text-[11px] text-slate-500">{item.workplaceCity} • {item.workplaceSector}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-xs text-slate-800">
                            {item.sgkRegistrationNo || '—'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.startDate ? new Date(item.startDate).toLocaleDateString('tr-TR') : '—'} - {item.currentEndDate ? new Date(item.currentEndDate).toLocaleDateString('tr-TR') : '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Başarılı ({item.acceptedDaysCount || item.requiredWorkDays} Gün)</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Arşivlendi</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
