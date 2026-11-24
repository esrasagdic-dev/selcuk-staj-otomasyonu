import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  Eye,
  FileX2,
  Filter,
  Mail,
  Megaphone,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  academicResultColors,
  academicResultLabels,
  api,
  docTypeLabels,
  documentStatusColors,
  documentStatusLabels,
  downloadBlob,
  formatDate,
  getErrorMessage,
  roleLabels,
  statusColors,
  statusLabels,
  type AcademicResultType,
  type AnnouncementDto,
  type CommitteeStatsDto,
  type CompanyStatDto,
  type DocumentDto,
  type DocumentStatus,
  type HolidayDto,
  type InternshipDetailDto,
  type InternshipStatus,
  type InternshipSummaryDto,
  type LeaveRequestDto,
  type ListingDto,
  type LogbookEntryDto,
  type ResetInternshipsResultDto,
  type TermDto,
  type UserDto,
  type UserRole,
} from '../api';
import { DocumentPreviewModal, type PreviewSource } from './DocumentPreviewModal';
import { EmailHistoryModal } from './EmailHistoryModal';

interface Props {
  user: UserDto;
}

type StatFilterKey =
  | 'all'
  | 'pendingReview'
  | 'approved'
  | 'inProgress'
  | 'awaitingEvaluation'
  | 'evaluated'
  | 'cancellationRequested'
  | 'cancelled'
  | 'pendingLeaves';

export const CommitteePanel: React.FC<Props> = ({ user }) => {
  const [tab, setTab] = useState<
    'applications' | 'archive' | 'announcements' | 'leaves' | 'calendar' | 'companies' | 'users'
  >('applications');
  const [stats, setStats] = useState<CommitteeStatsDto | null>(null);
  const [allList, setAllList] = useState<InternshipSummaryDto[]>([]);
  const [selected, setSelected] = useState<InternshipDetailDto | null>(null);
  const [logbook, setLogbook] = useState<LogbookEntryDto[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'General',
    isPinned: true,
    isActive: true,
  });

  // Yıllık Arşiv Sekmesi (Ayrı Panel) State'leri
  const [archiveList, setArchiveList] = useState<InternshipSummaryDto[]>([]);
  const [archiveSelected, setArchiveSelected] = useState<InternshipDetailDto | null>(null);
  const [archiveYear, setArchiveYear] = useState('');
  const [archiveYears, setArchiveYears] = useState<string[]>([]);
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<'' | 'Staj1' | 'Staj2'>('');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<string>('');
  const [archiveSearch, setArchiveSearch] = useState('');

  // İstatistik Akordeon ve Dinamik Filtre State'leri (Başvuru Listesi Sekmesi İçin)
  const [isStatsOpen, setIsStatsOpen] = useState(true);
  const [activeCard, setActiveCard] = useState<StatFilterKey>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Belge Önizleme Modalı State'i
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    subtitle?: string;
    sources: PreviewSource[];
    initialIndex?: number;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailHistoryScope, setEmailHistoryScope] = useState<{
    internshipId?: string | null;
    title?: string;
  } | null>(null);

  // Diğer sekmelerin verileri
  const [leaves, setLeaves] = useState<LeaveRequestDto[]>([]);
  const [terms, setTerms] = useState<TermDto[]>([]);
  const [holidays, setHolidays] = useState<HolidayDto[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStatDto[]>([]);
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);

  // Gerekçe / Değerlendirme Inputları
  const [actionNote, setActionNote] = useState('');
  const [evalResult, setEvalResult] = useState<AcademicResultType>('Successful');
  const [acceptedDays, setAcceptedDays] = useState<number>(20);

  // Yeni Dönem Formu
  const [newTerm, setNewTerm] = useState({
    name: '2026-2027 Yaz Dönemi - Staj 1',
    academicYear: '2026',
    internshipType: 'Staj1' as 'Staj1' | 'Staj2',
    applicationStartDate: '2026-05-01',
    earliestStartDate: '2026-06-15',
    latestEndDate: '2027-09-30',
    applicationDeadline: '2027-09-01',
    reportDeadline: '2027-10-30',
    minWorkDays: 20,
    maxWorkDays: 30,
    isSaturdayAllowed: true,
    isActive: true,
    publishAnnouncement: false,
  });

  // Yeni Tatil Formu
  const [newHolidayDate, setNewHolidayDate] = useState('2026-07-15');
  const [newHolidayName, setNewHolidayName] = useState('');

  // Tarih Simülatörü & Arşiv Yılı
  const [simDate, setSimDate] = useState('2026-08-15');
  const [archiveInputYear, setArchiveInputYear] = useState('2026');

  // Yeni İlan Formu
  const [newListing, setNewListing] = useState({
    companyName: '',
    title: '',
    description: '',
    contact: '',
    city: 'Konya',
    deadline: '2026-06-15',
    isActive: true,
    quota: '',
    sector: '',
    department: '',
  });

  // Yeni Personel Formu (Bölüm Başkanı)
  const [newStaff, setNewStaff] = useState({
    email: '',
    fullName: '',
    role: 'CommitteeMember' as UserRole,
    password: '',
    phone: '',
  });

  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadApplications = async () => {
    try {
      const [statsRes, listRes, yearsRes] = await Promise.all([
        api.get<CommitteeStatsDto>('/committee/stats'),
        api.get<InternshipSummaryDto[]>('/committee/internships', {
          params: {
            archived: false,
          },
        }),
        api.get<string[]>('/committee/archive/years'),
      ]);
      setStats(statsRes.data);
      setAllList(listRes.data);
      setArchiveYears(yearsRes.data);
      if (selected) {
        const stillExists = listRes.data.some((x) => x.id === selected.id);
        if (stillExists) {
          await selectInternship(selected.id);
        } else if (listRes.data.length > 0) {
          await selectInternship(listRes.data[0].id);
        } else {
          setSelected(null);
        }
      } else if (listRes.data.length > 0) {
        await selectInternship(listRes.data[0].id);
      }
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const loadArchive = async () => {
    try {
      const [listRes, yearsRes] = await Promise.all([
        api.get<InternshipSummaryDto[]>('/committee/internships', {
          params: {
            archived: true,
            archiveYear: archiveYear || undefined,
          },
        }),
        api.get<string[]>('/committee/archive/years'),
      ]);
      setArchiveList(listRes.data);
      setArchiveYears(yearsRes.data);
      if (archiveSelected && listRes.data.some((x) => x.id === archiveSelected.id)) {
        await selectArchiveInternship(archiveSelected.id);
      } else if (listRes.data.length > 0) {
        await selectArchiveInternship(listRes.data[0].id);
      } else {
        setArchiveSelected(null);
      }
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const selectArchiveInternship = async (id: string) => {
    try {
      const detailRes = await api.get<InternshipDetailDto>(`/internships/${id}`);
      setArchiveSelected(detailRes.data);
    } catch {
      setArchiveSelected(null);
    }
  };

  const selectInternship = async (id: string) => {
    try {
      const [detailRes, logRes] = await Promise.all([
        api.get<InternshipDetailDto>(`/internships/${id}`),
        api.get<LogbookEntryDto[]>(`/internships/${id}/logbook`),
      ]);
      setSelected(detailRes.data);
      setLogbook(logRes.data);
      setEvalResult(
        detailRes.data.academicResult && detailRes.data.academicResult !== 'None'
          ? detailRes.data.academicResult
          : 'Successful'
      );
      setAcceptedDays(
        detailRes.data.acceptedDaysCount && detailRes.data.acceptedDaysCount > 0
          ? detailRes.data.acceptedDaysCount
          : Math.max(1, detailRes.data.workDays - 1)
      );
    } catch {
      setSelected(null);
    }
  };

  const loadOtherTabs = async () => {
    try {
      if (tab === 'leaves') {
        const { data } = await api.get<LeaveRequestDto[]>('/committee/leaves');
        setLeaves(data);
      } else if (tab === 'announcements') {
        const { data } = await api.get<AnnouncementDto[]>('/announcements?onlyActive=false');
        setAnnouncements(data);
      } else if (tab === 'calendar') {
        const [tRes, hRes, aRes] = await Promise.all([
          api.get<TermDto[]>('/terms?onlyOpen=false'),
          api.get<HolidayDto[]>('/holidays'),
          api.get<AnnouncementDto[]>('/announcements?onlyActive=false'),
        ]);
        setTerms(tRes.data);
        setHolidays(hRes.data);
        setAnnouncements(aRes.data);
      } else if (tab === 'companies') {
        const [cRes, lRes] = await Promise.all([
          api.get<CompanyStatDto[]>('/companies/stats'),
          api.get<ListingDto[]>('/listings?onlyActive=false'),
        ]);
        setCompanyStats(cRes.data);
        setListings(lRes.data);
      } else if (tab === 'users') {
        const { data } = await api.get<UserDto[]>('/users');
        setUsers(data);
      }
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    if (tab === 'archive') {
      loadArchive();
    } else if (tab !== 'applications') {
      loadOtherTabs();
    }
  }, [tab, archiveYear]);

  // Sayfa yenilenmeden anlık, akıcı filtreleme mantığı (Başvuru Listesi)
  const filteredList = useMemo(() => {
    return allList.filter((item) => {
      // 1. Kart bazlı grup filtresi
      if (activeCard === 'pendingReview' && item.status !== 'Submitted') {
        return false;
      }
      if (
        activeCard === 'approved' &&
        item.status !== 'ApprovedByCommittee' &&
        item.status !== 'InsuranceStarted'
      ) {
        return false;
      }
      if (activeCard === 'inProgress' && item.status !== 'InProgress') return false;
      if (activeCard === 'awaitingEvaluation' && item.status !== 'CompletedPendingReview') {
        return false;
      }
      if (activeCard === 'evaluated' && item.status !== 'Passed' && item.status !== 'Failed') {
        return false;
      }
      if (activeCard === 'cancellationRequested' && item.status !== 'CancellationRequested') {
        return false;
      }
      if (activeCard === 'cancelled' && item.status !== 'Cancelled') {
        return false;
      }
      if (activeCard === 'pendingLeaves' && item.pendingLeaveCount <= 0) return false;

      // 2. Tekil statü açılır menü / alt kırılım filtresi
      if (statusFilter && item.status !== statusFilter) return false;

      // 3. Metin araması
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchNo = (item.studentNo ?? '').toLowerCase().includes(q);
        const matchCompany = item.companyName.toLowerCase().includes(q);
        if (!matchName && !matchNo && !matchCompany) return false;
      }

      return true;
    });
  }, [allList, activeCard, statusFilter, search]);

  // Yıllık Arşiv sekmesi filtreleme mantığı
  const filteredArchiveList = useMemo(() => {
    return archiveList.filter((item) => {
      if (archiveYear && (item.archiveYear ?? item.startDate.slice(0, 4)) !== archiveYear) {
        return false;
      }
      if (archiveTypeFilter && item.type !== archiveTypeFilter) return false;
      if (archiveStatusFilter && item.status !== archiveStatusFilter) return false;
      if (archiveSearch.trim()) {
        const q = archiveSearch.trim().toLowerCase();
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchNo = (item.studentNo ?? '').toLowerCase().includes(q);
        const matchCompany = item.companyName.toLowerCase().includes(q);
        const matchYear = (item.archiveYear ?? item.startDate.slice(0, 4)).toLowerCase().includes(q);
        if (!matchName && !matchNo && !matchCompany && !matchYear) return false;
      }
      return true;
    });
  }, [archiveList, archiveYear, archiveTypeFilter, archiveStatusFilter, archiveSearch]);

  // Filtre değiştiğinde seçili başvuru listede yoksa ilk uygun başvuruyu otomatik seç
  useEffect(() => {
    if (filteredList.length > 0) {
      if (!selected || !filteredList.some((x) => x.id === selected.id)) {
        selectInternship(filteredList[0].id);
      }
    }
  }, [activeCard, statusFilter, search, filteredList.length]);

  const handleCardClick = (cardKey: StatFilterKey) => {
    setTab('applications');
    if (activeCard === cardKey && cardKey !== 'all') {
      // Aynı karta tekrar tıklandığında filtreyi sıfırla (akordeon aç/kapa davranışı)
      setActiveCard('all');
      setStatusFilter('');
      return;
    }
    setActiveCard(cardKey);
    switch (cardKey) {
      case 'all':
        setStatusFilter('');
        break;
      case 'pendingReview':
        setStatusFilter('Submitted');
        break;
      case 'approved':
        setStatusFilter('');
        break;
      case 'inProgress':
        setStatusFilter('InProgress');
        break;
      case 'awaitingEvaluation':
        setStatusFilter('CompletedPendingReview');
        break;
      case 'evaluated':
        setStatusFilter('');
        break;
      case 'cancellationRequested':
        setStatusFilter('CancellationRequested');
        break;
      case 'cancelled':
        setStatusFilter('Cancelled');
        break;
      case 'pendingLeaves':
        setStatusFilter('');
        break;
    }
  };

  // =========================================================================
  //  BELGE ÖNİZLEME YARDIMCILARI (MODAL GÖRÜNTÜLEYİCİ)
  // =========================================================================

  const openForm2PreviewForSummary = (item: InternshipSummaryDto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sources: PreviewSource[] = [];
    if (item.form2DocumentId) {
      sources.push({
        label: 'Yüklenen İmzalı Form 2',
        url: `/documents/${item.form2DocumentId}`,
        fallbackFileName: item.form2FileName || `Imzali_Form2_${item.studentNo}.pdf`,
      });
    }
    sources.push({
      label: 'Oluşturulan Form 2 Şablonu',
      url: `/internships/${item.id}/pdf/form2`,
      fallbackFileName: `Form2_${item.studentNo}_${item.type}.pdf`,
    });

    setPreviewModal({
      title: 'Staj Kabul Formu (Form 2) Önizleme',
      subtitle: `${item.studentName} (${item.studentNo || '-'}) — ${item.companyName}`,
      sources,
      initialIndex: 0,
    });
  };

  const openSpasPreviewForSummary = (item: InternshipSummaryDto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!item.spasDocumentId) return;
    setPreviewModal({
      title: 'SPAS Müstehaklık Belgesi Önizleme',
      subtitle: `${item.studentName} (${item.studentNo || '-'}) — ${item.companyName}`,
      sources: [
        {
          label: 'SPAS Müstehaklık Belgesi',
          url: `/documents/${item.spasDocumentId}`,
          fallbackFileName: item.spasFileName || `SPAS_${item.studentNo}.pdf`,
        },
      ],
      initialIndex: 0,
    });
  };

  const openForm7PreviewForSummary = (item: InternshipSummaryDto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sources: PreviewSource[] = [];
    if (item.form7DocumentId) {
      sources.push({
        label: 'Öğrencinin Gönderdiği Form 7 PDF',
        url: `/documents/${item.form7DocumentId}`,
        fallbackFileName: item.form7FileName || `Form7_Staj_Iptal_${item.studentNo}.pdf`,
      });
    }
    sources.push({
      label: 'Sistem Form 7 Şablonu',
      url: `/internships/${item.id}/pdf/form7`,
      fallbackFileName: `Form7_${item.studentNo}_${item.type}.pdf`,
    });

    setPreviewModal({
      title: 'Staj İptal Formu (Form 7) Önizleme',
      subtitle: `${item.studentName} (${item.studentNo || '-'}) — ${item.companyName}`,
      sources,
      initialIndex: 0,
    });
  };

  const openForm2PreviewForDetail = (detail: InternshipDetailDto) => {
    const uploadedForm2 = detail.documents.find((d) => d.type === 'Form2');
    const sources: PreviewSource[] = [];
    if (uploadedForm2) {
      sources.push({
        label: 'Yüklenen İmzalı Form 2',
        url: `/documents/${uploadedForm2.id}`,
        fallbackFileName: uploadedForm2.originalFileName,
      });
    }
    sources.push({
      label: 'Oluşturulan Form 2 Şablonu',
      url: `/internships/${detail.id}/pdf/form2`,
      fallbackFileName: `Form2_${detail.studentNo}_${detail.type}.pdf`,
    });

    setPreviewModal({
      title: 'Staj Kabul Formu (Form 2) Önizleme',
      subtitle: `${detail.studentName} (${detail.studentNo || '-'}) — ${detail.companyName}`,
      sources,
      initialIndex: 0,
    });
  };

  const openForm7PreviewForDetail = (detail: InternshipDetailDto) => {
    const uploadedForm7 = detail.documents.find((d) => d.type === 'Form7');
    const sources: PreviewSource[] = [];
    if (uploadedForm7) {
      sources.push({
        label: 'Öğrencinin Gönderdiği Form 7 PDF',
        url: `/documents/${uploadedForm7.id}`,
        fallbackFileName: uploadedForm7.originalFileName,
      });
    }
    sources.push({
      label: 'Sistem Form 7 Şablonu',
      url: `/internships/${detail.id}/pdf/form7`,
      fallbackFileName: `Form7_${detail.studentNo}_${detail.type}.pdf`,
    });

    setPreviewModal({
      title: 'Staj İptal Formu (Form 7) Önizleme',
      subtitle: `${detail.studentName} (${detail.studentNo || '-'}) — ${detail.companyName}`,
      sources,
      initialIndex: 0,
    });
  };

  const openLogbookPreviewForDetail = (detail: InternshipDetailDto) => {
    setPreviewModal({
      title: 'Sanal Staj Defteri PDF Önizleme',
      subtitle: `${detail.studentName} (${detail.studentNo || '-'}) — ${detail.companyName}`,
      sources: [
        {
          label: 'Sanal Staj Defteri PDF',
          url: `/internships/${detail.id}/pdf/logbook`,
          fallbackFileName: `Defter_${detail.studentNo}_${detail.type}.pdf`,
        },
      ],
      initialIndex: 0,
    });
  };

  const openDocumentPreview = (doc: DocumentDto, detail: InternshipDetailDto) => {
    if (doc.type === 'Form2') {
      openForm2PreviewForDetail(detail);
      return;
    }
    if (doc.type === 'Form7') {
      openForm7PreviewForDetail(detail);
      return;
    }
    setPreviewModal({
      title: `${docTypeLabels[doc.type]} Önizleme`,
      subtitle: `${detail.studentName} (${detail.studentNo || '-'}) — ${detail.companyName}`,
      sources: [
        {
          label: docTypeLabels[doc.type],
          url: `/documents/${doc.id}`,
          fallbackFileName: doc.originalFileName,
        },
      ],
      initialIndex: 0,
    });
  };

  const handleApprove = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      await api.post(`/committee/internships/${selected.id}/approve`);
      const { data } = await api.get<InternshipDetailDto>(`/internships/${selected.id}`);
      setSelected(data);
      setShowEmailModal(true);
      setMsg({
        type: 'ok',
        text: `Başvuru onaylandı! Şirket yetkilisine (${selected.advisorEmail}) giriş şifresi oluşturuldu, e-postalandı ve kayıt KPTO "Gelenler" listesine düşürüldü.`,
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleRevision = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      await api.post(`/committee/internships/${selected.id}/revision`, { note: actionNote });
      setActionNote('');
      setMsg({ type: 'ok', text: 'Öğrenciden gerekçeli revize istendi.' });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleRejectApplication = async () => {
    if (!selected) return;
    if (!actionNote.trim()) {
      setMsg({ type: 'err', text: 'Lütfen başvuru reddi için gerekçenizi yazınız.' });
      return;
    }
    setMsg(null);
    try {
      await api.post(`/committee/internships/${selected.id}/reject`, { note: actionNote });
      setActionNote('');
      setMsg({
        type: 'ok',
        text: 'Başvuru gerekçeli olarak reddedildi ve öğrenci bilgilendirildi.',
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleEvaluate = async () => {
    if (!selected) return;
    setMsg(null);
    const resolvedDays =
      evalResult === 'PartiallySuccessful'
        ? acceptedDays
        : evalResult === 'Successful'
        ? selected.workDays
        : 0;
    try {
      await api.post(`/committee/internships/${selected.id}/evaluate`, {
        passed: evalResult !== 'Unsuccessful',
        note: actionNote,
        academicResult: evalResult,
        acceptedDaysCount: resolvedDays,
      });
      setActionNote('');
      setMsg({
        type: 'ok',
        text: `Staj sonu değerlendirmesi "${academicResultLabels[evalResult]}" (${resolvedDays}/${selected.workDays} gün) olarak kaydedildi.`,
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleReviewDocument = async (documentId: string, status: DocumentStatus) => {
    if (!selected) return;
    if ((status === 'RevisionRequested' || status === 'Rejected') && !actionNote.trim()) {
      setMsg({
        type: 'err',
        text: 'Belge düzeltme talebi veya reddi için yukarıdaki not kutusuna geri bildirim yazınız.',
      });
      return;
    }
    setMsg(null);
    try {
      await api.post(`/committee/documents/${documentId}/review`, {
        status,
        feedback: actionNote.trim() || null,
      });
      if (actionNote.trim()) setActionNote('');
      setMsg({
        type: 'ok',
        text: `Belge durumu "${documentStatusLabels[status]}" olarak güncellendi.`,
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleRequestLogbookRevision = async () => {
    if (!selected) return;
    if (!actionNote.trim()) {
      setMsg({ type: 'err', text: 'Lütfen staj defteri için revize gerekçesini yazınız.' });
      return;
    }
    setMsg(null);
    try {
      await api.post(`/advisor/internships/${selected.id}/request-logbook-revision`, {
        note: actionNote,
      });
      setActionNote('');
      setMsg({
        type: 'ok',
        text: 'Öğrenciden staj defteri için revize (düzeltme) talep edildi.',
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleResendAdvisorEmail = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      const { data } = await api.post<InternshipDetailDto>(
        `/internships/${selected.id}/resend-advisor-email`
      );
      setSelected(data);
      setShowEmailModal(true);
      setMsg({
        type: 'ok',
        text: `Şirket danışmanı (${selected.advisorEmail}) adresine bilgilendirme e-postası ve geçici giriş şifresi oluşturularak gönderildi.`,
      });
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/announcements', newAnnouncement);
      setNewAnnouncement({
        title: '',
        content: '',
        category: 'General',
        isPinned: true,
        isActive: true,
      });
      setMsg({ type: 'ok', text: 'Duyuru yayınlandı ve tüm öğrencilerin duyuru paneline eklendi.' });
      await loadOtherTabs();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setMsg(null);
    try {
      await api.delete(`/announcements/${id}`);
      setMsg({ type: 'ok', text: 'Duyuru kaldırıldı.' });
      await loadOtherTabs();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleCancelInternship = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      await api.post(`/committee/internships/${selected.id}/cancel`, {
        note: actionNote || selected.evaluationNote || 'Öğrencinin Form 7 staj iptal talebi onaylandı.',
      });
      setActionNote('');
      setMsg({
        type: 'ok',
        text: 'Öğrencinin Form 7 staj iptal talebi onaylandı, staj iptal edildi ve KPTO bilgilendirildi.',
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleRejectCancelRequest = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      await api.post(`/committee/internships/${selected.id}/reject-cancel`, {
        note: actionNote || 'Form 7 iptal talebi komisyon tarafından uygun görülmedi.',
      });
      setActionNote('');
      setMsg({
        type: 'ok',
        text: 'Öğrencinin Form 7 staj iptal talebi reddedildi ve staj önceki aktif statüsüne döndürüldü.',
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    setMsg(null);
    try {
      const { data } = await api.post<LeaveRequestDto>(`/committee/leaves/${leaveId}/approve`, {
        note: 'Komisyon tarafından onaylandı.',
      });
      setMsg({
        type: 'ok',
        text: `İzin onaylandı! Yeni bitiş tarihi ${formatDate(data.newEndDate)} olarak ötelendi ve KPTO'ya bildirildi.`,
      });
      await loadOtherTabs();
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    setMsg(null);
    try {
      await api.post(`/committee/leaves/${leaveId}/reject`, {
        note: 'Komisyon tarafından uygun görülmedi.',
      });
      setMsg({ type: 'ok', text: 'İzin talebi reddedildi.' });
      await loadOtherTabs();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/terms', {
        ...newTerm,
        applicationStartDate: newTerm.applicationStartDate || null,
      });
      setMsg({ type: 'ok', text: 'Yeni staj dönemi açıldı.' });
      await loadOtherTabs();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/holidays', { date: newHolidayDate, name: newHolidayName });
      setNewHolidayName('');
      setMsg({ type: 'ok', text: 'Resmi tatil takvime eklendi.' });
      await loadOtherTabs();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleRunLifecycle = async () => {
    setMsg(null);
    try {
      const { data } = await api.post<{ changedCount: number }>(
        `/committee/lifecycle/run?simulatedToday=${simDate}`
      );
      setMsg({
        type: 'ok',
        text: `Tarih simülasyonu (${formatDate(simDate)}) çalıştırıldı: ${data.changedCount} staj kaydının durumu/bildirimi güncellendi.`,
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleArchiveYear = async () => {
    setMsg(null);
    try {
      const { data } = await api.post<{ archivedCount: number }>(
        `/committee/archive/${archiveInputYear}`
      );
      setMsg({
        type: 'ok',
        text: `${archiveInputYear} dönemine ait sonuçlanmış ${data.archivedCount} staj kaydı Yıllık Arşive taşındı.`,
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/listings', {
        companyName: newListing.companyName,
        title: newListing.title,
        description: newListing.description,
        contact: newListing.contact || null,
        city: newListing.city || null,
        deadline: newListing.deadline || null,
        isActive: newListing.isActive,
        quota: newListing.quota ? Number(newListing.quota) : null,
        sector: newListing.sector.trim() || null,
        department: newListing.department.trim() || null,
      });
      setNewListing({
        companyName: '',
        title: '',
        description: '',
        contact: '',
        city: 'Konya',
        deadline: '2026-06-15',
        isActive: true,
        quota: '',
        sector: '',
        department: '',
      });
      setMsg({ type: 'ok', text: 'Yeni firma staj ilanı yayınlandı ve öğrencilere bildirildi.' });
      await loadOtherTabs();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post('/users/staff', newStaff);
      setNewStaff({ email: '', fullName: '', role: 'CommitteeMember', password: '', phone: '' });
      setMsg({ type: 'ok', text: 'Yeni personel hesabı oluşturuldu.' });
      await loadOtherTabs();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleResetInternships = async () => {
    setMsg(null);
    try {
      const { data } = await api.post<ResetInternshipsResultDto>('/committee/reset-internships');
      setSelected(null);
      setLogbook([]);
      setActiveCard('all');
      setStatusFilter('');
      setMsg({
        type: 'ok',
        text: `Test verileri sıfırlandı: ${data.deletedInternships} staj başvurusu, ${data.deletedDocuments} belge (Form 2 / Form 7 / SPAS), ${data.deletedLogbookEntries} defter sayfası ve ${data.deletedLeaveRequests} izin talebi temizlendi. Kullanıcı hesapları korundu.`,
      });
      await loadApplications();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const statCardLabels: Record<StatFilterKey, string> = {
    all: 'Toplam Başvuru (Tümü)',
    pendingReview: 'Onay Bekleyen Başvurular',
    approved: 'Komisyon Onaylı Başvurular',
    inProgress: 'Devam Eden Stajlar',
    awaitingEvaluation: 'Değerlendirme Bekleyenler',
    evaluated: 'Sonuçlananlar (Geçti / Kaldı)',
    cancellationRequested: 'Staj İptal Talepleri (Form 7 İncelemesinde)',
    cancelled: 'İptal Edilen Stajlar',
    pendingLeaves: 'Bekleyen İzin / Rapor Talebi Olanlar',
  };

  return (
    <div className="space-y-6">
      {/* Aktif Bölüm Komisyonu Başlığı ve İzolasyon Rozeti */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-5 py-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-amber-300 backdrop-blur-xs">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight sm:text-lg">
                {user.department || 'Bilgisayar Mühendisliği'} — Staj Komisyonu Yönetim Paneli
              </h2>
              <span className="rounded-full bg-amber-400/20 border border-amber-300/40 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-200">
                🔒 Bölüm İzolasyonu Aktif
              </span>
            </div>
            <p className="mt-0.5 text-xs text-blue-100">
              Yetkili: <b>{user.fullName}</b> ({roleLabels[user.role]}) • Yalnızca <b>{user.department || 'Bilgisayar Mühendisliği'}</b> bölümüne kayıtlı öğrencilerin başvuruları, izinleri ve arşivleri listelenmektedir.
            </p>
          </div>
        </div>
      </div>

      {/* Özet İstatistik Kartları (Tıklanabilir & Akordeon Filtre Yapısı) */}
      {stats && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div
            onClick={() => setIsStatsOpen((prev) => !prev)}
            className="flex cursor-pointer items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3 transition hover:bg-slate-100/80"
          >
            <div className="flex items-center gap-2.5">
              <Filter className="h-4 w-4 text-blue-700" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                Başvuru Durum Özeti & Hızlı Filtre Kartları
              </span>
              {(activeCard !== 'all' || statusFilter) && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                  Aktif Filtre: {statCardLabels[activeCard]} ({filteredList.length} Kayıt)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(activeCard !== 'all' || statusFilter || search) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCard('all');
                    setStatusFilter('');
                    setSearch('');
                  }}
                  className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                >
                  Filtreyi Temizle
                </button>
              )}
              <span className="text-[11px] font-semibold text-slate-500">
                {isStatsOpen ? 'Daralt' : 'Genişlet'}
              </span>
              {isStatsOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </div>

          {isStatsOpen && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
                <StatCard
                  label="Toplam Başvuru"
                  value={stats.totalApplications}
                  color="text-slate-900"
                  active={activeCard === 'all' && !statusFilter}
                  subtitle="Tümünü Listele"
                  onClick={() => handleCardClick('all')}
                />
                <StatCard
                  label="Onay Bekleyen"
                  value={stats.pendingReview}
                  color="text-amber-600"
                  active={activeCard === 'pendingReview'}
                  subtitle="İnceleme Bekleyen"
                  onClick={() => handleCardClick('pendingReview')}
                />
                <StatCard
                  label="Komisyon Onaylı"
                  value={stats.approved}
                  color="text-blue-600"
                  active={activeCard === 'approved'}
                  subtitle="KPTO / Sigorta"
                  onClick={() => handleCardClick('approved')}
                />
                <StatCard
                  label="Devam Eden"
                  value={stats.inProgress}
                  color="text-indigo-600"
                  active={activeCard === 'inProgress'}
                  subtitle="Aktif Stajda"
                  onClick={() => handleCardClick('inProgress')}
                />
                <StatCard
                  label="Değerlendirme"
                  value={stats.awaitingEvaluation}
                  color="text-purple-600"
                  active={activeCard === 'awaitingEvaluation'}
                  subtitle="Biten / Not Bekleyen"
                  onClick={() => handleCardClick('awaitingEvaluation')}
                />
                <StatCard
                  label="Geçti / Kaldı"
                  value={`${stats.passed} / ${stats.failed}`}
                  color="text-emerald-600"
                  active={activeCard === 'evaluated'}
                  subtitle="Sonuçlananlar"
                  onClick={() => handleCardClick('evaluated')}
                />
                <StatCard
                  label="Staj İptal Talepleri"
                  value={stats.cancellationRequested ?? 0}
                  color="text-orange-600"
                  active={activeCard === 'cancellationRequested'}
                  subtitle="Form 7 İncelemesinde"
                  onClick={() => handleCardClick('cancellationRequested')}
                />
                <StatCard
                  label="İptal Edilen Stajlar"
                  value={stats.cancelled ?? 0}
                  color="text-rose-700"
                  active={activeCard === 'cancelled'}
                  subtitle="İptali Onaylananlar"
                  onClick={() => handleCardClick('cancelled')}
                />
                <StatCard
                  label="Bekleyen İzin"
                  value={stats.pendingLeaves}
                  color="text-rose-600"
                  active={activeCard === 'pendingLeaves'}
                  subtitle="İzin / Rapor Talebi"
                  onClick={() => handleCardClick('pendingLeaves')}
                />
              </div>

              {/* Seçili Karta Özel Açılır Alt Filtre / Akordeon Detay Çubuğu */}
              {activeCard !== 'all' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-blue-950">
                      Seçili Kategori: {statCardLabels[activeCard]} ({filteredList.length} başvuru listeleniyor)
                    </span>

                    {activeCard === 'approved' && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('')}
                          className={`rounded-lg px-2.5 py-1 font-bold transition ${
                            statusFilter === ''
                              ? 'bg-blue-700 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Tümü ({stats.approved})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('ApprovedByCommittee')}
                          className={`rounded-lg px-2.5 py-1 font-bold transition ${
                            statusFilter === 'ApprovedByCommittee'
                              ? 'bg-blue-700 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          KPTO Sigorta Bekleyen
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('InsuranceStarted')}
                          className={`rounded-lg px-2.5 py-1 font-bold transition ${
                            statusFilter === 'InsuranceStarted'
                              ? 'bg-blue-700 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Sigortası Başlatılan
                        </button>
                      </div>
                    )}

                    {activeCard === 'evaluated' && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('')}
                          className={`rounded-lg px-2.5 py-1 font-bold transition ${
                            statusFilter === ''
                              ? 'bg-emerald-700 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Tümü ({stats.passed + stats.failed})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('Passed')}
                          className={`rounded-lg px-2.5 py-1 font-bold transition ${
                            statusFilter === 'Passed'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          Geçti ({stats.passed})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('Failed')}
                          className={`rounded-lg px-2.5 py-1 font-bold transition ${
                            statusFilter === 'Failed'
                              ? 'bg-rose-700 text-white'
                              : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                          }`}
                        >
                          Kaldı ({stats.failed})
                        </button>
                      </div>
                    )}

                    {activeCard === 'pendingLeaves' && (
                      <button
                        type="button"
                        onClick={() => setTab('leaves')}
                        className="ml-2 rounded-lg bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-700"
                      >
                        İzin / Telafi Onay Sekmesine Git →
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCardClick('all')}
                    className="font-bold text-blue-800 hover:underline"
                  >
                    Tüm Başvuruları Göster
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Üst Sekmeler (Başvuru Listesi ve Yıllık Arşiv Ayrı Sekmeler Olarak Ayrıldı - 1. Görsel Revizesi) */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <button
          onClick={() => setTab('applications')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            tab === 'applications' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Başvuru Listesi & Değerlendirme ({filteredList.length})
        </button>
        <button
          onClick={() => setTab('archive')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            tab === 'archive' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          <Archive className="h-4 w-4" />
          Yıllık Staj Arşivi
        </button>
        <button
          onClick={() => setTab('announcements')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            tab === 'announcements' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Megaphone className="h-4 w-4" />
          Komisyon Duyuru Paneli
        </button>
        <button
          onClick={() => setTab('leaves')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            tab === 'leaves' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          İzin / Telafi Talepleri {stats?.pendingLeaves ? `(${stats.pendingLeaves})` : ''}
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            tab === 'calendar' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Staj Takvimi, Tatiller & Simülatör
        </button>
        <button
          onClick={() => setTab('companies')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
            tab === 'companies' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Firma Havuzu, İstatistikler & İlanlar
        </button>
        {(user.role === 'DepartmentHead' || user.role === 'Admin') && (
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
              tab === 'users' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Personel & Yetki Yönetimi (Bölüm Başkanı)
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            setEmailHistoryScope({
              internshipId: null,
              title: 'Tüm Sistem HTML E-Posta Gönderim Geçmişi',
            })
          }
          className="ml-auto flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
        >
          <Mail className="h-4 w-4 text-indigo-700" />
          HTML E-Posta Geçmişi
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            msg.type === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-rose-300 bg-rose-50 text-rose-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* SEKME 1: BAŞVURULAR VE DEĞERLENDİRME */}
      {tab === 'applications' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Öğrenci adı, no veya firma ara..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setActiveCard('all');
                    setStatusFilter(e.target.value);
                  }}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                >
                  <option value="">Tüm Durumlar</option>
                  {(Object.keys(statusLabels) as InternshipStatus[])
                    .filter((s) => s !== 'Draft')
                    .map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {filteredList.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Seçili filtreye uygun staj başvurusu bulunamadı.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectInternship(item.id)}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                      selected?.id === item.id
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900">{item.studentName}</span>
                        <span className="ml-1.5 text-xs text-slate-500">({item.studentNo})</span>
                        <p className="text-xs font-semibold text-indigo-700 truncate">
                          {item.type === 'Staj1' ? 'Staj 1' : 'Staj 2'} — {item.companyName}
                        </p>
                        {item.subject && (
                          <p className="text-[11px] text-slate-600 truncate">Konu: {item.subject}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span
                          className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            statusColors[item.status]
                          }`}
                        >
                          {statusLabels[item.status]}
                        </span>
                        {item.academicResult && item.academicResult !== 'None' && (
                          <span
                            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              academicResultColors[item.academicResult]
                            }`}
                          >
                            {academicResultLabels[item.academicResult]} ({item.acceptedDaysCount ?? 0}/{item.workDays} Gün)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {formatDate(item.startDate)} – {formatDate(item.endDate)} ({item.workDays} gün)
                      </span>
                      {item.advisorLogbookApproved && (
                        <span className="font-bold text-emerald-700">✔ Şirket Defteri Onayladı</span>
                      )}
                    </div>

                    {/* Liste Satırında Hızlı Belge Önizleme Butonları (Form 2, SPAS & Form 7) */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={(e) => openForm2PreviewForSummary(item, e)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-700" />
                        Form 2 Önizle
                      </button>

                      {item.spasDocumentId ? (
                        <button
                          type="button"
                          onClick={(e) => openSpasPreviewForSummary(item, e)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-700" />
                          SPAS Belgesi Önizle
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">SPAS Yüklü Değil</span>
                      )}

                      {(item.form7DocumentId ||
                        item.status === 'CancellationRequested' ||
                        item.status === 'Cancelled') && (
                        <button
                          type="button"
                          onClick={(e) => openForm7PreviewForSummary(item, e)}
                          className="inline-flex items-center gap-1 rounded-lg border border-orange-300 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-900 hover:bg-orange-100"
                        >
                          <FileX2 className="h-3.5 w-3.5 text-orange-700" />
                          Form 7 Önizle
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            {!selected ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Detayları incelemek için soldan bir başvuru seçiniz.
              </div>
            ) : (
              <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {selected.studentName} ({selected.studentNo})
                    </h3>
                    <p className="text-xs text-slate-500">
                      TC: <b>{selected.studentNationalId || '-'}</b> • Tel: {selected.studentPhone || '-'} •{' '}
                      {selected.studentEmail}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-blue-900">
                      {selected.companyName} — {selected.type === 'Staj1' ? 'Staj 1' : 'Staj 2'} ({selected.archiveYear || selected.startDate.slice(0, 4)} Yılı)
                    </p>
                    <p className="text-xs text-slate-600">
                      Şirket Yetkilisi: <b>{selected.advisorName}</b>
                      {selected.advisorTitle ? ` (${selected.advisorTitle})` : ''} ({selected.advisorEmail}) • Tarih:{' '}
                      <b>
                        {formatDate(selected.startDate)} – {formatDate(selected.endDate)} ({selected.workDays} İş Günü • Cumartesi: {selected.worksOnSaturday ? 'Çalışıyor' : 'Çalışmıyor'})
                      </b>
                    </p>
                    {(selected.subject ||
                      selected.advisorGraduatedDepartment ||
                      selected.sgkRegistrationNo ||
                      selected.sgkExitNo ||
                      (selected.academicResult && selected.academicResult !== 'None')) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        {selected.subject && (
                          <span>
                            Staj Konusu: <b className="text-slate-900">{selected.subject}</b>
                          </span>
                        )}
                        {selected.advisorGraduatedDepartment && (
                          <span>
                            • Mezuniyet: <b className="text-slate-900">{selected.advisorGraduatedDepartment}</b>
                          </span>
                        )}
                        {selected.sgkRegistrationNo && (
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            SGK Tescil No: {selected.sgkRegistrationNo}
                          </span>
                        )}
                        {selected.sgkExitNo && (
                          <span className="rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                            SGK Çıkış No: {selected.sgkExitNo}
                          </span>
                        )}
                        {selected.academicResult && selected.academicResult !== 'None' && (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              academicResultColors[selected.academicResult]
                            }`}
                          >
                            {academicResultLabels[selected.academicResult]} ({selected.acceptedDaysCount ?? 0}/{selected.workDays} Gün)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openForm2PreviewForDetail(selected)}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-700" />
                      Form 2 Önizle
                    </button>
                    <button
                      type="button"
                      onClick={() => openLogbookPreviewForDetail(selected)}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                    >
                      <Eye className="h-3.5 w-3.5 text-indigo-700" />
                      Defter PDF Önizle
                    </button>
                  </div>
                </div>

                {/* Yüklenen Evraklar (Belge Bazlı İnceleme + Sürüm Geçmişi) */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-500">
                      Yüklenen Resmi Evraklar ({selected.documents.length}) — Önizleme, İnceleme & Sürüm Geçmişi
                    </h4>
                  </div>
                  {selected.documents.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">Yüklü belge yok.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {selected.documents.map((d) => {
                        const docStatus = d.status ?? 'Pending';
                        return (
                          <div
                            key={d.id}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900">
                                  {docTypeLabels[d.type]}
                                </span>
                                <span className="text-slate-600">({d.originalFileName})</span>
                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-800">
                                  v{d.versionNumber ?? 1}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                    documentStatusColors[docStatus]
                                  }`}
                                >
                                  {documentStatusLabels[docStatus]}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openDocumentPreview(d, selected)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-bold text-blue-800 hover:bg-blue-100"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Önizle
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadBlob(`/documents/${d.id}`, d.originalFileName)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  İndir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDocument(d.id, 'Approved')}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700"
                                >
                                  Onayla
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDocument(d.id, 'RevisionRequested')}
                                  className="rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-700"
                                >
                                  Düzeltme İste
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDocument(d.id, 'Rejected')}
                                  className="rounded-lg bg-rose-600 px-2.5 py-1 font-bold text-white hover:bg-rose-700"
                                >
                                  Reddet
                                </button>
                              </div>
                            </div>

                            {d.commissionFeedback && (
                              <div className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-[11px] font-semibold text-orange-900">
                                Komisyon Geri Bildirimi: {d.commissionFeedback}
                              </div>
                            )}

                            {d.versions && d.versions.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-1.5 text-[11px]">
                                <span className="font-semibold text-slate-500">Önceki Sürümler:</span>
                                {d.versions.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() =>
                                      downloadBlob(`/document-versions/${v.id}`, v.originalFileName)
                                    }
                                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 font-medium text-slate-700 hover:bg-slate-100"
                                  >
                                    <Download className="h-3 w-3 text-slate-500" />
                                    v{v.versionNumber} ({v.originalFileName})
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Şirket Danışmanı (Sorumlu Mühendis) E-Posta & Süreç Takibi Kutusu (Madde 7) */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-extrabold text-indigo-950">
                      <Mail className="h-4 w-4 text-indigo-700" />
                      <span>Şirket Danışmanı (Sorumlu Mühendis) E-Posta & İnceleme Takibi</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selected.advisorEmailStatus && (
                        <button
                          type="button"
                          onClick={() => setShowEmailModal(true)}
                          className="flex items-center gap-1 rounded-lg bg-indigo-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-indigo-800"
                        >
                          <Eye className="h-3 w-3" />
                          Gönderilen E-Postayı & Şifreyi Görüntüle
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setEmailHistoryScope({
                            internshipId: selected.id,
                            title: `${selected.studentName} — HTML E-Posta Logları`,
                          })
                        }
                        className="flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                      >
                        <Mail className="h-3 w-3" />
                        Bu Stajın E-Posta Logları
                      </button>
                      <button
                        type="button"
                        onClick={handleResendAdvisorEmail}
                        className="flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                      >
                        <Send className="h-3 w-3" />
                        Yetkiliye E-Postayı Tekrar Gönder
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-indigo-100 bg-white p-2.5">
                      <span className="text-[11px] text-slate-500">1. E-Posta Gönderim Durumu:</span>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {selected.advisorEmailSentAt
                          ? `✔ Gönderildi (${formatDate(selected.advisorEmailSentAt)})`
                          : 'Onay Bekleniyor'}
                      </p>
                      <p className="text-[11px] text-indigo-700 truncate">{selected.advisorEmail}</p>
                    </div>
                    <div className="rounded-lg border border-indigo-100 bg-white p-2.5">
                      <span className="text-[11px] text-slate-500">2. Yetkili Sisteme Giriş:</span>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {selected.advisorLastLoginAt
                          ? `✔ Giriş Yaptı (${formatDate(selected.advisorLastLoginAt)})`
                          : 'Henüz Giriş Yapmadı'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-indigo-100 bg-white p-2.5">
                      <span className="text-[11px] text-slate-500">3. Defter Gönderim & Onay:</span>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {selected.advisorLogbookApproved
                          ? `✔ Mühendis Onayladı (${formatDate(selected.advisorApprovedAt)})`
                          : selected.logbookRevisionRequested
                          ? '↻ Mühendis Revize İstedi'
                          : selected.logbookSubmittedToAdvisorAt
                          ? `📩 Öğrenci Gönderdi (${formatDate(selected.logbookSubmittedToAdvisorAt)})`
                          : `Defter Yazılıyor (${logbook.length}/${selected.workDays} gün)`}
                      </p>
                      {selected.advisorApprovedIpAddress && (
                        <p className="mt-0.5 text-[11px] text-emerald-700">
                          Onay IP: <b>{selected.advisorApprovedIpAddress}</b>
                        </p>
                      )}
                    </div>
                  </div>
                  {selected.advisorEmailStatus && (
                    <p className="rounded-lg bg-white/80 px-3 py-1.5 text-[11px] font-medium text-indigo-900 border border-indigo-100">
                      <b>Son E-Posta Kaydı:</b> {selected.advisorEmailStatus}
                    </p>
                  )}
                </div>

                {/* Komisyon Karar Aksiyonları */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Komisyon İnceleme & Değerlendirme İşlemleri
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      Şirket Defter Onayı:{' '}
                      <b className={selected.advisorLogbookApproved ? 'text-emerald-700' : 'text-amber-700'}>
                        {selected.advisorLogbookApproved ? '✔ Gördüm / İnceledim Onaylı' : 'Henüz Onaylanmadı'}
                      </b>
                    </span>
                  </div>

                  {logbook.filter((e) => !e.isDraft).length < selected.workDays &&
                    (selected.status === 'CompletedPendingReview' || selected.status === 'InProgress') && (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">
                        ⚠️ Eksik Deftere Tam Başarılı Onayı Verilemez: Öğrenci {selected.workDays} iş gününün tamamını tamamlamalıdır (Tamamlanan: {logbook.filter((e) => !e.isDraft).length}/{selected.workDays} gün).
                      </div>
                    )}

                  <input
                    type="text"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Revize gerekçesi, staj defteri düzeltme notu, değerlendirme notu veya iptal talebi karar notu yazınız..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  />

                  <div className="flex flex-wrap gap-2">
                    {selected.status === 'Submitted' && (
                      <button
                        onClick={handleApprove}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Başvuruyu Onayla (Şirkete Şifre Gönder & KPTO'ya İlet)
                      </button>
                    )}

                    {(selected.status === 'Submitted' || selected.status === 'ApprovedByCommittee') && (
                      <button
                        onClick={handleRevision}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Başvuru Revizesi İste
                      </button>
                    )}

                    {(selected.status === 'Submitted' ||
                      selected.status === 'RevisionRequested' ||
                      selected.status === 'ApprovedByCommittee') && (
                      <button
                        type="button"
                        onClick={handleRejectApplication}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        <XCircle className="h-4 w-4" />
                        Başvuruyu Gerekçeli Reddet
                      </button>
                    )}

                    {(selected.status === 'InProgress' || selected.status === 'CompletedPendingReview') && (
                      <button
                        type="button"
                        onClick={handleRequestLogbookRevision}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Staj Defteri İçin Revize İste
                      </button>
                    )}
                  </div>

                  {(selected.status === 'CompletedPendingReview' || selected.status === 'InProgress') && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                      <p className="text-xs font-bold text-slate-800">
                        3 Kademeli Akademik Değerlendirme Kararı:
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => setEvalResult('Successful')}
                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                            evalResult === 'Successful'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          ✔ Başarılı (Tam Kabul — {selected.workDays} Gün)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvalResult('PartiallySuccessful')}
                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                            evalResult === 'PartiallySuccessful'
                              ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          ◐ Kısmen Başarılı (Belirli Gün)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvalResult('Unsuccessful')}
                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                            evalResult === 'Unsuccessful'
                              ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          ✖ Başarısız (Kaldı)
                        </button>
                      </div>

                      {evalResult === 'PartiallySuccessful' && (
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs">
                          <label className="font-bold text-amber-950">Kabul Edilen İş Günü:</label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, selected.workDays - 1)}
                            value={acceptedDays}
                            onChange={(e) => setAcceptedDays(Number(e.target.value))}
                            className="w-24 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                          />
                          <span className="text-amber-900">
                            / {selected.workDays} İş Günü (Gerekçe notu zorunludur)
                          </span>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleEvaluate}
                          disabled={
                            evalResult === 'Successful' &&
                            logbook.filter((e) => !e.isDraft).length < selected.workDays
                          }
                          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                            evalResult === 'Unsuccessful'
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : evalResult === 'PartiallySuccessful'
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-green-700 hover:bg-green-800'
                          }`}
                        >
                          {evalResult === 'Unsuccessful' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Değerlendirme Kararını Kaydet
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Öğrencinin İlettiği Form 7 (Staj İptal Talebi) İnceleme & Önizleme Alanı */}
                <div
                  className={`rounded-xl border p-4 space-y-3 ${
                    selected.status === 'CancellationRequested'
                      ? 'border-orange-300 bg-orange-50/70'
                      : 'border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileX2
                        className={`h-4 w-4 ${
                          selected.status === 'CancellationRequested' ? 'text-orange-700' : 'text-slate-600'
                        }`}
                      />
                      <span className="text-xs font-extrabold text-slate-900">
                        Öğrenci Staj İptal Talebi (Form 7) İnceleme Alanı
                      </span>
                    </div>
                    {selected.status === 'CancellationRequested' && (
                      <span className="rounded-full bg-orange-200 px-2.5 py-0.5 text-[11px] font-extrabold text-orange-950">
                        İptal Talebi Onay Bekliyor
                      </span>
                    )}
                  </div>

                  {selected.status === 'CancellationRequested' ||
                  selected.status === 'Cancelled' ||
                  selected.documents.some((d) => d.type === 'Form7') ? (
                    <div className="space-y-3">
                      {selected.evaluationNote && (
                        <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs text-slate-800">
                          <span className="font-bold text-slate-900">Öğrencinin İptal Gerekçesi (Mazeret): </span>
                          <span>{selected.evaluationNote}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openForm7PreviewForDetail(selected)}
                          className="flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-3.5 py-2 text-xs font-bold text-orange-900 shadow-xs hover:bg-orange-100"
                        >
                          <Eye className="h-4 w-4 text-orange-700" />
                          Öğrencinin Gönderdiği Form 7 (Staj İptal Formu) Önizle
                        </button>

                        {selected.status === 'CancellationRequested' && (
                          <>
                            <button
                              type="button"
                              onClick={handleCancelInternship}
                              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              İptal Talebini Onayla (Stajı İptal Et)
                            </button>
                            <button
                              type="button"
                              onClick={handleRejectCancelRequest}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <XCircle className="h-4 w-4 text-slate-500" />
                              Talebi Reddet (Staja Devam)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Öğrenci tarafından bu staj için iletilmiş bir <b>Form 7 (Staj İptal Formu)</b> talebi bulunmamaktadır. (Staj iptal talepleri öğrenci panelinden Form 7 doldurularak başlatılır.)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEKME 1.2: YILLIK STAJ ARŞİVİ VE SORGULAMA PANELİ (Ayrı Bağımsız Panel - 1. Görsel Revizesi) */}
      {tab === 'archive' && (
        <div className="space-y-4">
          {/* Yıllara Göre Klasör / Kategori Seçim Kartları */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Yıllık Staj Arşivi & Onaylanan Stajları Sorgulama Paneli
                  </h3>
                  <p className="text-xs text-slate-500">
                    Onaylanan ve tamamlanan stajlar yıllara göre ayrılmıştır. İlgili yılı seçerek o yıla ait tüm staj kayıtlarını, belgelerini ve defterlerini sorgulayabilirsiniz.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-800 border border-indigo-200">
                Listelenen Arşiv Kaydı: {filteredArchiveList.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setArchiveYear('')}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                  archiveYear === ''
                    ? 'border-indigo-700 bg-indigo-700 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                📁 Tüm Yıllar ({archiveList.length})
              </button>
              {archiveYears.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setArchiveYear(y)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                    archiveYear === y
                      ? 'border-indigo-700 bg-indigo-700 text-white shadow-xs'
                      : 'border-indigo-200 bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100'
                  }`}
                >
                  📁 {y} Yılı Staj Arşivi
                </button>
              ))}
            </div>
          </div>

          {/* Arşiv Sorgulama Listesi ve Detay Görünümü */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
                <input
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="Arşivde öğrenci adı, öğrenci no, firma veya yıl ara..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={archiveYear}
                    onChange={(e) => setArchiveYear(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  >
                    <option value="">Tüm Yıllar</option>
                    {archiveYears.map((y) => (
                      <option key={y} value={y}>
                        {y} Yılı
                      </option>
                    ))}
                  </select>
                  <select
                    value={archiveTypeFilter}
                    onChange={(e) => setArchiveTypeFilter(e.target.value as '' | 'Staj1' | 'Staj2')}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="">Staj 1 & Staj 2</option>
                    <option value="Staj1">Sadece Staj 1</option>
                    <option value="Staj2">Sadece Staj 2</option>
                  </select>
                  <select
                    value={archiveStatusFilter}
                    onChange={(e) => setArchiveStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="">Tüm Onaylılar</option>
                    <option value="ApprovedByCommittee">Komisyon Onaylı</option>
                    <option value="InsuranceStarted">Sigortası Başlayan</option>
                    <option value="InProgress">Devam Eden</option>
                    <option value="CompletedPendingReview">Değerlendirme Bekleyen</option>
                    <option value="Passed">Başarılı (Geçti)</option>
                  </select>
                </div>
              </div>

              {filteredArchiveList.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Seçilen yıl ve kriterlere uygun onaylanmış arşiv kaydı bulunamadı.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredArchiveList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => selectArchiveInternship(item.id)}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                        archiveSelected?.id === item.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="shrink-0 rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-900">
                              {item.archiveYear || item.startDate.slice(0, 4)} YILI
                            </span>
                            <span className="font-bold text-slate-900">{item.studentName}</span>
                            <span className="text-xs text-slate-500">({item.studentNo})</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-indigo-700 truncate">
                            {item.type === 'Staj1' ? 'Staj 1' : 'Staj 2'} — {item.companyName}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            statusColors[item.status]
                          }`}
                        >
                          {statusLabels[item.status]}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {formatDate(item.startDate)} – {formatDate(item.endDate)} ({item.workDays} gün)
                        </span>
                        {item.advisorLogbookApproved && (
                          <span className="font-bold text-emerald-700">✔ Defter Onaylı</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-7">
              {!archiveSelected ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Arşiv detaylarını ve belgelerini görüntülemek için soldan bir kayıt seçiniz.
                </div>
              ) : (
                <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-extrabold text-indigo-900">
                          📁 {archiveSelected.archiveYear || archiveSelected.startDate.slice(0, 4)} YILI ARŞİV KAYDI
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            statusColors[archiveSelected.status]
                          }`}
                        >
                          {statusLabels[archiveSelected.status]}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-slate-900">
                        {archiveSelected.studentName} ({archiveSelected.studentNo})
                      </h3>
                      <p className="text-xs text-slate-500">
                        TC: <b>{archiveSelected.studentNationalId || '-'}</b> • Tel: {archiveSelected.studentPhone || '-'} •{' '}
                        {archiveSelected.studentEmail}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-blue-900">
                        {archiveSelected.companyName} — {archiveSelected.type === 'Staj1' ? 'Staj 1' : 'Staj 2'}
                      </p>
                      <p className="text-xs text-slate-600">
                        Şirket Yetkilisi: <b>{archiveSelected.advisorName}</b>
                        {archiveSelected.advisorTitle ? ` (${archiveSelected.advisorTitle})` : ''} ({archiveSelected.advisorEmail}) • Tarih:{' '}
                        <b>
                          {formatDate(archiveSelected.startDate)} – {formatDate(archiveSelected.endDate)} ({archiveSelected.workDays} İş Günü)
                        </b>
                      </p>
                      {(archiveSelected.subject || archiveSelected.advisorGraduatedDepartment || (archiveSelected.academicResult && archiveSelected.academicResult !== 'None')) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {archiveSelected.subject && (
                            <span>
                              Staj Konusu: <b className="text-slate-900">{archiveSelected.subject}</b>
                            </span>
                          )}
                          {archiveSelected.advisorGraduatedDepartment && (
                            <span>
                              • Mezuniyet: <b className="text-slate-900">{archiveSelected.advisorGraduatedDepartment}</b>
                            </span>
                          )}
                          {archiveSelected.academicResult && archiveSelected.academicResult !== 'None' && (
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                academicResultColors[archiveSelected.academicResult]
                              }`}
                            >
                              {academicResultLabels[archiveSelected.academicResult]} ({archiveSelected.acceptedDaysCount ?? 0}/{archiveSelected.workDays} Gün)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openForm2PreviewForDetail(archiveSelected)}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-700" />
                        Form 2 Önizle
                      </button>
                      <button
                        type="button"
                        onClick={() => openLogbookPreviewForDetail(archiveSelected)}
                        className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-700" />
                        Defter PDF Önizle
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500">
                      Arşivdeki Resmi Evraklar ({archiveSelected.documents.length})
                    </h4>
                    {archiveSelected.documents.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-500">Yüklü belge yok.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {archiveSelected.documents.map((d) => (
                          <div
                            key={d.id}
                            className="inline-flex items-center overflow-hidden rounded-lg border border-blue-200 bg-blue-50/60"
                          >
                            <button
                              type="button"
                              onClick={() => openDocumentPreview(d, archiveSelected)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-700" />
                              <span>
                                {docTypeLabels[d.type]} ({d.originalFileName})
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadBlob(`/documents/${d.id}`, d.originalFileName)}
                              className="border-l border-blue-200 px-2 py-1.5 text-blue-700 hover:bg-blue-200/60"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEKME 1.5: KOMİSYON DUYURU PANELİ (Madde 11, 4, 18) */}
      {tab === 'announcements' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateAnnouncement}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Megaphone className="h-5 w-5 text-blue-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Yeni Komisyon Duyurusu Yayınla</h3>
                  <p className="text-[11px] text-slate-500">
                    Yayınlanan duyurular öğrenci panelindeki Duyurular & Staj Takvimi ekranında anında gösterilir.
                  </p>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Duyuru Kategorisi</label>
                <select
                  value={newAnnouncement.category}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="General">📌 Genel Komisyon Duyurusu</option>
                  <option value="Calendar">📅 Staj Başlama ve Başvuru Takvimi</option>
                  <option value="CompanyListing">📢 Stajyer Arayan Firma Duyurusu</option>
                  <option value="Warning">⚠️ Önemli Uyarı / Son Tarih Hatırlatması</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Duyuru Başlığı *</label>
                <input
                  type="text"
                  placeholder="Örn: 2026-2027 Yaz Dönemi Staj Başlama Takvimi ve Evrak Teslimi"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Duyuru Metni / Detaylar *</label>
                <textarea
                  rows={5}
                  placeholder="Öğrencilere iletilecek duyuru metnini, staj başlama tarihlerini veya önemli kuralları yazınız..."
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"
                  required
                />
              </div>

              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={newAnnouncement.isPinned}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Üstte Sabitle (Önemli Duyuru olarak ilk sırada göster)
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-700 py-2.5 font-bold text-white hover:bg-blue-800"
              >
                <Megaphone className="h-4 w-4" />
                Duyuruyu Öğrencilere Yayınla
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900">
              Aktif Komisyon Duyuruları ({announcements.length})
            </h3>
            {announcements.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Henüz yayınlanmış duyuru bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 text-xs ${
                      a.category === 'Calendar'
                        ? 'border-blue-200 bg-blue-50/50'
                        : a.category === 'CompanyListing'
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : a.category === 'Warning'
                        ? 'border-amber-300 bg-amber-50/60'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-700 border border-slate-200">
                            {a.category === 'Calendar'
                              ? 'STAJ TAKVİMİ'
                              : a.category === 'CompanyListing'
                              ? 'FİRMA İLANI DUYURUSU'
                              : a.category === 'Warning'
                              ? 'ÖNEMLİ UYARI'
                              : 'GENEL DUYURU'}
                          </span>
                          {a.isPinned && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              📌 Sabitli
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">{formatDate(a.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 text-sm font-bold text-slate-900">{a.title}</p>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-700">{a.content}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700"
                        title="Duyuruyu Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEKME 2: İZİN / TELAFİ TALEPLERİ */}
      {tab === 'leaves' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="font-bold text-slate-900">
            Öğrenci İzin ve Sağlık Raporu Talepleri (Onaylandığında Bitiş Tarihi Otomatik Ötelenir & KPTO'ya Bildirilir)
          </h3>
          {leaves.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Kayıtlı izin talebi bulunmuyor.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-200">
              {leaves.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-4 py-3 text-xs">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {l.studentName} — <span className="text-indigo-700">{l.companyName}</span>
                    </p>
                    <p className="text-slate-600">
                      <b>{l.type === 'MedicalReport' ? 'Sağlık Raporu' : 'Mazeret İzni'}:</b> {l.days} İş Günü (Başlangıç:{' '}
                      {formatDate(l.startDate)}) — Gerekçe: {l.reason}
                    </p>
                    {l.newEndDate && (
                      <p className="font-semibold text-emerald-700">
                        Bitiş Tarihi Güncellendi: {formatDate(l.oldEndDate)} → {formatDate(l.newEndDate)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {l.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => handleApproveLeave(l.id)}
                          className="rounded-lg bg-emerald-600 px-3.5 py-2 font-bold text-white hover:bg-emerald-700"
                        >
                          Onayla ve Tarihi Ötele
                        </button>
                        <button
                          onClick={() => handleRejectLeave(l.id)}
                          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Reddet
                        </button>
                      </>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 font-bold ${
                          l.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {l.status === 'Approved' ? 'Onaylandı' : 'Reddedildi'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEKME 3: DÖNEM TAKVİMİ, RESMİ TATİLLER VE ARŞİVLEME */}
      {tab === 'calendar' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sol: Dönem Açma */}
          <div className="space-y-6 lg:col-span-6">
            <form
              onSubmit={handleCreateTerm}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
            >
              <h3 className="font-bold text-slate-900">Yeni Staj Dönemi Aç (Staj 1 / Staj 2)</h3>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700">Dönem Adı</label>
                  <input
                    type="text"
                    value={newTerm.name}
                    onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Akademik Yıl</label>
                  <input
                    type="text"
                    value={newTerm.academicYear}
                    onChange={(e) => setNewTerm({ ...newTerm, academicYear: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Staj Türü</label>
                  <select
                    value={newTerm.internshipType}
                    onChange={(e) =>
                      setNewTerm({ ...newTerm, internshipType: e.target.value as 'Staj1' | 'Staj2' })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="Staj1">Staj 1</option>
                    <option value="Staj2">Staj 2</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Başvuru Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={newTerm.applicationStartDate}
                    onChange={(e) => setNewTerm({ ...newTerm, applicationStartDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Son Başvuru Tarihi</label>
                  <input
                    type="date"
                    value={newTerm.applicationDeadline}
                    onChange={(e) => setNewTerm({ ...newTerm, applicationDeadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">En Erken Başlama</label>
                  <input
                    type="date"
                    value={newTerm.earliestStartDate}
                    onChange={(e) => setNewTerm({ ...newTerm, earliestStartDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">En Geç Bitiş</label>
                  <input
                    type="date"
                    value={newTerm.latestEndDate}
                    onChange={(e) => setNewTerm({ ...newTerm, latestEndDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-bold text-slate-700">Rapor Teslim Tarihi</label>
                  <input
                    type="date"
                    value={newTerm.reportDeadline}
                    onChange={(e) => setNewTerm({ ...newTerm, reportDeadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newTerm.isSaturdayAllowed}
                    onChange={(e) => setNewTerm({ ...newTerm, isSaturdayAllowed: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  Bu dönemde Cumartesi çalışmasına izin ver (Cumartesi iş günü seçilebilir)
                </label>
                <label className="col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-900">
                  <input
                    type="checkbox"
                    checked={newTerm.publishAnnouncement}
                    onChange={(e) => setNewTerm({ ...newTerm, publishAnnouncement: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  Bu dönemi oluştururken öğrencilere otomatik Takvim Duyurusu yayınla
                </label>
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                Staj Takvimini Güncelle / Kaydet
              </button>
            </form>

            {/* Kayıtlı Staj Dönemleri Özeti */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
              <h4 className="font-bold text-slate-900">
                Kayıtlı Staj Dönemleri ({terms.length})
              </h4>
              <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto text-xs">
                {terms.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-bold text-slate-900">
                        {t.name} ({t.internshipType === 'Staj1' ? 'Staj 1' : 'Staj 2'})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Başvuru: {t.applicationStartDate ? formatDate(t.applicationStartDate) : '-'} – {formatDate(t.applicationDeadline)} • Staj: {formatDate(t.earliestStartDate)} – {formatDate(t.latestEndDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          t.isSaturdayAllowed === false
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {t.isSaturdayAllowed === false ? 'Cmt Hariç' : 'Cmt Serbest'}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {t.applicationCount} Başvuru
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Yıllara Göre Onaylanan Staj Arşivi Sorgulama Kartı (Madde 12 & 17: Mevcut Dönem Kaldırıldı) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900">
                Yıllara Göre Onaylanan Stajlar Arşivi (Hızlı Sorgulama)
              </h4>
              <p className="text-xs text-slate-500">
                Onaylanan ve tamamlanan stajlar otomatik olarak yıllara göre ayrılır. İlgili yıla tıklayarak o yılın stajlarını sorgulayabilirsiniz.
              </p>
              <div className="flex flex-wrap gap-2">
                {archiveYears.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setArchiveYear(y);
                      setTab('archive');
                    }}
                    className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
                  >
                    <Archive className="h-4 w-4 text-indigo-700" />
                    {y} Yılı Onaylanan Stajlarını Listele →
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ: Yıllık Arşivleme, Tarih Simülatörü ve Resmi Tatiller */}
          <div className="space-y-6 lg:col-span-6">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-4">
              <div>
                <h4 className="font-bold text-indigo-950">
                  Sunum / Test İçin Otomatik Yaşam Döngüsü (Tarih Simülatörü)
                </h4>
                <p className="text-xs text-indigo-800">
                  Seçilen tarihe göre stajın başlaması ("1. Gün"), bitime 1 hafta kala uyarısı ve staj bitişinde dosyanın Komisyona düşmesini anında tetikler.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="date"
                    value={simDate}
                    onChange={(e) => setSimDate(e.target.value)}
                    className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <button
                    onClick={handleRunLifecycle}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-800"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Tarihi Simüle Et & Durumları Güncelle
                  </button>
                </div>
              </div>

              <div className="border-t border-indigo-200 pt-3">
                <h4 className="font-bold text-indigo-950">Yıllık Arşivleme</h4>
                <p className="text-xs text-indigo-800">
                  Belirtilen yıldaki tamamlanmış (Geçti / Kaldı) stajları yıllık arşive taşır.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={archiveInputYear}
                    onChange={(e) => setArchiveInputYear(e.target.value)}
                    className="w-28 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs"
                  />
                  <button
                    onClick={handleArchiveYear}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {archiveInputYear} Yılı Arşivine Taşı
                  </button>
                </div>
              </div>

              <div className="border-t border-indigo-200 pt-3">
                <h4 className="font-bold text-rose-900">
                  Test Staj Kayıtlarını Sıfırla (Kullanıcı Profilleri Korunur)
                </h4>
                <p className="text-xs text-rose-800">
                  Öğrenci ve personel hesaplarına dokunmadan tüm staj başvurularını, üretilen belgeleri (Form 2, Form 7, SPAS), sanal defterleri ve izin geçmişini temizler.
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleResetInternships}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Tüm Staj Başvurularını ve Test Belgelerini Temizle
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900">
                Resmi Tatiller (İş Günü Hesaplayıcıda Otomatik Düşülür)
              </h4>
              <form onSubmit={handleAddHoliday} className="flex gap-2">
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                  required
                />
                <input
                  type="text"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="Tatil Adı..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  required
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Ekle
                </button>
              </form>
              <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto text-xs">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2">
                    <span>
                      <b>{formatDate(h.date)}</b> — {h.name}
                    </span>
                    <button
                      onClick={async () => {
                        await api.delete(`/holidays/${h.id}`);
                        loadOtherTabs();
                      }}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 4: FİRMA HAVUZU, İSTATİSTİKLER VE İLANLAR */}
      {tab === 'companies' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-slate-900">
              Firma Arşivi ve İstatistikleri (Hangi Firmada Kaç Öğrenci Staj Yaptı?)
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Firma Adı</th>
                    <th className="px-3 py-2.5">Şehir / Sektör</th>
                    <th className="px-3 py-2.5 text-center">Toplam Stajyer</th>
                    <th className="px-3 py-2.5 text-center">Başarılı (Geçti)</th>
                    <th className="px-3 py-2.5 text-center">Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {companyStats.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2.5 font-bold text-slate-900">{c.name}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {c.city || '-'} / {c.sector || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-extrabold text-blue-700">
                        {c.totalInternships}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-700">
                        {c.passedCount}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-indigo-700">
                        {c.activeCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <form
              onSubmit={handleCreateListing}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5 text-xs"
            >
              <h4 className="text-sm font-bold text-slate-900">
                Stajyer Arayan Firma İlanı Yayınla (Öğrencilere Duyuru Olarak Gösterilir)
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Kayıtlı Firmalardan Seç (Veya Aşağıya Yazın)
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const found = companyStats.find((c) => c.id === e.target.value);
                    if (found) {
                      setNewListing({
                        ...newListing,
                        companyName: found.name,
                        city: found.city || newListing.city,
                        sector: found.sector || newListing.sector,
                      });
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs"
                >
                  <option value="">-- Sistemde Kayıtlı Firmalardan Otomatik Doldur --</option>
                  {companyStats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || 'Şehir Yok'})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Firma Adı *"
                value={newListing.companyName}
                onChange={(e) => setNewListing({ ...newListing, companyName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="İlan Başlığı *"
                value={newListing.title}
                onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <textarea
                rows={3}
                placeholder="İlan Detayı / Aranan Kriterler *"
                value={newListing.description}
                onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Şehir"
                  value={newListing.city}
                  onChange={(e) => setNewListing({ ...newListing, city: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="İletişim E-posta / Link"
                  value={newListing.contact}
                  onChange={(e) => setNewListing({ ...newListing, contact: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Sektör (Örn: Savunma / Yazılım)"
                  value={newListing.sector}
                  onChange={(e) => setNewListing({ ...newListing, sector: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Hedef Bölüm / Alan"
                  value={newListing.department}
                  onChange={(e) => setNewListing({ ...newListing, department: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Kontenjan (Örn: 5)"
                  value={newListing.quota}
                  onChange={(e) => setNewListing({ ...newListing, quota: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="date"
                  value={newListing.deadline}
                  onChange={(e) => setNewListing({ ...newListing, deadline: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 py-2 font-bold text-white hover:bg-blue-800"
              >
                İlanı Yayınla
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">Yayınlanan İlanlar</h4>
              {listings.map((l) => (
                <div key={l.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{l.title}</p>
                    <p className="text-slate-500">
                      {l.companyName}
                      {l.sector ? ` • ${l.sector}` : ''}
                      {l.department ? ` • ${l.department}` : ''}
                      {l.quota != null ? ` • Kontenjan: ${l.quota}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await api.delete(`/listings/${l.id}`);
                      loadOtherTabs();
                    }}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEKME 5: PERSONEL YÖNETİMİ (BÖLÜM BAŞKANI) */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateStaff}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs"
            >
              <h3 className="text-sm font-bold text-slate-900">
                Yeni Personel Ekle (Komisyon Üyesi / KPTO Yetkilisi)
              </h3>
              <input
                type="text"
                placeholder="Ad Soyad ve Unvan *"
                value={newStaff.fullName}
                onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <input
                type="email"
                placeholder="Kurumsal E-Posta *"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="CommitteeMember">Staj Komisyonu Üyesi</option>
                <option value="KptoOfficer">KPTO / Sigorta Birimi</option>
                <option value="DepartmentHead">Bölüm Başkanı</option>
              </select>
              <input
                type="password"
                placeholder="Geçici Parola *"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 py-2.5 font-bold text-white hover:bg-blue-800"
              >
                Personel Hesabı Oluştur
              </button>
            </form>
          </div>
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="font-bold text-slate-900">Sistemdeki Kullanıcılar ({users.length})</h3>
            <div className="mt-3 max-h-96 divide-y divide-slate-200 overflow-y-auto text-xs">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-bold text-slate-900">{u.fullName}</p>
                    <p className="text-slate-500">
                      {u.email} • <b>{roleLabels[u.role]}</b>
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-bold ${
                      u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gönderilen E-Posta & Geçici Şifre Simülasyon Modalı */}
      {showEmailModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    📨 Gönderilen Bilgilendirme E-Postası & Giriş Bilgileri
                  </h3>
                  <p className="text-xs text-slate-500">
                    Yerel Sunum / Test E-Posta Önizlemesi ({selected.advisorEmail})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
              <div>
                <span className="font-bold text-slate-500">Kimden:</span>{' '}
                <span className="font-semibold text-slate-800">
                  Selçuk Üniversitesi Bilgisayar Müh. Staj Komisyonu &lt;staj@selcuk.edu.tr&gt;
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Kime:</span>{' '}
                <span className="font-bold text-indigo-700">
                  {selected.advisorName} &lt;{selected.advisorEmail}&gt;
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500">Konu:</span>{' '}
                <span className="font-bold text-slate-900">
                  [S.Ü. Staj Sistemi] Stajyer Onayı ve Şirket Danışmanı Paneli Giriş Bilgileriniz
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-white p-4 text-xs leading-relaxed text-slate-700 space-y-3">
              <p>
                Sayın <b>{selected.advisorName}</b> (Sorumlu Mühendis),
              </p>
              <p>
                Kurumunuz <b>{selected.companyName}</b> bünyesinde staj yapacak olan Selçuk Üniversitesi
                Teknoloji Fakültesi Bilgisayar Mühendisliği Bölümü öğrencisi{' '}
                <b>
                  {selected.studentName} ({selected.studentNo})
                </b>{' '}
                için staj başvurusu Staj Komisyonumuz tarafından onaylanmıştır.
              </p>
              <p>
                Öğrencimizin günlük staj raporlarını (Sanal Staj Defteri) incelemek, gerekirse revize talep
                etmek ve staj sonunda onaylamak için aşağıdaki giriş bilgileriyle{' '}
                <b>Şirket Yetkilisi Paneli</b>'ne giriş yapabilirsiniz:
              </p>

              {(() => {
                const match = selected.advisorEmailStatus?.match(/geçici şifre \(([^)]+)\)/i);
                const extractedPass = match ? match[1] : 'Danisman123!';
                return (
                  <div className="rounded-xl border-2 border-indigo-300 bg-indigo-50/80 p-3.5 space-y-1.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900">
                      🔐 Şirket Danışmanı (Sorumlu Mühendis) Giriş Bilgileri
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-xs">
                      <div>
                        <span className="text-slate-500">E-Posta (Kullanıcı Adı):</span>
                        <p className="font-mono font-bold text-slate-900 select-all">
                          {selected.advisorEmail}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Geçici Giriş Şifresi:</span>
                        <p className="font-mono text-sm font-extrabold text-indigo-700 select-all">
                          {extractedPass}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <p className="text-[11px] text-slate-500">
                Sistem Durum Kaydı: {selected.advisorEmailStatus || 'Hesap aktif.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-xl bg-indigo-700 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-800"
              >
                Tamam, Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Belge Önizleme Modalı (Form 2, SPAS, Defter PDF, Sonuç Formu vb.) */}
      {previewModal && (
        <DocumentPreviewModal
          title={previewModal.title}
          subtitle={previewModal.subtitle}
          sources={previewModal.sources}
          initialIndex={previewModal.initialIndex}
          onClose={() => setPreviewModal(null)}
        />
      )}

      {emailHistoryScope && (
        <EmailHistoryModal
          internshipId={emailHistoryScope.internshipId}
          title={emailHistoryScope.title}
          onClose={() => setEmailHistoryScope(null)}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: number | string;
  color: string;
  active: boolean;
  subtitle: string;
  onClick: () => void;
}> = ({ label, value, color, active, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
      active
        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/25 shadow-sm'
        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs'
    }`}
  >
    <div className="flex w-full items-center justify-between gap-1">
      <span className="block text-[11px] font-bold text-slate-500 uppercase">{label}</span>
      {active ? (
        <ChevronUp className="h-3.5 w-3.5 text-blue-700" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100" />
      )}
    </div>
    <span className={`mt-1 block text-xl font-extrabold ${color}`}>{value}</span>
    <span
      className={`mt-1 block text-[10px] font-semibold ${
        active ? 'text-blue-800' : 'text-slate-400 group-hover:text-slate-600'
      }`}
    >
      {active ? '● Filtre Aktif' : subtitle}
    </span>
  </button>
);
