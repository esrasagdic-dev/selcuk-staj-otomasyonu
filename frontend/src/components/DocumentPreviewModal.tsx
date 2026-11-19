import React, { useEffect, useState } from 'react';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { downloadBlob, fetchPreviewBlob, getErrorMessage } from '../api';

export interface PreviewSource {
  label: string;
  url: string;
  fallbackFileName: string;
  postBody?: unknown;
}

interface Props {
  title: string;
  subtitle?: string;
  sources: PreviewSource[];
  initialIndex?: number;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<Props> = ({
  title,
  subtitle,
  sources,
  initialIndex = 0,
  onClose,
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('application/pdf');
  const [fileName, setFileName] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  const activeSource = sources[activeIndex] ?? sources[0];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!activeSource) return;
    let currentBlobUrl: string | null = null;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setImageZoom(1);

    fetchPreviewBlob(activeSource.url, activeSource.fallbackFileName, activeSource.postBody)
      .then((res) => {
        if (cancelled) {
          window.URL.revokeObjectURL(res.blobUrl);
          return;
        }
        currentBlobUrl = res.blobUrl;
        setBlobUrl(res.blobUrl);
        setMimeType(res.mimeType);
        setFileName(res.fileName);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [activeSource?.url, activeSource?.fallbackFileName]);

  const isImage = mimeType.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-2 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all ${
          isFullscreen ? 'h-[96vh] w-[98vw]' : 'h-[88vh] w-full max-w-6xl'
        }`}
      >
        {/* Üst Başlık ve Kontrol Çubuğu */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-extrabold text-slate-900 sm:text-base">{title}</h3>
              <p className="truncate text-xs text-slate-500">
                {subtitle ? `${subtitle} • ` : ''}
                <span className="font-semibold text-slate-700">{fileName || activeSource?.fallbackFileName}</span>
              </p>
            </div>
          </div>

          {/* Birden fazla kaynak varsa (Örn: Yüklenen İmzalı Form 2 vs Sistem Form 2 Şablonu) sekme seçici */}
          {sources.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
              {sources.map((src, idx) => (
                <button
                  key={src.url}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    activeIndex === idx
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {src.label}
                </button>
              ))}
            </div>
          )}

          {/* Sağ Aksiyon Butonları */}
          <div className="flex items-center gap-2">
            {isImage && !loading && !error && (
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1">
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  title="Küçült"
                  className="rounded p-1 text-slate-600 hover:bg-slate-100"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="px-1.5 text-xs font-bold text-slate-700">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  title="Büyüt"
                  className="rounded p-1 text-slate-600 hover:bg-slate-100"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom(1)}
                  title="Sıfırla"
                  className="rounded p-1 text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                title="Yeni Sekmede Aç"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-700" />
                <span className="hidden sm:inline">Yeni Sekmede Aç</span>
              </a>
            )}

            {activeSource && (
              <button
                type="button"
                onClick={() => {
                  if (blobUrl) {
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = fileName || activeSource.fallbackFileName;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } else {
                    downloadBlob(activeSource.url, fileName || activeSource.fallbackFileName);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Cihaza İndir</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? 'Normal Boyut' : 'Tam Ekran'}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Kapat (ESC)"
              className="rounded-xl bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Belge Görüntüleme Gövdesi */}
        <div className="relative flex-1 overflow-auto bg-slate-800/95">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm font-semibold">Belge önizlemesi hazırlanıyor...</p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 max-w-md">
                <p className="text-sm font-bold text-rose-900">Belge Önizlenemedi</p>
                <p className="mt-1 text-xs text-rose-700">{error}</p>
                {activeSource && (
                  <button
                    type="button"
                    onClick={() => downloadBlob(activeSource.url, activeSource.fallbackFileName)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Doğrudan İndirmeyi Dene
                  </button>
                )}
              </div>
            </div>
          ) : blobUrl ? (
            isImage ? (
              <div className="flex min-h-full items-center justify-center p-6 overflow-auto">
                <img
                  src={blobUrl}
                  alt={title}
                  style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
                  className="max-w-full rounded-lg bg-white shadow-2xl transition-transform duration-150"
                />
              </div>
            ) : (
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
                title={title}
                className="h-full w-full border-0 bg-white"
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};
