import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  FileOutput,
  FileSpreadsheet,
  PlusCircle,
  Receipt,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  api,
  downloadBlob,
  formatDate,
  getErrorMessage,
  statusLabels,
  type KptoInsuranceStatus,
  type KptoRowDto,
  type SalaryReceiptDto,
} from '../api';

type KptoTab =
  | 'Pending'
  | 'InsuranceActive'
  | 'InsuranceNotStarted'
  | 'Extensions'
  | 'Exits'
  | 'Receipts'
  | 'Archive';

export const KptoPanel: React.FC = () => {
  const [tab, setTab] = useState<KptoTab>('Pending');
  const [rows, setRows] = useState<KptoRowDto[]>([]);
  const [receipts, setReceipts] = useState<SalaryReceiptDto[]>([]);
  const [archiveYear, setArchiveYear] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; studentName: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [startModal, setStartModal] = useState<{ id: string; studentName: string } | null>(null);
  const [sgkRegNo, setSgkRegNo] = useState('');
  const [processModal, setProcessModal] = useState<{
    mode: 'extension' | 'exit';
    id: string;
    studentName: string;
  } | null>(null);
  const [refNo, setRefNo] = useState('');
  const [processNote, setProcessNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'Receipts') {
        const { data } = await api.get<SalaryReceiptDto[]>('/kpto/salary-receipts');
        setReceipts(data);
      } else if (tab === 'Extensions') {
        const { data } = await api.get<KptoRowDto[]>('/kpto/extensions');
        setRows(data);
      } else if (tab === 'Exits') {
        const { data } = await api.get<KptoRowDto[]>('/kpto/exits');
        setRows(data);
      } else if (tab === 'Archive') {
        const { data } = await api.get<KptoRowDto[]>('/kpto/archive', {
          params: archiveYear ? { year: archiveYear } : undefined,
        });
        setRows(data);
      } else {
        const { data } = await api.get<KptoRowDto[]>('/kpto/internships', {
          params: { status: tab },
        });
        setRows(data);
      }
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab, archiveYear]);

  const handleStartInsuranceSubmit = async () => {
    if (!startModal) return;
    setMsg(null);
    try {
      await api.post(`/kpto/internships/${startModal.id}/start-insurance`, {
        sgkRegistrationNo: sgkRegNo.trim() || null,
      });
      setMsg({
        type: 'ok',
        text: `${startModal.studentName} için "Sigorta Başlatıldı" işaretlendi.${
          sgkRegNo.trim() ? ` (SGK Tescil No: ${sgkRegNo.trim()})` : ''
        } Öğrenci "Sigortası Başlatılanlar" listesine taşındı ve öğrenci panelinde yeşil onay yandı.`,
      });
      setStartModal(null);
      setSgkRegNo('');
      await loadData();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleProcessModalSubmit = async () => {
    if (!processModal) return;
    setMsg(null);
    try {
      const endpoint =
        processModal.mode === 'extension'
          ? `/kpto/internships/${processModal.id}/process-extension`
          : `/kpto/internships/${processModal.id}/process-exit`;
      await api.post(endpoint, {
        referenceNo: refNo.trim() || null,
        note: processNote.trim() || null,
      });
      setMsg({
        type: 'ok',
        text:
          processModal.mode === 'extension'
            ? `${processModal.studentName} için izin kaynaklı Ek Prim / Uzatma SGK tescili işlendi.`
            : `${processModal.studentName} için SGK işten çıkış bildirimi kaydedildi.`,
      });
      setProcessModal(null);
      setRefNo('');
      setProcessNote('');
      await loadData();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleVerifyReceipt = async (documentId: string, studentName: string) => {
    setMsg(null);
    try {
      await api.post(`/kpto/salary-receipts/${documentId}/verify`, {});
      setMsg({
        type: 'ok',
        text: `${studentName} adlı öğrencinin maaş dekontu KPTO tarafından doğrulandı.`,
      });
      await loadData();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleMarkNotStarted = async () => {
    if (!rejectModal) return;
    setMsg(null);
    try {
      await api.post(`/kpto/internships/${rejectModal.id}/not-started`, {
        note: rejectNote,
      });
      setMsg({
        type: 'ok',
        text: `${rejectModal.studentName} "Sigortası Başlatılmayanlar" listesine alındı.`,
      });
      setRejectModal(null);
      setRejectNote('');
      await loadData();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleMoveToPending = async (row: KptoRowDto) => {
    setMsg(null);
    try {
      await api.post(`/kpto/internships/${row.internshipId}/pending`);
      setMsg({ type: 'ok', text: `${row.studentName} tekrar "Gelenler" listesine alındı.` });
      await loadData();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const exportExcel = (status?: KptoInsuranceStatus) => {
    const query = status ? `?status=${status}` : '';
    downloadBlob(`/kpto/export${query}`, `KPTO_Liste_${status ?? 'Tumu'}.xlsx`);
  };

  const exportArchiveExcel = () => {
    const query = archiveYear ? `?year=${archiveYear}` : '';
    downloadBlob(`/kpto/archive/export${query}`, `KPTO_SGK_Arsivi_${archiveYear || 'Tumu'}.xlsx`);
  };

  const isStatusTab =
    tab === 'Pending' || tab === 'InsuranceActive' || tab === 'InsuranceNotStarted';

  return (
    <div className="space-y-6">
      {/* Başlık ve Toplu Excel Dökümü */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">KPTO Paneli (Sigorta ve SGK Giriş Birimi)</h2>
              <p className="text-sm text-slate-500">
                SGK giriş, izin kaynaklı ek prim tescili, işten çıkış bildirimi, maaş dekontu doğrulama ve arşiv işlemleri.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isStatusTab && (
              <button
                onClick={() => exportExcel(tab)}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Bu Listeyi Excel / SPAS Dökümü İndir (.xlsx)
              </button>
            )}
            {tab === 'Archive' && (
              <button
                onClick={exportArchiveExcel}
                className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                SGK Arşivini Excel İndir (.xlsx)
              </button>
            )}
            <button
              onClick={() => exportExcel(undefined)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-slate-600" />
              Tüm Kayıtları İndir
            </button>
          </div>
        </div>

        {/* 7 Sekme: Gelenler, Başlatılanlar, Başlatılmayanlar, Ek Prim Tescilleri, SGK Çıkış Masası, Maaş Dekontları, Arşiv */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <button
            onClick={() => setTab('Pending')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === 'Pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1. Gelenler (Sigorta Bekleyenler)
          </button>
          <button
            onClick={() => setTab('InsuranceActive')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === 'InsuranceActive'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2. Sigortası Başlatılanlar
          </button>
          <button
            onClick={() => setTab('InsuranceNotStarted')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === 'InsuranceNotStarted'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            3. Sigortası Başlatılmayanlar
          </button>
          <button
            onClick={() => setTab('Extensions')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === 'Extensions'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            4. Ek Prim Tescilleri
          </button>
          <button
            onClick={() => setTab('Exits')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === 'Exits'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <FileOutput className="h-4 w-4" />
            5. SGK Çıkış Masası
          </button>
          <button
            onClick={() => setTab('Receipts')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === 'Receipts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Receipt className="h-4 w-4" />
            6. Maaş Dekontları
          </button>
          <button
            onClick={() => setTab('Archive')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              tab === 'Archive'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Archive className="h-4 w-4" />
            7. SGK Arşivi
          </button>
        </div>

        {tab === 'Archive' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Archive className="h-4 w-4 text-slate-600" />
              <span>Tarihsel SGK Arşivi (Salt Okunur) — Yıla Göre Filtrele:</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={archiveYear}
                onChange={(e) => setArchiveYear(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="">Tüm Arşiv Yılları</option>
                <option value="2027">2027 Dönemi</option>
                <option value="2026">2026 Dönemi</option>
                <option value="2025">2025 Dönemi</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            msg.type === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-rose-300 bg-rose-50 text-rose-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {tab === 'Receipts' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-bold text-slate-900">Öğrencilerin Yüklediği Stajyer Maaş Dekontları</h3>
          </div>
          {receipts.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Henüz yüklenmiş maaş dekontu bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Öğrenci</th>
                    <th className="px-4 py-3">Firma</th>
                    <th className="px-4 py-3">Dosya</th>
                    <th className="px-4 py-3">Yüklenme Tarihi</th>
                    <th className="px-4 py-3">Doğrulama Durumu</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {receipts.map((r) => (
                    <tr key={r.documentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {r.studentName} <span className="text-xs text-slate-500">({r.studentNo})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.companyName}</td>
                      <td className="px-4 py-3 text-slate-600">{r.fileName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(r.uploadedAt)}</td>
                      <td className="px-4 py-3">
                        {r.isVerifiedByKpto ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            KPTO Doğruladı ({formatDate(r.verifiedByKptoAt)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                            İnceleme Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => downloadBlob(`/documents/${r.documentId}`, r.fileName)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Dekontu İndir
                          </button>
                          {!r.isVerifiedByKpto && (
                            <button
                              onClick={() => handleVerifyReceipt(r.documentId, r.studentName)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Dekontu Doğrula
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Yükleniyor...</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Bu listede kayıt bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Öğrenci / T.C. Kimlik</th>
                    <th className="px-4 py-3">Firma / Tür</th>
                    <th className="px-4 py-3">Staj Tarihleri & SGK Tescili</th>
                    <th className="px-4 py-3">SPAS & Maaş</th>
                    <th className="px-4 py-3 text-right">Sigorta / SGK İşlemi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r) => (
                    <tr key={r.internshipId} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{r.studentName}</p>
                        <p className="text-xs text-slate-500">
                          No: {r.studentNo} • TC: <b className="text-slate-700">{r.nationalId || 'Girilmemiş'}</b>
                        </p>
                        <p className="text-xs text-slate-400">{r.studentPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{r.companyName}</p>
                        <p className="text-xs text-slate-500">
                          {r.type === 'Staj1' ? 'Staj 1' : 'Staj 2'} • {r.workDays} İş Günü
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {formatDate(r.startDate)} — {formatDate(r.endDate)}
                        </p>
                        {r.originalEndDate && r.originalEndDate !== r.endDate && (
                          <p className="text-[11px] text-slate-500">
                            İlk Bitiş: {formatDate(r.originalEndDate)}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.sgkRegistrationNo && (
                            <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                              SGK Tescil No: {r.sgkRegistrationNo}
                            </span>
                          )}
                          {r.dateChanged && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                              <AlertTriangle className="h-3 w-3" />
                              İzin Nedeniyle Bitiş Tarihi Güncellendi
                            </span>
                          )}
                          {r.extensionSgkProcessed && (
                            <span className="inline-flex items-center rounded-md bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                              Ek Prim İşlendi ({formatDate(r.extensionSgkProcessedAt)})
                            </span>
                          )}
                          {r.sgkExitProcessed && (
                            <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800">
                              SGK Çıkış İşlendi{r.sgkExitNo ? ` (${r.sgkExitNo})` : ''}
                            </span>
                          )}
                        </div>
                        {r.extensionSgkNote && (
                          <p className="mt-1 text-xs font-medium text-teal-700">Ek Prim Notu: {r.extensionSgkNote}</p>
                        )}
                        {r.kptoNote && (
                          <p className="mt-1 text-xs font-medium text-rose-600">Not: {r.kptoNote}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {r.spasDocumentId ? (
                            <button
                              onClick={() =>
                                downloadBlob(`/documents/${r.spasDocumentId}`, `SPAS_${r.studentNo}.pdf`)
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <Download className="h-3.5 w-3.5" />
                              SPAS Belgesi İndir
                            </button>
                          ) : (
                            <span className="text-xs text-rose-600">SPAS Yok</span>
                          )}
                          <span className="text-xs text-slate-500">
                            Maaş: {r.receivesSalary ? `Evet (${r.salaryReceiptCount} dekont)` : 'Alınmıyor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tab === 'Pending' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setStartModal({ id: r.internshipId, studentName: r.studentName });
                                setSgkRegNo(r.sgkRegistrationNo || '');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Sigorta Başlatıldı
                            </button>
                            <button
                              onClick={() =>
                                setRejectModal({ id: r.internshipId, studentName: r.studentName })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <XCircle className="h-4 w-4" />
                              Başlatılamadı
                            </button>
                          </div>
                        )}
                        {tab === 'InsuranceActive' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                              ✔ SGK Aktif ({formatDate(r.insuranceStartedAt)})
                            </span>
                            {r.sgkRegistrationNo && (
                              <span className="text-[11px] font-semibold text-slate-600">
                                Tescil: {r.sgkRegistrationNo}
                              </span>
                            )}
                          </div>
                        )}
                        {tab === 'InsuranceNotStarted' && (
                          <button
                            onClick={() => handleMoveToPending(r)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Tekrar Gelenler'e Al
                          </button>
                        )}
                        {tab === 'Extensions' && (
                          r.extensionSgkProcessed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
                              ✔ Ek Prim Tescili Tamam
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setProcessModal({
                                  mode: 'extension',
                                  id: r.internshipId,
                                  studentName: r.studentName,
                                });
                                setRefNo('');
                                setProcessNote('');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
                            >
                              <PlusCircle className="h-4 w-4" />
                              Ek Prim Tescilini İşle
                            </button>
                          )
                        )}
                        {tab === 'Exits' && (
                          r.sgkExitProcessed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                              ✔ SGK Çıkışı İşlendi
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setProcessModal({
                                  mode: 'exit',
                                  id: r.internshipId,
                                  studentName: r.studentName,
                                });
                                setRefNo('');
                                setProcessNote('');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800"
                            >
                              <FileOutput className="h-4 w-4" />
                              SGK Çıkışını İşle
                            </button>
                          )
                        )}
                        {tab === 'Archive' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              {r.status ? statusLabels[r.status] : 'Arşiv'}
                            </span>
                            {r.archiveYear && (
                              <span className="text-[11px] text-slate-500">{r.archiveYear} Dönemi</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SGK Sigorta Başlat & Tescil No Modalı */}
      {startModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              SGK Sigorta Girişini Onayla ({startModal.studentName})
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              İsteğe bağlı olarak e-SGK / SPAS işe giriş tescil numarasını kaydedebilirsiniz.
            </p>
            <input
              type="text"
              value={sgkRegNo}
              onChange={(e) => setSgkRegNo(e.target.value)}
              placeholder="SGK İşe Giriş Tescil / Referans No (Opsiyonel)"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setStartModal(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                onClick={handleStartInsuranceSubmit}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Sigortayı Başlat & Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ek Prim Tescili / SGK Çıkış İşleme Modalı */}
      {processModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              {processModal.mode === 'extension'
                ? `Ek Prim / Süre Uzatma SGK Tescili (${processModal.studentName})`
                : `SGK İşten Çıkış Bildirimi (${processModal.studentName})`}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {processModal.mode === 'extension'
                ? 'İzin/rapor nedeniyle ötelenecek günler için SGK sisteminde yaptığınız ek prim tescil bilgisini giriniz.'
                : 'Stajını tamamlayan veya Form 7 ile iptal edilen öğrenci için SGK çıkış referans numarasını giriniz.'}
            </p>
            <input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder={
                processModal.mode === 'extension'
                  ? 'Ek Bildirge / Referans No (Opsiyonel)'
                  : 'SGK Çıkış Belge / Referans No (Opsiyonel)'
              }
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={processNote}
              onChange={(e) => setProcessNote(e.target.value)}
              placeholder="KPTO İşlem Notu (Opsiyonel)"
              className="mt-2.5 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setProcessModal(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                onClick={handleProcessModalSubmit}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white ${
                  processModal.mode === 'extension'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-purple-700 hover:bg-purple-800'
                }`}
              >
                Kaydet ve İşaretle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sigorta Başlatılamadı Gerekçe Modalı */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Sigorta Başlatılamama Gerekçesi ({rejectModal.studentName})
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Öğrenci ve Staj Komisyonuna iletilecek açıklamayı giriniz (Örn: SPAS belgesi güncel değil / müstehaklık yok).
            </p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Gerekçe yazınız..."
              className="mt-3 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                onClick={handleMarkNotStarted}
                disabled={!rejectNote.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Başlatılmayanlar Listesine Taşı
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
