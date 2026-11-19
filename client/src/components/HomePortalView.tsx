import React, { useState } from 'react';
import { User } from '../types';
import { apiRequest, setAuthToken } from '../services/api';
import { SelcukLogo } from './SelcukLogo';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  EyeOff, 
  Bell, 
  GraduationCap, 
  ShieldCheck, 
  Building2, 
  Briefcase,
  KeyRound,
  FileText
} from 'lucide-react';

interface HomePortalViewProps {
  onLoginSuccess: (user: User) => void;
  onOpenAdvisorTest: (token?: string) => void;
  onOpenDocuments: () => void;
  onOpenAnnouncements: () => void;
}

export const HomePortalView: React.FC<HomePortalViewProps> = ({
  onLoginSuccess,
  onOpenAdvisorTest,
  onOpenDocuments,
  onOpenAnnouncements
}) => {
  const [selectedRoleTab, setSelectedRoleTab] = useState<'student' | 'commission' | 'head' | 'kpto' | 'advisor'>('student');
  const [email, setEmail] = useState('ogrenci@selcuk.edu.tr');
  const [password, setPassword] = useState('Selcuk123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisorToken, setAdvisorToken] = useState('2537bbd26b12426e868f310dda388bdd');

  const handleRoleTabChange = (role: 'student' | 'commission' | 'head' | 'kpto' | 'advisor') => {
    setSelectedRoleTab(role);
    setError(null);
    if (role === 'student') setEmail('ogrenci@selcuk.edu.tr');
    else if (role === 'commission') setEmail('komisyon@selcuk.edu.tr');
    else if (role === 'head') setEmail('bolumbaskani@selcuk.edu.tr');
    else if (role === 'kpto') setEmail('kpto@selcuk.edu.tr');
    else if (role === 'advisor') setAdvisorToken('2537bbd26b12426e868f310dda388bdd');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleTab === 'advisor') {
      if (!advisorToken.trim()) {
        setError('Lütfen işyeri yetkili erişim kodunu giriniz.');
        return;
      }
      onOpenAdvisorTest(advisorToken.trim());
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res: any = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password })
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
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectLogin = async (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('Selcuk123!');
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail.trim(), password: 'Selcuk123!' })
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
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-gradient-to-br from-slate-100 via-blue-50/30 to-slate-100 flex flex-col justify-between font-['Montserrat',sans-serif]">
      
      {/* Üst Bilgilendirme Çubuğu */}
      <div className="bg-[#002b49] text-white text-xs py-2 px-4 shadow-sm border-b border-[#c5a880]/30">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold tracking-wider">T.C. SELÇUK ÜNİVERSİTESİ</span>
            <span className="text-blue-300">•</span>
            <span className="text-blue-100">Resmî Staj Bilgi Sistemi</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-blue-200">
            <button
              type="button"
              onClick={onOpenAnnouncements}
              className="hover:text-white transition flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Bell className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Duyurular & Takvim</span>
            </button>
            <span className="text-blue-500">|</span>
            <button
              type="button"
              onClick={onOpenDocuments}
              className="hover:text-white transition flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Download className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Boş Form 2 & Resmî Evraklar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ana Giriş Alanı */}
      <div className="max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex-1 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden w-full grid grid-cols-1 lg:grid-cols-12">
          
          {/* Sol Kolon: Resmî Amblem & Kurumsal Tanıtım */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#002b49] via-[#09355e] to-[#1c458b] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Arka plan dekoratif hafif amblem silüeti */}
            <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
              <SelcukLogo size={280} variant="white" />
            </div>

            <div className="space-y-6 relative z-10">
              {/* Resmî Amblem Vitrini */}
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-2xl shadow-lg ring-4 ring-[#c5a880]/30">
                  <SelcukLogo size={64} variant="color" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black font-serif tracking-wider leading-tight text-white">
                    SELÇUK <br />ÜNİVERSİTESİ
                  </h1>
                  <span className="text-[11px] font-bold text-[#c5a880] tracking-widest uppercase">
                    Staj Bilgi Sistemi
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-light">
                  Mühendislik ve Teknoloji Fakülteleri lisans staj süreçlerinin; başvuru, komisyon onayı, 5510 S.K. 5/b SGK prim tescili ve dijital staj defteri değerlendirmelerinin yürütüldüğü resmî portaldır.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2.5 text-xs text-blue-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Resmî Form 2 & e-Devlet SPAS Onayı</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-blue-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>KPTO SGK 5510 5/b Prim Tescili</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-blue-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Sanal Staj Defteri & İş Yeri Onayı</span>
                  </div>
                </div>
              </div>
            </div>

              <div className="pt-6 border-t border-white/15 relative z-10 space-y-2">
                <button
                  type="button"
                  onClick={onOpenDocuments}
                  className="w-full py-2.5 px-3.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <FileText className="w-4 h-4 text-[#c5a880]" />
                  <span>Boş Form 2 & Resmî Şablonları İndir</span>
                </button>
              <div className="text-[10px] text-blue-200/80 text-center font-medium">
                Giriş yapmadan resmî formları ve yönergeleri indirebilirsiniz.
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Sade & Şık Giriş Formu */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Başlık ve Rol Seçici Sekmeler */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Sisteme Giriş Yapın
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Lütfen kurumsal rolünüzü seçerek giriş bilgilerinizi giriniz.
                  </p>
                </div>

                {/* Rol Sekmeleri */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('student')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      selectedRoleTab === 'student'
                        ? 'bg-white text-[#1c458b] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Öğrenci</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('commission')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      selectedRoleTab === 'commission'
                        ? 'bg-white text-[#1c458b] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Komisyon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('head')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      selectedRoleTab === 'head'
                        ? 'bg-white text-[#1c458b] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Bölüm Bşk.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('kpto')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      selectedRoleTab === 'kpto'
                        ? 'bg-white text-[#1c458b] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>KPTO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleTabChange('advisor')}
                    className={`col-span-2 sm:col-span-1 py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      selectedRoleTab === 'advisor'
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>İşyeri</span>
                  </button>
                </div>
              </div>

              {/* Hata Mesajı */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Alanı */}
              <form onSubmit={handleLogin} className="space-y-4">
                {selectedRoleTab !== 'advisor' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        Kurumsal E-Posta / Kullanıcı Adı
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ad.soyad@selcuk.edu.tr"
                          className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c458b] focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Parola</label>
                        <span className="text-[11px] text-slate-400">Varsayılan: Selcuk123!</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c458b] focus:bg-white transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      İşyeri Mühendisi Erişim Kodu (Token)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={advisorToken}
                        onChange={(e) => setAdvisorToken(e.target.value)}
                        placeholder="Örn: DEMO_ADV_LOGO_2026"
                        className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Öğrencinin staj defterini onaylamak üzere işyeri sorumlu mühendisine e-posta ile gönderilen güvenli erişim anahtarıdır.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#1c458b] hover:bg-[#002b49] text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                >
                  {loading ? (
                    <span>Giriş yapılıyor...</span>
                  ) : (
                    <>
                      <span>{selectedRoleTab === 'advisor' ? 'Defter Onay Paneline Giriş Yap' : 'Giriş Yap'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Hızlı Demo Girişi (Tek Tıkla Giriş Rozetleri) */}
              <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">⚡ Hızlı Test & Demo Girişi:</span>
                  <span className="text-[10px] bg-blue-100 text-[#1c458b] font-bold px-2 py-0.5 rounded">
                    Tek Tıkla Aç
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDirectLogin('ogrenci@selcuk.edu.tr')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-[#1c458b] border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#1c458b]" />
                    <span>Öğrenci (Esra)</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDirectLogin('komisyon@selcuk.edu.tr')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-[#1c458b] border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#1c458b]" />
                    <span>Komisyon (Bilg.)</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDirectLogin('komisyon.makine@selcuk.edu.tr')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-[#1c458b] border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Komisyon (Makine)</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDirectLogin('komisyon.ee@selcuk.edu.tr')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-[#1c458b] border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Komisyon (EE)</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDirectLogin('bolumbaskani@selcuk.edu.tr')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-[#1c458b] border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                    <span>Bölüm Başkanı</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDirectLogin('kpto@selcuk.edu.tr')}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:text-[#1c458b] border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>KPTO Sigorta</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onOpenAdvisorTest('2537bbd26b12426e868f310dda388bdd')}
                    className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 col-span-2 sm:col-span-3 shadow-2xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🏢 İş Yeri Mühendisi (esrasagdic200@gmail.com - Defter Onayı)</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Sade & Kurumsal Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SelcukLogo size={24} variant="color" />
            <span className="font-semibold text-slate-700">Selçuk Üniversitesi Teknoloji Fakültesi</span>
            <span className="text-slate-300">•</span>
            <span>Bilgisayar Mühendisliği Bölümü</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Bitirme Projesi 2026 • Esra SAĞDIÇ & Betül ACAR • Danışman: Dr. Öğr. Üyesi Onur İNAN
          </div>
        </div>
      </footer>

    </div>
  );
};
