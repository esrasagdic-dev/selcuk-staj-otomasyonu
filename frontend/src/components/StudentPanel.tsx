import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FileX2,
  FolderCheck,
  Lock,
  Mail,
  Megaphone,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  api,
  docTypeLabels,
  downloadBlob,
  formatDate,
  getErrorMessage,
  statusColors,
  statusLabels,
  type AnnouncementDto,
  type CompanyDto,
  type DocumentType,
  type EndDateResponse,
  type InternshipDetailDto,
  type InternshipType,
  type LeaveType,
  type ListingDto,
  type LogbookEntryDto,
  type TermDto,
  type UserDto,
} from '../api';
import { DocumentPreviewModal, type PreviewSource } from './DocumentPreviewModal';

interface Props {
  user: UserDto;
  onUserUpdated: (u: UserDto) => void;
}

const APPROVED_STATUSES = [
  'ApprovedByCommittee',
  'InsuranceStarted',
  'InProgress',
  'CompletedPendingReview',
  'Passed',
];

export const StudentPanel: React.FC<Props> = ({ user, onUserUpdated }) => {
  const [mainTab, setMainTab] = useState<
    'internships' | 'documents' | 'logbook' | 'leaves' | 'announcements'
  >('internships');
  const [guideChecked, setGuideChecked] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(!user.hasAcceptedGuide);

  const [internships, setInternships] = useState<InternshipDetailDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [terms, setTerms] = useState<TermDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [logbook, setLogbook] = useState<LogbookEntryDto[]>([]);

  // Yeni / Düzenleme Başvuru Formu
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInternshipType, setSelectedInternshipType] = useState<InternshipType>('Staj1');
  const [termId, setTermId] = useState('');
  const [useNewCompany, setUseNewCompany] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [newCompany, setNewCompany] = useState({
    name: '',
    sector: '',
    city: '',
    address: '',
    phone: '',
    email: '',
  });
  const [advisorName, setAdvisorName] = useState('');
  const [advisorEmail, setAdvisorEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [workDays, setWorkDays] = useState(20);
  const [startDate, setStartDate] = useState('2026-07-01');
  const [worksOnSaturday, setWorksOnSaturday] = useState(false);
  const [receivesSalary, setReceivesSalary] = useState(false);
  const [calcPreview, setCalcPreview] = useState<EndDateResponse | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Sanal Staj Defteri (Word Rapor Görünümü State)
  const [wordViewMode, setWordViewMode] = useState<'cover' | 'intro' | 'page'>('page');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logTitle, setLogTitle] = useState('');
  const [logContent, setLogContent] = useState('');

  // İzin / Rapor Formu
  const [leaveType, setLeaveType] = useState<LeaveType>('MedicalReport');
  const [leaveStart, setLeaveStart] = useState('2026-07-10');
  const [leaveDays, setLeaveDays] = useState(2);
  const [leaveReason, setLeaveReason] = useState('');

  // Form 7 (Staj İptal Talebi) Modal State'leri
  const [showForm7Modal, setShowForm7Modal] = useState(false);
  const [form7Reason, setForm7Reason] = useState('');
  const [form7EduType, setForm7EduType] = useState<'NÖ' | 'İÖ'>('NÖ');
  const [form7NationalId, setForm7NationalId] = useState(user.nationalId ?? '');
  const [form7Phone, setForm7Phone] = useState(user.phone ?? '');
  const [submittingForm7, setSubmittingForm7] = useState(false);

  // Belge Önizleme Modalı State'i
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    subtitle?: string;
    sources: PreviewSource[];
    initialIndex?: number;
  } | null>(null);

  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!user.hasAcceptedGuide) {
      setShowGuideModal(true);
      setGuideChecked(false);
    }
  }, [user.hasAcceptedGuide]);

  const selected = internships.find((x) => x.id === selectedId) ?? internships[0] ?? null;
  const isApprovedInternship = selected ? APPROVED_STATUSES.includes(selected.status) : false;
  const verifiedStudentNo =
    user.studentNo || (user.email.includes('@') ? user.email.split('@')[0] : '');

  const loadAll = async () => {
    try {
      const [myRes, termRes, compRes, listRes, annRes] = await Promise.all([
        api.get<InternshipDetailDto[]>('/internships/mine'),
        api.get<TermDto[]>('/terms?onlyOpen=true'),
        api.get<CompanyDto[]>('/companies'),
        api.get<ListingDto[]>('/listings?onlyActive=true'),
        api.get<AnnouncementDto[]>('/announcements?onlyActive=true'),
      ]);
      setInternships(myRes.data);
      setTerms(termRes.data);
      setCompanies(compRes.data);
      setListings(listRes.data);
      setAnnouncements(annRes.data);
      if (termRes.data.length > 0 && !termId) {
        setTermId(termRes.data[0].id);
        setSelectedInternshipType(termRes.data[0].internshipType);
      }
      if (myRes.data.length > 0 && !selectedId) {
        setSelectedId(myRes.data[0].id);
      }
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const selectEntryForEdit = (entry: LogbookEntryDto) => {
    setWordViewMode('page');
    setActiveEntryId(entry.id);
    setPageNumber(entry.dayNumber);
    setLogDate(entry.date.split('T')[0]);
    setLogTitle(entry.title);
    setLogContent(entry.content);
  };

  const openBlankNewPage = (entriesList: LogbookEntryDto[] = logbook) => {
    setWordViewMode('page');
    const maxDays = selected?.workDays ?? 20;
    const usedDays = new Set(entriesList.map((x) => x.dayNumber));
    let nextNo = 1;
    while (nextNo <= maxDays && usedDays.has(nextNo)) {
      nextNo++;
    }
    if (nextNo > maxDays) {
      setMsg({
        type: 'err',
        text: `Staj süreniz ${maxDays} iş günüdür. Tüm iş günleri (${maxDays}/${maxDays} gün) doldurulmuştur, ${maxDays} günden fazla rapor sayfası açılamaz.`,
      });
      if (entriesList.length > 0) {
        selectEntryForEdit(entriesList[entriesList.length - 1]);
      }
      return;
    }
    setActiveEntryId(null);
    setPageNumber(nextNo);
    setLogDate(
      selected?.startDate
        ? selected.startDate.split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setLogTitle('');
    setLogContent('');
  };

  useEffect(() => {
    if (selected) {
      api
        .get<LogbookEntryDto[]>(`/internships/${selected.id}/logbook`)
        .then((r) => {
          setLogbook(r.data);
          if (r.data.length > 0) {
            selectEntryForEdit(r.data[0]);
          } else {
            openBlankNewPage([]);
          }
        })
        .catch(() => {});
    }
  }, [selected?.id]);

  // Otomatik İş Günü ve Bitiş Tarihi Hesaplayıcı (Cumartesi çalışıyor mu dahil - Madde 2)
  useEffect(() => {
    if (!showForm || !startDate || !workDays) return;
    setCalcError(null);
    api
      .post<EndDateResponse>('/workdays/calculate', {
        startDate,
        workDays,
        worksOnSaturday,
      })
      .then((r) => setCalcPreview(r.data))
      .catch((err) => {
        setCalcPreview(null);
        setCalcError(getErrorMessage(err));
      });
  }, [showForm, startDate, workDays, worksOnSaturday]);

  const handleAcceptGuide = async () => {
    try {
      const { data } = await api.post<UserDto>('/auth/accept-guide');
      onUserUpdated(data);
      setShowGuideModal(false);
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleSelectType = (type: InternshipType) => {
    setSelectedInternshipType(type);
    const matchingTerm = terms.find((t) => t.internshipType === type) ?? terms[0];
    if (matchingTerm) {
      setTermId(matchingTerm.id);
    }
  };

  const openNewApplication = () => {
    setEditingId(null);
    const defaultTerm = terms.find((t) => t.internshipType === 'Staj1') ?? terms[0];
    if (defaultTerm) {
      setTermId(defaultTerm.id);
      setSelectedInternshipType(defaultTerm.internshipType);
    }
    setUseNewCompany(false);
    setCompanyId(companies[0]?.id ?? '');
    setCompanySearch('');
    setAdvisorName('');
    setAdvisorEmail('');
    setDepartment('Yazılım Geliştirme / Ar-Ge');
    setWorkDays(20);
    setStartDate('2026-07-01');
    setWorksOnSaturday(false);
    setReceivesSalary(false);
    setShowForm(true);
  };

  const openEditApplication = (i: InternshipDetailDto) => {
    setEditingId(i.id);
    setTermId(i.termId);
    setSelectedInternshipType(i.type);
    setUseNewCompany(false);
    setCompanyId(i.companyId);
    setCompanySearch('');
    setAdvisorName(i.advisorName);
    setAdvisorEmail(i.advisorEmail);
    setDepartment(i.department ?? '');
    setWorkDays(i.workDays);
    setStartDate(i.startDate);
    setWorksOnSaturday(i.worksOnSaturday ?? false);
    setReceivesSalary(i.receivesSalary);
    setShowForm(true);
  };

  const handleSaveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const resolvedTermId =
      termId ||
      terms.find((t) => t.internshipType === selectedInternshipType)?.id ||
      terms[0]?.id ||
      '';
    const payload = {
      termId: resolvedTermId,
      companyId: useNewCompany ? null : companyId || null,
      newCompany: useNewCompany ? newCompany : null,
      advisorName,
      advisorEmail,
      workDays,
      startDate,
      department,
      receivesSalary,
      worksOnSaturday,
    };
    try {
      const res = editingId
        ? await api.put<InternshipDetailDto>(`/internships/${editingId}`, payload)
        : await api.post<InternshipDetailDto>('/internships', payload);
      setShowForm(false);
      setSelectedId(res.data.id);
      setMainTab('internships');
      setMsg({
        type: 'ok',
        text: 'Staj başvurunuz kaydedildi. Şimdi Zorunlu Belgeler panelinden resmi Form 2 (Staj Kabul Formu) belgenizi indirip imzalatarak SPAS belgesiyle birlikte yükleyebilirsiniz.',
      });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleUploadDoc = async (type: DocumentType, file?: File) => {
    if (!file || !selected) return;
    setMsg(null);
    const fd = new FormData();
    fd.append('type', type);
    fd.append('file', file);
    try {
      await api.post(`/internships/${selected.id}/documents`, fd);
      setMsg({ type: 'ok', text: `${docTypeLabels[type]} başarıyla yüklendi.` });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setMsg(null);
    try {
      await api.delete(`/documents/${docId}`);
      setMsg({ type: 'ok', text: 'Belge silindi.' });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleSubmitToCommittee = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      await api.post(`/internships/${selected.id}/submit`);
      setMsg({
        type: 'ok',
        text: `Başvurunuz öğrenci numaranız (${verifiedStudentNo}) doğrulanarak Staj Komisyonu onayına gönderildi!`,
      });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleSaveLogbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (pageNumber < 1 || pageNumber > selected.workDays) {
      setMsg({
        type: 'err',
        text: `Staj süreniz ${selected.workDays} iş günüdür. En fazla ${selected.workDays} günlük staj defteri yazabilirsiniz (${pageNumber}. gün açılamaz).`,
      });
      return;
    }
    setMsg(null);
    try {
      const saved = await api.post<LogbookEntryDto>(`/internships/${selected.id}/logbook`, {
        id: activeEntryId,
        pageNumber,
        date: logDate,
        title: logTitle,
        content: logContent,
      });
      setMsg({
        type: 'ok',
        text: activeEntryId
          ? `${saved.data.dayNumber}. sayfa staj raporu güncellendi.`
          : `${saved.data.dayNumber}. sayfa staj raporu kaydedildi.`,
      });
      const { data } = await api.get<LogbookEntryDto[]>(`/internships/${selected.id}/logbook`);
      setLogbook(data);
      const found = data.find((x) => x.id === saved.data.id);
      if (found) selectEntryForEdit(found);
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleDeleteLogEntry = async (entryId: string) => {
    if (!selected) return;
    setMsg(null);
    try {
      await api.delete(`/internships/${selected.id}/logbook/${entryId}`);
      const { data } = await api.get<LogbookEntryDto[]>(`/internships/${selected.id}/logbook`);
      setLogbook(data);
      if (data.length > 0) {
        selectEntryForEdit(data[data.length - 1]);
      } else {
        openBlankNewPage([]);
      }
      setMsg({ type: 'ok', text: 'Rapor sayfası silindi.' });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  // Madde 6 & 16: Staj defteri dolduğunda sorumlu mühendise gönderme
  const handleSubmitLogbookToAdvisor = async () => {
    if (!selected) return;
    setMsg(null);
    try {
      await api.post(`/internships/${selected.id}/logbook/submit-to-advisor`);
      setMsg({
        type: 'ok',
        text: `Staj defteriniz (${logbook.length}/${selected.workDays} gün) sorumlu mühendis ${selected.advisorName} (${selected.advisorEmail}) onayına gönderildi ve bilgilendirme e-postası iletildi!`,
      });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setMsg(null);
    try {
      await api.post(`/internships/${selected.id}/leaves`, {
        type: leaveType,
        startDate: leaveStart,
        days: leaveDays,
        reason: leaveReason,
      });
      setLeaveReason('');
      setMsg({
        type: 'ok',
        text: 'İzin / Rapor talebiniz Komisyon onayına gönderildi. Onaylandığında bitiş tarihiniz otomatik ötelenecek ve KPTO bilgilendirilecektir.',
      });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    }
  };

  // =========================================================================
  //  FORM 7 (STAJ İPTAL TALEBİ) FONKSİYONLARI
  // =========================================================================

  const openForm7Modal = () => {
    if (!selected) return;
    setForm7Reason(selected.evaluationNote || '');
    setForm7NationalId(selected.studentNationalId || user.nationalId || '');
    setForm7Phone(selected.studentPhone || user.phone || '');
    setForm7EduType('NÖ');
    setShowForm7Modal(true);
  };

  const handlePreviewForm7 = () => {
    if (!selected) return;
    if (!form7Reason.trim()) {
      setMsg({
        type: 'err',
        text: 'Önizleme için lütfen önce mazeret / iptal gerekçesi alanını doldurunuz.',
      });
      return;
    }
    setPreviewModal({
      title: 'Staj İptal Formu (Form 7) — Canlı Önizleme',
      subtitle: `${user.fullName} (${verifiedStudentNo}) — ${selected.companyName}`,
      sources: [
        {
          label: 'Doldurulmuş Form 7 PDF Önizleme',
          url: `/internships/${selected.id}/form7/preview`,
          fallbackFileName: `Form7_Staj_Iptal_${verifiedStudentNo}_${selected.type}.pdf`,
          postBody: {
            reason: form7Reason,
            educationType: form7EduType,
            nationalId: form7NationalId,
            phone: form7Phone,
          },
        },
      ],
      initialIndex: 0,
    });
  };

  const handleSubmitForm7 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!form7Reason.trim()) {
      setMsg({ type: 'err', text: 'Lütfen staj iptal gerekçenizi (Mazeret) yazınız.' });
      return;
    }
    setSubmittingForm7(true);
    setMsg(null);
    try {
      await api.post(`/internships/${selected.id}/form7/submit`, {
        reason: form7Reason,
        educationType: form7EduType,
        nationalId: form7NationalId,
        phone: form7Phone,
      });
      setShowForm7Modal(false);
      setMsg({
        type: 'ok',
        text: 'Staj İptal Formunuz (Form 7) otomatik oluşturularak başvurunuza eklendi ve Staj Komisyonu onayına gönderildi.',
      });
      await loadAll();
    } catch (err) {
      setMsg({ type: 'err', text: getErrorMessage(err) });
    } finally {
      setSubmittingForm7(false);
    }
  };

  const openSubmittedForm7Preview = () => {
    if (!selected) return;
    const form7Doc = selected.documents.find((d) => d.type === 'Form7');
    const sources: PreviewSource[] = [];
    if (form7Doc) {
      sources.push({
        label: 'Komisyona Gönderilen Form 7 PDF',
        url: `/documents/${form7Doc.id}`,
        fallbackFileName: form7Doc.originalFileName,
      });
    }
    sources.push({
      label: 'Sistem Form 7 Şablonu',
      url: `/internships/${selected.id}/pdf/form7`,
      fallbackFileName: `Form7_${verifiedStudentNo}_${selected.type}.pdf`,
    });

    setPreviewModal({
      title: 'Staj İptal Formu (Form 7) Önizleme',
      subtitle: `${user.fullName} (${verifiedStudentNo}) — ${selected.companyName}`,
      sources,
      initialIndex: 0,
    });
  };

  const filteredCompanies = companies.filter(
    (c) =>
      !companySearch ||
      c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
      (c.city ?? '').toLowerCase().includes(companySearch.toLowerCase())
  );

  // Yeni firma yazarken bile sistemde benzer kayıtlı firma varsa göstermek için (Madde 3)
  const matchingRegisteredCompanies = newCompany.name.trim()
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(newCompany.name.trim().toLowerCase())
      )
    : [];

  const currentEntryIndex = activeEntryId
    ? logbook.findIndex((x) => x.id === activeEntryId)
    : -1;

  const isLogbookComplete = selected ? logbook.length >= selected.workDays : false;

  // Madde 14: Staj bitimine 1 hafta kala uyarısı kontrolü
  const isEndingWithinOneWeek = (() => {
    if (!selected) return false;
    if (selected.endingSoonNotified) return true;
    if (selected.status !== 'InProgress' && selected.status !== 'InsuranceStarted') return false;
    const endMs = new Date(selected.endDate).getTime();
    const nowMs = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24));
    const remainingWorkDays =
      selected.currentDay && selected.currentDay > 0
        ? selected.workDays - selected.currentDay
        : 99;
    return (diffDays >= 0 && diffDays <= 7) || remainingWorkDays <= 5;
  })();

  // Madde 9: Öğrenci Paneli Akış Takibi (Adımlar ilerledikçe ilerleyen Stepper)
  const getWorkflowStepIndex = (item: InternshipDetailDto | null): number => {
    if (!item) return 0;
    if (item.status === 'Passed') return 6;
    if (item.status === 'CompletedPendingReview') return 5;
    if (item.advisorLogbookApproved) return 5;
    if (item.logbookSubmittedToAdvisorAt) return 4;
    if (item.status === 'InProgress' || (item.currentDay && item.currentDay > 0)) return 3;
    if (item.status === 'InsuranceStarted' || item.kptoStatus === 'InsuranceActive') return 2;
    if (item.status === 'ApprovedByCommittee') return 2;
    if (item.status === 'Submitted') return 1;
    return 0; // Draft or RevisionRequested
  };

  const activeStepIndex = getWorkflowStepIndex(selected);
  const workflowSteps = [
    {
      step: 1,
      title: '1. Başvuru & Evraklar',
      desc: 'Form 2 ve SPAS Yükleme',
    },
    {
      step: 2,
      title: '2. Komisyon Onayı',
      desc: 'Başvuru İnceleme',
    },
    {
      step: 3,
      title: '3. SGK Sigorta Girişi',
      desc: 'KPTO Sigorta Başlatma',
    },
    {
      step: 4,
      title: '4. Aktif Staj & Defter',
      desc:
        selected && selected.currentDay && selected.currentDay > 0
          ? `${selected.currentDay}. Gün / ${selected.workDays} İş Günü`
          : 'Günlük Rapor Yazımı',
    },
    {
      step: 5,
      title: '5. Sorumlu Mühendis Onayı',
      desc: selected?.advisorLogbookApproved
        ? 'Mühendis Onayladı'
        : selected?.logbookSubmittedToAdvisorAt
        ? 'Mühendis İnceliyor'
        : 'Defter Gönderimi',
    },
    {
      step: 6,
      title: '6. Komisyon Son Onayı',
      desc: selected?.status === 'Passed' ? 'Staj Tamamlandı (GEÇTİ)' : 'Değerlendirme & Arşiv',
    },
  ];

  return (
    <div className="space-y-6">
      {/* MADDE 1: HER ÖĞRENCİ GİRİŞİNDE ZORUNLU BİLGİLENDİRME EKRANI */}
      {(!user.hasAcceptedGuide || showGuideModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-blue-200">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 uppercase">
                  Her Girişte Zorunlu Bilgilendirme
                </span>
                <h2 className="mt-0.5 text-xl font-bold text-slate-900">
                  Zorunlu Staj Yönergesi, Kurallar ve Süreç Bilgilendirmesi
                </h2>
                <p className="text-xs text-slate-500">
                  Öğrenci paneline geçmeden önce aşağıdaki staj kurallarını ve süreç adımlarını okuyup onaylamanız zorunludur.
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-bold text-slate-900">📌 Önemli Staj Kuralları ve İş Akışı:</p>
              <ol className="list-decimal space-y-2 pl-5 text-xs sm:text-sm leading-relaxed">
                <li>
                  <b>Kayıtlı Firma Seçimi & Cumartesi Kontrolü:</b> Başvuru yaparken sistemde kayıtlı firmaları listeden seçebilir veya yeni firma ekleyebilirsiniz. Staj yapılan kurumda <b>Cumartesi çalışılıyorsa</b> ilgili kutucuğu işaretlemeniz gerekir; bitiş tarihiniz buna göre otomatik hesaplanır.
                </li>
                <li>
                  <b>Zorunlu Belgeler Paneli:</b> Başvuru aşamasında <b>Form 2 (Staj Kabul Formu)</b> ve <b>SPAS Müstehaklık Belgesi</b>, süreç sonunda ise <b>Staj Raporu, Form 3 (Devamlılık) ve Form 4 (Değerlendirme)</b> belgelerinizi Zorunlu Belgeler panelinden takip edebilirsiniz.
                </li>
                <li>
                  <b>Aktif Staj Sayacı & 1 Hafta Kala Uyarısı:</b> Staj başlama tarihiniz geldiği anda aktif staj sayacınız otomatik olarak <b>"1. Gün"</b> şeklinde başlar. Staj bitimine 1 hafta kala Duyurular panelinde tamamlama uyarısı yayınlanır.
                </li>
                <li>
                  <b>Word Formatında Staj Defteri & Tek PDF İndirme:</b> Sanal Staj Defteriniz resmi <b>rapor_sayfası.docx</b> ve <b>rapor__kapak.docx</b> Word şablonu görünümünde açılır. Kapak + tüm rapor sayfalarınızı tek bir PDF dosyası olarak indirebilirsiniz.
                </li>
                <li>
                  <b>Eksik Deftere Onay Açılmaz & Sorumlu Mühendise Gönderim:</b> Staj sürenizdeki tüm iş günlerini (ör. 20/20 gün) eksiksiz doldurmadan defterinizi sorumlu mühendise gönderemezsiniz ve eksik deftere onay verilmez. Mühendis revize isterse düzeltip tekrar gönderebilirsiniz.
                </li>
              </ol>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-sm font-semibold text-blue-950">
              <input
                type="checkbox"
                checked={guideChecked}
                onChange={(e) => setGuideChecked(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600"
              />
              Staj Bilgilendirme Metni'ni okudum, anladım ve tüm staj kurallarını kabul ediyorum.
            </label>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAcceptGuide}
                disabled={!guideChecked}
                className="rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                Okudum, Onayla ve Öğrenci Paneline Geç →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MADDE 14: STAJ BİTİMİNE 1 HAFTA KALA OTOMATİK DUYURU / UYARI BANNER'I */}
      {selected && isEndingWithinOneWeek && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500 p-2.5 text-white">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 uppercase">
                Otomatik Süreç Uyarısı • Staj Bitimine 1 Hafta Kaldı
              </span>
              <h4 className="mt-0.5 text-sm font-extrabold text-amber-950">
                ⚠️ Stajınızın Bitimine 1 Haftadan Az Kaldı! (Bitiş Tarihi: {formatDate(selected.endDate)})
              </h4>
              <p className="mt-0.5 text-xs text-amber-900">
                Sanal staj defterinizin tüm iş günlerini ({logbook.length}/{selected.workDays} gün) eksiksiz doldurup <b>Sorumlu Mühendise Gönder</b> butonuna basmayı ve Zorunlu Belgeler panelindeki evraklarınızı tamamlamayı unutmayınız.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMainTab('logbook')}
              className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              Staj Defterini Tamamla →
            </button>
            <button
              type="button"
              onClick={() => setMainTab('documents')}
              className="rounded-xl border border-amber-400 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              Zorunlu Belgeler →
            </button>
          </div>
        </div>
      )}

      {/* ÜST SEKME ÇUBUĞU (ANA PANEL) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap gap-2">
          {/* 1. Staj Başvurularım & Akış Takibi */}
          <button
            onClick={() => {
              setMainTab('internships');
              setMsg(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mainTab === 'internships'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Staj Panelim & Akış Takibi
          </button>

          {/* 2. Zorunlu Belgeler Paneli (Madde 8) */}
          <button
            onClick={() => {
              setMainTab('documents');
              setMsg(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mainTab === 'documents'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <FolderCheck className="h-4 w-4" />
            Zorunlu Belgeler Paneli ({selected?.documents.length ?? 0})
          </button>

          {/* 3. Sanal Staj Defteri (Word Rapor Sayfası - Madde 10) */}
          <button
            onClick={() => {
              if (!isApprovedInternship) {
                setMsg({
                  type: 'err',
                  text: 'Sanal Staj Defteri paneli, staj başvurunuz Staj Komisyonu tarafından onaylandığında açılacaktır.',
                });
                return;
              }
              setMainTab('logbook');
              setMsg(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mainTab === 'logbook'
                ? 'bg-blue-700 text-white shadow-xs'
                : isApprovedInternship
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isApprovedInternship ? (
              <BookOpen className="h-4 w-4" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            Staj Defteri ({logbook.length}/{selected?.workDays ?? 20} Gün)
          </button>

          {/* 4. İzin / Rapor Talebi */}
          <button
            onClick={() => {
              if (!isApprovedInternship) {
                setMsg({
                  type: 'err',
                  text: 'İzin / Rapor Talebi paneli, staj başvurunuz onaylandığında açılacaktır.',
                });
                return;
              }
              setMainTab('leaves');
              setMsg(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mainTab === 'leaves'
                ? 'bg-blue-700 text-white shadow-xs'
                : isApprovedInternship
                ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isApprovedInternship ? (
              <Calendar className="h-4 w-4" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            İzin Talebi ({selected?.leaveRequests.length ?? 0})
          </button>

          {/* 5. Duyurular, Staj Takvimi & Firma İlanları (Madde 4, 14, 18) */}
          <button
            onClick={() => {
              setMainTab('announcements');
              setMsg(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mainTab === 'announcements'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Duyurular, Takvim & Firma İlanları ({announcements.length + listings.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setGuideChecked(true);
              setShowGuideModal(true);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Bilgilendirme Kılavuzu
          </button>
          <button
            onClick={openNewApplication}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Staj Başvurusu (Staj 1 / Staj 2)
          </button>
        </div>
      </div>

      {/* Birden fazla staj varsa seçim barı */}
      {internships.length > 1 && mainTab !== 'announcements' && (
        <div className="flex flex-wrap gap-3">
          {internships.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`rounded-xl border px-4 py-2.5 text-left text-xs transition ${
                selected?.id === item.id
                  ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div>
                {item.type === 'Staj1' ? 'STAJ 1' : 'STAJ 2'} — {item.companyName}
              </div>
              <div className="text-[11px] text-slate-500">{statusLabels[item.status]}</div>
            </button>
          ))}
        </div>
      )}

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

      {/* MADDE 9: STAJ AKIŞ TAKİBİ (ADIMLAR İLERLEDİKÇE İLERLEYEN SÜREÇ ÇUBUĞU) */}
      {selected && mainTab !== 'announcements' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-blue-900">
                Staj Süreci Akış Takibi (Adımlar Tamamlandıkça Otomatik İlerler)
              </h3>
              <p className="text-[11px] text-slate-500">
                {selected.type === 'Staj1' ? 'Staj 1' : 'Staj 2'} • {selected.companyName} — Mevcut Aşama:{' '}
                <b className="text-slate-800">{statusLabels[selected.status]}</b>
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800 border border-blue-200">
              Adım {Math.min(activeStepIndex + 1, 6)} / 6
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {workflowSteps.map((ws, idx) => {
              const isCompleted = idx < activeStepIndex || selected.status === 'Passed';
              const isCurrent = idx === activeStepIndex && selected.status !== 'Passed';
              return (
                <div
                  key={ws.step}
                  className={`relative rounded-xl border p-3 transition ${
                    isCompleted
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                      : isCurrent
                      ? 'border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-slate-50/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? '✓' : ws.step}
                    </span>
                    {isCurrent && (
                      <span className="rounded bg-blue-200 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-900">
                        Aktif Adım
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-bold leading-snug">{ws.title}</p>
                  <p className="mt-0.5 text-[11px] opacity-80">{ws.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YENİ / DÜZENLEME BAŞVURU MODAL FORMU */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Staj Başvurusunu Düzenle' : 'Yeni Staj Başvurusu Oluştur'}
            </h3>
            <form onSubmit={handleSaveApplication} className="mt-4 space-y-4">
              {/* Madde 17: Mevcut Dönem Seçimi Yerine Doğrudan Staj 1 / Staj 2 Seçimi */}
              <div>
                <label className="block text-xs font-bold text-slate-700">1. Staj Türü Seçimi</label>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectType('Staj1')}
                    className={`rounded-xl border py-2.5 text-xs font-extrabold transition ${
                      selectedInternshipType === 'Staj1'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ☑ STAJ 1 (20 İş Günü)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectType('Staj2')}
                    className={`rounded-xl border py-2.5 text-xs font-extrabold transition ${
                      selectedInternshipType === 'Staj2'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    ☑ STAJ 2 (20 İş Günü)
                  </button>
                </div>
              </div>

              {/* Madde 3: Kayıtlı Firma İsmi Gelmesi veya Yeni Firma Ekleme */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    2. Staj Yapılacak Firma / Kurum (Kayıtlı Firmalar Otomatik Gelir)
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseNewCompany(!useNewCompany)}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    {useNewCompany
                      ? '← Kayıtlı Firma Listesinden Seç'
                      : '+ Firma Listede Yok, Yeni Firma Ekle'}
                  </button>
                </div>

                {!useNewCompany ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        const matches = companies.filter((c) =>
                          c.name.toLowerCase().includes(e.target.value.toLowerCase())
                        );
                        if (matches.length === 1) {
                          setCompanyId(matches[0].id);
                        }
                      }}
                      placeholder="Kayıtlı firma adını yazarak arayın (Örn: Aselsan, Havelsan, Teknokent, Innova)..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                    />
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                      required
                    >
                      <option value="">-- Kayıtlı Firmalardan Seçiniz ({filteredCompanies.length} Firma) --</option>
                      {filteredCompanies.map((c) => (
                        <option key={c.id} value={c.id}>
                          ✔ {c.name} ({c.city || 'Şehir Belirtilmemiş'} - {c.sector || 'Genel'})
                        </option>
                      ))}
                    </select>
                    {/* Hızlı Seçim Etiketleri */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {filteredCompanies.slice(0, 6).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCompanyId(c.id)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                            companyId === c.id
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Yeni Firma Tam Adı *"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        required
                      />
                      {matchingRegisteredCompanies.length > 0 && (
                        <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs">
                          <span className="font-bold text-blue-900">
                            💡 Sistemde benzer isimli kayıtlı firma bulundu (Tıklayarak seçebilirsiniz):
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {matchingRegisteredCompanies.map((mc) => (
                              <button
                                key={mc.id}
                                type="button"
                                onClick={() => {
                                  setUseNewCompany(false);
                                  setCompanyId(mc.id);
                                }}
                                className="rounded-md bg-blue-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-800"
                              >
                                ✔ {mc.name} ({mc.city}) Seç
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Sektör (Örn: Yazılım / Savunma)"
                        value={newCompany.sector}
                        onChange={(e) => setNewCompany({ ...newCompany, sector: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Şehir (Örn: Konya)"
                        value={newCompany.city}
                        onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Firma Telefonu"
                        value={newCompany.phone}
                        onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="email"
                        placeholder="Firma Kurumsal E-Posta"
                        value={newCompany.email}
                        onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Açık Adres"
                        value={newCompany.address}
                        onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                        className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Şirket Yetkilisi (Advisor / Sorumlu Mühendis) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Sorumlu Mühendis / Yetkili Adı *
                  </label>
                  <input
                    type="text"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    placeholder="Örn: Yük. Müh. Burak Çelik"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Yetkili E-Posta (Şifre Gidecek) *
                  </label>
                  <input
                    type="email"
                    value={advisorEmail}
                    onChange={(e) => setAdvisorEmail(e.target.value)}
                    placeholder="danisman@aselsankonya.com.tr"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Çalışılacak Departman
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Örn: Gömülü Sistemler"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Otomatik Gün Hesaplayıcı + MADDE 2: STAJYER CUMARTESİ ÇALIŞIYOR MU KUTUSU */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                <p className="text-xs font-bold text-blue-900">
                  3. Otomatik İş Günü, Cumartesi Çalışma Kontrolü ve Bitiş Tarihi Hesaplayıcı
                </p>

                {/* Madde 2: Cumartesi Çalışıyor mu Kontrol Kutusu */}
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-blue-300 bg-white p-3 text-xs font-bold text-slate-900 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={worksOnSaturday}
                    onChange={(e) => setWorksOnSaturday(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span>
                    Stajyer Cumartesi Günleri Çalışıyor mu?{' '}
                    <span className="font-normal text-slate-600">
                      ({worksOnSaturday ? 'Evet — Cumartesi günleri iş günü hesabına dahil edilir' : 'Hayır — Cumartesi ve Pazar tatil sayılır'})
                    </span>
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Staj Süresi (İş Günü)
                    </label>
                    <select
                      value={workDays}
                      onChange={(e) => setWorkDays(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                    >
                      <option value={20}>20 İş Günü (Standart)</option>
                      <option value={25}>25 İş Günü</option>
                      <option value={30}>30 İş Günü</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Başlama Tarihi
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Otomatik Bitiş Tarihi (Kilitli)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={calcPreview ? formatDate(calcPreview.endDate) : 'Hesaplanıyor...'}
                      className="mt-1 w-full rounded-lg border border-blue-300 bg-blue-100/70 px-3 py-2 text-sm font-bold text-blue-950"
                    />
                  </div>
                </div>

                {calcError && (
                  <p className="text-xs font-semibold text-rose-600">{calcError}</p>
                )}

                {calcPreview && calcPreview.skippedHolidays.length > 0 && (
                  <div className="text-xs text-blue-800">
                    <b>Atlanan Resmi Tatiller:</b>{' '}
                    {calcPreview.skippedHolidays
                      .map((h) => `${h.name} (${formatDate(h.date)})`)
                      .join(', ')}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={receivesSalary}
                  onChange={(e) => setReceivesSalary(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
                Şirketten stajyer maaşı / ücreti alacağım (Staj sürecinde maaş dekontu yükleyeceğim)
              </label>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!!calcError}
                  className="rounded-lg bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  Başvuruyu Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANA SEKME 5: DUYURULAR, STAJ BAŞLAMA TAKVİMİ VE STAJYER ARAYAN FİRMA DUYURULARI (Madde 4, 11, 14, 18) */}
      {mainTab === 'announcements' ? (
        <div className="space-y-6">
          {/* Madde 18: Öğrenci Duyuruları Staj Başlama Takvimi */}
          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  📅 Resmi Staj Başvuru ve Başlama Takvimi
                </h3>
                <p className="text-xs text-slate-500">
                  Komisyon tarafından belirlenen Staj 1 ve Staj 2 başvuru, başlama, bitiş ve rapor teslim tarihleri
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Staj Türü / Takvim</th>
                    <th className="px-4 py-3">Son Başvuru Tarihi</th>
                    <th className="px-4 py-3">En Erken Staj Başlama</th>
                    <th className="px-4 py-3">En Geç Staj Bitiş</th>
                    <th className="px-4 py-3">Defter & Rapor Son Teslim</th>
                    <th className="px-4 py-3">İş Günü Süresi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {terms.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-blue-950">
                        {t.internshipType === 'Staj1' ? 'STAJ 1' : 'STAJ 2'} ({t.academicYear})
                      </td>
                      <td className="px-4 py-3 font-semibold text-rose-700">
                        {formatDate(t.applicationDeadline)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {formatDate(t.earliestStartDate)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatDate(t.latestEndDate)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-indigo-700">
                        {formatDate(t.reportDeadline)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {t.minWorkDays} - {t.maxWorkDays} İş Günü
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Komisyon Duyuruları & StajBitimine 1 Hafta Kala Uyarısı */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Megaphone className="h-5 w-5 text-rose-600" />
              <h3 className="text-base font-extrabold text-slate-900">
                Staj Komisyonu Duyuruları & Otomatik Süreç Bildirimleri
              </h3>
            </div>

            {selected && isEndingWithinOneWeek && (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-xs">
                <div className="flex items-center gap-2 font-extrabold text-amber-950">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>⚠️ OTOMATİK SÜREÇ DUYURUSU: Stajınızın Bitimine 1 Hafta Kaldı!</span>
                </div>
                <p className="mt-1 text-amber-900">
                  <b>{selected.companyName}</b> firmasındaki stajınız <b>{formatDate(selected.endDate)}</b> tarihinde sona erecektir. Lütfen sanal staj defterinizin tüm sayfalarını ({selected.workDays} iş günü) tamamlayarak sorumlu mühendise göndermeyi unutmayınız.
                </p>
              </div>
            )}

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
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 border border-slate-200">
                      {a.category === 'Calendar'
                        ? '📅 STAJ TAKVİMİ DUYURUSU'
                        : a.category === 'CompanyListing'
                        ? '📢 STAJYER ARAYAN FİRMA DUYURUSU'
                        : a.category === 'Warning'
                        ? '⚠️ ÖNEMLİ UYARI'
                        : '📌 GENEL DUYURU'}
                    </span>
                    <span className="text-[11px] text-slate-500">{formatDate(a.createdAt)}</span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900">{a.title}</h4>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-700">
                    {a.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Madde 4: Stajyer Arayan Firmanın Komisyon Eklemesinin Öğrenciye Duyuru Şeklinde Gösterilmesi */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    📢 Stajyer Arayan Firma Duyuruları (Komisyon Tarafından Eklenen İlanlar)
                  </h3>
                  <p className="text-xs text-slate-500">
                    İlgilendiğiniz firma duyurusundaki "Bu Firmaya Başvur" butonuyla doğrudan başvuru formunu açabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
                        📢 Firma Staj Duyurusu • {l.city || 'Türkiye Geneli'}
                      </span>
                      {l.deadline && (
                        <span className="text-xs font-semibold text-rose-700">
                          Son: {formatDate(l.deadline)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-bold text-slate-900">{l.title}</h3>
                    <p className="mt-1 text-xs font-extrabold text-indigo-700">{l.companyName}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{l.description}</p>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-emerald-100 pt-3 text-xs text-slate-600">
                    <div>
                      <b>İletişim / Başvuru:</b> {l.contact || '-'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        openNewApplication();
                        const matchedComp = companies.find(
                          (c) => c.name.toLowerCase() === l.companyName.toLowerCase()
                        );
                        if (matchedComp) {
                          setUseNewCompany(false);
                          setCompanyId(matchedComp.id);
                        } else {
                          setUseNewCompany(true);
                          setNewCompany({
                            ...newCompany,
                            name: l.companyName,
                            city: l.city || '',
                          });
                        }
                      }}
                      className="w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Bu Firmaya Staj Başvurusu Oluştur →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : internships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-bold text-slate-900">Henüz Staj Başvurunuz Yok</h3>
          <p className="mt-1 text-sm text-slate-500">
            Staj 1 veya Staj 2 başvurusu oluşturmak için sağ üstteki <b>"Yeni Staj Başvurusu"</b> butonuna tıklayın.
          </p>
          <button
            onClick={openNewApplication}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            İlk Staj Başvurumu Oluştur
          </button>
        </div>
      ) : (
        selected && (
          <div className="space-y-6">
            {/* ANA SEKME 1: STAJ PANELİM & AKIŞ ÖZETİ */}
            {mainTab === 'internships' && (
              <>
                {/* MADDE 5: AKTİF STAJ SAYACI (TARİH GELDİĞİ ANDA 1. GÜN OLARAK BAŞLAR) */}
                {isApprovedInternship && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="rounded-xl bg-emerald-600 p-3 text-white">
                        {selected.kptoStatus === 'InsuranceActive' ? (
                          <ShieldCheck className="h-6 w-6" />
                        ) : (
                          <Clock className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-950">
                          {selected.currentDay && selected.currentDay > 0
                            ? `🚀 Aktif Stajınız Devam Ediyor: ${selected.currentDay}. İş Günündesiniz!`
                            : selected.kptoStatus === 'InsuranceActive'
                            ? '✔ Sigortanız başlatıldı, başlangıç tarihi geldiği anda 1. Gün sayacınız başlayacaktır!'
                            : '✔ Başvurunuz Komisyon tarafından onaylandı (KPTO Sigorta Girişi Bekleniyor)'}
                        </h4>
                        <p className="mt-0.5 text-xs text-emerald-800">
                          Staj Tarihleri: <b>{formatDate(selected.startDate)}</b> –{' '}
                          <b>{formatDate(selected.endDate)}</b> ({selected.workDays} İş Günü • Cumartesi:{' '}
                          <b>{selected.worksOnSaturday ? 'Çalışıyor' : 'Çalışmıyor'}</b>)
                        </p>
                      </div>
                    </div>

                    <div className="min-w-60 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center shadow-xs">
                      <span className="block text-[11px] font-extrabold text-slate-500 uppercase">
                        Aktif Staj Gün Sayacı
                      </span>
                      <span className="mt-0.5 block text-lg font-extrabold text-indigo-700">
                        {selected.currentDay && selected.currentDay > 0
                          ? `${selected.currentDay}. Gün / ${selected.workDays} İş Günü`
                          : `Başlangıç: ${formatDate(selected.startDate)} (1. Gün)`}
                      </span>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((selected.currentDay ?? 0) / selected.workDays) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Komisyon Başvuru Revize Uyarısı */}
                {selected.status === 'RevisionRequested' && (
                  <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="h-5 w-5 text-rose-600" />
                      Komisyon Başvurunuz İçin Revize İstedi:
                    </div>
                    <p className="mt-1 font-medium">{selected.revisionNote}</p>
                    <p className="mt-1 text-xs text-rose-700">
                      Bilgilerinizi veya Zorunlu Belgeler panelindeki evraklarınızı güncelleyip tekrar Komisyon onayına gönderebilirsiniz.
                    </p>
                  </div>
                )}

                {/* Madde 15: Danışman Staj Defterini Beğenmedi / Revize İstedi Uyarısı */}
                {selected.logbookRevisionRequested && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-rose-400 bg-rose-50 p-4 text-sm text-rose-950">
                    <div>
                      <div className="flex items-center gap-2 font-extrabold text-rose-900">
                        <RotateCcw className="h-5 w-5 text-rose-600" />
                        Danışman / Sorumlu Mühendis ({selected.advisorName}) Staj Defteriniz İçin Revize İstedi!
                      </div>
                      <p className="mt-1 text-xs font-semibold text-rose-800">
                        <b>Revize Gerekçesi:</b> "{selected.logbookRevisionNote}"
                      </p>
                      <p className="mt-0.5 text-xs text-rose-700">
                        Lütfen Sanal Staj Defteri sekmesinden ilgili sayfaları düzenleyip tekrar sorumlu mühendise gönderiniz.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMainTab('logbook')}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      Defteri Düzenle ve Tekrar Gönder →
                    </button>
                  </div>
                )}

                {/* Staj İptal Talebi (Form 7) Bekliyor Uyarısı */}
                {selected.status === 'CancellationRequested' && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-orange-900">
                        <FileX2 className="h-5 w-5 text-orange-600" />
                        Staj İptal Talebiniz (Form 7) Komisyon İncelemesinde
                      </div>
                      {selected.evaluationNote && (
                        <p className="text-xs font-medium text-orange-800">
                          <b>Belirttiğiniz Mazeret:</b> {selected.evaluationNote}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={openSubmittedForm7Preview}
                      className="flex items-center gap-1.5 rounded-xl border border-orange-300 bg-white px-3.5 py-2 text-xs font-bold text-orange-900 shadow-xs hover:bg-orange-100"
                    >
                      <Eye className="h-4 w-4 text-orange-700" />
                      Gönderilen Form 7 PDF Önizle
                    </button>
                  </div>
                )}

                {/* Staj Özet Kartı */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-extrabold text-blue-800">
                          {selected.type === 'Staj1' ? 'STAJ 1' : 'STAJ 2'}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                            statusColors[selected.status]
                          }`}
                        >
                          {statusLabels[selected.status]}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                          Öğrenci No: {verifiedStudentNo}
                        </span>
                        <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                          Cumartesi: {selected.worksOnSaturday ? 'Çalışıyor (Dahil)' : 'Çalışmıyor (Hariç)'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-bold text-slate-900">{selected.companyName}</h3>
                      <p className="text-xs text-slate-500">
                        Departman: <b>{selected.department || 'Genel Birim'}</b> • Sorumlu Mühendis:{' '}
                        <b>{selected.advisorName}</b> ({selected.advisorEmail})
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setMainTab('documents')}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
                      >
                        <FolderCheck className="h-4 w-4" />
                        Zorunlu Belgeler Paneline Git
                      </button>

                      {(selected.status === 'Draft' || selected.status === 'RevisionRequested') && (
                        <button
                          onClick={() => openEditApplication(selected)}
                          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Bilgileri Düzenle
                        </button>
                      )}

                      {selected.status !== 'Draft' &&
                        selected.status !== 'Passed' &&
                        selected.status !== 'Failed' &&
                        selected.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={openForm7Modal}
                            className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 shadow-xs hover:bg-rose-100"
                          >
                            <FileX2 className="h-4 w-4 text-rose-700" />
                            {selected.status === 'CancellationRequested'
                              ? 'İptal Talebini (Form 7) Güncelle'
                              : 'Staj İptal Talebi (Form 7)'}
                          </button>
                        )}
                    </div>
                  </div>

                  {/* MADDE 7: STAJ ŞİRKET DANIŞMANI (SORUMLU MÜHENDİS) E-POSTA & ONAY TAKİBİ */}
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-950">
                        <Mail className="h-4 w-4 text-indigo-700" />
                        <span>
                          Şirket Danışmanı / Sorumlu Mühendis ({selected.advisorName}) E-Posta ve Onay Takibi
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                      <div className="rounded-lg border border-indigo-100 bg-white p-3">
                        <span className="text-[11px] text-slate-500">1. Şirket Danışmanı E-Postası:</span>
                        <p className="mt-0.5 font-bold text-slate-900 truncate">{selected.advisorEmail}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                          {selected.advisorEmailSentAt
                            ? `✔ E-posta Gönderildi (${formatDate(selected.advisorEmailSentAt)})`
                            : 'Komisyon onayında otomatik gönderilir'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-indigo-100 bg-white p-3">
                        <span className="text-[11px] text-slate-500">2. Mühendis Sisteme Giriş Takibi:</span>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {selected.advisorLastLoginAt
                            ? `✔ Sisteme Giriş Yaptı (${formatDate(selected.advisorLastLoginAt)})`
                            : 'Henüz Giriş Yapmadı'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Şirket panelinden defterinizi inceler
                        </p>
                      </div>

                      <div className="rounded-lg border border-indigo-100 bg-white p-3">
                        <span className="text-[11px] text-slate-500">3. Staj Defteri Mühendis Onayı:</span>
                        <p className="mt-0.5 font-bold text-slate-900">
                          {selected.advisorLogbookApproved
                            ? `✔ Onaylandı (${formatDate(selected.advisorApprovedAt)})`
                            : selected.logbookRevisionRequested
                            ? '↻ Mühendis Revize İstedi'
                            : selected.logbookSubmittedToAdvisorAt
                            ? `📩 Gönderildi (${formatDate(selected.logbookSubmittedToAdvisorAt)}) — İncelemede`
                            : `Defter Dolduruluyor (${logbook.length}/${selected.workDays} gün)`}
                        </p>
                      </div>
                    </div>

                    {selected.advisorEmailStatus && (
                      <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-indigo-950">
                        <b>E-Posta İletim Kaydı:</b> {selected.advisorEmailStatus}
                      </div>
                    )}

                    {/* MADDE 6 & 16: ÖĞRENCİ TARAFINDA STAJ DEFTERİNİ SORUMLU MÜHENDİSE GÖNDERME BUTONU */}
                    {isApprovedInternship && !selected.advisorLogbookApproved && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-white p-3.5">
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">
                            Sanal Staj Defterini Sorumlu Mühendise ({selected.advisorName}) Gönder
                          </p>
                          <p className="text-slate-600">
                            {isLogbookComplete
                              ? `✔ Tüm iş günlerini (${logbook.length}/${selected.workDays} gün) tamamladınız! Şimdi defterinizi sorumlu mühendisin onayına gönderebilirsiniz.`
                              : `⚠️ Eksik deftere onay açılmaz: Defteri sorumlu mühendise gönderebilmek için ${selected.workDays} iş gününün tamamını doldurmalısınız (Mevcut: ${logbook.length}/${selected.workDays} gün).`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSubmitLogbookToAdvisor}
                          disabled={!isLogbookComplete}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          {selected.logbookSubmittedToAdvisorAt
                            ? 'Defteri Sorumlu Mühendise Tekrar Gönder'
                            : 'Staj Defterini Sorumlu Mühendise Gönder'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* STAJ KOMİSYONUNA BELGE YÜKLEME VE BAŞVURU GÖNDERME ALANI (YALNIZCA BAŞVURU ONAYLANMADAN / STAJ BAŞLAMADAN ÖNCE GÖRÜNÜR - 2. Görsel Revizesi) */}
                  {!isApprovedInternship && (
                    <div className="rounded-2xl border-2 border-blue-200 bg-slate-50/70 p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            📤 Staj Komisyonuna Gönderilecek Belgeler & Başvuru Onayı
                          </h4>
                          <p className="text-xs text-slate-600">
                            1) Hazır Form 2 PDF'ini indirip firmaya imzalatın, 2) İmzalı Form 2 ve e-Devlet SPAS belgenizi yükleyin, 3) <b>"Başvuruyu ve Belgeleri Komisyona Gönder"</b> butonuna basın.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(
                              `/internships/${selected.id}/pdf/form2`,
                              `Form2_${verifiedStudentNo}_${selected.type}.pdf`
                            )
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
                        >
                          <Download className="h-4 w-4" />
                          Form 2 (Staj Kabul Formu) PDF İndir
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* 1. Form 2 Yükle */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900">
                              1. Islak İmzalı Form 2 (Kabul Formu)
                            </p>
                            {selected.documents.some((d) => d.type === 'Form2') ? (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ✔ Yüklendi
                              </span>
                            ) : (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Zorunlu
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Firmaya kaşe/ıslak imza yaptırdığınız Form 2'yi yükleyin.
                          </p>
                          <label className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
                            <Upload className="h-4 w-4" />
                            {selected.documents.some((d) => d.type === 'Form2')
                              ? 'İmzalı Form 2 Güncelle'
                              : 'İmzalı Form 2 Yükle'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleUploadDoc('Form2', e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* 2. SPAS Yükle */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900">
                              2. SPAS Müstehaklık Belgesi
                            </p>
                            {selected.documents.some((d) => d.type === 'Spas') ? (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ✔ Yüklendi
                              </span>
                            ) : (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Zorunlu
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            e-Devlet'ten barkodlu "SPAS Müstehaklık Sorgulama" PDF belgenizi yükleyin.
                          </p>
                          <label className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                            <Upload className="h-4 w-4" />
                            {selected.documents.some((d) => d.type === 'Spas')
                              ? 'SPAS Belgesini Güncelle'
                              : 'SPAS Belgesi Yükle'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleUploadDoc('Spas', e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* 3. Maaş Dekontu Yükle */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900">
                              3. Stajyer Maaş Dekontu (KPTO)
                            </p>
                            {selected.documents.some((d) => d.type === 'SalaryReceipt') && (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ✔ Yüklendi
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Şirketten maaş/ücret yatarsa banka maaş dekontunu yükleyin.
                          </p>
                          <label className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                            <Upload className="h-4 w-4" />
                            Maaş Dekontu Yükle
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleUploadDoc('SalaryReceipt', e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Yüklü Belgeler Listesi */}
                      <div>
                        <h5 className="text-xs font-bold uppercase text-slate-500">
                          Yüklenen Belgeler ({selected.documents.length})
                        </h5>
                        {selected.documents.length === 0 ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Henüz belge yüklenmedi. Yukarıdaki butonlardan Form 2 ve SPAS belgelerinizi yükleyiniz.
                          </p>
                        ) : (
                          <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                            {selected.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between px-4 py-2.5 text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">
                                    {docTypeLabels[doc.type]}:{' '}
                                  </span>
                                  <span className="text-slate-600">{doc.originalFileName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewModal({
                                        title: `${docTypeLabels[doc.type]} Önizleme`,
                                        subtitle: `${user.fullName} (${verifiedStudentNo}) — ${selected.companyName}`,
                                        sources: [
                                          {
                                            label: docTypeLabels[doc.type],
                                            url: `/documents/${doc.id}`,
                                            fallbackFileName: doc.originalFileName,
                                          },
                                        ],
                                        initialIndex: 0,
                                      })
                                    }
                                    className="flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Önizle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      downloadBlob(`/documents/${doc.id}`, doc.originalFileName)
                                    }
                                    className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    İndir
                                  </button>
                                  {(selected.status === 'Draft' ||
                                    selected.status === 'RevisionRequested') && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoc(doc.id)}
                                      className="rounded-md bg-rose-50 p-1 text-rose-600 hover:bg-rose-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Komisyona Gönder Butonu */}
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-xs">
                        <div className="text-xs text-emerald-950">
                          <p className="text-sm font-extrabold text-emerald-950">
                            📤 Staj Belgelerini Staj Komisyonuna Gönder
                          </p>
                          <p className="mt-0.5">
                            Yüklediğiniz belgeleri (Form 2, SPAS vb.) Staj Komisyonu ekranına iletmek için sağdaki butona tıklayınız.
                            {selected.submittedAt && (
                              <span className="ml-1 font-bold text-emerald-800">
                                (Son Gönderim: {formatDate(selected.submittedAt)} — Durum: {statusLabels[selected.status]})
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSubmitToCommittee}
                          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                        >
                          <Send className="h-4 w-4" />
                          Belgeleri ve Başvuruyu Staj Komisyonuna Gönder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ANA SEKME 2: ÖĞRENCİ İÇİN ZORUNLU BELGELER PANELİ (Madde 8) */}
            {mainTab === 'documents' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                        <FolderCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">
                          Öğrenci Zorunlu Belgeler Paneli
                        </h3>
                        <p className="text-xs text-slate-500">
                          Staj başvurusu, staj süreci ve staj sonunda indirmeniz ve sisteme yüklemeniz gereken tüm resmi formlar burada listelenmektedir.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Zorunlu Belgeler Kartları */}
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* 1. Form 2 - Staj Kabul Formu */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                            ZORUNLU • BAŞVURU AŞAMASI
                          </span>
                          {selected.documents.some((d) => d.type === 'Form2') ? (
                            <span className="text-xs font-bold text-emerald-700">✔ Yüklendi</span>
                          ) : (
                            <span className="text-xs font-bold text-amber-700">Bekleniyor</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          1. Staj Kabul Formu (Form 2)
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Bilgilerinizle otomatik doldurulmuş Form 2 PDF'ini indirip firmaya kaşe/ıslak imza yaptırdıktan sonra yükleyin.
                        </p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(
                              `/internships/${selected.id}/pdf/form2`,
                              `Form2_${verifiedStudentNo}_${selected.type}.pdf`
                            )
                          }
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50"
                        >
                          <Download className="h-4 w-4" />
                          Hazır Form 2 Şablonunu İndir (PDF)
                        </button>
                        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">
                          <Upload className="h-4 w-4" />
                          İmzalı Form 2 Yükle
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleUploadDoc('Form2', e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 2. SPAS Müstehaklık Belgesi */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                            ZORUNLU • BAŞVURU AŞAMASI
                          </span>
                          {selected.documents.some((d) => d.type === 'Spas') ? (
                            <span className="text-xs font-bold text-emerald-700">✔ Yüklendi</span>
                          ) : (
                            <span className="text-xs font-bold text-amber-700">Bekleniyor</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          2. SPAS Müstehaklık Belgesi (e-Devlet)
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          SGK sigorta girişi için e-Devlet'ten alacağınız barkodlu "SPAS Müstehaklık Sorgulama" PDF belgesini yükleyin.
                        </p>
                      </div>
                      <div className="mt-4">
                        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                          <Upload className="h-4 w-4" />
                          SPAS Belgesi Yükle
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleUploadDoc('Spas', e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 3. Staj Defteri & Rapor Kapağı (Tek PDF) */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                            ZORUNLU • STAJ SÜRECİ / SONU
                          </span>
                          <span className="text-xs font-bold text-indigo-700">
                            {logbook.length}/{selected.workDays} Gün
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          3. Staj Defteri (Kapak + Rapor Sayfaları)
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Word formatında doldurduğunuz staj defterini kapak ve işyeri tanıtım sayfasıyla birlikte tek PDF olarak indirin.
                        </p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(
                              `/internships/${selected.id}/pdf/logbook`,
                              `StajDefteri_${verifiedStudentNo}_${selected.type}.pdf`
                            )
                          }
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <Download className="h-4 w-4" />
                          Tüm Defteri Tek PDF Halinde İndir
                        </button>
                      </div>
                    </div>

                    {/* 4. Form 3 - Staj Devamlılık Formu */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
                            ZORUNLU • STAJ SONU
                          </span>
                          {selected.documents.some((d) => d.type === 'Form3') ? (
                            <span className="text-xs font-bold text-emerald-700">✔ Yüklendi</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">Opsiyonel / Staj Sonu</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          4. Staj Devamlılık Formu (Form 3)
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Her iş günü imzalanan devamlılık çizelgesi (TF-BM-SF-03) şablonunu indirip staj sonunda imzalı halini yükleyin.
                        </p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(
                              `/internships/${selected.id}/pdf/form3`,
                              `Form3_Devamlilik_${verifiedStudentNo}.pdf`
                            )
                          }
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-purple-800 hover:bg-purple-50"
                        >
                          <Download className="h-4 w-4" />
                          Hazır Form 3 (Devam Çizelgesi) İndir
                        </button>
                        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-bold text-white hover:bg-purple-800">
                          <Upload className="h-4 w-4" />
                          İmzalı Form 3 Yükle
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleUploadDoc('Form3', e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 5. Form 4 - Staj Değerlendirme Formu */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
                            ZORUNLU • İŞYERİ DEĞERLENDİRME
                          </span>
                          {selected.documents.some((d) => d.type === 'ResultForm') ? (
                            <span className="text-xs font-bold text-emerald-700">✔ Yüklendi</span>
                          ) : (
                            <span className="text-xs font-bold text-amber-700">Bekleniyor</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          5. Staj Değerlendirme Formu (Form 4)
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          İşyeri yetkilisi tarafından doldurulup imzalanan değerlendirme formu (TF-BM-SF-04).
                        </p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(
                              `/internships/${selected.id}/pdf/form4`,
                              `Form4_Degerlendirme_${verifiedStudentNo}.pdf`
                            )
                          }
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          <Download className="h-4 w-4" />
                          Hazır Form 4 Şablonunu İndir
                        </button>
                        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900">
                          <Upload className="h-4 w-4" />
                          İmzalı Form 4 Yükle
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleUploadDoc('ResultForm', e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 6. Stajyer Maaş Dekontu */}
                    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                            ÜCRETLİ STAJLAR • KPTO
                          </span>
                          {selected.documents.some((d) => d.type === 'SalaryReceipt') ? (
                            <span className="text-xs font-bold text-emerald-700">✔ Yüklendi</span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500">Ücret Alınıyorsa</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          6. Stajyer Maaş Dekontu
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Şirketten stajyer maaşı/ücreti alıyorsanız banka maaş dekontunu yükleyin (KPTO'ya iletilir).
                        </p>
                      </div>
                      <div className="mt-4">
                        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                          <Upload className="h-4 w-4" />
                          Maaş Dekontu Yükle
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleUploadDoc('SalaryReceipt', e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Yüklü Belgeler Listesi */}
                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <h4 className="text-xs font-bold uppercase text-slate-500">
                      Sisteme Yüklenen Tüm Belgeleriniz ({selected.documents.length})
                    </h4>
                    {selected.documents.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">Henüz belge yüklenmedi.</p>
                    ) : (
                      <div className="mt-2 divide-y divide-slate-200 rounded-xl border border-slate-200">
                        {selected.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between px-4 py-2.5 text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-800">
                                {docTypeLabels[doc.type]}:{' '}
                              </span>
                              <span className="text-slate-600">{doc.originalFileName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModal({
                                    title: `${docTypeLabels[doc.type]} Önizleme`,
                                    subtitle: `${user.fullName} (${verifiedStudentNo}) — ${selected.companyName}`,
                                    sources: [
                                      {
                                        label: docTypeLabels[doc.type],
                                        url: `/documents/${doc.id}`,
                                        fallbackFileName: doc.originalFileName,
                                      },
                                    ],
                                    initialIndex: 0,
                                  })
                                }
                                className="flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Önizle
                              </button>
                              <button
                                onClick={() =>
                                  downloadBlob(`/documents/${doc.id}`, doc.originalFileName)
                                }
                                className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <Download className="h-3.5 w-3.5" />
                                İndir
                              </button>
                              {(selected.status === 'Draft' ||
                                selected.status === 'RevisionRequested') && (
                                <button
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="rounded-md bg-rose-50 p-1 text-rose-600 hover:bg-rose-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Zorunlu Belgeler Panelinin Altında da Komisyona Gönder Butonu (Her Zaman Aktif) */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 shadow-xs">
                    <div className="text-xs text-emerald-950">
                      <p className="text-sm font-extrabold text-emerald-950">
                        📤 Yüklenen Zorunlu Belgeleri Staj Komisyonuna Gönder
                      </p>
                      <p className="mt-0.5">
                        Yüklediğiniz tüm zorunlu belgeleri (Form 2, SPAS, Form 3, Form 4, Staj Raporu, Maaş Dekontu) Staj Komisyonu incelemesine göndermek için sağdaki butona tıklayınız.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmitToCommittee}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <Send className="h-4 w-4" />
                      Belgeleri Staj Komisyonuna Gönder
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ANA SEKME 3: SANAL STAJ DEFTERİ (WORD RAPOR SAYFASI GÖRÜNÜMÜ & TEK PDF İNDİRME - Madde 6, 10, 15, 16) */}
            {mainTab === 'logbook' && (
              <div className="space-y-4">
                {/* Üst Word Şeridi & Sorumlu Mühendise Gönderim Çubuğu */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-700 p-2.5 text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Word Staj Defteri Düzenleyici (rapor__kapak.docx + rapor_sayfası.docx)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Doldurulan Gün: <b>{logbook.length} / {selected.workDays} İş Günü</b> • Sorumlu Mühendis:{' '}
                        <b>{selected.advisorName}</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewModal({
                          title: 'Staj Defteri (Kapak + İşyeri Tanıtım + Rapor Sayfaları) Tek PDF Önizleme',
                          subtitle: `${user.fullName} (${verifiedStudentNo}) — ${selected.companyName}`,
                          sources: [
                            {
                              label: 'Birleştirilmiş Tek PDF Staj Defteri',
                              url: `/internships/${selected.id}/pdf/logbook`,
                              fallbackFileName: `StajDefteri_${verifiedStudentNo}_${selected.type}.pdf`,
                            },
                          ],
                        })
                      }
                      className="flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                    >
                      <Eye className="h-4 w-4" />
                      Tek PDF Önizle
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        downloadBlob(
                          `/internships/${selected.id}/pdf/logbook`,
                          `StajDefteri_${verifiedStudentNo}_${selected.type}.pdf`
                        )
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
                    >
                      <Download className="h-4 w-4" />
                      En Son Tek PDF Halinde İndir
                    </button>

                    {/* Madde 6 & 16: Staj Defteri Dolduğunda Sorumlu Mühendise Gönderen Buton */}
                    {!selected.advisorLogbookApproved && (
                      <button
                        type="button"
                        onClick={handleSubmitLogbookToAdvisor}
                        disabled={!isLogbookComplete}
                        title={
                          isLogbookComplete
                            ? 'Tamamlanan staj defterini sorumlu mühendise gönder'
                            : `Tüm iş günleri (${selected.workDays} gün) dolmadan gönderilemez`
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {isLogbookComplete
                          ? 'Staj Defterini Sorumlu Mühendise Gönder'
                          : `Mühendise Gönder (${logbook.length}/${selected.workDays} Gün)`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Madde 15: Danışman Revize Uyarısı (Defter İçinde) */}
                {selected.logbookRevisionRequested && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-900">
                    <b>↻ Sorumlu Mühendis ({selected.advisorName}) Revize Talebi:</b> "{selected.logbookRevisionNote}" — Lütfen ilgili rapor sayfalarını düzenleyip kaydedin ve tekrar mühendise gönderin.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* Sol Sütun: Word Belgesi Sayfa Gezgini (Kapak, Tanıtım ve Günlük Rapor Sayfaları) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Word Belgesi Sayfaları
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Kapak, tanıtım ve günlük rapor sayfaları
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openBlankNewPage(logbook)}
                          disabled={selected.advisorLogbookApproved || logbook.length >= selected.workDays}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FilePlus2 className="h-4 w-4" />
                          {logbook.length >= selected.workDays
                            ? `✔ ${selected.workDays}/${selected.workDays} Gün Dolu`
                            : '+ Yeni Gün Ekle'}
                        </button>
                      </div>

                      {/* Sabit Word Kapak & İşyeri Tanıtım Sayfaları (rapor__kapak.docx) */}
                      <div className="mt-3 space-y-1.5 border-b border-slate-200 pb-3">
                        <button
                          type="button"
                          onClick={() => setWordViewMode('cover')}
                          className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition ${
                            wordViewMode === 'cover'
                              ? 'border-blue-600 bg-blue-50 font-bold text-blue-950 ring-2 ring-blue-600/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-bold">📄 Kapak Sayfası (rapor__kapak.docx)</span>
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                            Sayfa 1
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWordViewMode('intro')}
                          className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition ${
                            wordViewMode === 'intro'
                              ? 'border-blue-600 bg-blue-50 font-bold text-blue-950 ring-2 ring-blue-600/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-bold">🏢 İşyeri & Personel Tanıtımı (TF-BM-SF-02a)</span>
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                            Sayfa 2
                          </span>
                        </button>
                      </div>

                      {/* Günlük Rapor Sayfaları Listesi (rapor_sayfası.docx) */}
                      <div className="mt-3 max-h-[440px] space-y-2 overflow-y-auto pr-1">
                        {logbook.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                            Henüz kayıtlı rapor sayfası yok. Sağdaki Word şablonunu doldurup <b>"Bu Sayfayı Kaydet"</b> butonuna basın.
                          </div>
                        ) : (
                          logbook.map((entry, idx) => {
                            const isSelectedPage =
                              wordViewMode === 'page' && activeEntryId === entry.id;
                            return (
                              <div
                                key={entry.id}
                                onClick={() => selectEntryForEdit(entry)}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition ${
                                  isSelectedPage
                                    ? 'border-blue-600 bg-blue-50 font-bold text-blue-950 ring-2 ring-blue-600/20'
                                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-blue-800 px-1.5 text-[11px] font-extrabold text-white">
                                      {entry.dayNumber || idx + 1}. Gün
                                    </span>
                                    <span className="truncate font-bold text-slate-900">
                                      {entry.title || `${entry.dayNumber}. Gün Staj Raporu`}
                                    </span>
                                  </div>
                                  <p className="mt-1 truncate text-[11px] text-slate-500">
                                    Tarih: {formatDate(entry.date)} • {entry.content.slice(0, 40)}...
                                  </p>
                                </div>

                                {!selected.advisorLogbookApproved && (
                                  <button
                                    type="button"
                                    title="Sayfayı Sil"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      handleDeleteLogEntry(entry.id);
                                    }}
                                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sağ Sütun: Word Belgesi A4 Kağıt Görünümü (Kapak / Tanıtım / rapor_sayfası.docx) */}
                  <div className="lg:col-span-8">
                    {wordViewMode === 'cover' ? (
                      /* WORD KAPAK SAYFASI GÖRÜNÜMÜ (rapor__kapak.docx Sayfa 1) */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
                          <span className="text-xs font-extrabold text-blue-900">
                            📄 Word Görünümü: Staj Raporu Kapağı (rapor__kapak.docx - Sayfa 1)
                          </span>
                          <button
                            type="button"
                            onClick={() => setWordViewMode('intro')}
                            className="flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
                          >
                            Sonraki: İşyeri Tanıtım Sayfası
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mx-auto rounded-sm border-2 border-slate-300 bg-white p-10 shadow-xl">
                          <div className="border-2 border-black p-10 text-center font-serif text-black space-y-6">
                            <div className="space-y-1 text-base font-bold sm:text-lg">
                              <div>T.C.</div>
                              <div>SELÇUK ÜNİVERSİTESİ</div>
                              <div>TEKNOLOJİ FAKÜLTESİ</div>
                              <div>BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ</div>
                            </div>

                            <div className="py-6">
                              <img
                                src="/selcuk-amblem.png"
                                alt="Selçuk Üniversitesi"
                                className="mx-auto h-32 w-auto object-contain"
                              />
                            </div>

                            <div className="space-y-2 text-sm font-bold">
                              <div>Öğrenci Numarası: {verifiedStudentNo}</div>
                              <div>Adı ve Soyadı: {user.fullName}</div>
                            </div>

                            <div className="py-8">
                              <div className="text-2xl font-extrabold tracking-wide">
                                {selected.type === 'Staj1' ? 'STAJ I RAPORU' : 'STAJ II RAPORU'}
                              </div>
                              <div className="mt-2 text-sm font-semibold text-slate-700">
                                {selected.companyName}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                ({formatDate(selected.startDate)} – {formatDate(selected.endDate)} • {selected.workDays} İş Günü)
                              </div>
                            </div>

                            <div className="pt-8 text-base font-bold">
                              <div>{selected.startDate.slice(0, 4)}</div>
                              <div>KONYA</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : wordViewMode === 'intro' ? (
                      /* WORD İŞYERİ VE PERSONEL TANITIM SAYFASI (rapor__kapak.docx Sayfa 2 - TF-BM-SF-02a) */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
                          <button
                            type="button"
                            onClick={() => setWordViewMode('cover')}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Kapak Sayfası
                          </button>
                          <span className="text-xs font-extrabold text-blue-900">
                            🏢 Word Görünümü: İşyeri ve Personel Tanıtımı (TF-BM-SF-02a)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (logbook.length > 0) selectEntryForEdit(logbook[0]);
                              else openBlankNewPage([]);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
                          >
                            1. Gün Rapor Sayfasına Geç
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mx-auto rounded-sm border-2 border-slate-300 bg-white p-8 shadow-xl font-serif text-black space-y-6">
                          <table className="w-full border-collapse border border-black text-xs">
                            <tbody>
                              <tr>
                                <td className="w-28 border border-black p-2 text-center">
                                  <img
                                    src="/selcuk-amblem.png"
                                    alt="Amblem"
                                    className="mx-auto h-14 w-auto object-contain"
                                  />
                                </td>
                                <td className="border border-black p-2 text-center font-bold">
                                  <div>T.C.</div>
                                  <div>SELÇUK ÜNİVERSİTESİ</div>
                                  <div>TEKNOLOJİ FAKÜLTESİ</div>
                                  <div>BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ</div>
                                </td>
                                <td className="w-44 border border-black p-2 text-[11px]">
                                  <div><b>Doküman No:</b> TF-BM-SF-02a</div>
                                  <div><b>Revizyon Tarihi:</b> 16.02.2021</div>
                                  <div><b>Revizyon No:</b> 04</div>
                                  <div><b>Sayfa No:</b> 2 / 2</div>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <table className="w-full border-collapse border border-black text-xs">
                            <tbody>
                              <tr>
                                <td className="w-48 border border-black bg-slate-100 p-2 font-bold">İŞYERİ ADI</td>
                                <td className="border border-black p-2">{selected.companyName}</td>
                              </tr>
                              <tr>
                                <td className="border border-black bg-slate-100 p-2 font-bold">İŞYERİ YETKİLİSİ</td>
                                <td className="border border-black p-2">{selected.advisorName}</td>
                              </tr>
                              <tr>
                                <td className="border border-black bg-slate-100 p-2 font-bold">ADRESİ</td>
                                <td className="border border-black p-2">{selected.companyAddress || selected.companyCity || '-'}</td>
                              </tr>
                              <tr>
                                <td className="border border-black bg-slate-100 p-2 font-bold">E-POSTA</td>
                                <td className="border border-black p-2">{selected.advisorEmail}</td>
                              </tr>
                              <tr>
                                <td className="border border-black bg-slate-100 p-2 font-bold">ÇALIŞILAN BİRİM / FAALİYET</td>
                                <td className="border border-black p-2">{selected.department || 'Bilgisayar / Yazılım Mühendisliği'}</td>
                              </tr>
                            </tbody>
                          </table>

                          <table className="w-full border-collapse border border-black text-xs">
                            <thead>
                              <tr>
                                <th colSpan={4} className="border border-black bg-slate-100 p-2 text-center font-bold">
                                  PERSONEL TANITIMI
                                </th>
                              </tr>
                              <tr className="bg-slate-50">
                                <th className="w-16 border border-black p-2">SIRA NO</th>
                                <th className="border border-black p-2">ADI SOYADI</th>
                                <th className="border border-black p-2">MEZUN OLDUĞU FAKÜLTE / BÖLÜM</th>
                                <th className="border border-black p-2">GÖREVİ</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-black p-2 text-center">1</td>
                                <td className="border border-black p-2 font-bold">{selected.advisorName}</td>
                                <td className="border border-black p-2">{selected.department || 'Mühendislik Fakültesi'}</td>
                                <td className="border border-black p-2">Sorumlu Mühendis / Staj Danışmanı</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      /* WORD GÜNLÜK RAPOR SAYFASI (rapor_sayfası.docx BİREBİR A4 KAĞIT GÖRÜNÜMÜ) */
                      <form onSubmit={handleSaveLogbook} className="space-y-4">
                        {/* Sayfa Üst Kontrol Çubuğu */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={currentEntryIndex <= 0}
                              onClick={() => {
                                if (currentEntryIndex > 0)
                                  selectEntryForEdit(logbook[currentEntryIndex - 1]);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Önceki Gün
                            </button>
                            <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-900 border border-blue-200">
                              {activeEntryId
                                ? `Word Rapor Sayfası: ${pageNumber}. İş Günü / ${selected.workDays} Gün`
                                : `Yeni Word Rapor Sayfası (${pageNumber}. İş Günü / ${selected.workDays} Gün)`}
                            </span>
                            <button
                              type="button"
                              disabled={
                                currentEntryIndex < 0 || currentEntryIndex >= logbook.length - 1
                              }
                              onClick={() => {
                                if (
                                  currentEntryIndex >= 0 &&
                                  currentEntryIndex < logbook.length - 1
                                ) {
                                  selectEntryForEdit(logbook[currentEntryIndex + 1]);
                                }
                              }}
                              className="flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              Sonraki Gün
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openBlankNewPage(logbook)}
                              disabled={selected.advisorLogbookApproved || logbook.length >= selected.workDays}
                              className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                              {logbook.length >= selected.workDays
                                ? `Tüm Günler (${selected.workDays}) Açıldı`
                                : 'Yeni Sayfa Aç'}
                            </button>
                            <button
                              type="submit"
                              disabled={selected.advisorLogbookApproved}
                              className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" />
                              {activeEntryId ? 'Sayfayı Güncelle' : 'Bu Sayfayı Kaydet'}
                            </button>
                          </div>
                        </div>

                        {/* A4 WORD KAĞIT GÖRÜNÜMÜ — rapor_sayfası.docx BİREBİR ŞABLONU */}
                        <div className="mx-auto rounded-sm border-2 border-slate-300 bg-white p-6 shadow-xl sm:p-10">
                          {/* 1. ÜST TABLO (HEADER TABLE - rapor_sayfası.docx) */}
                          <table className="w-full border-collapse border border-black text-black">
                            <tbody>
                              <tr>
                                {/* Sol Hücre: Teknoloji Fakültesi Amblemi (2 Satır Birleşik) */}
                                <td
                                  rowSpan={2}
                                  className="w-36 border border-black p-2 text-center align-middle sm:w-44"
                                >
                                  <img
                                    src="/rapor-media1.png"
                                    alt="Selçuk Üniversitesi Teknoloji Fakültesi"
                                    className="mx-auto max-h-20 w-auto object-contain"
                                  />
                                </td>

                                {/* Orta Hücre: T.C. SELÇUK ÜNİVERSİTESİ TEKNOLOJİ FAKÜLTESİ BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ STAJ RAPORU */}
                                <td
                                  rowSpan={2}
                                  className="border border-black px-3 py-2 text-center align-middle font-serif text-xs font-bold leading-snug sm:text-sm"
                                >
                                  <div>T.C.</div>
                                  <div>SELÇUK ÜNİVERSİTESİ</div>
                                  <div>TEKNOLOJİ FAKÜLTESİ</div>
                                  <div>BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ</div>
                                  <div className="mt-0.5">STAJ RAPORU</div>
                                </td>

                                {/* Sağ Üst: Tarih */}
                                <td className="w-20 border border-black px-2 py-2 text-xs font-semibold align-middle">
                                  Tarih
                                </td>
                                <td className="w-36 border border-black p-1.5 text-center align-middle">
                                  <input
                                    type="date"
                                    value={logDate}
                                    onChange={(e) => setLogDate(e.target.value)}
                                    disabled={selected.advisorLogbookApproved}
                                    className="w-full rounded border border-slate-200 px-1.5 py-1 text-center text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                                    required
                                  />
                                </td>
                              </tr>
                              <tr>
                                {/* Sağ Alt: Sayfa No */}
                                <td className="border border-black px-2 py-2 text-xs font-semibold align-middle">
                                  Sayfa No:
                                </td>
                                <td className="border border-black p-1.5 text-center align-middle">
                                  <input
                                    type="number"
                                    min={1}
                                    max={selected.workDays}
                                    value={pageNumber}
                                    onChange={(e) =>
                                      setPageNumber(
                                        Math.min(
                                          selected.workDays,
                                          Math.max(1, Number(e.target.value))
                                        )
                                      )
                                    }
                                    disabled={selected.advisorLogbookApproved}
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-center text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                                    required
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* 2. ORTA GÖVDE (DÜZENLENEBİLİR STAJ RAPORU SAYFA İÇERİĞİ) */}
                          <div className="my-4 min-h-[440px] border border-slate-300 p-4 flex flex-col">
                            <div className="mb-3 border-b border-slate-200 pb-2">
                              <input
                                type="text"
                                value={logTitle}
                                onChange={(e) => setLogTitle(e.target.value)}
                                disabled={selected.advisorLogbookApproved}
                                placeholder="Yapılan Çalışmanın Konusu / Başlığı (Örn: Veritabanı Tablolarının Tasarımı ve API Geliştirmesi)..."
                                className="w-full border-0 bg-transparent text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                              />
                            </div>
                            <textarea
                              rows={16}
                              value={logContent}
                              onChange={(e) => setLogContent(e.target.value)}
                              disabled={selected.advisorLogbookApproved}
                              placeholder="Bu iş gününde gerçekleştirdiğiniz staj çalışmalarını Word sayfasına yazar gibi detaylıca buraya yazınız. Tüm sayfalar tamamlandığında Kapak + Rapor Sayfaları tek bir PDF olarak indirilebilir ve sorumlu mühendise gönderilebilir..."
                              className="w-full flex-1 resize-y border-0 bg-transparent font-serif text-sm leading-relaxed text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none"
                              required
                            />
                          </div>

                          {/* 3. ALT TABLO (FOOTER TABLE - rapor_sayfası.docx) */}
                          <table className="w-full border-collapse border border-black text-center text-black">
                            <tbody>
                              <tr>
                                <td className="border border-black py-1.5 text-xs font-bold tracking-wide">
                                  STAJ SORUMLUSU
                                </td>
                              </tr>
                              <tr>
                                <td className="h-14 border border-black align-middle text-xs">
                                  {selected.advisorLogbookApproved ? (
                                    <span className="font-bold text-emerald-700">
                                      ✔ ONAYLANDI — {selected.advisorName} (
                                      {formatDate(selected.advisorApprovedAt)})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Onay (İmza &amp; Kaşe)</span>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td className="border border-black py-1.5 text-xs text-slate-500">
                                  {logDate
                                    ? formatDate(logDate).replace(/\./g, ' / ')
                                    : '........ /   . / 20 ..'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ANA SEKME 4: İZİN / TELAFİ TALEBİ */}
            {mainTab === 'leaves' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <form
                    onSubmit={handleCreateLeave}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                  >
                    <h4 className="font-bold text-slate-900">
                      İzin / Sağlık Raporu Talebi Oluştur
                    </h4>
                    <p className="text-xs text-slate-500">
                      Komisyon onayladığında kullanılmayan günler stajın sonuna otomatik eklenir ve yeni bitiş tarihi KPTO'ya bildirilir.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Talep Türü</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="MedicalReport">Sağlık Raporu</option>
                        <option value="Excuse">Mazeret İzni / Telafi</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Başlangıç Tarihi
                        </label>
                        <input
                          type="date"
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          İş Günü Sayısı
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={15}
                          value={leaveDays}
                          onChange={(e) => setLeaveDays(Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Gerekçe / Açıklama
                      </label>
                      <textarea
                        rows={3}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Örn: 2 günlük hastane istirahat raporu..."
                        className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      İzin / Telafi Talebi Gönder
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h4 className="font-bold text-slate-900">İzin / Telafi Taleplerim</h4>
                    {selected.leaveRequests.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">
                        Kayıtlı izin talebiniz bulunmuyor.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2.5">
                        {selected.leaveRequests.map((lr) => (
                          <div
                            key={lr.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                {lr.type === 'MedicalReport' ? 'Sağlık Raporu' : 'Mazeret İzni'} —{' '}
                                {lr.days} İş Günü ({formatDate(lr.startDate)})
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 font-bold ${
                                  lr.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : lr.status === 'Rejected'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {lr.status === 'Approved'
                                  ? 'Onaylandı (Sona Eklendi)'
                                  : lr.status === 'Rejected'
                                  ? 'Reddedildi'
                                  : 'Komisyon Onayı Bekliyor'}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-600">{lr.reason}</p>
                            {lr.newEndDate && (
                              <p className="mt-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                                Bitiş Tarihi Ötelendi: {formatDate(lr.oldEndDate)} →{' '}
                                {formatDate(lr.newEndDate)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* FORM 7 (STAJ İPTAL FORMU) OLUŞTURMA, ÖNİZLEME VE KOMİSYONA GÖNDERME MODALI */}
      {showForm7Modal && selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700">
                  <FileX2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold text-rose-800">
                      FORM-7 • TF-BM-SF-07
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Rev. 02 (21.03.2022)
                    </span>
                  </div>
                  <h3 className="mt-0.5 text-lg font-extrabold text-slate-900">
                    STAJ İPTAL FORMU (Form 7) Oluştur ve Komisyona Gönder
                  </h3>
                  <p className="text-xs text-slate-500">
                    Öğrenci ve staj bilgileriniz sistemden otomatik doldurulmuştur. Mazeretinizi yazarak formu önizleyebilir ve doğrudan Staj Komisyonuna iletebilirsiniz.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm7Modal(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm7} className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50/60 text-xs">
                <div className="grid grid-cols-1 border-b border-slate-300 bg-slate-100 sm:grid-cols-2">
                  <div className="border-b border-slate-300 px-3.5 py-2.5 font-bold text-slate-900 sm:border-b-0 sm:border-r">
                    Konu : Staj İptali
                  </div>
                  <div className="px-3.5 py-2.5 font-bold text-slate-900">
                    Tarih: {formatDate(new Date().toISOString())}
                  </div>
                </div>

                <div className="grid grid-cols-1 border-b border-slate-300 sm:grid-cols-4">
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    Adı Soyadı
                  </div>
                  <div className="px-3.5 py-2.5 font-semibold text-slate-900 sm:border-r sm:border-slate-300">
                    {user.fullName}
                  </div>
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    T.C. Kimlik No
                  </div>
                  <div className="px-2.5 py-1.5">
                    <input
                      type="text"
                      maxLength={11}
                      value={form7NationalId}
                      onChange={(e) => setForm7NationalId(e.target.value)}
                      placeholder="11 Haneli T.C. Kimlik No"
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 border-b border-slate-300 sm:grid-cols-4">
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    Öğrenci No
                  </div>
                  <div className="px-3.5 py-2.5 font-semibold text-slate-900 sm:border-r sm:border-slate-300">
                    {verifiedStudentNo}
                  </div>
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    Cep Tel No
                  </div>
                  <div className="px-2.5 py-1.5">
                    <input
                      type="text"
                      value={form7Phone}
                      onChange={(e) => setForm7Phone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 border-b border-slate-300 sm:grid-cols-4">
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    NÖ / İÖ
                  </div>
                  <div className="px-2.5 py-1.5 sm:border-r sm:border-slate-300">
                    <select
                      value={form7EduType}
                      onChange={(e) => setForm7EduType(e.target.value as 'NÖ' | 'İÖ')}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900"
                    >
                      <option value="NÖ">NÖ (Normal Öğretim)</option>
                      <option value="İÖ">İÖ (İkinci Öğretim)</option>
                    </select>
                  </div>
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    E-posta
                  </div>
                  <div className="px-3.5 py-2.5 font-semibold text-slate-900 truncate">
                    {user.email}
                  </div>
                </div>

                <div className="grid grid-cols-1 border-b border-slate-300 sm:grid-cols-4">
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    Staj Yapılan İşyeri Adı
                  </div>
                  <div className="px-3.5 py-2.5 font-bold text-slate-900 sm:col-span-3">
                    {selected.companyName}
                  </div>
                </div>

                <div className="grid grid-cols-1 border-b border-slate-300 sm:grid-cols-4">
                  <div className="bg-slate-100/80 px-3.5 py-2.5 font-bold text-slate-700 sm:border-r sm:border-slate-300">
                    Staj Türü*
                  </div>
                  <div className="flex items-center gap-6 px-3.5 py-2.5 font-bold text-slate-900 sm:col-span-3">
                    <span>{selected.type === 'Staj1' ? '☑ Staj-1' : '☐ Staj-1'}</span>
                    <span>{selected.type === 'Staj2' ? '☑ Staj-2' : '☐ Staj-2'}</span>
                  </div>
                </div>

                <div className="bg-white p-4 space-y-3">
                  <p className="text-xs leading-relaxed text-slate-800">
                    Başlangıç tarihi <b>{formatDate(selected.startDate)}</b> , bitiş tarihi{' '}
                    <b>{formatDate(selected.endDate)}</b> olan <b>{selected.workDays}</b> iş günlük stajımı aşağıda
                    belirttiğim mazeretten dolayı sonlandırmak için gereğini saygılarımla arz ederim.
                  </p>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-900">
                      Mazeretim (İptal Gerekçesi) *
                    </label>
                    <textarea
                      rows={4}
                      value={form7Reason}
                      onChange={(e) => setForm7Reason(e.target.value)}
                      placeholder="Stajınızı iptal etme / sonlandırma gerekçenizi detaylı olarak buraya yazınız..."
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm7Modal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePreviewForm7}
                    className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-800 shadow-xs hover:bg-blue-100"
                  >
                    <Eye className="h-4 w-4 text-blue-700" />
                    Formu Önizle (PDF)
                  </button>

                  <button
                    type="submit"
                    disabled={submittingForm7}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submittingForm7 ? 'Gönderiliyor...' : 'Formu Komisyona Gönder'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TARAYICI İÇİ BELGE ÖNİZLEME MODALI */}
      {previewModal && (
        <DocumentPreviewModal
          onClose={() => setPreviewModal(null)}
          title={previewModal.title}
          subtitle={previewModal.subtitle}
          sources={previewModal.sources}
          initialIndex={previewModal.initialIndex}
        />
      )}
    </div>
  );
};
