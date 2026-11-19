import React, { useState, useEffect } from 'react';
import { User } from './types';
import { apiRequest, getAuthToken, setAuthToken } from './services/api';
import { Navbar } from './components/Navbar';
import { GuideModal } from './components/GuideModal';
import { StudentApplicationView } from './components/StudentApplicationView';
import { OnlineDiaryView } from './components/OnlineDiaryView';
import { CommissionDashboard } from './components/CommissionDashboard';
import { KPTOView } from './components/KPTOView';
import { AdvisorDiaryReview } from './components/AdvisorDiaryReview';
import { OfficialDocumentsView } from './components/OfficialDocumentsView';
import { LoginModal } from './components/LoginModal';
import { Shield, BookOpen, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

import { HomePortalView } from './components/HomePortalView';
import { StudentProcessTrackerView } from './components/StudentProcessTrackerView';
import { AnnouncementsView } from './components/AnnouncementsView';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('home');
  const [targetApplicationType, setTargetApplicationType] = useState<'Staj1' | 'Staj2'>('Staj1');
  const [selectedAdvisorToken, setSelectedAdvisorToken] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Check login on startup
  useEffect(() => {
    const checkAuth = async () => {
      // 1. İş yeri eğitici personeli token bağlantısı kontrolü (URL üzerinden doğrudan erişim)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      const isAdvisorPath = window.location.pathname.includes('/advisor') || tokenParam !== null;

      if (isAdvisorPath) {
        if (tokenParam) setSelectedAdvisorToken(tokenParam);
        setActiveView('advisor-test');
        setInitialLoading(false);
        return;
      }

      // Canlı demo ve otomatik görünüm URL parametresi kontrolü
      const autoEmail = urlParams.get('autoLogin');
      const viewParam = urlParams.get('view');
      if (autoEmail) {
        try {
          const res: any = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: autoEmail.trim(), password: 'Selcuk123!' })
          });
          setAuthToken(res.token);
          const dept = res.department || res.Department || (res.email?.includes('makine') ? 'Makine Mühendisliği' : res.email?.includes('.ee') ? 'Elektrik-Elektronik Mühendisliği' : 'Bilgisayar Mühendisliği');
          const loggedUser: User = {
            id: res.userId,
            email: res.email,
            fullName: res.fullName,
            role: res.role,
            department: dept,
            studentProfile: res.studentProfile
          };
          setCurrentUser(loggedUser);
          if (viewParam) {
            setActiveView(viewParam);
          } else if (loggedUser.role === 'CommissionMember' || loggedUser.role === 'DepartmentHead') {
            setActiveView('commission');
          } else if (loggedUser.role === 'KPTOOfficer') {
            setActiveView('kpto');
          } else {
            setActiveView('student-tracker');
          }
          setInitialLoading(false);
          return;
        } catch (e) {
          console.error('AutoLogin hatası:', e);
        }
      }

      const token = getAuthToken();
      if (token) {
        try {
          const user: any = await apiRequest('/auth/me');
          const dept = user.department || user.Department || user.studentProfile?.department || (user.email?.includes('makine') ? 'Makine Mühendisliği' : user.email?.includes('.ee') ? 'Elektrik-Elektronik Mühendisliği' : 'Bilgisayar Mühendisliği');
          const normalizedUser: User = {
            ...user,
            department: dept
          };
          setCurrentUser(normalizedUser);
          // Set view based on role
          if (user.role === 'CommissionMember' || user.role === 'DepartmentHead') {
            setActiveView('commission');
          } else if (user.role === 'KPTOOfficer') {
            setActiveView('kpto');
          } else {
            setActiveView('student-tracker');
            if (user.studentProfile && !user.studentProfile.hasAcceptedGuide) {
              setShowGuideModal(true);
            }
          }
        } catch {
          setAuthToken(null);
          setCurrentUser(null);
          setActiveView('home');
        }
      } else {
        setActiveView('home');
      }
      setInitialLoading(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'CommissionMember' || user.role === 'DepartmentHead') {
      setActiveView('commission');
    } else if (user.role === 'KPTOOfficer') {
      setActiveView('kpto');
    } else {
      setActiveView('student-tracker');
      if (user.studentProfile && !user.studentProfile.hasAcceptedGuide) {
        setShowGuideModal(true);
      }
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setActiveView('home');
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Sistem yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] print:bg-white print:min-h-0 print:block print:p-0 print:m-0">
      <Navbar
        currentUser={currentUser}
        activeView={activeView}
        onSelectView={setActiveView}
        onLogout={handleLogout}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      <main className="flex-1 print:p-0 print:m-0 print:block">
        {/* If user is not logged in */}
        {!currentUser ? (
          <div>
            {activeView === 'home' && (
              <HomePortalView
                onLoginSuccess={handleLoginSuccess}
                onOpenAdvisorTest={(token?: string) => {
                  if (token) setSelectedAdvisorToken(token);
                  setActiveView('advisor-test');
                }}
                onOpenDocuments={() => setActiveView('documents')}
                onOpenAnnouncements={() => setActiveView('announcements')}
              />
            )}

            {activeView === 'announcements' && (
              <AnnouncementsView />
            )}

            {activeView === 'documents' && (
              <OfficialDocumentsView />
            )}

            {activeView === 'advisor-test' && (
              <AdvisorDiaryReview
                initialToken={selectedAdvisorToken}
                onBackToHome={() => setActiveView('home')}
              />
            )}
          </div>
        ) : (
          /* When user is logged in */
          <div>
            {/* Student Views */}
            {currentUser.role === 'Student' && (
              <>
                {activeView === 'student-tracker' && (
                  <StudentProcessTrackerView
                    currentUser={currentUser}
                    onNavigateToApplication={(type) => {
                      setTargetApplicationType(type);
                      setActiveView('student-application');
                    }}
                    onNavigateToDiary={() => setActiveView('diary')}
                    onNavigateToDocuments={() => setActiveView('documents')}
                    onNavigateToAnnouncements={() => setActiveView('announcements')}
                  />
                )}

                {activeView === 'student-application' && (
                  <StudentApplicationView
                    currentUser={currentUser}
                    initialType={targetApplicationType}
                    onBackToTracker={() => setActiveView('student-tracker')}
                  />
                )}

                {activeView === 'diary' && (
                  <OnlineDiaryView />
                )}
              </>
            )}

            {/* Academic & Commission Views */}
            {(currentUser.role === 'CommissionMember' || currentUser.role === 'DepartmentHead') && (
              <>
                {activeView === 'commission' && (
                  <CommissionDashboard currentUser={currentUser} />
                )}
              </>
            )}

            {/* KPTO Views */}
            {currentUser.role === 'KPTOOfficer' && (
              <>
                {activeView === 'kpto' && (
                  <KPTOView />
                )}
              </>
            )}

            {/* Shared Views when logged in */}
            {activeView === 'announcements' && (
              <AnnouncementsView />
            )}

            {activeView === 'documents' && (
              <OfficialDocumentsView />
            )}

            {activeView === 'advisor-test' && (
              <AdvisorDiaryReview
                initialToken={selectedAdvisorToken}
                onBackToHome={() => setActiveView('home')}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer when inside application panels */}
      {(currentUser || activeView === 'advisor-test' || activeView === 'documents' || activeView === 'announcements') && (
        <footer data-no-print="true" className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500 print:hidden">
          Selçuk Üniversitesi • Staj Bilgi Sistemi © 2026. Tüm hakları saklıdır.
        </footer>
      )}

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <GuideModal
        isOpen={showGuideModal}
        onAccepted={() => {
          setShowGuideModal(false);
          if (currentUser?.studentProfile) {
            currentUser.studentProfile.hasAcceptedGuide = true;
          }
        }}
      />
    </div>
  );
}

export default App;
