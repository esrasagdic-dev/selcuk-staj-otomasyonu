import React, { useState } from 'react';
import { User as UserIcon, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { apiRequest, setAuthToken } from '../services/api';

import { SelcukLogo } from './SelcukLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('ogrenci@selcuk.edu.tr');
  const [password, setPassword] = useState('Selcuk123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      setAuthToken(res.token);
      const dept = res.department || res.Department || (res.email?.includes('makine') ? 'Makine Mühendisliği' : res.email?.includes('.ee') ? 'Elektrik-Elektronik Mühendisliği' : 'Bilgisayar Mühendisliği');
      onLoginSuccess({
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        department: dept,
        studentProfile: res.studentProfile
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Selcuk123!');
  };

  const handleDirectLoginModal = async (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('Selcuk123!');
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: 'Selcuk123!' })
      });

      setAuthToken(res.token);
      const dept = res.department || res.Department || (res.email?.includes('makine') ? 'Makine Mühendisliği' : res.email?.includes('.ee') ? 'Elektrik-Elektronik Mühendisliği' : 'Bilgisayar Mühendisliği');
      onLoginSuccess({
        id: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        department: dept,
        studentProfile: res.studentProfile
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="bg-[#002b49] text-white p-6 text-center border-b border-[#c5a880]/30 relative">
          <div className="flex justify-center mb-2">
            <SelcukLogo size={58} variant="badge" className="drop-shadow-lg" />
          </div>
          <h2 className="text-lg font-bold tracking-wider font-serif">SELÇUK ÜNİVERSİTESİ</h2>
          <p className="text-xs text-[#c5a880] font-medium mt-0.5">Staj Bilgi Sistemi • Kurumsal Giriş</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Quick Demo Credentials */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 block">⚡ Tek Tıkla Doğrudan Giriş:</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Otomatik</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDirectLoginModal('komisyon@selcuk.edu.tr')}
                className="py-1.5 px-2 bg-[#002b49] hover:bg-blue-900 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>💻 Bilgisayar Kom.</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDirectLoginModal('bolumbaskani@selcuk.edu.tr')}
                className="py-1.5 px-2 bg-purple-900 hover:bg-purple-950 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>🎓 Bölüm Başkanı</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDirectLoginModal('komisyon.makine@selcuk.edu.tr')}
                className="py-1.5 px-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-0.5 cursor-pointer disabled:opacity-50"
              >
                <span>⚙️ Makine</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDirectLoginModal('komisyon.ee@selcuk.edu.tr')}
                className="py-1.5 px-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-0.5 cursor-pointer disabled:opacity-50"
              >
                <span>⚡ E-E</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDirectLoginModal('kpto@selcuk.edu.tr')}
                className="py-1.5 px-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-[10px] flex items-center justify-center gap-0.5 cursor-pointer disabled:opacity-50"
              >
                <span>🛡️ KPTO</span>
              </button>
            </div>
            
            <div className="p-2 bg-indigo-50 border border-indigo-300 rounded-lg space-y-1">
              <div className="text-[10px] font-bold text-indigo-950 flex items-center justify-between">
                <span>🎓 Esra SAĞDIÇ & Betül ACAR</span>
                <span className="text-indigo-700">4. Sınıf • Proje Ekibi</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDirectLoginModal('esra.sagdic@selcuk.edu.tr')}
                  className="py-1 px-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold text-center transition cursor-pointer disabled:opacity-50"
                >
                  Esra SAĞDIÇ →
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDirectLoginModal('betul.acar@selcuk.edu.tr')}
                  className="py-1 px-1 bg-indigo-800 hover:bg-indigo-900 text-white rounded text-[10px] font-bold text-center transition cursor-pointer disabled:opacity-50"
                >
                  Betül ACAR →
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDirectLoginModal('mehmet.demir@selcuk.edu.tr')}
              className="w-full py-2 px-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-950 font-bold hover:bg-emerald-100 transition text-[11px] flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span>👤 Mehmet Demir (Aktif Stajyer • Uzatma / Mazeret)</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">Giriş Yap →</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDirectLoginModal('gamze.arslan@selcuk.edu.tr')}
              className="w-full py-2 px-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-950 font-bold hover:bg-rose-100 transition text-[11px] flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span>🚫 Gamze Arslan (Form 7 İptal Talebi)</span>
              <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-bold">Giriş Yap →</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDirectLoginModal('tolga.yilmaz@selcuk.edu.tr')}
              className="w-full py-2 px-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-bold hover:bg-amber-100 transition text-[11px] flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span>📋 Tolga Yılmaz (20 Gün Dolu • Onayda)</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">Giriş Yap →</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDirectLoginModal('caner.ozdemir@selcuk.edu.tr')}
              className="w-full py-2 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold hover:bg-slate-100 transition text-[11px] flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span>🌱 Caner Özdemir (0 Başvuru • Temiz)</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">Giriş Yap →</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDirectLoginModal('can.ozturk@selcuk.edu.tr')}
              className="w-full py-2 px-2.5 bg-teal-50 border border-teal-300 rounded-lg text-teal-900 font-bold hover:bg-teal-100 transition text-[11px] flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span>🎉 Can Öztürk (20 Gün Başarılı • PDF Baskı)</span>
              <span className="text-[10px] bg-teal-200 text-teal-900 px-1.5 py-0.5 rounded font-bold">Giriş Yap →</span>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">E-posta Adresi:</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-[#1c458b]"
                  placeholder="ornek@selcuk.edu.tr"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Parola:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-[#1c458b]"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#002b49] hover:bg-[#003d66] text-white font-bold rounded-xl shadow transition text-sm flex items-center justify-center gap-2 mt-2"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? 'Giriş Yapılıyor...' : 'Sisteme Giriş Yap'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
