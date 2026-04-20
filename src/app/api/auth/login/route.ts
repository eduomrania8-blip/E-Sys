// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase';
import { buildSessionCookie } from '@/lib/session';
import { getSchoolByCode } from '@/services/schoolService';
import type { SessionUser } from '@/types';

const Schema = z.object({
  type: z.enum(['admin', 'school']),
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });

  const { type, identifier, password } = parsed.data;
  const bcrypt = await import('bcryptjs');
  const db = createAdminClient();

  if (type === 'admin') {
    const { data } = await db
      .from('admin_settings')
      .select('password_hash')
      .eq('username', identifier)
      .single();

    if (!data || !(await bcrypt.compare(password, data.password_hash)))
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });

    const user: SessionUser = { role: 'admin' };
    const res = NextResponse.json({ success: true, role: 'admin' });
    res.headers.set('Set-Cookie', buildSessionCookie(user));
    return res;
  }

  // School login
  const school = await getSchoolByCode(identifier);
  if (!school)
    return NextResponse.json({ error: 'كود المدرسة غير صحيح' }, { status: 401 });

  const { data: auth } = await db
    .from('school_auth')
    .select('password_hash')
    .eq('school_id', school.id)
    .single();

  if (!auth || !(await bcrypt.compare(password, auth.password_hash)))
    return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });

  const user: SessionUser = {
    role: 'school',
    schoolId: school.id,
    schoolCode: school.code,
    schoolName: school.name,
    schoolType: school.type as SessionUser['schoolType'],
  };
  const res = NextResponse.json({ success: true, role: 'school', school });
  res.headers.set('Set-Cookie', buildSessionCookie(user));
  return res;
}
