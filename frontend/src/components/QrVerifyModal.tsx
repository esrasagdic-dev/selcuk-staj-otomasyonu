import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, QrCode, Search, Upload, X, XCircle } from 'lucide-react';
import { api, formatDate, getErrorMessage, statusLabels, type VerifyResultDto } from '../api';

interface Props {
  initialCode?: string;
  onClose: () => void;
}

export const QrVerifyModal: React.FC<Props> = ({ initialCode, onClose }) => {
  const [codeInput, setCodeInput] = useState(initialCode ?? '');
  const [result, setResult] = useState<VerifyResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const extractGuid = (raw: string): string => {
    const match = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    return match ? match[0] : raw.trim();
  };

  const verifyCode = async (raw: string) => {
    const clean = extractGuid(raw);
    if (!clean) return;
    setCodeInput(clean);
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<VerifyResultDto>(`/verify/${clean}`);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      verifyCode(initialCode);
    }
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [initialCode]);

  const startCamera = async () => {
    setError(null);
    setScanning(true);
    setTimeout(async () => {
      try {
        const qr = new Html5Qrcode('qr-reader-box');
        scannerRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            qr.stop().catch(() => {});
            setScanning(false);
            verifyCode(decodedText);
          },
          () => {}
        );
      } catch {
        setScanning(false);
        setError('Kamera başlatılamadı. QR kod görselini yükleyebilir veya doğrulama kodunu girebilirsiniz.');
      }
    }, 100);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const qr = new Html5Qrcode('qr-file-hidden');
      const decoded = await qr.scanFile(file, false);
      await verifyCode(decoded);
    } catch {
      setError('Yüklenen görselde geçerli bir QR kod okunamadı.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">QR Kodlu Resmi Belge Doğrulama</h3>
              <p className="text-xs text-slate-500">Form 2 veya Sanal Staj Defteri üzerindeki QR kodu okutun</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Belge üzerindeki Doğrulama Kodunu (GUID) yapıştırın..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <button
              onClick={() => verifyCode(codeInput)}
              disabled={loading || !codeInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              Sorgula
            </button>
          </div>

          <div className="flex gap-2">
            {!scanning ? (
              <button
                onClick={startCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <QrCode className="h-4 w-4 text-blue-600" />
                Kamera ile QR Okut
              </button>
            ) : (
              <button
                onClick={() => {
                  scannerRef.current?.stop().catch(() => {});
                  setScanning(false);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              >
                Kamerayı Kapat
              </button>
            )}

            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
              <Upload className="h-4 w-4 text-indigo-600" />
              QR Görseli Yükle
              <input type="file" accept="image/*" onChange={handleFileScan} className="hidden" />
            </label>
          </div>

          {scanning && <div id="qr-reader-box" className="overflow-hidden rounded-xl border border-slate-200" />}
          <div id="qr-file-hidden" className="hidden" />

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {result && (
            <div
              className={`rounded-xl border p-4 ${
                result.valid ? 'border-emerald-300 bg-emerald-50/70' : 'border-rose-300 bg-rose-50'
              }`}
            >
              {result.valid ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold">Doğrulandı — Resmi Staj Kaydı Geçerlidir</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-700">
                    <div>
                      <span className="text-slate-500">Öğrenci (KVKK Maskeli):</span>
                      <p className="font-semibold">{result.studentName} ({result.studentNo})</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Dönem:</span>
                      <p className="font-semibold">{result.termName}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Kurum / Firma:</span>
                      <p className="font-semibold">{result.companyName}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Staj Tarihleri:</span>
                      <p className="font-semibold">{formatDate(result.startDate)} — {formatDate(result.endDate)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Güncel Durum:</span>
                      <p className="font-semibold">{result.status ? statusLabels[result.status] : '-'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-800">
                  <XCircle className="h-5 w-5 text-rose-600" />
                  <span className="font-semibold">Geçersiz Kod: Bu doğrulama koduna ait staj kaydı bulunamadı.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
