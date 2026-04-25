// src/app/api/public-stats/route.ts
// إحصائيات عامة للصفحة الرئيسية — لا تتطلب تسجيل دخول
// تستخدم Service Role داخلياً فقط (لا تُكشف للعميل)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const [schoolsRes, studentsRes, admRes] = await Promise.all([
      supabaseAdmin.from('schools').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('class_statistics')
        .select('boys_count, girls_count')
        .eq('academic_year', '2025-2026'),
      supabaseAdmin.from('educational_administrations').select('id', { count: 'exact', head: true }),
    ]);

    const totalStudents = (studentsRes.data ?? []).reduce(
      (acc, s) => acc + (Number(s.boys_count) || 0) + (Number(s.girls_count) || 0), 0
    );

    return NextResponse.json({
      schools: schoolsRes.count ?? 0,
      students: totalStudents,
      administrations: admRes.count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ schools: 0, students: 0, administrations: 0 });
  }
}
