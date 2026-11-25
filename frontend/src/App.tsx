import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  GraduationCap,
  KeyRound,
  LogOut,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  api,
  formatDate,
  getErrorMessage,
  roleLabels,
  type AuthResponse,
  type NotificationDto,
  type UserDto,
} from './api';
import { AdvisorPanel } from './components/AdvisorPanel';
import { CommitteePanel } from './components/CommitteePanel';
import { KptoPanel } from './components/KptoPanel';
import { QrVerifyModal } from './components/QrVerifyModal';
import { StudentPanel } from './components/StudentPanel';

const STUDENT_DEMO_ACCOUNTS = [
  {
    label: 'Bilgisayar Müh. Öğrencisi (Ahmet Özkan — 233311056)',
    email: '233311056@ogr.selcuk.edu.tr',
    badge: 'Bilgisayar Müh.',
    color: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100',
  },
  {
    label: 'Makine Müh. Öğrencisi (Seda Nur Karaca — 223322015)',
    email: '223322015@ogr.selcuk.edu.tr',
    badge: 'Makine Müh.',
    color: 'border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100',
  },
  {
    label: 'Elektrik-Elektronik Müh. Öğrencisi (Ceren Yıldız — 223333019)',
    email: '223333019@ogr.selcuk.edu.tr',
    badge: 'Elektrik-Elektronik Müh.',
    color: 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
  },
];

const DEPARTMENT_COMMITTEE_OPTIONS = [
  {
    dept: 'Bilgisayar Mühendisliği',
    name: 'Doç. Dr. Ayşe Kaya',
    email: 'komisyon@selcuk.edu.tr',
  },
  {
    dept: 'Makine Mühendisliği',
    name: 'Doç. Dr. Hasan Çetin',
    email: 'komisyon.makine@selcuk.edu.tr',
  },
  {
    dept: 'Elektrik-Elektronik Mühendisliği',
    name: 'Doç. Dr. Murat Yıldız',
    email: 'komisyon.ee@selcuk.edu.tr',
  },
];

const ADMIN_DEMO_ACCOUNTS = [
  {
    label: '1. Komisyon Paneli (Doç. Dr. Ayşe Kaya)',
    email: 'komisyon@selcuk.edu.tr',
    badge: 'Komisyon',
    color: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
  },
  {
    label: '2. Bölüm Başkanı (Prof. Dr. Mehmet Yılmaz)',
    email: 'bolumbaskani@selcuk.edu.tr',
    badge: 'Süper Yetkili',
    color: 'border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100',
  },
  {
    label: '3. Şirket Paneli / Advisor (Yük. Müh. Gökhan Yılmaz — TUSAŞ)',
    email: 'gokhan.yilmaz@tusas.com',
    badge: 'Şirket',
    color: 'border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100',
  },
  {
    label: '4. KPTO / Sigorta Paneli (Mustafa Demir)',
    email: 'kpto@selcuk.edu.tr',
    badge: 'KPTO',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
  },
];

export function App() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginPortal, setLoginPortal] = useState<'choice' | 'student' | 'admin'>('choice');

  // Login state
  const [email, setEmail] = useState('233311056@ogr.selcuk.edu.tr');
  const [password, setPassword] = useState('123456');
  const [authError, setAuthError] = useState<string | null>(null);

  // Bildirimler
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  // Şifre Değiştirme Modalı
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);

  // QR / Belge Doğrulama Modalı
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrInitialCode, setQrInitialCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    const verifyParam = new URLSearchParams(window.location.search).get('verify');
    if (verifyParam) {
      setQrInitialCode(verifyParam);
      setShowQrModal(true);
    }

    const token = localStorage.getItem('staj_token');
    if (!token) {
      setLoadingAuth(false);
      return;
    }
    api
      .get<UserDto>('/auth/me')
      .then((res) => {
        setUser(res.data);
        if (res.data.mustChangePassword) setShowPassModal(true);
      })
      .catch(() => {
        localStorage.removeItem('staj_token');
      })
      .finally(() => setLoadingAuth(false));
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await api.get<NotificationDto[]>('/notifications');
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      const timer = setInterval(loadNotifications, 15000);
      return () => clearInterval(timer);
    }
  }, [user?.id]);

  const handleLogin = async (e: React.FormEvent, quickEmail?: string) => {
    e.preventDefault();
    setAuthError(null);
    const targetEmail = (quickEmail ?? email).trim().toLowerCase();

    if (loginPortal === 'student' && !targetEmail.endsWith('@ogr.selcuk.edu.tr')) {
      setAuthError('Öğrenci girişi yalnızca @ogr.selcuk.edu.tr uzantılı okul e-postası ile yapılabilir.');
      return;
    }

    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        email: targetEmail,
        password: quickEmail ? '123456' : password,
      });
      localStorage.setItem('staj_token', data.token);
      setUser(data.user);
      if (data.user.mustChangePassword) setShowPassModal(true);
    } catch (err) {
      setAuthError(getErrorMessage(err));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staj_token');
    setUser(null);
    setNotifications([]);
    setLoginPortal('choice');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
      setShowPassModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPassMsg(getErrorMessage(err));
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const extractedStudentNo = email.includes('@') ? email.split('@')[0].trim() : email.trim();

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
        Staj Yönetim Sistemi yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Üst Bar (Header) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div
            onClick={() => {
              if (!user) setLoginPortal('choice');
            }}
            className={`flex items-center gap-3 ${!user ? 'cursor-pointer' : ''}`}
          >
            <img
              src="/selcuk-amblem.png"
              alt="Selçuk Üniversitesi"
              className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain p-0.5 shadow-xs"
            />
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                T.C. Selçuk Üniversitesi — Staj Yönetim ve Takip Sistemi
              </h1>
              <p className="text-xs text-slate-500">
                Teknoloji Fakültesi • Öğrenci, Komisyon, Şirket ve KPTO Entegre Otomasyonu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              title="Resmî Belge / QR Kod Doğrula"
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">QR Doğrula</span>
            </button>

            {user && (
              <>
                {/* Bildirim Zili */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotif(!showNotif)}
                    className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotif && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-900">
                          Bildirimler ({unreadCount} Okunmamış)
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={async () => {
                              await api.post('/notifications/read-all');
                              loadNotifications();
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Tümünü Okundu İşaretle
                          </button>
                        )}
                      </div>
                      <div className="mt-2 max-h-80 divide-y divide-slate-100 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="py-6 text-center text-xs text-slate-500">Bildirim bulunmuyor.</p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={async () => {
                                if (!n.isRead) {
                                  await api.post(`/notifications/${n.id}/read`);
                                  loadNotifications();
                                }
                              }}
                              className={`cursor-pointer py-2.5 text-xs ${
                                n.isRead ? 'opacity-65' : 'bg-blue-50/40 font-medium'
                              }`}
                            >
                              <div className="flex justify-between font-bold text-slate-900">
                                <span>{n.title}</span>
                                <span className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</span>
                              </div>
                              <p className="mt-0.5 text-slate-600">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Kullanıcı Bilgisi */}
                <div className="hidden text-right md:block">
                  <p className="text-xs font-bold text-slate-900">
                    {user.fullName}
                    {user.role === 'Student' && user.studentNo ? ` (${user.studentNo})` : ''}
                  </p>
                  <p className="text-[11px] font-semibold text-blue-700">
                    {roleLabels[user.role]}
                    {user.department ? ` • ${user.department}` : ''}
                  </p>
                </div>

                <button
                  onClick={() => setShowPassModal(true)}
                  title="Parola Değiştir"
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                >
                  <KeyRound className="h-4 w-4" />
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {!user ? (
          loginPortal === 'choice' ? (
            /* İLK AÇILAN KARŞILAMA SAYFASI: ÜNİVERSİTE AMBLEMİ + ÖĞRENCİ / YÖNETİCİ GİRİŞ BUTONLARI */
            <div className="mx-auto max-w-3xl py-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-md sm:p-12">
                <img
                  src="/selcuk-amblem.png"
                  alt="T.C. Selçuk Üniversitesi Amblemi"
                  className="mx-auto h-44 w-auto object-contain sm:h-52"
                />
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  T.C. Selçuk Üniversitesi
                </h2>
                <p className="mt-1 text-sm font-semibold text-blue-800 sm:text-base">
                  Teknoloji Fakültesi — Staj Yönetim ve Takip Otomasyonu
                </p>
                <p className="mx-auto mt-2 max-w-xl text-xs text-slate-500 sm:text-sm">
                  Devam etmek için lütfen giriş yapmak istediğiniz kullanıcı türünü seçiniz.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* Öğrenci Girişi Butonu */}
                  <button
                    onClick={() => {
                      setLoginPortal('student');
                      setEmail('233311056@ogr.selcuk.edu.tr');
                      setPassword('123456');
                      setAuthError(null);
                    }}
                    className="group flex flex-col items-center justify-center rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-7 text-center transition hover:border-blue-600 hover:bg-blue-50 hover:shadow-md"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm transition group-hover:scale-105">
                      <GraduationCap className="h-8 w-8" />
                    </div>
                    <span className="mt-4 text-lg font-extrabold text-slate-900">Öğrenci Girişi</span>
                    <span className="mt-1 text-xs text-slate-600">
                      Okul e-postası (<b>@ogr.selcuk.edu.tr</b>) ve parola ile staj başvuru & defter işlemleri
                    </span>
                    <span className="mt-4 inline-flex items-center rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white group-hover:bg-blue-800">
                      Öğrenci Girişine Git →
                    </span>
                  </button>

                  {/* Yönetici / Yetkili Girişi Butonu */}
                  <button
                    onClick={() => {
                      setLoginPortal('admin');
                      setEmail('komisyon@selcuk.edu.tr');
                      setPassword('123456');
                      setAuthError(null);
                    }}
                    className="group flex flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-7 text-center transition hover:border-amber-600 hover:bg-amber-50 hover:shadow-md"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm transition group-hover:scale-105">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <span className="mt-4 text-lg font-extrabold text-slate-900">Yönetici Girişi</span>
                    <span className="mt-1 text-xs text-slate-600">
                      Staj Komisyonu, Bölüm Başkanı, Şirket Yetkilisi (Danışman) ve KPTO Sigorta Birimi
                    </span>
                    <span className="mt-4 inline-flex items-center rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white group-hover:bg-amber-700">
                      Yönetici Girişine Git →
                    </span>
                  </button>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-800 transition"
                  >
                    <QrCode className="h-4 w-4 text-blue-700" />
                    Resmî Belge / QR Kod Doğrulama
                  </button>
                </div>
              </div>
            </div>
          ) : loginPortal === 'student' ? (
            /* ÖĞRENCİ GİRİŞ EKRANI (Sadece Okul E-Postası ve Parola ile Giriş) */
            <div className="mx-auto max-w-md py-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <button
                  type="button"
                  onClick={() => {
                    setLoginPortal('choice');
                    setAuthError(null);
                  }}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Giriş Seçimine Dön
                </button>

                <div className="text-center">
                  <img
                    src="/selcuk-amblem.png"
                    alt="Selçuk Üniversitesi"
                    className="mx-auto h-24 w-auto object-contain"
                  />
                  <h2 className="mt-2 text-lg font-extrabold text-slate-900">Öğrenci Sisteme Giriş</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Okul e-posta adresiniz (<b>öğrencino@ogr.selcuk.edu.tr</b>) ve parolanız ile giriş yapınız.
                  </p>
                </div>

                {authError && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    {authError}
                  </div>
                )}

                <form onSubmit={(e) => handleLogin(e)} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Okul E-Posta Adresi (@ogr.selcuk.edu.tr)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="233311056@ogr.selcuk.edu.tr"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      required
                    />
                    {extractedStudentNo && (
                      <p className="mt-1.5 text-[11px] font-semibold text-blue-700">
                        E-postadan Algılanan Öğrenci Numarası: <b>{extractedStudentNo}</b>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Parola</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-800 py-3 text-sm font-bold text-white shadow-xs hover:bg-blue-900"
                  >
                    Öğrenci Olarak Oturum Aç
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-[11px] font-bold text-slate-500 uppercase">
                    Bölümlere Göre Hızlı Öğrenci Girişi (Şifre: 123456)
                  </p>
                  <div className="space-y-2">
                    {STUDENT_DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={(e) => handleLogin(e, acc.email)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${acc.color}`}
                      >
                        <div>
                          <p className="text-xs font-extrabold">{acc.label}</p>
                          <p className="text-[11px] opacity-80">{acc.email}</p>
                        </div>
                        <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold shadow-2xs">
                          {acc.badge} →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* YÖNETİCİ / YETKİLİ GİRİŞ EKRANI */
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginPortal('choice');
                      setAuthError(null);
                    }}
                    className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Giriş Seçimine Dön
                  </button>

                  <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                    <img
                      src="/selcuk-amblem.png"
                      alt="Selçuk Üniversitesi"
                      className="h-14 w-auto object-contain"
                    />
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Yönetici / Yetkili Girişi
                      </h2>
                      <p className="text-xs text-slate-500">
                        Komisyon, Bölüm Başkanı, Şirket Yetkilisi ve KPTO Girişi
                      </p>
                    </div>
                  </div>

                  {authError && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={(e) => handleLogin(e)} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Kurumsal E-Posta</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Parola</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-amber-700"
                    >
                      Yönetici Oturumu Aç
                    </button>
                  </form>

                  {/* Bölüm Komisyonları Seçenekleri (Bilgi Giriş Kısmının Altında) */}
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="mb-2 text-[11px] font-bold text-slate-500 uppercase">
                      Bölüm Staj Komisyonu Seçenekleri (Şifre: 123456)
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {DEPARTMENT_COMMITTEE_OPTIONS.map((opt) => {
                        const isSelected = email.trim().toLowerCase() === opt.email;
                        return (
                          <button
                            key={opt.email}
                            type="button"
                            onClick={(e) => {
                              setEmail(opt.email);
                              setPassword('123456');
                              handleLogin(e, opt.email);
                            }}
                            className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20'
                                : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-amber-300 hover:bg-amber-50/50'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-extrabold">{opt.dept}</p>
                              <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
                                {opt.name}
                              </p>
                            </div>
                            <p className="mt-1.5 truncate text-[10px] font-medium text-amber-800">
                              {opt.email}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-blue-900">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <h2 className="text-base font-bold">
                      Yönetici ve Yetkili Panellerine Tek Tıkla Hızlı Giriş
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Sunum ve test için aşağıdaki yetkili hesaplarına tıklayarak doğrudan ilgili panele geçiş yapabilirsiniz (Şifre: <b>123456</b>).
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {ADMIN_DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.email}
                        onClick={(e) => handleLogin(e, acc.email)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${acc.color}`}
                      >
                        <div>
                          <p className="text-xs font-extrabold">{acc.label}</p>
                          <p className="text-[11px] opacity-80">{acc.email}</p>
                        </div>
                        <span className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold shadow-2xs">
                          {acc.badge} Giriş →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : user.role === 'Student' ? (
          <StudentPanel user={user} onUserUpdated={setUser} />
        ) : user.role === 'CompanyAdvisor' ? (
          <AdvisorPanel />
        ) : user.role === 'KptoOfficer' ? (
          <KptoPanel />
        ) : (
          <CommitteePanel user={user} />
        )}
      </main>

      {/* Parola Değiştirme Modalı */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Parola Güncelleme</h3>
            {user?.mustChangePassword && (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                Geçici şifre ile giriş yaptınız. Güvenliğiniz için lütfen yeni şifrenizi belirleyiniz.
              </p>
            )}
            {passMsg && <p className="mt-2 text-xs font-semibold text-rose-600">{passMsg}</p>}
            <form onSubmit={handleChangePassword} className="mt-3 space-y-3">
              <input
                type="password"
                placeholder="Mevcut Parola"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="password"
                placeholder="Yeni Parola (En az 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Parolayı Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR / Resmî Belge Doğrulama Modalı */}
      {showQrModal && (
        <QrVerifyModal
          initialCode={qrInitialCode}
          onClose={() => {
            setShowQrModal(false);
            setQrInitialCode(undefined);
          }}
        />
      )}
    </div>
  );
}

export default App;
