// src/services/schoolService.ts
// خدمة المدارس — متوافقة مع Schema v2.0
import { createAdminClient, supabaseBrowser } from '@/lib/supabase';
import type { Database } from '@/types';

type School = Database['public']['Tables']['schools']['Row'];
type SchoolInsert = Database['public']['Tables']['schools']['Insert'];

// ─── قراءة ───────────────────────────────────────────────────

export async function getAllSchools() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('school_summary')
    .select('*')
    .order('school_name_ar');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSchoolById(id: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('schools')
    .select('*, educational_administrations(name_ar, governorate)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getSchoolByCode(code: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('schools')
    .select('*')
    .eq('school_code', code.trim())
    .single();
  if (error) return null;
  return data;
}

export async function getSchoolFullDetails(id: string) {
  const db = createAdminClient();
  const [school, building, leaders, staff, stats] = await Promise.all([
    db.from('schools').select('*, educational_administrations(name_ar, governorate)').eq('id', id).single(),
    db.from('school_buildings').select('*').eq('school_id', id).single(),
    db.from('school_leaders').select('*').eq('school_id', id).order('job_title'),
    db.from('school_staff').select('*').eq('school_id', id).order('job_category'),
    db.from('class_statistics').select('*').eq('school_id', id).order('grade_level'),
  ]);
  return {
    school: school.data,
    building: building.data,
    leaders: leaders.data ?? [],
    staff: staff.data ?? [],
    stats: stats.data ?? [],
  };
}

// ─── إنشاء ───────────────────────────────────────────────────

export async function createSchool(payload: {
  school_code: string;
  school_name_ar: string;
  school_type: string;
  educational_stage: string;
  administration_id: string;
  address?: string;
  phone?: string;
  email?: string;
}): Promise<School> {
  const db = createAdminClient();

  // التحقق من عدم تكرار الكود
  const existing = await getSchoolByCode(payload.school_code);
  if (existing) throw new Error(`كود المدرسة "${payload.school_code}" مستخدم بالفعل`);

  const { data, error } = await db
    .from('schools')
    .insert({
      school_code: payload.school_code.trim(),
      school_name_ar: payload.school_name_ar.trim(),
      school_type: payload.school_type,
      educational_stage: payload.educational_stage,
      administration_id: payload.administration_id,
      address: payload.address ?? null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'فشل إنشاء المدرسة');
  return data;
}

// ─── تعديل ───────────────────────────────────────────────────

export async function updateSchool(
  id: string,
  payload: Partial<SchoolInsert>
): Promise<School> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('schools')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'فشل تحديث المدرسة');
  return data;
}

// ─── حذف ───────────────────────────────────────────────────

export async function deleteSchool(id: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from('schools').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── إدارات ───────────────────────────────────────────────────

export async function getAllAdministrations() {
  const db = createAdminClient();
  const { data, error } = await db
    .from('educational_administrations')
    .select('*')
    .order('name_ar');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAdministration(payload: {
  code: string;
  name_ar: string;
  governorate: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('educational_administrations')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── إحصاءات مدرسة ───────────────────────────────────────────

export async function upsertClassStatistics(payload: {
  school_id: string;
  academic_year: string;
  grade_level: string;
  number_of_classes: number;
  boys_count: number;
  girls_count: number;
  muslim_count?: number;
  christian_count?: number;
  inclusion_mental?: number;
  inclusion_hearing?: number;
  inclusion_visual?: number;
  inclusion_physical?: number;
  inclusion_multiple?: number;
  expatriate_count?: number;
  transferred_or_new?: number;
  retained_for_repeat?: number;
  dropout_count?: number;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('class_statistics')
    .upsert(payload, { onConflict: 'school_id,academic_year,grade_level' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── قيادات ───────────────────────────────────────────────────

export async function upsertSchoolLeader(payload: {
  school_id: string;
  national_id: string;
  full_name_ar: string;
  job_title: string;
  phone?: string;
  cadre?: string;
  appointment_type?: string;
  hire_date?: string;
  retirement_date?: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('school_leaders')
    .upsert(payload, { onConflict: 'national_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── البحث عن مدارس بديلة ─────────────────────────────────────

export async function findAlternativeSchools(schoolId: string, year = '2025-2026') {
  const db = createAdminClient();
  const { data, error } = await db.rpc('find_alternative_schools', {
    target_school_id: schoolId,
    year,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}
