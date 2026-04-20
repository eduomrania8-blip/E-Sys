// src/services/studentService.ts
import { createAdminClient } from '@/lib/supabase';
import type { Student, PaginatedResponse, AdminStats, ParsedExcelData } from '@/types';

const PER_PAGE = 20;

/** Insert a complete upload batch (upload record + all students) */
export async function createUpload(
  schoolId: string,
  parsed: ParsedExcelData,
  fileName: string,
  storagePath?: string
): Promise<{ uploadId: string; count: number }> {
  const db = createAdminClient();

  // 1. Delete existing upload for this school (one active kshf per school)
  const { data: old } = await db
    .from('uploads')
    .select('id')
    .eq('school_id', schoolId);
  if (old?.length) {
    await db.from('uploads').delete().eq('school_id', schoolId);
  }

  // 2. Create new upload record
  const { data: upload, error: upErr } = await db
    .from('uploads')
    .insert({
      school_id: schoolId,
      district: parsed.header.district || null,
      school_name_snapshot: parsed.header.schoolName || null,
      address_snapshot: parsed.header.address || null,
      file_name: fileName,
      storage_path: storagePath ?? null,
    })
    .select()
    .single();
  if (upErr || !upload) throw new Error(upErr?.message ?? 'فشل إنشاء سجل الرفع');

  // 3. Bulk insert students (batch of 500 to avoid payload limits)
  const BATCH = 500;
  let count = 0;
  for (let i = 0; i < parsed.students.length; i += BATCH) {
    const batch = parsed.students.slice(i, i + BATCH).map((s) => ({
      upload_id: upload.id,
      school_id: schoolId,
      row_num: s.rowNum,
      name: s.name,
      grade: s.grade || null,
      class_room: s.classRoom || null,
    }));
    const { error } = await db.from('students').insert(batch);
    if (error) throw new Error(error.message);
    count += batch.length;
  }

  return { uploadId: upload.id, count };
}

/** Paginated student list for admin (all schools) */
export async function getStudentsPaginated(params: {
  page?: number;
  search?: string;
  schoolId?: string;
  type?: string;
  grade?: string;
}): Promise<PaginatedResponse<Student & { school_name: string; school_type: string; district: string }>> {
  const db = createAdminClient();
  const page = params.page ?? 1;
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  let query = db
    .from('students')
    .select(
      `*, schools!inner(name, type, district)`,
      { count: 'exact' }
    );

  if (params.search) query = query.ilike('name', `%${params.search}%`);
  if (params.schoolId) query = query.eq('school_id', params.schoolId);
  if (params.grade) query = query.ilike('grade', `%${params.grade}%`);
  if (params.type) {
    query = query.eq('schools.type', params.type);
  }

  const { data, error, count } = await query
    .order('name')
    .range(from, to);

  if (error) throw new Error(error.message);

  const items = (data ?? []).map((r: Record<string, unknown>) => {
    const school = r.schools as { name: string; type: string; district: string } | null;
    return {
      ...r,
      schools: undefined,
      school_name: school?.name ?? '',
      school_type: school?.type ?? '',
      district: school?.district ?? '',
    };
  }) as (Student & { school_name: string; school_type: string; district: string })[];

  return {
    items,
    total: count ?? 0,
    page,
    perPage: PER_PAGE,
    totalPages: Math.ceil((count ?? 0) / PER_PAGE),
  };
}

/** All students for a specific school */
export async function getSchoolStudents(
  schoolId: string,
  params: { page?: number; search?: string; grade?: string }
): Promise<PaginatedResponse<Student>> {
  const db = createAdminClient();
  const page = params.page ?? 1;
  const from = (page - 1) * PER_PAGE;

  let query = db
    .from('students')
    .select('*', { count: 'exact' })
    .eq('school_id', schoolId);

  if (params.search) query = query.ilike('name', `%${params.search}%`);
  if (params.grade) query = query.ilike('grade', `%${params.grade}%`);

  const { data, error, count } = await query
    .order('row_num', { nullsFirst: false })
    .order('name')
    .range(from, from + PER_PAGE - 1);

  if (error) throw new Error(error.message);
  return {
    items: (data ?? []) as Student[],
    total: count ?? 0,
    page,
    perPage: PER_PAGE,
    totalPages: Math.ceil((count ?? 0) / PER_PAGE),
  };
}

/** School's latest upload metadata */
export async function getSchoolUpload(schoolId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from('uploads')
    .select('*')
    .eq('school_id', schoolId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

/** Delete all data for a school */
export async function deleteSchoolData(schoolId: string): Promise<void> {
  const db = createAdminClient();
  await db.from('uploads').delete().eq('school_id', schoolId);
}

/** Admin stats */
export async function getAdminStats(): Promise<AdminStats> {
  const db = createAdminClient();

  const [{ count: totalStudents }, { count: totalSchools }, { data: byTypeData }, { data: byGradeData }, { data: uploads }] =
    await Promise.all([
      db.from('students').select('*', { count: 'exact', head: true }),
      db.from('schools').select('*', { count: 'exact', head: true }),
      db.from('students').select('school_id, schools!inner(type)'),
      db.from('students').select('grade'),
      db.from('uploads').select('school_id'),
    ]);

  const byType: Record<string, number> = {};
  (byTypeData ?? []).forEach((r: Record<string, unknown>) => {
    const t = (r.schools as { type: string } | null)?.type ?? 'غير محدد';
    byType[t] = (byType[t] ?? 0) + 1;
  });

  const byGrade: Record<string, number> = {};
  (byGradeData ?? []).forEach((r: { grade: string | null }) => {
    const g = r.grade ?? 'غير محدد';
    byGrade[g] = (byGrade[g] ?? 0) + 1;
  });

  const uploadedSchoolIds = new Set((uploads ?? []).map((u: { school_id: string }) => u.school_id));

  return {
    totalStudents: totalStudents ?? 0,
    totalSchools: totalSchools ?? 0,
    uploadedSchools: uploadedSchoolIds.size,
    pendingSchools: (totalSchools ?? 0) - uploadedSchoolIds.size,
    byType,
    byGrade,
  };
}

/** Get ALL students for export (no pagination) */
export async function getAllStudentsForExport(params: {
  schoolId?: string;
  grade?: string;
  search?: string;
  type?: string;
}) {
  const db = createAdminClient();
  let query = db
    .from('students')
    .select('*, schools!inner(name,type,district), uploads!inner(district,school_name_snapshot,address_snapshot,uploaded_at)');

  if (params.schoolId) query = query.eq('school_id', params.schoolId);
  if (params.grade) query = query.ilike('grade', `%${params.grade}%`);
  if (params.search) query = query.ilike('name', `%${params.search}%`);
  if (params.type) query = query.eq('schools.type', params.type);

  const { data, error } = await query.order('row_num').order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}
