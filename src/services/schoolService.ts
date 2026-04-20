// src/services/schoolService.ts
import { createAdminClient } from '@/lib/supabase';
import type { School, SchoolWithStatus, PaginatedResponse } from '@/types';

export async function getAllSchools(): Promise<SchoolWithStatus[]> {
  const db = createAdminClient();

  const { data: schools, error } = await db
    .from('schools')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);

  // Get student counts per school
  const { data: counts } = await db
    .from('students')
    .select('school_id', { count: 'exact' });

  const { data: uploads } = await db
    .from('uploads')
    .select('school_id, uploaded_at')
    .order('uploaded_at', { ascending: false });

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach((r: { school_id: string }) => {
    countMap[r.school_id] = (countMap[r.school_id] ?? 0) + 1;
  });

  const uploadMap: Record<string, string> = {};
  (uploads ?? []).forEach((r: { school_id: string; uploaded_at: string }) => {
    if (!uploadMap[r.school_id]) uploadMap[r.school_id] = r.uploaded_at;
  });

  return (schools ?? []).map((s) => ({
    ...s,
    uploadCount: uploadMap[s.id] ? 1 : 0,
    studentCount: countMap[s.id] ?? 0,
    lastUpload: uploadMap[s.id] ?? null,
  }));
}

export async function getSchoolByCode(code: string): Promise<School | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('schools')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  return data ?? null;
}

export async function createSchool(payload: {
  code: string;
  name: string;
  type: string;
  stage: string;
  district?: string;
  address?: string;
  password: string;
}): Promise<School> {
  const db = createAdminClient();
  const bcrypt = await import('bcryptjs');

  // Check duplicate code
  const { data: existing } = await db
    .from('schools')
    .select('id')
    .eq('code', payload.code.toUpperCase())
    .single();
  if (existing) throw new Error('كود المدرسة مستخدم بالفعل');

  const { data: school, error } = await db
    .from('schools')
    .insert({
      code: payload.code.toUpperCase(),
      name: payload.name,
      type: payload.type,
      stage: payload.stage,
      district: payload.district ?? null,
      address: payload.address ?? null,
    })
    .select()
    .single();
  if (error || !school) throw new Error(error?.message ?? 'فشل إنشاء المدرسة');

  const hash = await bcrypt.hash(payload.password || payload.code.toUpperCase(), 10);
  await db
    .from('school_auth')
    .insert({ school_id: school.id, password_hash: hash });

  return school;
}

export async function deleteSchool(schoolId: string): Promise<void> {
  const db = createAdminClient();
  // CASCADE will delete uploads + students
  const { error } = await db.from('schools').delete().eq('id', schoolId);
  if (error) throw new Error(error.message);
}

export async function verifySchoolPassword(
  schoolId: string,
  password: string
): Promise<boolean> {
  const db = createAdminClient();
  const bcrypt = await import('bcryptjs');
  const { data } = await db
    .from('school_auth')
    .select('password_hash')
    .eq('school_id', schoolId)
    .single();
  if (!data) return false;
  return bcrypt.compare(password, data.password_hash);
}
