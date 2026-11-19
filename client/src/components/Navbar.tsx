import React from 'react';
import { User } from '../types';
import { LogOut, User as UserIcon, Shield, FileText, CheckCircle2, Building2, Download, Bell, Activity, PlusCircle } from 'lucide-react';

import { SelcukLogo } from './SelcukLogo';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  currentUser: User | null;
  activeView: string;
  onSelectView: (view: string) => void;
  onLogout: () => void;
  onOpenLoginModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  onSelectView,
  onLogout,
  onOpenLoginModal
}) => {
  return (
    <header data-no-print="true" className="bg-[#1c458b] text-white shadow-md sticky top-0 z-40 border-b border-[#c5a880]/30 font-['Montserrat',sans-serif] print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & University Brand */}
          <div className="flex items-center gap-3.5 cursor-pointer py-2" onClick={() => onSelectView(currentUser ? 'student-tracker' : 'home')}>
            <SelcukLogo size={46} variant="badge" className="drop-shadow-md" />
            <div>
              <div className="font-extrabold text-base tracking-wider leading-tight text-white font-serif sm:text-lg">
                SELÇUK ÜNİVERSİTESİ
              </div>
              <div className="text-xs text-[#c5a880] font-semibold tracking-wider uppercase">
                Staj Bilgi Sistemi
              </div>
            </div>
          </div>

          {/* Navigation Links based on Role */}
          <nav className="hidden md:flex items-center gap-1.5">
            {currentUser?.role === 'Student' && (
              <>
                <button
                  onClick={() => onSelectView('student-tracker')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'student-tracker' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Süreç Takibi
                </button>

                <button
                  onClick={() => onSelectView('student-application')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'student-application' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Staj Başvurusu
                </button>

                <button
                  onClick={() => onSelectView('diary')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'diary' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Sanal Staj Defteri
                </button>

                <button
                  onClick={() => onSelectView('announcements')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'announcements' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Duyurular
                </button>

                <button
                  onClick={() => onSelectView('documents')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'documents' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Resmî Belgeler
                </button>
              </>
            )}

            {(currentUser?.role === 'CommissionMember' || currentUser?.role === 'DepartmentHead') && (
              <>
                <button
                  onClick={() => onSelectView('commission')}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'commission' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Komisyon Değerlendirme Paneli
                </button>
                <button
                  onClick={() => onSelectView('announcements')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'announcements' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Duyurular
                </button>
                <button
                  onClick={() => onSelectView('documents')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'documents' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Resmî Belgeler
                </button>
              </>
            )}

            {currentUser?.role === 'KPTOOfficer' && (
              <>
                <button
                  onClick={() => onSelectView('kpto')}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'kpto' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  KPTO Sigorta Masası
                </button>
                <button
                  onClick={() => onSelectView('documents')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'documents' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Resmî Belgeler
                </button>
              </>
            )}

            {/* Public Links when not logged in */}
            {!currentUser && (
              <>
                <button
                  onClick={() => onSelectView('announcements')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'announcements' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Duyurular
                </button>
                <button
                  onClick={() => onSelectView('documents')}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeView === 'documents' ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Resmî Belgeler
                </button>
              </>
            )}
          </nav>

          {/* Fast Role Switcher & User Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Role Switcher for Demo */}
            <div className="hidden lg:flex items-center">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    window.location.href = `/?autoLogin=${encodeURIComponent(e.target.value)}`;
                  }
                }}
                defaultValue=""
                className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold py-1.5 px-2.5 rounded-xl border border-white/20 cursor-pointer outline-none transition shadow-xs"
                title="Tek Tıkla Doğrudan Kullanıcı / Rol Değiştir"
              >
                <option value="" disabled className="text-slate-900 bg-white font-bold">⚡ Rol Değiştir (Demo)</option>
                <option value="esra.sagdic@selcuk.edu.tr" className="text-slate-900 bg-white">⭐ Esra SAĞDIÇ (4. Sınıf • Proje Sahibi)</option>
                <option value="betul.acar@selcuk.edu.tr" className="text-slate-900 bg-white">⭐ Betül ACAR (4. Sınıf • Proje Ekibi)</option>
                <option value="mehmet.demir@selcuk.edu.tr" className="text-slate-900 bg-white">👤 Mehmet Demir (Bilgisayar • İzin/Uzatma)</option>
                <option value="gamze.arslan@selcuk.edu.tr" className="text-slate-900 bg-white">🚫 Gamze Arslan (Bilgisayar • Form 7 İptal)</option>
                <option value="furkan.genc@selcuk.edu.tr" className="text-slate-900 bg-white">⏱️ Furkan Genç (Bilgisayar • Uzatma Bekleyen)</option>
                <option value="tolga.yilmaz@selcuk.edu.tr" className="text-slate-900 bg-white">📋 Tolga Yılmaz (Bilgisayar • 20 Gün Dolu)</option>
                <option value="serhat.yilmaz@selcuk.edu.tr" className="text-slate-900 bg-white">⚙️ Serhat Yılmaz (Makine • Onay Bekleyen)</option>
                <option value="burak.ozkan@selcuk.edu.tr" className="text-slate-900 bg-white">⚡ Burak Özkan (Elk-Elektronik • Onay Bekleyen)</option>
                <option value="komisyon@selcuk.edu.tr" className="text-slate-900 bg-white">💻 Bilgisayar Komisyonu (Dr. Onur İnan)</option>
                <option value="komisyon.makine@selcuk.edu.tr" className="text-slate-900 bg-white">⚙️ Makine Komisyonu (Doç. Dr. Serkan Çelik)</option>
                <option value="komisyon.ee@selcuk.edu.tr" className="text-slate-900 bg-white">⚡ Elk-Elektronik Komisyonu (Prof. Dr. Mehmet Aktaş)</option>
                <option value="bolumbaskani@selcuk.edu.tr" className="text-slate-900 bg-white">🎓 Bölüm Başkanı (Ortak Denetim)</option>
                <option value="kpto@selcuk.edu.tr" className="text-slate-900 bg-white">🛡️ KPTO Sigorta Masası</option>
              </select>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold">{currentUser.fullName}</div>
                  <div className="text-xs text-blue-200">
                    {currentUser.role === 'Student' && `Öğrenci (${currentUser.studentProfile?.studentNumber || '203301001'})`}
                    {currentUser.role === 'CommissionMember' && `Komisyon Üyesi (${currentUser.department || (currentUser.email?.includes('makine') ? 'Makine Mühendisliği' : currentUser.email?.includes('.ee') ? 'Elektrik-Elektronik Mühendisliği' : 'Bilgisayar Mühendisliği')})`}
                    {currentUser.role === 'DepartmentHead' && `Bölüm Başkanı (${currentUser.department || 'Bilgisayar Mühendisliği'})`}
                    {currentUser.role === 'KPTOOfficer' && 'KPTO Sigorta Yetkilisi'}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg bg-blue-900/60 hover:bg-red-600 transition text-white"
                  title="Oturumu Kapat"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-4 py-2 bg-white text-[#1c458b] hover:bg-blue-50 font-semibold rounded-lg text-sm shadow transition flex items-center gap-1.5"
              >
                <UserIcon className="w-4 h-4" />
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
