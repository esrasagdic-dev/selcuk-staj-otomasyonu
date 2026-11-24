import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('staj_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type UserRole =
  | 'Student'
  | 'CommitteeMember'
  | 'DepartmentHead'
  | 'CompanyAdvisor'
  | 'KptoOfficer'
  | 'Admin';

export type InternshipType = 'Staj1' | 'Staj2';

export type InternshipStatus =
  | 'Draft'
  | 'Submitted'
  | 'RevisionRequested'
  | 'ApprovedByCommittee'
  | 'InsuranceStarted'
  | 'InProgress'
  | 'CompletedPendingReview'
  | 'Passed'
  | 'Failed'
  | 'Cancelled'
  | 'CancellationRequested'
  | 'Rejected';

export type AcademicResultType =
  | 'None'
  | 'Successful'
  | 'PartiallySuccessful'
  | 'Unsuccessful';

export type KptoInsuranceStatus =
  | 'Pending'
  | 'InsuranceActive'
  | 'InsuranceNotStarted';

export type DocumentType =
  | 'Form2'
  | 'Spas'
  | 'ResultForm'
  | 'SalaryReceipt'
  | 'Form7'
  | 'InternshipReport'
  | 'Form3'
  | 'Other';

export type LeaveType = 'Excuse' | 'MedicalReport';
export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  studentNo?: string;
  nationalId?: string;
  phone?: string;
  department?: string;
  hasAcceptedGuide: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export interface TermDto {
  id: string;
  name: string;
  academicYear: string;
  internshipType: InternshipType;
  earliestStartDate: string;
  latestEndDate: string;
  applicationDeadline: string;
  reportDeadline: string;
  minWorkDays: number;
  maxWorkDays: number;
  isActive: boolean;
  applicationCount: number;
  applicationStartDate?: string | null;
  isSaturdayAllowed?: boolean;
}

export interface HolidayDto {
  id: string;
  date: string;
  name: string;
}

export interface CompanyDto {
  id: string;
  name: string;
  sector?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  isVerified: boolean;
}

export interface CompanyStatDto {
  id: string;
  name: string;
  city?: string;
  sector?: string;
  isVerified: boolean;
  totalInternships: number;
  passedCount: number;
  activeCount: number;
}

export interface ListingDto {
  id: string;
  companyId?: string;
  companyName: string;
  title: string;
  description: string;
  contact?: string;
  city?: string;
  deadline?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  content: string;
  category: 'General' | 'Calendar' | 'CompanyListing' | 'Warning' | string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface WorkDayBreakdownItemDto {
  date: string;
  dayName: string;
  isWorkDay: boolean;
  workDayNumber?: number | null;
  reason: string;
}

export interface EndDateResponse {
  startDate: string;
  endDate: string;
  workDays: number;
  calendarDays: number;
  skippedHolidays: HolidayDto[];
  breakdown?: WorkDayBreakdownItemDto[];
  skippedSaturdays?: number;
  skippedSundays?: number;
}

export interface DocumentDto {
  id: string;
  type: DocumentType;
  originalFileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface LogbookEntryDto {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface LeaveRequestDto {
  id: string;
  internshipId: string;
  studentName: string;
  companyName: string;
  type: LeaveType;
  startDate: string;
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  reviewNote?: string;
  oldEndDate?: string;
  newEndDate?: string;
  createdAt: string;
}

export interface InternshipSummaryDto {
  id: string;
  studentId: string;
  studentName: string;
  studentNo?: string;
  termName: string;
  type: InternshipType;
  companyName: string;
  startDate: string;
  endDate: string;
  workDays: number;
  status: InternshipStatus;
  kptoStatus?: KptoInsuranceStatus;
  receivesSalary: boolean;
  submittedAt?: string;
  advisorLogbookApproved: boolean;
  isArchived: boolean;
  archiveYear?: string;
  pendingLeaveCount: number;
  form2DocumentId?: string;
  form2FileName?: string;
  spasDocumentId?: string;
  spasFileName?: string;
  form7DocumentId?: string;
  form7FileName?: string;
  worksOnSaturday?: boolean;
  logbookSubmittedToAdvisorAt?: string;
  logbookRevisionRequested?: boolean;
  academicResult?: AcademicResultType;
  acceptedDaysCount?: number;
  subject?: string | null;
}

export interface InternshipDetailDto {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentNo?: string;
  studentPhone?: string;
  studentNationalId?: string;
  termId: string;
  termName: string;
  type: InternshipType;
  companyId: string;
  companyName: string;
  companyCity?: string;
  companyAddress?: string;
  advisorName: string;
  advisorEmail: string;
  department?: string;
  workDays: number;
  startDate: string;
  endDate: string;
  originalEndDate: string;
  status: InternshipStatus;
  kptoStatus?: KptoInsuranceStatus;
  kptoNote?: string;
  receivesSalary: boolean;
  revisionNote?: string;
  evaluationNote?: string;
  submittedAt?: string;
  approvedAt?: string;
  insuranceStartedAt?: string;
  advisorLogbookApproved: boolean;
  advisorApprovedAt?: string;
  evaluatedAt?: string;
  isArchived: boolean;
  archiveYear?: string;
  verificationCode: string;
  currentDay?: number;
  logbookCount: number;
  documents: DocumentDto[];
  leaveRequests: LeaveRequestDto[];
  worksOnSaturday?: boolean;
  logbookSubmittedToAdvisorAt?: string;
  logbookRevisionRequested?: boolean;
  logbookRevisionNote?: string;
  advisorEmailSentAt?: string;
  advisorEmailStatus?: string;
  advisorLastLoginAt?: string;
  endingSoonNotified?: boolean;
  subject?: string | null;
  advisorTitle?: string | null;
  advisorGraduatedDepartment?: string | null;
  academicResult?: AcademicResultType;
  acceptedDaysCount?: number;
  advisorApprovedIpAddress?: string | null;
}

export interface KptoRowDto {
  internshipId: string;
  studentName: string;
  studentNo?: string;
  nationalId?: string;
  studentEmail: string;
  studentPhone?: string;
  companyName: string;
  companyAddress?: string;
  type: InternshipType;
  startDate: string;
  endDate: string;
  workDays: number;
  receivesSalary: boolean;
  kptoStatus?: KptoInsuranceStatus;
  kptoNote?: string;
  approvedAt?: string;
  insuranceStartedAt?: string;
  spasDocumentId?: string;
  salaryReceiptCount: number;
  dateChanged: boolean;
}

export interface SalaryReceiptDto {
  documentId: string;
  internshipId: string;
  studentName: string;
  studentNo?: string;
  companyName: string;
  fileName: string;
  uploadedAt: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  internshipId?: string;
}

export interface CommitteeStatsDto {
  totalApplications: number;
  pendingReview: number;
  approved: number;
  inProgress: number;
  awaitingEvaluation: number;
  passed: number;
  failed: number;
  pendingLeaves: number;
  topCompanies: CompanyStatDto[];
  cancellationRequested: number;
  cancelled: number;
  rejected?: number;
}

export interface ResetInternshipsResultDto {
  deletedInternships: number;
  deletedDocuments: number;
  deletedLogbookEntries: number;
  deletedLeaveRequests: number;
  deletedNotifications: number;
}

export interface VerifyResultDto {
  valid: boolean;
  studentName?: string;
  studentNo?: string;
  companyName?: string;
  termName?: string;
  startDate?: string;
  endDate?: string;
  status?: InternshipStatus;
}

export const roleLabels: Record<UserRole, string> = {
  Student: 'Öğrenci',
  CommitteeMember: 'Staj Komisyonu Üyesi',
  DepartmentHead: 'Bölüm Başkanı (Süper Yetkili)',
  CompanyAdvisor: 'Şirket Yetkilisi (Danışman)',
  KptoOfficer: 'KPTO / Sigorta Birimi',
  Admin: 'Sistem Yöneticisi',
};

export const statusLabels: Record<InternshipStatus, string> = {
  Draft: 'Taslak',
  Submitted: 'Komisyon Onayı Bekliyor',
  RevisionRequested: 'Revize İstendi',
  ApprovedByCommittee: 'Komisyon Onayladı (KPTO Bekleniyor)',
  InsuranceStarted: 'Sigorta Başlatıldı',
  InProgress: 'Staj Devam Ediyor',
  CompletedPendingReview: 'Değerlendirme Bekliyor',
  Passed: 'Geçti (Başarılı)',
  Failed: 'Kaldı (Başarısız)',
  Cancelled: 'İptal Edildi',
  CancellationRequested: 'İptal Talebi Bekliyor (Form 7)',
  Rejected: 'Başvuru Reddedildi',
};

export const statusColors: Record<InternshipStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-300',
  Submitted: 'bg-amber-50 text-amber-800 border-amber-300',
  RevisionRequested: 'bg-rose-50 text-rose-700 border-rose-300',
  ApprovedByCommittee: 'bg-blue-50 text-blue-700 border-blue-300',
  InsuranceStarted: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  InProgress: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  CompletedPendingReview: 'bg-purple-50 text-purple-700 border-purple-300',
  Passed: 'bg-green-100 text-green-800 border-green-400',
  Failed: 'bg-red-100 text-red-800 border-red-400',
  Cancelled: 'bg-gray-200 text-gray-600 border-gray-300',
  CancellationRequested: 'bg-orange-100 text-orange-800 border-orange-300',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-400',
};

export const academicResultLabels: Record<AcademicResultType, string> = {
  None: 'Değerlendirilmedi',
  Successful: 'Başarılı (Tam Kabul)',
  PartiallySuccessful: 'Kısmen Başarılı',
  Unsuccessful: 'Başarısız (Kaldı)',
};

export const academicResultColors: Record<AcademicResultType, string> = {
  None: 'bg-slate-100 text-slate-700 border-slate-300',
  Successful: 'bg-emerald-100 text-emerald-800 border-emerald-400',
  PartiallySuccessful: 'bg-amber-100 text-amber-900 border-amber-400',
  Unsuccessful: 'bg-rose-100 text-rose-800 border-rose-400',
};

export const docTypeLabels: Record<DocumentType, string> = {
  Form2: 'Islak İmzalı Staj Kabul Formu (Form 2)',
  Spas: 'SPAS Müstehaklık Belgesi (e-Devlet)',
  ResultForm: 'Şirket Sonuç / Değerlendirme Formu (Form 4)',
  SalaryReceipt: 'Stajyer Maaş Dekontu',
  Form7: 'Staj İptal Formu (Form 7)',
  InternshipReport: 'Staj Raporu / Defteri',
  Form3: 'Staj Devamlılık Formu (Form 3)',
  Other: 'Ek Belge',
};

export function formatDate(d?: string | null): string {
  if (!d) return '-';
  const parts = d.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return d;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message || 'Bir hata oluştu.';
  }
  return err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.';
}

export async function downloadBlob(url: string, fallbackName: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'];
  let fileName = fallbackName;
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i.exec(disposition);
    if (match?.[1]) fileName = decodeURIComponent(match[1]);
  }
  const blobUrl = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function fetchPreviewBlob(
  url: string,
  fallbackName: string,
  postBody?: unknown
): Promise<{ blobUrl: string; mimeType: string; fileName: string }> {
  const res = postBody
    ? await api.post(url, postBody, { responseType: 'blob' })
    : await api.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'];
  let fileName = fallbackName;
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i.exec(disposition);
    if (match?.[1]) fileName = decodeURIComponent(match[1]);
  }

  const lower = fileName.toLowerCase();
  let mimeType = (res.headers['content-type'] as string) || res.data.type || 'application/pdf';
  if (lower.endsWith('.pdf') || url.includes('/pdf/') || url.includes('/form7/')) {
    mimeType = 'application/pdf';
  } else if (lower.endsWith('.png')) {
    mimeType = 'image/png';
  } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    mimeType = 'image/jpeg';
  }

  const typedBlob = new Blob([res.data], { type: mimeType });
  const blobUrl = window.URL.createObjectURL(typedBlob);
  return { blobUrl, mimeType, fileName };
}
