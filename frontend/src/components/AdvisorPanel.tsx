import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  api,
  docTypeLabels,
  downloadBlob,
  formatDate,
  getErrorMessage,
  statusColors,
  statusLabels,
  type InternshipDetailDto,
  type InternshipSummaryDto,
  type LogbookEntryDto,
} from '../api';
import { DocumentPreviewModal, type PreviewSource } from './DocumentPreviewModal';
import { AuthImage } from './AuthImage';

export const AdvisorPanel: React.FC = () => {
  const [interns, setInterns] = useState<InternshipSummaryDto[]>([]);
  const [selected, setSelected] = useState<InternshipDetailDto | null>(null);
  const [logbook, setLogbook] = useState<LogbookEntryDto[]>([]);
  const [revisionNote, setRevisionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    subtitle?: string;
    sources: PreviewSource[];
  } | null>(null);

  const loadInterns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<InternshipSummaryDto[]>('/advisor/internships');
      setInterns(data);
      if (data.length > 0 && !selected) {
        await selectIntern(data[0].id);
      } else if (selected) {
        await selectIntern(selected.id);
      }
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const selectIntern = async (id: string) => {
    try {
      const [detailRes, logRes] = await Promise.all([
        api.get<InternshipDetailDto>(`/internships/${id}`),
        api.get<LogbookEntryDto[]>(`/internships/${id}/logbook`),
      ]);
      setSelected(detailRes.data);
      setLogbook(logRes.data);
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    loadInterns();
  }, []);

  const handleApproveLogbook = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      const { data } = await api.post<InternshipDetailDto>(
        `/advisor/internships/${selected.id}/approve-logbook`
      );
      setSelected(data);
      setMsg({
        type: 'ok',
        text: '"Staj defterini gördüm ve inceledim" onayınız kaydedildi.',
      });
      await loadInterns();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleRequestLogbookRevision = async () => {
    if (!selected) return;
    if (!revisionNote.trim()) {
      setMsg({ type: 'err', text: 'Lütfen öğrencinin staj defteri için revize / düzeltme gerekçenizi yazınız.' });
      return;
    }
    setMsg(null);
    try {
      const { data } = await api.post<InternshipDetailDto>(
        `/advisor/internships/${selected.id}/request-logbook-revision`,
        { note: revisionNote }
      );
      setSelected(data);
      setRevisionNote('');
      setMsg({
        type: 'ok',
        text: 'Öğrenciden staj defteri için revize (düzeltme) istendi ve bildirim gönderildi.',
      });
      await loadInterns();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleUploadResultForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setMsg(null);
    const fd = new FormData();
    fd.append('type', 'ResultForm');
    fd.append('file', file);
    try {
      await api.post(`/internships/${selected.id}/documents`, fd);
      setMsg({
        type: 'ok',
        text: 'Islak imzalı Sonuç / Değerlendirme Formu (Form 4) başarıyla yüklendi ve Komisyona iletildi.',
      });
      await selectIntern(selected.id);
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    } finally {
      e.target.value = '';
    }
  };

  const completedLogbookCount = logbook.filter((e) => !e.isDraft).length;
  const isLogbookComplete = selected ? completedLogbookCount >= selected.workDays : false;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Şirket Yetkilisi / Sorumlu Mühendis (Advisor) Paneli
              </h2>
              <p className="text-sm text-slate-500">
                Kurumunuzda staj yapan öğrencilerin Sanal Staj Defterini inceleyin, onaylayın veya revize isteyin ve Sonuç Formunu yükleyin.
              </p>
            </div>
          </div>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sol Liste: Stajyerler */}
        <div className="space-y-3 lg:col-span-4">
          <h3 className="text-sm font-bold tracking-wide text-slate-600 uppercase">
            Kurumunuzdaki Stajyerler ({interns.length})
          </h3>
          {loading && interns.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Yükleniyor...
            </div>
          ) : interns.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Henüz size atanmış aktif bir stajyer bulunmuyor.
            </div>
          ) : (
            interns.map((item) => (
              <button
                key={item.id}
                onClick={() => selectIntern(item.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selected?.id === item.id
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{item.studentName}</p>
                    <p className="text-xs text-slate-500">Öğrenci No: {item.studentNo}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      statusColors[item.status]
                    }`}
                  >
                    {statusLabels[item.status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600">
                  <span>
                    {formatDate(item.startDate)} — {formatDate(item.endDate)} ({item.workDays} gün)
                  </span>
                  {item.advisorLogbookApproved ? (
                    <span className="font-semibold text-emerald-700">✔ Defter Onaylı</span>
                  ) : item.logbookRevisionRequested ? (
                    <span className="font-semibold text-rose-700">↻ Revize İstendi</span>
                  ) : item.logbookSubmittedToAdvisorAt ? (
                    <span className="font-semibold text-blue-700">📩 Onayınıza Gönderildi</span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sağ Detay: Sanal Defter & Sonuç Formu */}
        <div className="lg:col-span-8">
          {!selected ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              İncelemek için soldaki listeden bir stajyer seçiniz.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Öğrenci Özeti ve Onay Kartı */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selected.studentName} ({selected.studentNo})
                    </h3>
                    <p className="text-sm text-slate-600">
                      {selected.type === 'Staj1' ? 'Staj 1' : 'Staj 2'} • {selected.companyName} ({selected.department || 'Genel Birim'})
                    </p>
                    {selected.subject && (
                      <p className="text-xs text-slate-600">
                        Staj Konusu: <b>{selected.subject}</b>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Tarih: <b>{formatDate(selected.startDate)}</b> – <b>{formatDate(selected.endDate)}</b> ({selected.workDays} İş Günü • Cumartesi: {selected.worksOnSaturday ? 'Çalışıyor' : 'Çalışmıyor'})
                      {selected.currentDay !== undefined && selected.currentDay !== null && selected.currentDay > 0 && (
                        <span className="ml-2 rounded-md bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">
                          Stajın {selected.currentDay}. İş Günü
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewModal({
                          title: 'Sanal Staj Defteri (Kapak + Rapor Sayfaları) Tek PDF Önizleme',
                          subtitle: `${selected.studentName} (${selected.studentNo})`,
                          sources: [
                            {
                              label: 'Tam Staj Defteri PDF',
                              url: `/internships/${selected.id}/pdf/logbook`,
                              fallbackFileName: `StajDefteri_${selected.studentNo}.pdf`,
                            },
                          ],
                        })
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                    >
                      <Eye className="h-4 w-4 text-indigo-700" />
                      Defteri Tek PDF Önizle
                    </button>
                    <button
                      onClick={() =>
                        downloadBlob(
                          `/internships/${selected.id}/pdf/logbook`,
                          `StajDefteri_${selected.studentNo}.pdf`
                        )
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4 text-indigo-600" />
                      Tek PDF İndir
                    </button>
                  </div>
                </div>

                {/* Öğrencinin Defter Gönderim Durumu Banner'ı */}
                {selected.logbookSubmittedToAdvisorAt && !selected.advisorLogbookApproved && (
                  <div className="mt-4 rounded-xl border border-blue-300 bg-blue-50 p-3.5 text-xs text-blue-950">
                    <b>📩 Öğrenci Staj Defterini Onayınıza Gönderdi ({formatDate(selected.logbookSubmittedToAdvisorAt)}):</b>{' '}
                    Öğrenci {logbook.length}/{selected.workDays} iş günlük defterini tamamladı. İnceleyip onaylayabilir veya beğenmediğiniz kısımlar için revize isteyebilirsiniz.
                  </div>
                )}

                {/* İşlem Kutuları: 1) Defter Onayı & Revize 2) Sonuç Formu Yükleme */}
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <FileCheck className="h-5 w-5 text-emerald-600" />
                        <span>1. Sanal Staj Defteri Onayı / Revize</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isLogbookComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {logbook.filter((e) => !e.isDraft).length} / {selected.workDays} Tamamlandı
                        {logbook.some((e) => e.isDraft)
                          ? ` (+${logbook.filter((e) => e.isDraft).length} Taslak)`
                          : ''}
                      </span>
                    </div>

                    {!isLogbookComplete && !selected.advisorLogbookApproved && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          <b>Eksik Deftere Onay Verilemez:</b> Öğrenci henüz {selected.workDays} iş gününün tamamını doldurmamıştır ({logbook.length}/{selected.workDays} gün). Tüm günler dolmadan onay butonu aktifleşmez.
                        </span>
                      </div>
                    )}

                    {selected.advisorLogbookApproved ? (
                      <div className="rounded-lg bg-emerald-100 px-3 py-2.5 text-xs font-bold text-emerald-800 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>Staj defterini gördüm ve inceledim ({formatDate(selected.advisorApprovedAt)})</span>
                        </div>
                        {selected.advisorApprovedIpAddress && (
                          <div className="pl-6 text-[11px] font-medium text-emerald-700">
                            Onay IP Damgası: <b>{selected.advisorApprovedIpAddress}</b>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={handleApproveLogbook}
                        disabled={!isLogbookComplete}
                        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ☑ Staj Defterini Gördüm ve İnceledim (Onayla)
                      </button>
                    )}

                    {/* Danışman Staj Defterini Beğenmediyse Revize İsteme Alanı (Madde 15) */}
                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Defter Beğenilmediyse / Düzeltme Gerekiyorsa Revize İste:
                      </label>
                      <textarea
                        rows={2}
                        value={revisionNote}
                        onChange={(e) => setRevisionNote(e.target.value)}
                        placeholder="Örn: 3. ve 5. gün raporlarında yapılan teknik çalışmaları daha detaylı açıklayınız..."
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleRequestLogbookRevision}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Staj Defteri İçin Öğrenciden Revize İste
                      </button>
                      {selected.logbookRevisionRequested && selected.logbookRevisionNote && (
                        <p className="text-[11px] font-semibold text-rose-700">
                          Son İstenen Revize Notu: "{selected.logbookRevisionNote}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Upload className="h-5 w-5 text-indigo-600" />
                      <span>2. Islak İmzalı Sonuç / Değerlendirme Formu (Form 4)</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Hazır doldurulmuş Form 4 şablonunu indirip kaşe/imza yaptıktan sonra sisteme yükleyin.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        downloadBlob(
                          `/internships/${selected.id}/pdf/form4`,
                          `Form4_Degerlendirme_${selected.studentNo}.pdf`
                        )
                      }
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50"
                    >
                      <Download className="h-4 w-4 text-indigo-600" />
                      Hazır Form 4 (Değerlendirme Formu) Şablonunu İndir
                    </button>
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">
                        <Upload className="h-4 w-4" />
                        İmzalı Sonuç / Değerlendirme Formu Yükle
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleUploadResultForm}
                          className="hidden"
                        />
                      </label>
                      {selected.documents
                        .filter((d) => d.type === 'ResultForm')
                        .map((d) => (
                          <button
                            key={d.id}
                            onClick={() => downloadBlob(`/documents/${d.id}`, d.originalFileName)}
                            className="flex items-center justify-between rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-50"
                          >
                            <span className="truncate font-medium">✔ {d.originalFileName}</span>
                            <Download className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Yüklü Tüm Evraklar */}
                {selected.documents.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">Dosyadaki Belgeler</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.documents.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => downloadBlob(`/documents/${doc.id}`, doc.originalFileName)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-semibold">{docTypeLabels[doc.type]}:</span>
                          <span>{doc.originalFileName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sanal Staj Defteri Sayfaları */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-900">
                      Öğrencinin Sanal Staj Defteri Sayfaları ({logbook.length} / {selected.workDays} Gün)
                    </h4>
                  </div>
                </div>

                {logbook.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Öğrenci henüz sanal staj defteri sayfası girmemiştir.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {logbook.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-900">
                              {entry.dayNumber}. İş Günü — {entry.title}
                            </span>
                            {entry.isDraft && (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-300">
                                TASLAK
                              </span>
                            )}
                          </div>
                          <span className="rounded-md bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {entry.content}
                        </p>
                        {entry.hasImage && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5">
                            <AuthImage
                              src={`/internships/${selected.id}/logbook/${entry.id}/image`}
                              alt={entry.imageCaption || `${entry.dayNumber}. Gün Çalışma Görseli`}
                              cacheKey={entry.updatedAt}
                              className="max-h-60 w-auto rounded object-contain"
                            />
                            {entry.imageCaption && (
                              <p className="mt-1.5 text-xs italic text-slate-600">
                                {entry.imageCaption}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {previewModal && (
        <DocumentPreviewModal
          title={previewModal.title}
          subtitle={previewModal.subtitle}
          sources={previewModal.sources}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </div>
  );
};
