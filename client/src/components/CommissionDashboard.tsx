import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Award, 
  FileText, 
  Calendar, 
  Bell, 
  Save, 
  Trash2, 
  PlusCircle,
  Clock,
  Users,
  Search,
  Filter,
  Archive,
  Building2,
  MapPin,
  User,
  ExternalLink,
  ChevronRight,
  Hash,
  Briefcase,
  FileCheck,
  TrendingUp,
  Plus,
  X,
  Send,
  Check,
  Sun,
  Ban,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import { InternshipApplication, InternshipPeriod, CompanyJobPosting, PublicHolidayItem, JobPostingStats } from '../types';
import { apiRequest } from '../services/api';

interface CommissionDashboardProps {
  currentUser?: any;
}

export const CommissionDashboard: React.FC<CommissionDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'applications' | 'extensions' | 'cancellations' | 'postings' | 'holidays' | 'calendar' | 'archive'>(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'postings' || tabParam === 'cancellations' || tabParam === 'extensions' || tabParam === 'holidays' || tabParam === 'calendar' || tabParam === 'archive') {
      return tabParam;
    }
    return 'applications';
  });
  const resolveDept = (user?: any) => {
    if (user?.department) return user.department;
    if (user?.Department) return user.Department;
    if (user?.email?.includes('makine')) return 'Makine Mühendisliği';
    if (user?.email?.includes('.ee')) return 'Elektrik-Elektronik Mühendisliği';
    return 'Bilgisayar Mühendisliği';
  };

  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => resolveDept(currentUser));

  useEffect(() => {
    const d = resolveDept(currentUser);
    if (d) {
      setSelectedDepartment(d);
    }
  }, [currentUser]);

  // Archive states
  const [archiveYears, setArchiveYears] = useState<any[]>([]);
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<string>('all');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<'all' | 'Staj1' | 'Staj2'>('all');
  const [archiveResultFilter, setArchiveResultFilter] = useState<'all' | 'Successful' | 'PartiallySuccessful' | 'Unsuccessful'>('all');
  const [archiveSearch, setArchiveSearch] = useState<string>('');
  const [archiveList, setArchiveList] = useState<any[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedArchiveApp, setSelectedArchiveApp] = useState<any | null>(null);
  const [archiveDetailLoading, setArchiveDetailLoading] = useState(false);
  const [archiveModalTab, setArchiveModalTab] = useState<'details' | 'diary'>('details');
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [allApplications, setAllApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('Submitted');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);

  // Review states
  const [reviewReason, setReviewReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // Final Evaluation states
  const [finalDecision, setFinalDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [finalRejectReason, setFinalRejectReason] = useState<string>('');
  const [academicResult, setAcademicResult] = useState<'Successful' | 'PartiallySuccessful' | 'Unsuccessful'>('Successful');
  const [acceptedDays, setAcceptedDays] = useState<number>(20);

  // Period & Announcement Management states
  const [periods, setPeriods] = useState<InternshipPeriod[]>([]);
  const [selectedPeriodType, setSelectedPeriodType] = useState<'Staj1' | 'Staj2'>('Staj1');
  const [periodForm, setPeriodForm] = useState({
    id: 0,
    title: '',
    applicationStartDate: '',
    applicationEndDate: '',
    earliestStartDate: '',
    latestEndDate: '',
    documentDeadlineDate: '',
    defaultWorkDays: 20,
    isSaturdayAllowed: true,
    publishAnnouncement: true,
    customAnnouncementTitle: '',
    customAnnouncementNote: ''
  });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodSuccessMessage, setPeriodSuccessMessage] = useState<string | null>(null);

  // Announcements list for management
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'general'
  });
  const [dispatchingReminders, setDispatchingReminders] = useState(false);
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

  // Postings states
  const [postings, setPostings] = useState<CompanyJobPosting[]>([]);
  const [postingStats, setPostingStats] = useState<JobPostingStats | null>(null);
  const [showPostingModal, setShowPostingModal] = useState(false);
  const [postingForm, setPostingForm] = useState({
    companyName: '',
    department: 'Bilgisayar Mühendisliği',
    title: '',
    sector: 'Yazılım / Bilişim',
    city: 'Konya',
    quota: 3,
    requirements: '',
    contactEmail: '',
    applicationDeadline: ''
  });

  // Holidays states
  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([]);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [holidayLoading, setHolidayLoading] = useState(false);

  // Periods Management states
  const [allPeriodsList, setAllPeriodsList] = useState<InternshipPeriod[]>([]);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    title: '',
    type: 1,
    defaultWorkDays: 20,
    applicationStartDate: '',
    applicationEndDate: '',
    earliestStartDate: '',
    latestEndDate: '',
    documentDeadlineDate: '',
    isSaturdayAllowed: true,
    publishAnnouncement: true
  });

  // Extension & Cancel notes map
  const [extNotes, setExtNotes] = useState<{ [id: number]: string }>({});
  const [cancelNotes, setCancelNotes] = useState<{ [id: number]: string }>({});

  const loadQueue = async () => {
    try {
      setLoading(true);
      const targetDept = selectedDepartment;
      const deptParam = targetDept && targetDept !== 'Tümü' ? `&department=${encodeURIComponent(targetDept)}` : '';
      const [filteredRes, allRes]: any = await Promise.all([
        apiRequest(`/applications/commission-queue${statusFilter ? `?statusFilter=${statusFilter}` : '?statusFilter='}${deptParam}`),
        apiRequest(`/applications/commission-queue${deptParam ? `?${deptParam.substring(1)}` : ''}`)
      ]);
      if (Array.isArray(filteredRes)) {
        setApplications(filteredRes);
      }
      if (Array.isArray(allRes)) {
        setAllApplications(allRes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      setHolidayLoading(true);
      const res: any = await apiRequest('/holidays');
      if (Array.isArray(res)) setHolidays(res);
    } catch (err) {
      console.error('Tatiller yüklenemedi:', err);
    } finally {
      setHolidayLoading(false);
    }
  };

  const loadPostings = async () => {
    try {
      const targetDept = selectedDepartment;
      const [postingsRes, statsRes]: any = await Promise.all([
        apiRequest(`/postings${targetDept && targetDept !== 'Tümü' ? `?department=${encodeURIComponent(targetDept)}` : ''}`),
        apiRequest(`/postings/statistics${targetDept && targetDept !== 'Tümü' ? `?department=${encodeURIComponent(targetDept)}` : ''}`)
      ]);
      if (Array.isArray(postingsRes)) setPostings(postingsRes);
      if (statsRes) setPostingStats(statsRes);
    } catch (err) {
      console.error('İlanlar yüklenemedi:', err);
    }
  };

  const loadAllPeriods = async () => {
    try {
      const res: any = await apiRequest('/periods');
      if (Array.isArray(res)) setAllPeriodsList(res);
    } catch (err) {
      console.error('Tüm dönemler yüklenemedi:', err);
    }
  };

  const loadPeriodsAndAnnouncements = async () => {
    try {
      const [periodsRes, annRes]: any = await Promise.all([
        apiRequest('/periods/active'),
        apiRequest('/announcements')
      ]);
      if (periodsRes && Array.isArray(periodsRes.periods)) {
        setPeriods(periodsRes.periods);
      }
      if (Array.isArray(annRes)) {
        setAnnouncements(annRes);
      }
      await Promise.all([loadHolidays(), loadPostings(), loadAllPeriods()]);
    } catch (err) {
      console.error('Takvim ve duyurular yüklenirken hata:', err);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [statusFilter, selectedDepartment]);

  useEffect(() => {
    loadPeriodsAndAnnouncements();
  }, []);

  useEffect(() => {
    if (activeTab === 'postings') {
      loadPostings();
    } else if (activeTab === 'cancellations' || activeTab === 'extensions') {
      loadQueue();
    } else if (activeTab === 'holidays') {
      loadHolidays();
    }
  }, [activeTab]);

  const loadArchiveYears = async () => {
    try {
      const res: any = await apiRequest('/applications/archive-years');
      if (Array.isArray(res)) {
        setArchiveYears(res);
      }
    } catch (err) {
      console.error('Arşiv yılları yüklenemedi:', err);
    }
  };

  const loadArchiveList = async () => {
    try {
      setArchiveLoading(true);
      const params = new URLSearchParams();
      if (selectedArchiveYear && selectedArchiveYear !== 'all') params.append('year', selectedArchiveYear);
      if (archiveTypeFilter && archiveTypeFilter !== 'all') params.append('type', archiveTypeFilter);
      if (archiveResultFilter && archiveResultFilter !== 'all') params.append('result', archiveResultFilter);
      if (archiveSearch.trim()) params.append('search', archiveSearch.trim());

      const res: any = await apiRequest(`/applications/archive?${params.toString()}`);
      if (Array.isArray(res)) {
        setArchiveList(res);
      }
    } catch (err) {
      console.error('Arşiv listesi yüklenemedi:', err);
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleOpenArchiveDetails = async (id: number) => {
    try {
      setArchiveDetailLoading(true);
      setArchiveModalTab('details');
      const res: any = await apiRequest(`/applications/archive/${id}/details`);
      setSelectedArchiveApp(res);
    } catch (err: any) {
      alert(err.message || 'Arşiv detayları yüklenemedi.');
    } finally {
      setArchiveDetailLoading(false);
    }
  };

  const handleDownloadArchiveCsv = () => {
    const params = new URLSearchParams();
    if (selectedArchiveYear && selectedArchiveYear !== 'all') params.append('year', selectedArchiveYear);
    if (archiveTypeFilter && archiveTypeFilter !== 'all') params.append('type', archiveTypeFilter);
    if (archiveResultFilter && archiveResultFilter !== 'all') params.append('result', archiveResultFilter);
    if (archiveSearch.trim()) params.append('search', archiveSearch.trim());
    window.open(`/api/applications/archive/export-csv?${params.toString()}`, '_blank');
  };

  useEffect(() => {
    loadArchiveYears();
  }, []);

  useEffect(() => {
    if (activeTab === 'archive') {
      loadArchiveList();
    }
  }, [activeTab, selectedArchiveYear, archiveTypeFilter, archiveResultFilter, archiveSearch]);


  // Populate period form when periods or selectedPeriodType changes
  useEffect(() => {
    const p = periods.find(item => item.type === selectedPeriodType) || periods[0];
    if (p) {
      setPeriodForm({
        id: p.id,
        title: p.title || (selectedPeriodType === 'Staj1' ? 'Staj 1 Dönemi' : 'Staj 2 Dönemi'),
        applicationStartDate: p.applicationStartDate ? p.applicationStartDate.split('T')[0] : '2026-10-01',
        applicationEndDate: p.applicationEndDate ? p.applicationEndDate.split('T')[0] : '2026-12-31',
        earliestStartDate: p.earliestStartDate ? p.earliestStartDate.split('T')[0] : '2026-11-01',
        latestEndDate: p.latestEndDate ? p.latestEndDate.split('T')[0] : '2027-03-31',
        documentDeadlineDate: p.documentDeadlineDate ? p.documentDeadlineDate.split('T')[0] : '2027-04-15',
        defaultWorkDays: p.defaultWorkDays || 20,
        isSaturdayAllowed: p.isSaturdayAllowed ?? true,
        publishAnnouncement: true,
        customAnnouncementTitle: '',
        customAnnouncementNote: ''
      });
    }
  }, [periods, selectedPeriodType]);

  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodForm.id) return;

    setSavingPeriod(true);
    setPeriodSuccessMessage(null);
    try {
      const res: any = await apiRequest(`/periods/${periodForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: periodForm.title,
          applicationStartDate: periodForm.applicationStartDate,
          applicationEndDate: periodForm.applicationEndDate,
          earliestStartDate: periodForm.earliestStartDate,
          latestEndDate: periodForm.latestEndDate,
          documentDeadlineDate: periodForm.documentDeadlineDate,
          defaultWorkDays: periodForm.defaultWorkDays,
          isSaturdayAllowed: periodForm.isSaturdayAllowed,
          publishAnnouncement: periodForm.publishAnnouncement,
          customAnnouncementTitle: periodForm.customAnnouncementTitle || null,
          customAnnouncementNote: periodForm.customAnnouncementNote || null
        })
      });

      setPeriodSuccessMessage(res.message || 'Staj takvimi güncellendi ve duyuru yayınlandı.');
      await loadPeriodsAndAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Staj takvimi güncellenirken hata oluştu.');
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleCreateCustomAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      alert('Lütfen duyuru başlığı ve içeriğini giriniz.');
      return;
    }
    setCreatingAnnouncement(true);
    try {
      await apiRequest('/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title: newAnnouncement.title,
          summary: newAnnouncement.summary || newAnnouncement.content.substring(0, 140) + '...',
          content: newAnnouncement.content,
          category: newAnnouncement.category,
          author: 'Staj Komisyonu Başkanlığı'
        })
      });
      setNewAnnouncement({ title: '', summary: '', content: '', category: 'general' });
      await loadPeriodsAndAnnouncements();
      alert('Yeni duyuru başarıyla yayınlandı.');
    } catch (err: any) {
      alert(err.message || 'Duyuru yayınlanamadı.');
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await apiRequest(`/announcements/${id}`, { method: 'DELETE' });
      await loadPeriodsAndAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Duyuru silinemedi.');
    }
  };

  const handleReviewAction = async (action: 'Approve' | 'RequestRevision' | 'Reject') => {
    if (!selectedApp) return;
    if ((action === 'RequestRevision' || action === 'Reject') && !reviewReason.trim()) {
      alert('Lütfen komisyon gerekçesini yazınız.');
      return;
    }

    setActionLoading(true);
    try {
      await apiRequest(`/applications/${selectedApp.id}/commission-review`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          reason: reviewReason
        })
      });

      alert(action === 'Approve' ? 'Başvuru onaylandı ve KPTO sigorta kuyruğuna iletildi!' : 'İşlem kaydedildi.');
      setSelectedApp(null);
      setReviewReason('');
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchDeadlineReminders = async () => {
    if (!confirm('Staj başvuru veya evrak teslim süresi 7 gün ve daha az kalan tüm öğrencilere sistem içi bildirim ve resmî e-posta hatırlatması gönderilsin mi?')) {
      return;
    }

    setDispatchingReminders(true);
    try {
      const data: any = await apiRequest('/notifications/dispatch-deadline-reminders?thresholdDays=7', { method: 'POST' });
      alert(data.message || 'Hatırlatma işlemi tamamlandı.');
    } catch (err: any) {
      alert(err.message || 'Hatırlatıcı çalıştırılırken bir hata oluştu.');
    } finally {
      setDispatchingReminders(false);
    }
  };

  const handleFinalEvaluation = async () => {
    if (!selectedApp) return;
    if (finalDecision === 'Rejected' && !finalRejectReason.trim()) {
      alert('Komisyon kararı Reddedildi ise gerekçe zorunludur.');
      return;
    }

    setActionLoading(true);
    try {
      await apiRequest(`/applications/${selectedApp.id}/final-evaluation`, {
        method: 'POST',
        body: JSON.stringify({
          commissionDecision: finalDecision,
          rejectReason: finalRejectReason,
          academicResult: academicResult,
          acceptedDaysCount: acceptedDays,
          academicNotes: 'Komisyon tarafından nihai değerlendirme yapıldı.'
        })
      });

      alert('Nihai değerlendirme başarıyla kaydedildi!');
      setSelectedApp(null);
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Değerlendirme kaydedilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtensionDecision = async (appId: number, isApproved: boolean) => {
    const notes = extNotes[appId] || '';
    setActionLoading(true);
    try {
      const res: any = await apiRequest(`/applications/${appId}/extension-decision`, {
        method: 'POST',
        body: JSON.stringify({ approved: isApproved, isApproved, notes })
      });
      alert(res.message || (isApproved ? 'Uzatma talebi onaylandı ve KPTO sigorta masasına ek SGK günü bildirildi.' : 'Uzatma talebi reddedildi.'));
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Uzatma kararı kaydedilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDecision = async (appId: number, isApproved: boolean) => {
    const notes = cancelNotes[appId] || '';
    setActionLoading(true);
    try {
      const res: any = await apiRequest(`/applications/${appId}/cancel-decision`, {
        method: 'POST',
        body: JSON.stringify({ approved: isApproved, isApproved, notes })
      });
      alert(res.message || (isApproved ? 'Staj iptali onaylandı, staj iptal edildi ve KPTO sigorta çıkışına iletildi.' : 'İptal talebi reddedildi.'));
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'İptal kararı kaydedilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayDesc.trim()) {
      alert('Lütfen tatil tarihi ve açıklamasını giriniz.');
      return;
    }
    setHolidayLoading(true);
    try {
      const d = new Date(holidayDate);
      await apiRequest('/holidays', {
        method: 'POST',
        body: JSON.stringify({
          date: holidayDate,
          description: holidayDesc.trim(),
          year: d.getFullYear()
        })
      });
      alert('Ekstra tatil başarıyla eklendi! Dinamik takvim motoru staj günlerini güncelledi.');
      setHolidayDate('');
      setHolidayDesc('');
      await loadHolidays();
    } catch (err: any) {
      alert(err.message || 'Tatil eklenemedi.');
    } finally {
      setHolidayLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('Bu tatil gününü silmek istediğinize emin misiniz?')) return;
    try {
      await apiRequest(`/holidays/${id}`, { method: 'DELETE' });
      await loadHolidays();
    } catch (err: any) {
      alert(err.message || 'Tatil silinemedi.');
    }
  };

  const handleCreatePosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postingForm.companyName.trim() || !postingForm.title.trim()) {
      alert('Lütfen firma adı ve staj başlığını giriniz.');
      return;
    }
    try {
      await apiRequest('/postings', {
        method: 'POST',
        body: JSON.stringify({
          companyName: postingForm.companyName.trim(),
          department: postingForm.department,
          title: postingForm.title.trim(),
          sector: postingForm.sector,
          city: postingForm.city,
          quota: Number(postingForm.quota) || 1,
          requirements: postingForm.requirements.trim(),
          contactEmail: postingForm.contactEmail.trim(),
          applicationDeadline: postingForm.applicationDeadline || new Date(Date.now() + 30 * 86400000).toISOString()
        })
      });
      alert('Yeni firma stajyer ilanı başarıyla yayınlandı!');
      setShowPostingModal(false);
      setPostingForm({
        companyName: '',
        department: selectedDepartment !== 'Tümü' ? selectedDepartment : 'Bilgisayar Mühendisliği',
        title: '',
        sector: 'Yazılım / Bilişim',
        city: 'Konya',
        quota: 3,
        requirements: '',
        contactEmail: '',
        applicationDeadline: ''
      });
      await loadPostings();
    } catch (err: any) {
      alert(err.message || 'İlan kaydedilemedi.');
    }
  };

  const handleDeletePosting = async (id: number) => {
    if (!confirm('Bu ilanı kaldırmak istediğinize emin misiniz?')) return;
    try {
      await apiRequest(`/postings/${id}`, { method: 'DELETE' });
      await loadPostings();
    } catch (err: any) {
      alert(err.message || 'İlan silinemedi.');
    }
  };

  const handleCreateNewPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodForm.title.trim()) {
      alert('Lütfen dönem başlığını giriniz.');
      return;
    }
    try {
      const res: any = await apiRequest('/periods', {
        method: 'POST',
        body: JSON.stringify({
          title: newPeriodForm.title.trim(),
          type: Number(newPeriodForm.type),
          defaultWorkDays: Number(newPeriodForm.defaultWorkDays) || 20,
          applicationStartDate: newPeriodForm.applicationStartDate,
          applicationEndDate: newPeriodForm.applicationEndDate,
          earliestStartDate: newPeriodForm.earliestStartDate,
          latestEndDate: newPeriodForm.latestEndDate,
          documentDeadlineDate: newPeriodForm.documentDeadlineDate,
          isSaturdayAllowed: newPeriodForm.isSaturdayAllowed,
          publishAnnouncement: newPeriodForm.publishAnnouncement
        })
      });
      alert(res.message || 'Yeni staj dönemi açıldı ve öğrencilere toplu duyuru iletildi!');
      setShowNewPeriodModal(false);
      await Promise.all([loadPeriodsAndAnnouncements(), loadAllPeriods()]);
    } catch (err: any) {
      alert(err.message || 'Dönem oluşturulamadı.');
    }
  };

  const handleTogglePeriod = async (id: number) => {
    try {
      const res: any = await apiRequest(`/periods/${id}/toggle-active`, { method: 'PUT' });
      alert(res.message || 'Dönem durumu güncellendi.');
      await Promise.all([loadPeriodsAndAnnouncements(), loadAllPeriods()]);
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    }
  };

  const handleDeletePeriod = async (id: number) => {
    if (!confirm('Bu staj dönemini silmek veya arşivlemek istediğinize emin misiniz?')) return;
    try {
      const res: any = await apiRequest(`/periods/${id}`, { method: 'DELETE' });
      alert(res.message || 'Dönem silindi/arşivlendi.');
      await Promise.all([loadPeriodsAndAnnouncements(), loadAllPeriods()]);
    } catch (err: any) {
      alert(err.message || 'İşlem başarısız.');
    }
  };

  const pendingCount = allApplications.filter(a => a.status === 'Submitted').length;
  const approvedCount = allApplications.filter(a => a.status === 'ApprovedByCommission' || a.status === 'InsuranceStarted' || a.status === 'InProgress').length;
  const completedCount = allApplications.filter(a => a.status === 'Completed' || a.status === 'AdvisorApproved').length;
  const pendingExtensionsCount = allApplications.filter(a => a.hasExtensionRequest && !a.isExtensionApprovedByCommission).length;
  const pendingCancellationsCount = allApplications.filter(a => a.hasCancelRequest && !a.isCancelApprovedByCommission).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 font-['Montserrat',sans-serif]">
      {/* Header & Top Navigation Switcher */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-[#1c458b]">
              <Shield className="w-6 h-6" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#002b49] font-serif">
                Staj Komisyonu & Bölüm Başkanlığı Yönetim Masası
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Öğrenci başvuruları, staj uzatma/iptal talepleri, partner firma ilanları, dinamik idari tatiller ve dönem yönetimini bu panelden gerçekleştirebilirsiniz.
            </p>
          </div>

          {/* Department Segregation & Switcher */}
          <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 py-1.5 px-3 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-[#1c458b] flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>🏛️ Yetkili Bölüm:</span>
            </span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="py-1 px-2.5 rounded-lg border border-blue-300 text-xs font-bold bg-white text-[#002b49] shadow-xs cursor-pointer focus:ring-2 focus:ring-[#1c458b] outline-none"
              title="Farklı Bölüm Komisyonları Arasında Geçiş Yap"
            >
              <option value="Bilgisayar Mühendisliği">💻 Bilgisayar Mühendisliği (Dr. Onur İNAN)</option>
              <option value="Makine Mühendisliği">⚙️ Makine Mühendisliği (Doç. Dr. Serkan ÇELİK)</option>
              <option value="Elektrik-Elektronik Mühendisliği">⚡ Elektrik-Elektronik Mühendisliği (Prof. Dr. Mehmet AKTAŞ)</option>
              <option value="Tümü">🌐 Tüm Bölümler (Fakülte Koordinatörlüğü / Bölüm Bşk.)</option>
            </select>
          </div>
        </div>

        {/* Main Section Switcher (Scrollable on small screens) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'applications'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Başvurular</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-400 text-slate-950 font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('extensions')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'extensions'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Uzatma Talepleri</span>
              {pendingExtensionsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-orange-500 text-white font-black animate-pulse">
                  {pendingExtensionsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('cancellations'); loadQueue(); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cancellations'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>İptal Talepleri (Form 7)</span>
              {pendingCancellationsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-600 text-white font-black animate-pulse">
                  {pendingCancellationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('postings'); loadPostings(); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'postings'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Firma İlanları & Sektörler</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('holidays'); loadHolidays(); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'holidays'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Ek Resmî/İdari Tatiller</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('calendar'); loadAllPeriods(); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Dönem & Duyuru</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-[#1c458b] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Yıllık Arşiv</span>
            </button>
          </div>

          <button
            type="button"
            disabled={dispatchingReminders}
            onClick={handleDispatchDeadlineReminders}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-50"
            title="Sistem Otomatik Hatırlatıcısı: Staj bitimine 1 hafta kalanlara defter uyarısı gönderir ve süresi dolanların defterini kilitler"
          >
            <Clock className="w-4 h-4" />
            <span>{dispatchingReminders ? 'Taranıyor...' : '⚡ Otomatik Hatırlatıcıyı Çalıştır'}</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1c458b] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Toplam Başvuru</div>
            <div className="text-xl font-black text-slate-900">{allApplications.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-700 uppercase">Onay Bekleyen</div>
            <div className="text-xl font-black text-slate-900">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase">Onaylı / Aktif Staj</div>
            <div className="text-xl font-black text-slate-900">{approvedCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-purple-700 uppercase">Değerlendirme / Biten</div>
            <div className="text-xl font-black text-slate-900">{completedCount}</div>
          </div>
        </div>
      </div>

      {/* TAB 1: APPLICATIONS REVIEW */}
      {activeTab === 'applications' && (() => {
        const filteredApps = applications.filter(app => {
          const matchesSearch = 
            !searchTerm ||
            (app.studentName && app.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (app.studentNumber && app.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (app.workplaceName && app.workplaceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (app.subject && app.subject.toLowerCase().includes(searchTerm.toLowerCase()));

          const matchesType = 
            selectedPeriodFilter === 'All' || 
            app.type === selectedPeriodFilter;

          return matchesSearch && matchesType;
        });

        return (
          <>
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Öğrenci adı, no veya firma ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1c458b] focus:bg-white transition"
                />
              </div>

              {/* Staj Türü Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Tür:
                </span>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  {(['All', 'Staj1', 'Staj2'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedPeriodFilter(t)}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        selectedPeriodFilter === t ? 'bg-white text-[#1c458b] shadow' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t === 'All' ? 'Tümü' : t === 'Staj1' ? 'Staj 1' : 'Staj 2'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700">Durum Filtresi:</span>
              <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setStatusFilter('Submitted')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'Submitted' ? 'bg-white text-[#1c458b] shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  İnceleme Bekleyenler
                </button>
                <button
                  onClick={() => setStatusFilter('ApprovedByCommission')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'ApprovedByCommission' ? 'bg-white text-[#1c458b] shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Komisyon Onaylılar
                </button>
                <button
                  onClick={() => setStatusFilter('AdvisorApproved')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'AdvisorApproved' ? 'bg-white text-[#1c458b] shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nihai Karar Bekleyenler
                </button>
                <button
                  onClick={() => setStatusFilter('RevisionRequired')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === 'RevisionRequired' ? 'bg-white text-[#1c458b] shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Revize İstenenler
                </button>
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    statusFilter === '' ? 'bg-white text-[#1c458b] shadow' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tüm Başvurular
                </button>
              </div>
            </div>

            {/* Applications Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Öğrenci No / Adı</th>
                      <th className="py-3.5 px-4">Staj Türü</th>
                      <th className="py-3.5 px-4">Firma & Staj Konusu</th>
                      <th className="py-3.5 px-4">Tarih Aralığı</th>
                      <th className="py-3.5 px-4">İş Günü</th>
                      <th className="py-3.5 px-4">Durum</th>
                      <th className="py-3.5 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Filtreleme kriterlerine uygun başvuru kaydı bulunmamaktadır.
                        </td>
                      </tr>
                    ) : (
                      filteredApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{app.studentName || 'Öğrenci'}</div>
                          <div className="text-[11px] text-slate-500">{app.studentNumber || '203301001'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1c458b] bg-blue-50 px-2.5 py-1 rounded-lg">
                            {app.type === 'Staj1' ? 'Staj 1' : 'Staj 2'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{app.workplaceName || 'Firma'} ({app.workplaceCity})</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{app.subject}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {new Date(app.startDate).toLocaleDateString('tr-TR')} - {new Date(app.currentEndDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {app.requiredWorkDays} Gün
                          {app.includesSaturday && <span className="block text-[10px] text-slate-500">+Cumartesi</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            app.status === 'Submitted' ? 'bg-amber-100 text-amber-800' :
                            app.status === 'ApprovedByCommission' ? 'bg-blue-100 text-blue-800' :
                            app.status === 'InsuranceStarted' ? 'bg-emerald-100 text-emerald-800' :
                            app.status === 'RevisionRequired' ? 'bg-orange-100 text-orange-800' :
                            app.status === 'Completed' ? 'bg-purple-100 text-purple-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {app.status === 'Submitted' ? 'İnceleme Bekliyor' :
                             app.status === 'ApprovedByCommission' ? 'Komisyon Onayladı' :
                             app.status === 'InsuranceStarted' ? 'Sigortası Başladı' :
                             app.status === 'RevisionRequired' ? 'Düzeltme İstendi' :
                             app.status === 'AdvisorApproved' ? 'İş Yeri Onayladı' :
                             app.status === 'Completed' ? 'Tamamlandı' : app.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setAcceptedDays(app.requiredWorkDays);
                            }}
                            className="px-3 py-1.5 bg-[#1c458b] text-white hover:bg-blue-800 font-bold rounded-lg transition shadow-sm flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            İncele
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        );
      })()}

      {/* TAB: STAJ UZATMA TALEPLERİ */}
      {activeTab === 'extensions' && (() => {
        const extApps = allApplications.filter(a => a.hasExtensionRequest);
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#002b49] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1c458b]" />
                  <span>Staj Süresi Uzatma Talepleri ({extApps.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Öğrencilerin staj sırasında talep ettiği ek iş günü uzatmaları. Komisyon onayladığında KPTO sigorta masasına otomatik SGK ek prim bildirimi gider.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200">
                {extApps.filter(a => !a.isExtensionApprovedByCommission).length} Bekleyen Onay
              </span>
            </div>

            {extApps.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold text-slate-600">Henüz staj uzatma talebi bulunmuyor.</p>
                <p className="text-xs mt-1">Öğrenciler stajları devam ederken ek iş günü uzatma talebinde bulunabilirler.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extApps.map((app) => (
                  <div key={app.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{app.studentName}</div>
                        <div className="text-xs text-slate-500">{app.studentDepartment || 'Bilgisayar Mühendisliği'} • {app.studentNumber}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        app.isExtensionApprovedByCommission 
                          ? (app.isExtensionSgkProcessedByKPTO ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')
                          : 'bg-orange-100 text-orange-800 animate-pulse'
                      }`}>
                        {app.isExtensionApprovedByCommission 
                          ? (app.isExtensionSgkProcessedByKPTO ? '✅ SGK Tescil Edildi' : '⏱️ Komisyon Onayladı (KPTO Masasında)')
                          : '⏳ Komisyon Onayı Bekliyor'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <div>
                        <span className="text-slate-400 block">Firma:</span>
                        <span className="font-semibold text-slate-800">{app.workplaceName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Mevcut Bitiş:</span>
                        <span className="font-semibold text-slate-800">{new Date(app.currentEndDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Talep Edilen Telafi:</span>
                        <span className="font-bold text-indigo-700 text-sm">+{app.extensionExtraDays || 1} İş Günü</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Talep Tarihi:</span>
                        <span className="font-semibold text-slate-800">{app.extensionRequestedAt ? new Date(app.extensionRequestedAt).toLocaleDateString('tr-TR') : 'Bugün'}</span>
                      </div>
                      {app.extensionMissedDates && (
                        <div className="col-span-2 bg-indigo-50/70 p-2 rounded-lg border border-indigo-200/60 flex items-center justify-between">
                          <span className="text-slate-600 font-medium">📅 Gelemeyeceği Tarihler:</span>
                          <strong className="text-indigo-900 font-bold">{app.extensionMissedDates}</strong>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">Öğrenci Mazeret ve Uzatma Gerekçesi:</span>
                      <p className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60 italic">
                        "{app.extensionReason || 'Belirtilmedi'}"
                      </p>
                    </div>

                    {!app.isExtensionApprovedByCommission && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <input
                          type="text"
                          placeholder="Komisyon karar notu (opsiyonel)..."
                          value={extNotes[app.id] || ''}
                          onChange={(e) => setExtNotes({ ...extNotes, [app.id]: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleExtensionDecision(app.id, true)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Uzatmayı Onayla & KPTO'ya Bildir</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleExtensionDecision(app.id, false)}
                            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: STAJ İPTAL TALEPLERİ (FORM 7) */}
      {activeTab === 'cancellations' && (() => {
        const cancelApps = allApplications.filter(a => a.hasCancelRequest);
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#002b49] flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-600" />
                  <span>Staj İptal Talepleri (Resmî Form 7) ({cancelApps.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Mazeret veya sağlık gerekçesiyle stajını iptal etmek isteyen öğrencilerin imzalı FORM 7 dilekçeleri. Komisyon onayladığında KPTO'ya SGK çıkışı bildirilir.
                </p>
              </div>
              <a
                href="/api/documents/blank/form7"
                download="FORM7_Staj_Iptal_Formu.docx"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#1c458b] text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Boş Form 7 Şablonu İndir</span>
              </a>
            </div>

            {cancelApps.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                <Ban className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold text-slate-600">Henüz staj iptal talebi bulunmuyor.</p>
                <p className="text-xs mt-1">Öğrenciler Form 7 iptal dilekçesini sisteme yüklediğinde burada listelenir.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cancelApps.map((app) => (
                  <div key={app.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{app.studentName}</div>
                        <div className="text-xs text-slate-500">{app.studentDepartment || 'Bilgisayar Mühendisliği'} • {app.studentNumber}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        app.isCancelApprovedByCommission ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {app.isCancelApprovedByCommission ? '🚫 Staj İptal Edildi (SGK Çıkışı Bildirildi)' : '⏳ İptal Onayı Bekliyor'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <div>
                        <span className="text-slate-400 block">Staj Yeri:</span>
                        <span className="font-semibold text-slate-800">{app.workplaceName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Staj Türü:</span>
                        <span className="font-bold text-[#1c458b]">{app.type === 'Staj1' ? 'Staj 1' : 'Staj 2'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Yüklenen İmzalı Form 7:</span>
                        {app.cancelFormDocumentPath ? (
                          <a
                            href={`/api/documents/download?filePath=${encodeURIComponent(app.cancelFormDocumentPath)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-[#1c458b] hover:underline flex items-center gap-1.5 mt-0.5 text-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                            <span>Öğrencinin Yüklediği FORM 7 Dilekçesini İndir / İncele</span>
                          </a>
                        ) : (
                          <a
                            href="/api/documents/blank/form7"
                            download="FORM7_Staj_Iptal_Formu.docx"
                            className="font-bold text-amber-700 hover:underline flex items-center gap-1.5 mt-0.5 text-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span>Resmî FORM 7 Şablonu İncele</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">Öğrenci Mazeret / İptal Gerekçesi:</span>
                      <p className="text-xs text-slate-600 bg-rose-50/50 p-2.5 rounded-lg border border-rose-200/60 italic">
                        "{app.cancelReason || 'Belirtilmedi'}"
                      </p>
                    </div>

                    {!app.isCancelApprovedByCommission && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <input
                          type="text"
                          placeholder="Komisyon iptal karar notu..."
                          value={cancelNotes[app.id] || ''}
                          onChange={(e) => setCancelNotes({ ...cancelNotes, [app.id]: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleCancelDecision(app.id, true)}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>İptali Onayla & SGK Çıkışına İlet</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleCancelDecision(app.id, false)}
                            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: FİRMA STAJYER İLANLARI & SEKTÖR İSTATİSTİKLERİ */}
      {activeTab === 'postings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#002b49] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1c458b]" />
                <span>Partner Firma Stajyer İlanları & Sektör Analitiği</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Fakülte ve bölümler ile işbirliği protokolü bulunan onaylı sanayi kuruluşlarının stajyer kontenjanları ve sektör dağılım grafiği.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPostingModal(true)}
              className="px-4 py-2 bg-[#1c458b] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Firma İlanı Ekle</span>
            </button>
          </div>

          {/* Sektör İstatistikleri Kartları */}
          {(() => {
            const totalP = postingStats?.totalPostings ?? postings.length;
            const activeP = postingStats?.activePostings ?? postings.filter(p => p.isActive !== false).length;
            const quotaP = postingStats?.totalQuota ?? postings.reduce((sum, p) => sum + (p.quota || 0), 0);
            const sectorItems = (postingStats?.bySector || (postingStats as any)?.sectorBreakdown || (postingStats as any)?.SectorBreakdown || []);
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Toplam İlan Sayısı</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{totalP}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{activeP} Aktif Başvuruya Açık</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm">
                  <div className="text-[11px] font-bold text-[#1c458b] uppercase">Toplam Kontenjan</div>
                  <div className="text-2xl font-black text-[#1c458b] mt-1">{quotaP} Öğrenci</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Firma Protokolleri Kapsamında</div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm col-span-2">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase mb-2">Sektörel Dağılım & Kontenjan</div>
                  <div className="flex flex-wrap gap-2">
                    {sectorItems.length > 0 ? (
                      sectorItems.map((s: any, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                          <span>{s.sector || s.Sector}:</span>
                          <strong className="text-emerald-700">{s.quota ?? s.Quota ?? s.count ?? 1} Kişi</strong>
                          <span className="text-[10px] text-emerald-600 font-normal">({s.count ?? s.Count ?? 1} İlan)</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sektörel dağılım verileri yükleniyor...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* İlanlar Listesi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {postings.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1c458b] border border-blue-200">
                      {p.department}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePosting(p.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="İlanı Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{p.title}</h3>
                  <div className="text-xs text-[#1c458b] font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{p.companyName}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{p.city}</span>
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                      Kontenjan: {p.quota} Kişi
                    </span>
                    <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-medium">{p.sector}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {p.requirements}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>İletişim: {p.contactEmail}</span>
                  <span className="font-semibold text-slate-700">Son: {new Date(p.applicationDeadline).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Yeni İlan Ekleme Modalı */}
          {showPostingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-[#002b49] text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#1c458b]" />
                    <span>Yeni Firma Stajyer İlanı Yayınla</span>
                  </h3>
                  <button type="button" onClick={() => setShowPostingModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreatePosting} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kurum / Firma Adı:</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: ASELSAN, HAVELSAN, AKINSOFT..."
                      value={postingForm.companyName}
                      onChange={(e) => setPostingForm({ ...postingForm, companyName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">İlgili Bölüm:</label>
                      <select
                        value={postingForm.department}
                        onChange={(e) => setPostingForm({ ...postingForm, department: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                      >
                        <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
                        <option value="Makine Mühendisliği">Makine Mühendisliği</option>
                        <option value="Elektrik-Elektronik Mühendisliği">Elektrik-Elektronik Mühendisliği</option>
                        <option value="Genel">Tüm Bölümler</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sektör:</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Savunma Sanayi, Yazılım..."
                        value={postingForm.sector}
                        onChange={(e) => setPostingForm({ ...postingForm, sector: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Staj Pozisyon Başlığı:</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Yapay Zeka & Görüntü İşleme Stajyeri"
                      value={postingForm.title}
                      onChange={(e) => setPostingForm({ ...postingForm, title: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Şehir:</label>
                      <input
                        type="text"
                        value={postingForm.city}
                        onChange={(e) => setPostingForm({ ...postingForm, city: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Kontenjan (Kişi):</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={postingForm.quota}
                        onChange={(e) => setPostingForm({ ...postingForm, quota: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Son Başvuru:</label>
                      <input
                        type="date"
                        value={postingForm.applicationDeadline}
                        onChange={(e) => setPostingForm({ ...postingForm, applicationDeadline: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Aranan Şartlar & Açıklama:</label>
                    <textarea
                      rows={3}
                      placeholder="Öğrencinin sahip olması gereken teknik beceriler veya sınıf düzeyi..."
                      value={postingForm.requirements}
                      onChange={(e) => setPostingForm({ ...postingForm, requirements: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">İletişim / Başvuru E-posta:</label>
                    <input
                      type="email"
                      required
                      placeholder="staj@kurum.com.tr"
                      value={postingForm.contactEmail}
                      onChange={(e) => setPostingForm({ ...postingForm, contactEmail: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPostingModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm"
                    >
                      İlanı Yayınla
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: RESMÎ & İDARİ TATİL YÖNETİMİ */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#002b49] flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                <span>Dinamik Ekstra Resmî & İdari Tatil Yönetimi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Rektörlük, valilik veya bakanlık tarafından sonradan ilan edilen ani tatiller (kar tatili, idari izin, bayram arifesi vb.) buraya eklendiğinde sistemdeki Dinamik İş Günü Hesaplama Motoru öğrenci staj bitiş tarihlerini otomatik öteler.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form: Yeni Tatil Ekle */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <Plus className="w-4 h-4 text-[#1c458b]" />
                <span>Yeni Tatil Günü Ekle</span>
              </h3>
              <form onSubmit={handleCreateHoliday} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tatil Tarihi:</label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Açıklama / Gerekçe:</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Yoğun Kar Nedeniyle İdari Tatil"
                    value={holidayDesc}
                    onChange={(e) => setHolidayDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={holidayLoading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sun className="w-4 h-4" />
                  <span>{holidayLoading ? 'Kaydediliyor...' : 'Tatili Kaydet & Takvimi Güncelle'}</span>
                </button>
              </form>
            </div>

            {/* Liste: Kayıtlı Tatiller */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-sm">Sistemde Kayıtlı Resmî ve İdari Tatiller ({holidays.length})</h3>
                <span className="text-[10px] text-slate-400">Pazar günleri otomatik hariç tutulur</span>
              </div>
              <div className="max-h-[480px] overflow-y-auto space-y-1.5 divide-y divide-slate-100 text-xs">
                {holidays.map((h) => (
                  <div key={h.id} className="pt-2 flex items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#1c458b] bg-blue-50 px-2 py-1 rounded">
                        {new Date(h.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'short' })}
                      </span>
                      <span className="font-semibold text-slate-800">{h.description}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Tatili Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERNSHIP CALENDAR & AUTO-ANNOUNCEMENT MANAGEMENT */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Period Dates Configuration */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#002b49] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1c458b]" />
                  <span>Staj Başvuru ve Uygulama Tarihlerini Belirle</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Öğrenciler yalnızca belirlediğiniz başvuru tarih aralığında başvuru yapabilir ve stajlarını belirlediğiniz staj tarihleri arasında gerçekleştirebilir.
                </p>
              </div>

              {/* Staj 1 / Staj 2 Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriodType('Staj1');
                    setPeriodSuccessMessage(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedPeriodType === 'Staj1'
                      ? 'bg-white text-[#1c458b] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Staj 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriodType('Staj2');
                    setPeriodSuccessMessage(null);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedPeriodType === 'Staj2'
                      ? 'bg-white text-[#1c458b] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Staj 2
                </button>
              </div>
            </div>

            {periodSuccessMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{periodSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePeriod} className="space-y-5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dönem Başlığı:</label>
                <input
                  type="text"
                  value={periodForm.title}
                  onChange={(e) => setPeriodForm({ ...periodForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-[#1c458b]"
                  required
                />
              </div>

              {/* Group 1: Application Window */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                <div className="font-extrabold text-[#1c458b] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>1. Öğrenci Staj Başvurusu Kabul Tarih Aralığı</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Başvuru Başlangıç Tarihi *</label>
                    <input
                      type="date"
                      value={periodForm.applicationStartDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, applicationStartDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Başvuru Bitiş Tarihi *</label>
                    <input
                      type="date"
                      value={periodForm.applicationEndDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, applicationEndDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-600">
                  * Öğrenciler yalnızca bu iki tarih arasında sistem üzerinden başvurularını komisyona gönderebilirler.
                </p>
              </div>

              {/* Group 2: Internship Execution Date Window */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="font-extrabold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span>2. Stajın Fiilen Yapılabileceği Tarih Aralığı</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">En Erken Staj Başlangıç Tarihi *</label>
                    <input
                      type="date"
                      value={periodForm.earliestStartDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, earliestStartDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">En Geç Staj Bitiş Tarihi *</label>
                    <input
                      type="date"
                      value={periodForm.latestEndDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, latestEndDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-600">
                  * Öğrencinin seçtiği staj başlangıç tarihi ve hesaplanan bitiş tarihi bu aralığın dışına çıkamaz.
                </p>
              </div>

              {/* Group 3: Document Deadline & Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Defter & Evrak Son Teslim Tarihi *</label>
                  <input
                    type="date"
                    value={periodForm.documentDeadlineDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, documentDeadlineDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 w-full cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={periodForm.isSaturdayAllowed}
                      onChange={(e) => setPeriodForm({ ...periodForm, isSaturdayAllowed: e.target.checked })}
                      className="w-4 h-4 text-[#1c458b] rounded"
                    />
                    <span className="font-bold text-slate-800">Cumartesi Çalışmasına İzin Ver</span>
                  </label>
                </div>
              </div>

              {/* Group 4: Auto Announcement Options */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={periodForm.publishAnnouncement}
                    onChange={(e) => setPeriodForm({ ...periodForm, publishAnnouncement: e.target.checked })}
                    className="w-4 h-4 text-[#1c458b] rounded"
                  />
                  <span className="font-extrabold text-slate-900">
                    Bu takvimi kaydettiğimde "Duyurular" sayfasında otomatik olarak yayınla
                  </span>
                </label>

                {periodForm.publishAnnouncement && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Duyuru Başlığı (Boş bırakılırsa otomatik oluşturulur):
                      </label>
                      <input
                        type="text"
                        value={periodForm.customAnnouncementTitle}
                        onChange={(e) => setPeriodForm({ ...periodForm, customAnnouncementTitle: e.target.value })}
                        placeholder={`Örn: ${periodForm.title} Staj Başvuru ve Uygulama Takvimi İlanı`}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Duyuruya Eklenecek Özel Komisyon Notu (İsteğe Bağlı):
                      </label>
                      <textarea
                        value={periodForm.customAnnouncementNote}
                        onChange={(e) => setPeriodForm({ ...periodForm, customAnnouncementNote: e.target.value })}
                        placeholder="Örn: Başvurularınızı son güne bırakmamanız ve SPAS belgelerinizi barkodlu yüklemeniz önemle rica olunur."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white h-16"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={savingPeriod}
                className="w-full py-3 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {savingPeriod
                    ? 'Kaydediliyor...'
                    : `${selectedPeriodType === 'Staj1' ? 'Staj 1' : 'Staj 2'} Takvimini Kaydet ve Duyuru Yayınla`}
                </span>
              </button>
            </form>
          </div>

          {/* Right 5 Cols: Custom Announcement Publisher & Active Announcements */}
          <div className="lg:col-span-5 space-y-6">
            {/* Custom Announcement Form */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-sm font-extrabold text-[#002b49] flex items-center gap-2 border-b border-slate-100 pb-3">
                <Bell className="w-4 h-4 text-[#1c458b]" />
                <span>Yeni Genel Duyuru Yayınla</span>
              </h3>
              <form onSubmit={handleCreateCustomAnnouncement} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duyuru Başlığı *</label>
                  <input
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="Örn: Güz Dönemi Mazeret Stajı Başvuruları Hakkında"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={newAnnouncement.category}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="period">Başvuru Takvimi</option>
                    <option value="guide">Evrak Rehberi</option>
                    <option value="insurance">SGK Sigorta</option>
                    <option value="general">Genel Duyuru</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duyuru Metni *</label>
                  <textarea
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    placeholder="Duyuru detaylarını buraya yazınız..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 h-24"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingAnnouncement}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{creatingAnnouncement ? 'Yayınlanıyor...' : 'Duyuruyu Hemen Yayınla'}</span>
                </button>
              </form>
            </div>

            {/* Active Announcements List */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
              <h3 className="text-sm font-extrabold text-[#002b49] border-b border-slate-100 pb-2.5">
                Yayındaki Duyurular ({announcements.length})
              </h3>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 line-clamp-1">{ann.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(ann.createdAt).toLocaleDateString('tr-TR')} • {ann.author}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      title="Duyuruyu Sil"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ALL PERIODS MANAGEMENT TABLE */}
          <div className="lg:col-span-12 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-[#002b49] text-base flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-[#1c458b]" />
                  <span>Dinamik Akademik Dönem Açma, Kapatma & Arşivleme</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Yeni bir staj dönemi tanımlandığında sistem kayıtlı tüm öğrencilere otomatik olarak anlık duyuru ve bildirim iletir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Staj Dönemi Tanımla & Duyur</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="py-3 px-4">Dönem Başlığı</th>
                    <th className="py-3 px-4">Tür</th>
                    <th className="py-3 px-4">Başvuru Tarihleri</th>
                    <th className="py-3 px-4">Staj Tarihleri</th>
                    <th className="py-3 px-4">İş Günü</th>
                    <th className="py-3 px-4">Başvuru Sayısı</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPeriodsList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.title}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1c458b] bg-blue-50 px-2 py-0.5 rounded">
                          {p.type === 'Staj1' ? 'Staj 1' : 'Staj 2'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {new Date(p.applicationStartDate).toLocaleDateString('tr-TR')} - {new Date(p.applicationEndDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#c5a880] font-bold">
                        {new Date(p.earliestStartDate).toLocaleDateString('tr-TR')} - {new Date(p.latestEndDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{p.defaultWorkDays} Gün</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{p.applicationCount ?? 0} Kayıt</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {p.isActive ? 'Aktif Dönem' : 'Kapalı / Arşiv'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePeriod(p.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          {p.isActive ? 'Kapat' : 'Aktif Et'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePeriod(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Dönemi Sil / Arşivle"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Yeni Dönem Açma Modalı */}
            {showNewPeriodModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-[#002b49] text-base flex items-center gap-2">
                      <FolderPlus className="w-5 h-5 text-emerald-600" />
                      <span>Yeni Staj Dönemi Aç & Duyur</span>
                    </h3>
                    <button type="button" onClick={() => setShowNewPeriodModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateNewPeriod} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dönem Başlığı:</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: 2026-2027 Bahar Stajı - Staj 1"
                        value={newPeriodForm.title}
                        onChange={(e) => setNewPeriodForm({ ...newPeriodForm, title: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-semibold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Staj Türü:</label>
                        <select
                          value={newPeriodForm.type}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, type: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                        >
                          <option value={1}>Staj 1 (Yazılım / Temel)</option>
                          <option value={2}>Staj 2 (Mesleki / İleri)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Varsayılan İş Günü:</label>
                        <select
                          value={newPeriodForm.defaultWorkDays}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, defaultWorkDays: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                        >
                          <option value={20}>20 İş Günü</option>
                          <option value={30}>30 İş Günü</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Başvuru Başlangıç:</label>
                        <input
                          type="date"
                          required
                          value={newPeriodForm.applicationStartDate}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, applicationStartDate: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Başvuru Bitiş:</label>
                        <input
                          type="date"
                          required
                          value={newPeriodForm.applicationEndDate}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, applicationEndDate: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Staj En Erken Başlama:</label>
                        <input
                          type="date"
                          required
                          value={newPeriodForm.earliestStartDate}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, earliestStartDate: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Staj En Geç Bitiş:</label>
                        <input
                          type="date"
                          required
                          value={newPeriodForm.latestEndDate}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, latestEndDate: e.target.value })}
                          className="w-full p-2 rounded-xl border border-slate-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Evrak & Defter Son Teslim Tarihi:</label>
                      <input
                        type="date"
                        required
                        value={newPeriodForm.documentDeadlineDate}
                        onChange={(e) => setNewPeriodForm({ ...newPeriodForm, documentDeadlineDate: e.target.value })}
                        className="w-full p-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div className="space-y-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPeriodForm.isSaturdayAllowed}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, isSaturdayAllowed: e.target.checked })}
                          className="rounded text-[#1c458b]"
                        />
                        <span className="font-semibold text-slate-700">Cumartesi günü çalışma kabul edilsin</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPeriodForm.publishAnnouncement}
                          onChange={(e) => setNewPeriodForm({ ...newPeriodForm, publishAnnouncement: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span className="font-bold text-emerald-800">📢 Açılışta tüm öğrencilere anlık resmî duyuru & bildirim gönder</span>
                      </label>
                    </div>
                    <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowNewPeriodModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                      >
                        Dönemi Aç ve Bildir
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN TAB: SENELERE GÖRE STAJ ARŞİVİ (KOMİSYON ARŞİVİ) */}
      {activeTab === 'archive' && (() => {
        const totalArchiveCount = archiveYears.reduce((acc, y) => acc + (y.totalCount || 0), 0);
        const totalCompletedCount = archiveYears.reduce((acc, y) => acc + (y.completedCount || 0), 0);
        const totalPartiallyCount = archiveYears.reduce((acc, y) => acc + (y.partiallySuccessfulCount || 0), 0);
        const totalUnsuccessfulCount = archiveYears.reduce((acc, y) => acc + (y.unsuccessfulCount || 0), 0);

        return (
          <div className="space-y-6">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1c458b] flex items-center justify-center font-bold">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Toplam Arşiv Kaydı</div>
                  <div className="text-xl font-black text-slate-900">{totalArchiveCount} Öğrenci</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Başarıyla Tamamlanan</div>
                  <div className="text-xl font-black text-emerald-800">{totalCompletedCount} Öğrenci</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Kısmen Başarılı</div>
                  <div className="text-xl font-black text-indigo-900">{totalPartiallyCount} Öğrenci</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Başarısız / Red</div>
                  <div className="text-xl font-black text-rose-900">{totalUnsuccessfulCount} Öğrenci</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Akademik Yıl</div>
                  <div className="text-xl font-black text-purple-900">{archiveYears.length} Dönem</div>
                </div>
              </div>
            </div>

            {/* Academic Years Pill Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1c458b]" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Akademik Yıllara Göre Filtrele:
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Seçili yıldaki staj kayıtları anlık olarak listelenir.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedArchiveYear('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedArchiveYear === 'all'
                      ? 'bg-[#1c458b] text-white shadow-sm ring-2 ring-blue-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Tüm Yıllar</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedArchiveYear === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {totalArchiveCount}
                  </span>
                </button>

                {archiveYears.map((y) => (
                  <button
                    key={y.year}
                    type="button"
                    onClick={() => setSelectedArchiveYear(y.year)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedArchiveYear === y.year
                        ? 'bg-[#1c458b] text-white shadow-sm ring-2 ring-blue-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{y.year}</span>
                    {y.isActive && (
                      <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-extrabold uppercase">
                        Aktif
                      </span>
                    )}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      selectedArchiveYear === y.year ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {y.totalCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub Filters & Actions Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                {/* Type filter */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setArchiveTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      archiveTypeFilter === 'all' ? 'bg-[#1c458b] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tüm Türler
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveTypeFilter('Staj1')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      archiveTypeFilter === 'Staj1' ? 'bg-[#1c458b] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Staj 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveTypeFilter('Staj2')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      archiveTypeFilter === 'Staj2' ? 'bg-[#1c458b] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Staj 2
                  </button>
                </div>

                {/* Result filter */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setArchiveResultFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      archiveResultFilter === 'all' ? 'bg-[#1c458b] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tüm Sonuçlar
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveResultFilter('Successful')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      archiveResultFilter === 'Successful' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Başarılı
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveResultFilter('PartiallySuccessful')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      archiveResultFilter === 'PartiallySuccessful' ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kısmen
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveResultFilter('Unsuccessful')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-[11px] ${
                      archiveResultFilter === 'Unsuccessful' ? 'bg-rose-700 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Başarısız
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder="Öğrenci, firma, danışman, no ara..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1c458b] focus:border-[#1c458b]"
                  />
                </div>
              </div>

              {/* Export CSV button */}
              <button
                type="button"
                onClick={handleDownloadArchiveCsv}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer w-full md:w-auto justify-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Arşiv CSV / Excel Dökümünü İndir</span>
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {archiveLoading ? (
                <div className="p-12 text-center text-slate-400 font-semibold text-xs flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#1c458b] border-t-transparent rounded-full animate-spin"></div>
                  <span>Arşiv verileri yükleniyor...</span>
                </div>
              ) : archiveList.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium text-xs">
                  Seçilen filtrelere uygun arşiv kaydı bulunamadı.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">Öğrenci Bilgileri</th>
                        <th className="py-3 px-4">Akademik Yıl & Tür</th>
                        <th className="py-3 px-4">Kurum & Şehir</th>
                        <th className="py-3 px-4">Staj Tarihleri & Gün</th>
                        <th className="py-3 px-4">İş Yeri Danışmanı</th>
                        <th className="py-3 px-4">SGK Tescil No</th>
                        <th className="py-3 px-4">Komisyon Sonucu</th>
                        <th className="py-3 px-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {archiveList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.studentName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {item.studentNumber} • TC: {item.nationalId}
                            </div>
                            <div className="text-[10px] text-slate-400">{item.department}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.academicYear}</div>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.internshipType === 'Staj 2' || item.internshipType === 'Staj2'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-[#1c458b]'
                            }`}>
                              {item.internshipType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.workplaceName}</div>
                            <div className="text-[11px] text-slate-500">{item.workplaceCity} • {item.workplaceSector}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {new Date(item.startDate).toLocaleDateString('tr-TR')} - {new Date(item.currentEndDate).toLocaleDateString('tr-TR')}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Zorunlu: {item.requiredWorkDays} gün • Kabul: <span className="font-bold text-slate-900">{item.acceptedDaysCount} gün</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.advisorName || '—'}</div>
                            <div className="text-[10px] text-slate-500">{item.advisorTitle || 'Eğitici Personel'}</div>
                            {item.advisorApproved && (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Defteri Onayladı
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-800 font-semibold">
                              {item.sgkRegistrationNo || '—'}
                            </div>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              item.insuranceStatus === 'Started' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.insuranceStatus === 'Started' ? 'SGK Aktif' : item.insuranceStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                              item.academicResult === 'Successful'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.academicResult === 'PartiallySuccessful'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {item.academicResult === 'Successful' && <Award className="w-3.5 h-3.5" />}
                              {item.academicResult === 'Successful'
                                ? 'Başarılı'
                                : item.academicResult === 'PartiallySuccessful'
                                ? 'Kısmen Başarılı'
                                : 'Başarısız / Red'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenArchiveDetails(item.id)}
                              className="px-3 py-1.5 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-lg transition shadow-sm inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>İncele</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1c458b] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Staj Başvuru ve Dosya İnceleme Masası</h2>
                <p className="text-xs text-blue-200">
                  {selectedApp.studentName} ({selectedApp.studentNumber}) • {selectedApp.type === 'Staj1' ? 'Staj 1' : 'Staj 2'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-white/80 hover:text-white font-bold text-lg cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Info summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold">Firma Adı:</span>
                  <div className="font-bold text-slate-900">{selectedApp.workplaceName}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Tarihler:</span>
                  <div className="font-bold text-slate-900">
                    {new Date(selectedApp.startDate).toLocaleDateString('tr-TR')} - {new Date(selectedApp.currentEndDate).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">İş Günü / Cumartesi:</span>
                  <div className="font-bold text-slate-900">{selectedApp.requiredWorkDays} Gün {selectedApp.includesSaturday ? '(6 Gün)' : '(5 Gün)'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">İş Yeri Sorumlusu:</span>
                  <div className="font-bold text-slate-900">{selectedApp.advisor?.fullName || 'Belirtilmedi'}</div>
                  <div className="text-[10px] text-slate-500">{selectedApp.advisor?.email}</div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Yüklenen Başvuru Evrakları
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedApp.documents.map((doc) => (
                    <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">
                          {doc.type === 'Form2_KabulFormu' ? 'Form 2 (Staj Kabul Formu)' : 'SPAS Müstehaklık Belgesi'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Sürüm: v{doc.currentVersionNumber} • {doc.latestVersion ? `${(doc.latestVersion.fileSizeBytes / 1024).toFixed(1)} KB` : ''}
                        </div>
                      </div>

                      <a
                        href={`/api/applications/${selectedApp.id}/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-50 text-[#1c458b] hover:bg-blue-100 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        İndir / Gör
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Initial Review Action Form */}
              {selectedApp.status === 'Submitted' && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs">Komisyon İnceleme Kararı:</h4>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Komisyon Görüşü / Düzeltme Gerekçesi (Ret veya Revize durumunda zorunludur):
                    </label>
                    <textarea
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder="Örn: Form 2 üzerindeki şirket kaşesi okunaklı değildir, tekrar yükleyiniz."
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs h-20 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleReviewAction('Reject')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition cursor-pointer"
                    >
                      Kesin Reddet
                    </button>
                    <button
                      onClick={() => handleReviewAction('RequestRevision')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer"
                    >
                      Düzeltme İste (Revize)
                    </button>
                    <button
                      onClick={() => handleReviewAction('Approve')}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow cursor-pointer"
                    >
                      Başvuruyu Onayla (KPTO'ya Gönder)
                    </button>
                  </div>
                </div>
              )}

              {/* Final Evaluation Section */}
              {(selectedApp.status === 'AdvisorApproved' || selectedApp.status === 'Completed') && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-[#1c458b]">
                    <Award className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900">Staj Sonu Nihai Değerlendirmesi</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        1. Komisyon İşlem Kararı:
                      </label>
                      <select
                        value={finalDecision}
                        onChange={(e: any) => setFinalDecision(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 font-bold bg-white"
                      >
                        <option value="Approved">Onaylandı</option>
                        <option value="Rejected">Reddedildi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        2. Nihai Başarı Sonucu (Akademik):
                      </label>
                      <select
                        value={academicResult}
                        onChange={(e: any) => setAcademicResult(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 font-bold bg-white"
                      >
                        <option value="Successful">Başarılı</option>
                        <option value="PartiallySuccessful">Kısmen Başarılı</option>
                        <option value="Unsuccessful">Başarısız</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">
                        3. Kabul Edilen İş Günü:
                      </label>
                      <input
                        type="number"
                        value={acceptedDays}
                        onChange={(e) => setAcceptedDays(Number(e.target.value))}
                        className="w-full p-2 rounded-lg border border-slate-300 font-bold bg-white"
                      />
                    </div>
                  </div>

                  {finalDecision === 'Rejected' && (
                    <div>
                      <label className="block text-[11px] font-bold text-rose-700 mb-1">
                        Red Gerekçesi (Zorunlu):
                      </label>
                      <input
                        type="text"
                        value={finalRejectReason}
                        onChange={(e) => setFinalRejectReason(e.target.value)}
                        placeholder="Örn: Form 4 notu yetersiz / defter kurallara uymuyor"
                        className="w-full p-2 rounded-lg border border-rose-300 bg-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleFinalEvaluation}
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-[#1c458b] hover:bg-blue-800 text-white font-bold rounded-lg transition shadow cursor-pointer"
                    >
                      Nihai Kararı Kaydet ve Arşivle
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Archive Application Details & Diary Viewer Modal */}
      {selectedArchiveApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#1c458b] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-300" />
                  <h2 className="text-base font-bold">Arşivlenmiş Staj Dosyası ve Defter İnceleme</h2>
                </div>
                <p className="text-xs text-blue-200 mt-0.5">
                  {selectedArchiveApp.student?.fullName} ({selectedArchiveApp.student?.studentNumber}) • {selectedArchiveApp.academicYear} • {selectedArchiveApp.internshipType}
                </p>
              </div>
              <button
                onClick={() => setSelectedArchiveApp(null)}
                className="text-white/80 hover:text-white font-bold text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModalTab('details')}
                className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  archiveModalTab === 'details'
                    ? 'border-[#1c458b] text-[#1c458b] bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Genel Bilgiler & Değerlendirme</span>
              </button>
              <button
                type="button"
                onClick={() => setArchiveModalTab('diary')}
                className={`px-4 py-2.5 font-bold text-xs border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  archiveModalTab === 'diary'
                    ? 'border-[#1c458b] text-[#1c458b] bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Günlük Defter Kayıtları ({selectedArchiveApp.diary?.entries?.length || 0} Gün)</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {archiveModalTab === 'details' && (
                <>
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    selectedArchiveApp.evaluation?.academicResult === 'Successful'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : selectedArchiveApp.evaluation?.academicResult === 'PartiallySuccessful'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Award className="w-5 h-5 shrink-0" />
                      <div>
                        <div className="font-bold text-sm">
                          Akademik Sonuç: {
                            selectedArchiveApp.evaluation?.academicResult === 'Successful'
                              ? 'Staj Başarıyla Tamamlandı'
                              : selectedArchiveApp.evaluation?.academicResult === 'PartiallySuccessful'
                              ? 'Kısmen Başarılı'
                              : 'Başarısız / Reddedildi'
                          }
                        </div>
                        <div className="text-xs opacity-90 mt-0.5">
                          Kabul Edilen Gün: {selectedArchiveApp.datesAndDuration?.acceptedDaysCount} / {selectedArchiveApp.datesAndDuration?.requiredWorkDays} İş Günü
                        </div>
                      </div>
                    </div>
                    {selectedArchiveApp.evaluation?.commissionDecisionDate && (
                      <div className="text-[11px] text-right font-medium">
                        Karar Tarihi: {new Date(selectedArchiveApp.evaluation.commissionDecisionDate).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>

                  {/* Student & Workplace Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Info Card */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs">
                        <User className="w-4 h-4 text-[#1c458b]" />
                        <span>Öğrenci Kimlik ve İletişim</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div><strong className="text-slate-600">Ad Soyad:</strong> {selectedArchiveApp.student?.fullName}</div>
                        <div><strong className="text-slate-600">Öğrenci No:</strong> {selectedArchiveApp.student?.studentNumber}</div>
                        <div><strong className="text-slate-600">T.C. Kimlik No:</strong> {selectedArchiveApp.student?.nationalId}</div>
                        <div><strong className="text-slate-600">Bölüm:</strong> {selectedArchiveApp.student?.department} ({selectedArchiveApp.student?.classLevel}. Sınıf)</div>
                        <div><strong className="text-slate-600">E-posta:</strong> {selectedArchiveApp.student?.email}</div>
                        <div><strong className="text-slate-600">Telefon:</strong> {selectedArchiveApp.student?.phoneNumber}</div>
                      </div>
                    </div>

                    {/* Workplace Info Card */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs">
                        <Building2 className="w-4 h-4 text-[#1c458b]" />
                        <span>Kurum ve İş Yeri Bilgileri</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div><strong className="text-slate-600">Kurum Adı:</strong> {selectedArchiveApp.workplace?.name}</div>
                        <div><strong className="text-slate-600">Şehir & Sektör:</strong> {selectedArchiveApp.workplace?.city} • {selectedArchiveApp.workplace?.sector}</div>
                        <div><strong className="text-slate-600">Adres:</strong> {selectedArchiveApp.workplace?.address}</div>
                        <div><strong className="text-slate-600">Web Sitesi:</strong> <a href={selectedArchiveApp.workplace?.webSite} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedArchiveApp.workplace?.webSite}</a></div>
                        <div><strong className="text-slate-600">Kurumsal Telefon:</strong> {selectedArchiveApp.workplace?.phoneNumber}</div>
                        <div><strong className="text-slate-600">Toplam Personel:</strong> {selectedArchiveApp.diary?.totalEmployees || '250+'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Advisor & SGK Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Advisor */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs">
                        <Briefcase className="w-4 h-4 text-[#1c458b]" />
                        <span>İş Yeri Eğitici Personeli (Danışman)</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div><strong className="text-slate-600">Ad Soyad:</strong> {selectedArchiveApp.advisor?.fullName || 'Belirtilmedi'}</div>
                        <div><strong className="text-slate-600">Unvanı:</strong> {selectedArchiveApp.advisor?.titleOrPosition || 'Sorumlu Mühendis'}</div>
                        <div><strong className="text-slate-600">Mezuniyet:</strong> {selectedArchiveApp.advisor?.graduatedUniversityAndDepartment || 'Bilgisayar Mühendisliği'}</div>
                        <div><strong className="text-slate-600">E-posta:</strong> {selectedArchiveApp.advisor?.email}</div>
                        <div><strong className="text-slate-600">Onay Durumu:</strong> {selectedArchiveApp.advisor?.hasApprovedDiary ? '✓ Defter Onaylandı' : '—'}</div>
                        {selectedArchiveApp.advisor?.approvedAt && (
                          <div><strong className="text-slate-600">Onay Zamanı:</strong> {new Date(selectedArchiveApp.advisor.approvedAt).toLocaleString('tr-TR')}</div>
                        )}
                      </div>
                    </div>

                    {/* SGK & Dates */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-xs">
                        <Hash className="w-4 h-4 text-[#1c458b]" />
                        <span>SGK ve Staj Tarih Kayıtları</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div><strong className="text-slate-600">SGK Tescil No:</strong> <span className="font-mono font-bold text-slate-900">{selectedArchiveApp.insurance?.sgkDocumentRegistrationNo || '—'}</span></div>
                        <div><strong className="text-slate-600">Staj Başlangıç:</strong> {new Date(selectedArchiveApp.datesAndDuration?.startDate).toLocaleDateString('tr-TR')}</div>
                        <div><strong className="text-slate-600">Staj Bitiş:</strong> {new Date(selectedArchiveApp.datesAndDuration?.currentEndDate).toLocaleDateString('tr-TR')}</div>
                        <div><strong className="text-slate-600">SGK Durumu:</strong> {selectedArchiveApp.insurance?.status === 'Started' ? 'Sigorta Aktif Başlatıldı' : selectedArchiveApp.insurance?.status}</div>
                        <div><strong className="text-slate-600">Cumartesi Çalışması:</strong> {selectedArchiveApp.datesAndDuration?.includesSaturday ? 'Dahil (Haftada 6 Gün)' : 'Hariç (Haftada 5 Gün)'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Academic Notes */}
                  {selectedArchiveApp.evaluation?.academicNotes && (
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-1">
                      <div className="font-bold text-[#1c458b] text-xs">Komisyon Değerlendirme Notu:</div>
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {selectedArchiveApp.evaluation.academicNotes}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Tab 2: Day-by-Day Diary Entries */}
              {archiveModalTab === 'diary' && (
                <div className="space-y-4">
                  {(!selectedArchiveApp.diary?.entries || selectedArchiveApp.diary.entries.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 font-semibold">
                      Bu arşiv kaydına ait detaylı günlük giriş bulunamadı.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedArchiveApp.diary.entries.map((entry: any) => (
                        <div key={entry.id || entry.dayNumber} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-[#1c458b] text-white flex items-center justify-center font-black text-xs">
                                {entry.dayNumber}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">
                                {entry.workSummary || `${entry.dayNumber}. Gün Faaliyeti`}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 font-semibold">
                              {new Date(entry.date).toLocaleDateString('tr-TR')}
                            </span>
                          </div>

                          <p className="text-slate-700 leading-relaxed text-xs pl-8">
                            {entry.description}
                          </p>

                          {entry.hasImage && entry.imageUrl && (
                            <div className="pl-8 pt-2">
                              <div className="inline-block p-2 rounded-lg border border-slate-300 bg-white shadow-sm">
                                <img
                                  src={entry.imageUrl}
                                  alt={entry.imageCaption || 'Teknik Şema'}
                                  className="max-h-48 rounded object-cover"
                                />
                                {entry.imageCaption && (
                                  <div className="text-[10px] text-slate-500 font-medium mt-1">
                                    {entry.imageCaption}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Selçuk Üniversitesi Staj Bilgi Sistemi • Resmî Komisyon Arşiv Modülü
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedArchiveApp(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
