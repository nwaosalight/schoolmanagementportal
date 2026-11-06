import type { Timestamp } from 'firebase/firestore';

export type StaffRole = 'school_admin' | 'exam_officer' | 'principal' | 'hod' | 'teacher';
export type DataRole = StaffRole | 'parent' | 'student';
export type Role = DataRole | 'platform';
export type Doc<T> = T & { id: string };
export type TS = Timestamp | Date | string | null | undefined;
export type ResultStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'RETURNED' | 'PUBLISHED' | 'LOCKED';
export type RowFlag = 'NONE' | 'ABSENT' | 'EXCUSED';

export interface UserDoc {
  schoolId: string;
  roles: DataRole[];
  firstName: string;
  lastName: string;
  email?: string | null;
  loginId?: string | null;
  phone?: string | null;
  status: 'ACTIVE' | 'DEACTIVATED';
  mustChangePassword: boolean;
  termsAcceptedAt?: TS;
  isPlatformAdmin?: boolean;
  staffNumber?: string | null;
  department?: string | null;
  fcmTokens?: string[];
  createdAt?: TS;
  lastLoginAt?: TS;
}

export interface SchoolDoc {
  code: string;
  name: string;
  motto?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  principalName?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  ownerUid: string;
  planId?: string;
  createdAt?: TS;
}

export interface Session { name: string; startDate: string; endDate: string; isCurrent: boolean }
export interface Term {
  sessionId: string; name: string; sequence: number; startDate: string; endDate: string;
  nextTermBegins?: string; daysOpen?: number; isCurrent: boolean; status: 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'LOCKED';
}
export interface Level { name: string; rank: number; stage: string; nextLevelId?: string }
export interface Arm { levelId: string; name: string; capacity?: number; isActive: boolean }
export interface Subject { name: string; code: string; type: 'CORE' | 'ELECTIVE'; levelIds: string[]; isActive: boolean }
export interface Band { grade: string; min: number; max: number; remark: string; gpa?: number; isPass: boolean }
export interface GradingScheme { name: string; passMark: number; bands: Band[]; isDefault: boolean }
export interface Component { code: string; name: string; max: number; isExam?: boolean }
export interface Structure { name: string; total: number; components: Component[]; isDefault: boolean }
export interface Trait { name: string; category: 'AFFECTIVE' | 'PSYCHOMOTOR'; maxRating: number; isActive: boolean }

export interface Student {
  admissionNumber: string; firstName: string; lastName: string; otherNames?: string;
  gender: 'MALE' | 'FEMALE'; dob?: string; armId: string | null; status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'WITHDRAWN';
  guardianUids: string[]; userId?: string | null; electives?: string[]; address?: string;
  history?: { armId: string | null; armLabel: string; at: string; note: string }[];
}

export interface Allocation { termId: string; armId: string; subjectId: string; teacherUid: string; teacherName: string }
export interface ClassTeacher { sessionId: string; armId: string; teacherUid: string; teacherName: string }

export interface Stats { studentCount: number; classAverage: number | null; highest: number | null; lowest: number | null; passRate: number | null; blanks: number }
export interface Sheet {
  termId: string; sessionId: string; armId: string; armLabel: string; subjectId: string; subjectName: string;
  teacherUid: string; teacherName: string; status: ResultStatus; version: number;
  components: Component[]; bands: Band[]; passMark: number; stats?: Stats | null;
  returnedReason?: string | null; submittedAt?: TS; approvedAt?: TS; createdAt?: TS; progress?: { filled: number; total: number };
}
export interface Row {
  studentId: string; name: string; admissionNumber: string; scores: Record<string, number | null>;
  flag: RowFlag; total: number | null; grade: string | null; remark: string | null; position: number | null; version: number;
}
export interface SubjectLine {
  subjectId: string; name: string; scores: Record<string, number | null>; total: number | null;
  grade: string | null; remark: string | null; position: number | null; classAverage: number | null; flag: RowFlag;
}
export interface Report {
  termId: string; sessionId: string; armId: string; armLabel: string; studentId: string; studentName: string;
  admissionNumber: string; gender?: string; guardianUids: string[]; studentUserId?: string | null;
  status?: 'DRAFT' | 'COMPUTED' | 'PUBLISHED' | 'LOCKED'; published?: boolean; publishedAt?: TS; verificationCode?: string;
  subjects?: SubjectLine[]; components?: Component[]; bands?: Band[]; passMark?: number;
  totalScore?: number | null; average?: number | null; cumulativeAverage?: number | null;
  overallGrade?: string | null; position?: number | null; classSize?: number;
  daysPresent?: number | null; daysAbsent?: number | null; traits?: Record<string, number>;
  teacherComment?: string; principalRemark?: string; computedAt?: TS;
}
export interface Notification { toUid: string; fromUid: string; title: string; body: string; link?: string; type: string; read: boolean; createdAt?: TS }
export interface Settings {
  allowQueries: boolean; notifyOnPublish: boolean; scoreDeadline?: string;
  showPosition: boolean; showClassAverage: boolean; showAttendance: boolean; showTraits: boolean; showGradeKey: boolean;
  layout: 'classic' | 'compact'; footerNote?: string; feeNotice?: string;
  teacherPhrases: { min: number; text: string }[]; principalPhrases: { min: number; text: string }[];
}
