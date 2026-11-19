import React, { useState } from 'react';
import { BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../services/api';

interface GuideModalProps {
  isOpen: boolean;
  onAccepted: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onAccepted }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isChecked) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/auth/accept-guide', { method: 'POST' });
      onAccepted();
    } catch (err: any) {
      setError(err.message || 'Onaylama sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#002b49] text-white px-6 py-4 flex items-center gap-3 border-b border-[#c5a880]/30">
          <BookOpen className="w-6 h-6 text-[#c5a880]" />
          <div>
            <h2 className="text-lg font-bold">Staj Kılavuzu ve Bilgilendirme Onayı</h2>
            <p className="text-xs text-blue-200">Selçuk Üniversitesi Staj Yönergesi</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-3.5 rounded text-blue-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              Staj başvurusuna başlamadan önce lütfen aşağıdaki temel esasları ve yönerge maddelerini dikkatle okuyunuz.
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Temel Staj Esasları (Sürüm 2.1):</h3>
            
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="font-semibold text-slate-900">1. Staj Süresi ve Ayrı Form 2:</span>
              <p className="text-xs text-slate-600 mt-1">
                Staj 1 ve Staj 2 için bağımsız olarak 20 veya 30 iş günü seçimi yapılabilir. Her iki staj için sistemde ayrı Form 2 düzenlenir.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="font-semibold text-slate-900">2. Başvuru Evrakları ve SPAS Zorunluluğu:</span>
              <p className="text-xs text-slate-600 mt-1">
                Islak imzalı ve kaşeli <strong>Form 2</strong> ile e-Devlet üzerinden temin edilen <strong>SPAS Müstehaklık Belgesi</strong> staj başlangıç öncesinde başvuru ekranına eksiksiz yüklenmelidir.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="font-semibold text-slate-900">3. Sanal Staj Defteri Yazım Kuralları:</span>
              <p className="text-xs text-slate-600 mt-1">
                Her iş günü için günü gününe rapor hazırlanmalıdır. Bölüm rehberi gereği her gün en az 1 sayfa olmalı, Arial 12 punto ve tek satır aralığı standardı korunmalıdır.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="font-semibold text-slate-900">4. İşyeri Onayı ve Kapalı Zarf Teslimatı:</span>
              <p className="text-xs text-slate-600 mt-1">
                İşyeri sorumlu mühendisine (Advisor) iletilen güvenli bağlantı üzerinden sanal defter onaylatılacaktır. Kapalı ve mühürlü zarftaki Form 4 ise staj sonunda bölüme elden veya kargo ile teslim edilecektir.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 select-none">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span>Yukarıdaki staj esaslarını ve yönerge kurallarını okudum, anladım ve kabul ediyorum.</span>
          </label>

          <button
            onClick={handleConfirm}
            disabled={!isChecked || loading}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition shrink-0 ${
              isChecked && !loading
                ? 'bg-[#1c458b] text-white hover:bg-blue-800 shadow-md'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Kaydediliyor...' : 'Onayla ve Devam Et'}
          </button>
        </div>
      </div>
    </div>
  );
};
