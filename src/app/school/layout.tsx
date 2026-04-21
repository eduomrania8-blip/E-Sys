// src/app/school/layout.tsx
// Layout خاص بمديري المدارس — يعرض اسم مدرستهم فقط

import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // جلب صلاحية المدرسة المرتبط بها هذا المستخدم
  const { data: perm } = await supabase
    .from('user_school_permissions')
    .select('school_id, permission_level')
    .eq('user_id', session.user.id)
    .not('school_id', 'is', null)
    .single();

  if (!perm) redirect('/login?error=no_permission');

  // جلب بيانات المدرسة
  const { data: school } = await supabase
    .from('schools')
    .select('school_name_ar, school_code, school_type')
    .eq('id', perm.school_id!)
    .single();

  return (
    <div className="flex min-h-screen bg-gray-50" dir="rtl">
      <SchoolSidebar
        schoolId={perm.school_id!}
        schoolName={school?.school_name_ar ?? 'مدرستي'}
        schoolCode={school?.school_code ?? ''}
        canEdit={perm.permission_level === 'edit' || perm.permission_level === 'admin'}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-screen-xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
