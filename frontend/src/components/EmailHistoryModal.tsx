import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, RefreshCw, X, XCircle } from 'lucide-react';
import { api, formatDate, getErrorMessage, type EmailLogDto } from '../api';

interface Props {
  internshipId?: string | null;
  title?: string;
  onClose: () => void;
}

export const EmailHistoryModal: React.FC<Props> = ({ internshipId, title, onClose }) => {
  const [logs, setLogs] = useState<EmailLogDto[]>([]);
  const [selected, setSelected] = useState<EmailLogDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<EmailLogDto[]>('/committee/email-logs', {
        params: internshipId ? { internshipId } : undefined,
      });
      setLogs(data);
      setSelected(data[0] ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [internshipId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {title || 'Sistem HTML E-Posta Gönderim Geçmişi'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Sistem tarafından otomatik veya manuel tetiklenen tüm HTML e-posta kayıtları
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadLogs}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Yenile
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="grid min-h-[460px] flex-1 grid-cols-1 overflow-hidden md:grid-cols-12">
          <div className="overflow-y-auto border-b border-slate-200 md:col-span-5 md:border-r md:border-b-0">
            {loading ? (
              <p className="p-6 text-center text-xs text-slate-500">E-posta kayıtları yükleniyor...</p>
            ) : logs.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">
                Henüz kaydedilmiş bir e-posta gönderimi bulunmuyor.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelected(log)}
                    className={`w-full p-3.5 text-left transition ${
                      selected?.id === log.id
                        ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{log.subject}</p>
                      {log.isSuccess ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          İletildi
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                          <XCircle className="h-3 w-3" />
                          Hata
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-indigo-700">{log.toEmail}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {formatDate(log.sentAt)} • {new Date(log.sentAt).toLocaleTimeString('tr-TR')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col overflow-hidden bg-slate-50 md:col-span-7">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-400">
                İçeriği önizlemek için soldan bir e-posta kaydı seçiniz.
              </div>
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden p-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1">
                  <div>
                    <span className="font-semibold text-slate-500">Alıcı:</span>{' '}
                    <b className="text-slate-900">{selected.toEmail}</b>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Konu:</span>{' '}
                    <b className="text-slate-900">{selected.subject}</b>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Tarih:</span>{' '}
                    <span>{formatDate(selected.sentAt)} {new Date(selected.sentAt).toLocaleTimeString('tr-TR')}</span>
                  </div>
                  {!selected.isSuccess && selected.errorMessage && (
                    <div className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 border border-rose-200">
                      <b>SMTP Notu:</b> {selected.errorMessage}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <iframe
                    title={selected.subject}
                    srcDoc={selected.htmlBody}
                    sandbox=""
                    className="h-full min-h-[300px] w-full border-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
