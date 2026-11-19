import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Receipt,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  api,
  downloadBlob,
  formatDate,
  getErrorMessage,
  type KptoInsuranceStatus,
  type KptoRowDto,
  type SalaryReceiptDto,
} from '../api';

export const KptoPanel: React.FC = () => {
  const [tab, setTab] = useState<'Pending' | 'InsuranceActive' | 'InsuranceNotStarted' | 'Receipts'>('Pending');
  const [rows, setRows] = useState<KptoRowDto[]>([]);
  const [receipts, setReceipts] = useState<SalaryReceiptDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; studentName: string } | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'Receipts') {
        const { data } = await api.get<SalaryReceiptDto[]>('/kpto/salary-receipts');
        setReceipts(data);
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
  }, [tab]);

  const handleStartInsurance = async (row: KptoRowDto) => {
    setMsg(null);
    try {
      await api.post(`/kpto/internships/${row.internshipId}/start-insurance`);
      setMsg({
        type: 'ok',
        text: `${row.studentName} için "Sigorta Başlatıldı" işaretlendi. Öğrenci "Sigortası Başlatılanlar" listesine taşındı ve öğrenci panelinde yeşil onay yandı.`,
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
                Komisyonun onayladığı öğrencilerin SPAS / Excel dökümünü alın, SGK girişini yapıp sigortalarını başlatın.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tab !== 'Receipts' && (
              <button
                onClick={() => exportExcel(tab)}
                className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Bu Listeyi Excel / SPAS Dökümü İndir (.xlsx)
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

        {/* 4 Sekme: Gelenler, Sigortası Başlatılanlar, Başlatılmayanlar, Maaş Dekontları */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <button
            onClick={() => setTab('Pending')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === 'Pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1. Gelenler (Sigorta Bekleyenler)
          </button>
          <button
            onClick={() => setTab('InsuranceActive')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === 'InsuranceActive'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2. Sigortası Başlatılanlar
          </button>
          <button
            onClick={() => setTab('InsuranceNotStarted')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === 'InsuranceNotStarted'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            3. Sigortası Başlatılmayanlar
          </button>
          <button
            onClick={() => setTab('Receipts')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === 'Receipts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Maaş Dekontları
          </button>
        </div>
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
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => downloadBlob(`/documents/${r.documentId}`, r.fileName)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Dekontu İndir
                        </button>
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
                    <th className="px-4 py-3">Staj Tarihleri</th>
                    <th className="px-4 py-3">SPAS & Maaş</th>
                    <th className="px-4 py-3 text-right">Sigorta İşlemi</th>
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
                        {r.dateChanged && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            İzin Nedeniyle Bitiş Tarihi Güncellendi!
                          </span>
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
                              onClick={() => handleStartInsurance(r)}
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            ✔ SGK Aktif ({formatDate(r.insuranceStartedAt)})
                          </span>
                        )}
                        {tab === 'InsuranceNotStarted' && (
                          <button
                            onClick={() => handleMoveToPending(r)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Tekrar Gelenler'e Al
                          </button>
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
