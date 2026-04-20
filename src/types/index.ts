// src/types/index.ts
// Central type definitions – import from here everywhere

export type SchoolType =
  | 'رسمي'
  | 'رسمي لغات'
  | 'خاص'
  | 'خاص لغات'
  | 'دولي'
  | 'ثقافي';

export type GradeType =
  | 'الأول'
  | 'الثاني'
  | 'الثالث'
  | 'الرابع'
  | 'الخامس'
  | 'السادس';

// ── Database row shapes ──────────────────────────────────────
export interface School {
  id: string;
  code: string;
  name: string;
  type: SchoolType;
  stage: string;
  district: string | null;
  address: string | null;
  created_at: string;
}

export interface Upload {
  id: string;
  school_id: string;
  district: string | null;
  school_name_snapshot: string | null;
  address_snapshot: string | null;
  file_name: string | null;
  storage_path: string | null;
  uploaded_at: string;
}

export interface Student {
  id: string;
  upload_id: string;
  school_id: string;
  row_num: number | null;
  name: string;
  grade: string | null;
  class_room: string | null;
  created_at: string;
}

// ── API payloads ─────────────────────────────────────────────
export interface LoginPayload {
  type: 'admin' | 'school';
  identifier: string; // username or school code
  password: string;
}

export interface SessionUser {
  role: 'admin' | 'school';
  schoolId?: string;
  schoolCode?: string;
  schoolName?: string;
  schoolType?: SchoolType;
}

export interface ParsedExcelData {
  header: {
    district: string;
    schoolName: string;
    address: string;
  };
  students: ParsedStudent[];
}

export interface ParsedStudent {
  rowNum: number;
  name: string;
  grade: string;
  classRoom: string;
}

// ── API response shapes ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface AdminStats {
  totalStudents: number;
  totalSchools: number;
  uploadedSchools: number;
  pendingSchools: number;
  byType: Record<string, number>;
  byGrade: Record<string, number>;
}

export interface SchoolWithStatus extends School {
  uploadCount: number;
  studentCount: number;
  lastUpload: string | null;
}
