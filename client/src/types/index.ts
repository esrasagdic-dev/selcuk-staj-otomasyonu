export type UserRole = 'Student' | 'CommissionMember' | 'DepartmentHead' | 'KPTOOfficer';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  department?: string;
  studentProfile?: {
    studentNumber: string;
    nationalId: string;
    faculty: string;
    department: string;
    classLevel: number;
    address: string;
    hasAcceptedGuide: boolean;
  };
}

export interface Workplace {
  id: number;
  name: string;
  taxNumber?: string;
  city: string;
  address: string;
  webSite?: string;
  phoneNumber?: string;
  companyEmail?: string;
  sector: string;
}

export interface InternshipPeriod {
  id: number;
  title: string;
  type: 'Staj1' | 'Staj2';
  defaultWorkDays: number;
  applicationStartDate: string;
  applicationEndDate: string;
  earliestStartDate: string;
  latestEndDate: string;
  documentDeadlineDate: string;
  isSaturdayAllowed: boolean;
  isActive?: boolean;
  academicYear?: string;
  applicationCount?: number;
}

export interface WorkDayBreakdownItem {
  date: string;
  dayName: string;
  isCounted: boolean;
  reason: string;
  cumulativeDayCount?: number;
}

export interface WorkDayCalculationResult {
  startDate: string;
  calculatedEndDate: string;
  requiredWorkDays: number;
  includesSaturday: boolean;
  totalCalendarDays: number;
  totalSkippedSundays: number;
  totalSkippedSaturdays: number;
  totalSkippedHolidays: number;
  breakdown: WorkDayBreakdownItem[];
}

export interface DocumentVersion {
  id: number;
  versionNumber: number;
  originalFileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface DocumentItem {
  id: number;
  type: 'Form2_KabulFormu' | 'Spas_Mustehaklik' | 'Form5_OgrenciBeyani' | 'Form3_DevamFormu' | 'Form4_DegerlendirmeFormu' | 'Form7_IptalFormu' | 'Other';
  status: 'Pending' | 'Approved' | 'RevisionRequested' | 'Rejected';
  currentVersionNumber: number;
  latestVersion?: DocumentVersion;
}

export interface InternshipApplication {
  id: number;
  studentId: number;
  studentName?: string;
  studentNumber?: string;
  studentDepartment?: string;
  studentFaculty?: string;
  periodId: number;
  periodTitle?: string;
  workplaceId: number;
  workplaceName?: string;
  workplaceCity?: string;
  type: 'Staj1' | 'Staj2';
  subject?: string;
  requiredWorkDays: number;
  includesSaturday: boolean;
  startDate: string;
  calculatedEndDate: string;
  currentEndDate: string;
  status: 'Draft' | 'Submitted' | 'RevisionRequired' | 'ApprovedByCommission' | 'InsuranceStarted' | 'InProgress' | 'AwaitingAdvisorApproval' | 'AdvisorApproved' | 'Completed' | 'Rejected' | 'Cancelled';
  commissionDecision: 'None' | 'Approved' | 'Rejected';
  commissionRejectReason?: string;
  academicResult: 'None' | 'Successful' | 'PartiallySuccessful' | 'Unsuccessful';
  acceptedDaysCount: number;

  // Staj Uzatma Alanları
  hasExtensionRequest?: boolean;
  extensionExtraDays?: number;
  extensionMissedDates?: string;
  extensionReason?: string;
  extensionRequestedAt?: string;
  isExtensionApprovedByCommission?: boolean;
  extensionCommissionApprovedAt?: string;
  isExtensionSgkProcessedByKPTO?: boolean;
  extensionSgkProcessedAt?: string;

  // Staj İptal Alanları
  hasCancelRequest?: boolean;
  cancelReason?: string;
  cancelFormDocumentPath?: string;
  cancelRequestedAt?: string;
  isCancelApprovedByCommission?: boolean;
  cancelCommissionApprovedAt?: string;
  cancelCommissionNotes?: string;

  // Dekont Alanları
  receiptDocumentPath?: string;
  receiptUploadedAt?: string;
  isReceiptVerifiedByKPTO?: boolean;

  // Defter Durum Alanları
  diary?: {
    id: number;
    isLocked: boolean;
    lockReason?: string;
    isRevisionRequestedByAdvisor: boolean;
    advisorRevisionNotes?: string;
    revisionRequestedAt?: string;
    isSubmittedToAdvisor: boolean;
    isApprovedByAdvisor: boolean;
    approvedAt?: string;
  };

  advisor?: {
    fullName: string;
    email: string;
    phoneNumber: string;
    graduatedUniversityAndDepartment: string;
    titleOrPosition: string;
    hasApprovedDiary: boolean;
    accessToken?: string;
  };
  documents: DocumentItem[];
  insurance?: {
    status: string;
    sgkEntryDate?: string;
    sgkExitDate?: string;
  };
  physicalDelivery?: {
    method: 'HandDelivery' | 'CourierCargo';
    cargoCompany?: string;
    trackingNumber?: string;
    isReceivedByUniversity: boolean;
    receivedDate?: string;
  };
}

export interface WorkplaceStaff {
  rowNo?: number;
  fullName: string;
  graduatedUniversityAndDepartment: string;
  titleOrPosition: string;
}

export interface DiaryCoverInfo {
  totalEmployees?: string;
  workplacePhone?: string;
  workplaceEmail?: string;
  workplaceWebSite?: string;
  workplaceAddress?: string;
  workplaceCity?: string;
  activityAreas?: string[];
  staffMembers?: WorkplaceStaff[];
}

export interface DiaryEntry {
  id: number;
  dayNumber: number;
  entryDate: string;
  title: string;
  content: string;
  isDraft: boolean;
  imageUrl?: string | null;
  imageCaption?: string | null;
  imageUrlFull?: string | null;
  updatedAt?: string;
}

export interface UserNotification {
  id: number;
  title: string;
  message: string;
  type: 'Info' | 'Success' | 'Warning' | 'Error';
  relatedApplicationId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface EmailLog {
  id: number;
  toEmail: string;
  recipientName: string;
  subject: string;
  templateType: string;
  bodyHtml: string;
  relatedApplicationId?: number;
  status: string;
  sentAt: string;
}

export interface CompanyJobPosting {
  id: number;
  companyName: string;
  department: string;
  title: string;
  sector: string;
  city: string;
  quota: number;
  requirements: string;
  contactEmail: string;
  applicationDeadline: string;
  isActive: boolean;
  createdAt: string;
}

export interface PublicHolidayItem {
  id: number;
  date: string;
  description: string;
  year: number;
}

export interface JobPostingStats {
  totalPostings: number;
  activePostings: number;
  totalQuota: number;
  bySector: { sector: string; count: number; quota: number }[];
  byDepartment: { department: string; count: number; quota: number }[];
}
