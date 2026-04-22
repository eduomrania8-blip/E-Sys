// src/types/database.ts
// أنواع TypeScript المتوافقة مع Schema v2.0

export type Database = {
  public: {
    Tables: {
      educational_administrations: {
        Row: {
          id: string;
          code: string;
          name_ar: string;
          governorate: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educational_administrations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['educational_administrations']['Insert']>;
      };
      schools: {
        Row: {
          id: string;
          school_code: string;
          school_name_ar: string;
          school_type: SchoolType | null;
          educational_stage: EducationalStage | null;
          administration_id: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          established_year: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schools']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['schools']['Insert']>;
      };
      school_buildings: {
        Row: {
          id: string;
          school_id: string;
          building_status: 'مستقل' | 'يعمل مع مدارس أخرى' | null;
          shared_schools: string | null;
          actual_classrooms: number;
          admin_rooms: number;
          total_labs: number;
          lab_types: string[] | null;
          activity_rooms: number;
          playgrounds: number;
          courtyard_area_sqm: number | null;
          boys_toilets: number;
          girls_toilets: number;
          staff_toilets: number;
          fence_condition: 'جيد' | 'يحتاج صيانة' | 'غير موجود' | null;
          surveillance_cameras: number;
          has_landline: boolean;
          has_internet: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['school_buildings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['school_buildings']['Insert']>;
      };
      school_leaders: {
        Row: {
          id: string;
          school_id: string;
          national_id: string;
          full_name_ar: string;
          phone: string | null;
          job_title: LeaderJobTitle | null;
          cadre: string | null;
          appointment_type: AppointmentType | null;
          hire_date: string | null;
          retirement_date: string | null;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['school_leaders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['school_leaders']['Insert']>;
      };
      school_staff: {
        Row: {
          id: string;
          school_id: string;
          job_category: 'معلم' | 'إداري' | 'عامل' | null;
          teacher_code: string | null;
          national_id: string;
          full_name_ar: string;
          qualification: string | null;
          cadre_position: string | null;
          employment_type: AppointmentType | null;
          cadre_status: 'له كادر' | 'ليس له كادر' | null;
          assignment_status: 'أصل' | 'منتدب' | null;
          original_school_id: string | null;
          hire_date: string | null;
          retirement_date: string | null;
          phone: string | null;
          work_status: WorkStatus | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['school_staff']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['school_staff']['Insert']>;
      };
      class_statistics: {
        Row: {
          id: string;
          school_id: string;
          academic_year: string;
          grade_level: GradeLevel | null;
          number_of_classes: number;
          boys_count: number;
          girls_count: number;
          total_students: number; // GENERATED
          muslim_count: number;
          christian_count: number;
          density_per_class: number; // GENERATED
          inclusion_mental: number;
          inclusion_hearing: number;
          inclusion_visual: number;
          inclusion_physical: number;
          inclusion_multiple: number;
          inclusion_total: number; // GENERATED
          expatriate_count: number;
          transferred_or_new: number;
          retained_for_repeat: number;
          dropout_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['class_statistics']['Row'], 'id' | 'total_students' | 'density_per_class' | 'inclusion_total' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['class_statistics']['Insert']>;
      };
      low_performer_students: {
        Row: {
          id: string;
          school_id: string;
          academic_year: string;
          student_full_name: string;
          grade_level: string;
          class_name: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['low_performer_students']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['low_performer_students']['Insert']>;
      };
      inclusion_students_list: {
        Row: {
          id: string;
          school_id: string;
          academic_year: string;
          student_full_name: string;
          national_id: string;
          grade_level: string;
          class_name: string | null;
          disability_type: DisabilityType | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inclusion_students_list']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['inclusion_students_list']['Insert']>;
      };
      expatriate_students_list: {
        Row: {
          id: string;
          school_id: string;
          academic_year: string;
          student_full_name: string;
          passport_number: string | null;
          grade_level: string;
          class_name: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expatriate_students_list']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['expatriate_students_list']['Insert']>;
      };
      refugee_students_list: {
        Row: {
          id: string;
          school_id: string;
          academic_year: string;
          student_full_name: string;
          grade_level: string;
          class_name: string | null;
          country: string | null;
          refugee_classification: RefugeeClassification | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['refugee_students_list']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['refugee_students_list']['Insert']>;
      };
      staging_school_data: {
        Row: {
          id: string;
          uploaded_by: string | null;
          upload_session_id: string;
          raw_school_code: string | null;
          raw_school_name: string | null;
          raw_total_students: string | null;
          raw_classroom_count: string | null;
          raw_academic_year: string | null;
          full_row_data: Record<string, unknown> | null;
          row_number: number | null;
          validation_status: 'pending' | 'valid' | 'invalid' | 'processed' | 'error';
          validation_errors: string[] | null;
          matched_school_id: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['staging_school_data']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['staging_school_data']['Insert']>;
      };
      user_school_permissions: {
        Row: {
          id: string;
          user_id: string;
          school_id: string | null;
          permission_level: 'view' | 'edit' | 'admin';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_school_permissions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_school_permissions']['Insert']>;
      };
    };
    Views: {
      school_summary: {
        Row: {
          school_id: string;
          school_code: string;
          school_name_ar: string;
          school_type: string | null;
          educational_stage: string | null;
          is_active: boolean;
          administration_name: string | null;
          governorate: string | null;
          actual_classrooms: number | null;
          building_status: string | null;
          has_internet: boolean | null;
          total_students: number;
          total_classes: number;
          total_inclusion: number;
          total_expatriate: number;
          total_retained: number;
          total_dropouts: number;
          total_boys: number;
          total_girls: number;
          avg_density: number | null;
          low_performer_count: number;
          teacher_count: number;
          admin_count: number;
          worker_count: number;
        };
      };
      high_density_schools: {
        Row: {
          school_id: string;
          school_code: string;
          school_name_ar: string;
          school_type: string | null;
          administration_name: string | null;
          governorate: string | null;
          grade_level: string | null;
          total_students: number;
          number_of_classes: number;
          density_per_class: number;
          density_status: 'خطر' | 'مرتفع' | 'متوسط' | 'مقبول';
        };
      };
    };
    Functions: {
      find_alternative_schools: {
        Args: { target_school_id: string; year?: string };
        Returns: {
          alternative_school_id: string;
          alternative_school_code: string;
          alternative_school_name: string;
          avg_density: number;
          available_classrooms: number;
          total_students: number;
        }[];
      };
    };
  };
};

// ─── Enums ──────────────────────────────────────────────────────

export type SchoolType = 'رسمية' | 'رسمية لغات' | 'خاصة' | 'خاصة لغات' | 'دولية' | 'فنية';

export type EducationalStage = 'ابتدائي' | 'اعدادي' | 'ثانوي' | 'تعليم اساسي' | 'تعليم مجتمعي';

export type GradeLevel =
  | 'KG1' | 'KG2'
  | 'الأول' | 'الثاني' | 'الثالث' | 'الرابع' | 'الخامس' | 'السادس'
  | 'الأول اعدادي' | 'الثاني اعدادي' | 'الثالث اعدادي'
  | 'الأول ثانوي' | 'الثاني ثانوي' | 'الثالث ثانوي';

export type LeaderJobTitle =
  | 'مدير' | 'وكيل شئون العاملين' | 'وكيل شئون الطلاب'
  | 'مسئول الإحصاء' | 'مسئول الدمج' | 'مسئول القرائية'
  | 'مسئول وحدة التدريب' | 'رئيس الكنترول';

export type AppointmentType = 'أساسي' | 'بالأجر' | 'معاش';

export type WorkStatus =
  | 'على رأس العمل' | 'إجازة مرضي' | 'إجازة رعاية طفل'
  | 'إجازة بدون مرتب' | 'إعارة' | 'مرافق مريض';

export type DisabilityType = 'ذهني' | 'سمعي' | 'بصري' | 'حركي' | 'متعدد';

export type RefugeeClassification = 'سوري' | 'أجنبي' | 'فلسطيني' | 'سوداني' | 'يمني' | 'أخرى';

export type DensityStatus = 'خطر' | 'مرتفع' | 'متوسط' | 'مقبول';

export type PermissionLevel = 'view' | 'edit' | 'admin';

// ─── Shortcuts ──────────────────────────────────────────────────

export type School = Database['public']['Tables']['schools']['Row'];
export type SchoolInsert = Database['public']['Tables']['schools']['Insert'];
export type SchoolBuilding = Database['public']['Tables']['school_buildings']['Row'];
export type SchoolLeader = Database['public']['Tables']['school_leaders']['Row'];
export type SchoolStaff = Database['public']['Tables']['school_staff']['Row'];
export type ClassStat = Database['public']['Tables']['class_statistics']['Row'];
export type SchoolSummary = Database['public']['Views']['school_summary']['Row'];
export type HighDensitySchool = Database['public']['Views']['high_density_schools']['Row'];

// ─── Session ──────────────────────────────────────────────────

export type SessionUser = {
  role: 'admin' | 'school';
  schoolId?: string;
  schoolCode?: string;
  schoolName?: string;
  schoolType?: string;
};

// Legacy compat
export type ParsedStudent = {
  rowNum: number;
  name: string;
  grade: string;
  classRoom: string;
};

export type ParsedExcelData = {
  header: { district: string; schoolName: string; address: string };
  students: ParsedStudent[];
};

// ─── Student / Admin Types ───────────────────────────────────────

export type Student = {
  id: string;
  upload_id: string;
  school_id: string;
  row_num: number;
  name: string;
  grade: string | null;
  class_room: string | null;
  created_at: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type AdminStats = {
  totalStudents: number;
  totalSchools: number;
  uploadedSchools: number;
  pendingSchools: number;
  byType: Record<string, number>;
  byGrade: Record<string, number>;
};

export type SchoolWithStatus = {
  id: string;
  code: string;
  name: string;
  type: string;
  district?: string;
  studentCount: number;
  uploadCount: number;
  lastUpload: string | null;
};
