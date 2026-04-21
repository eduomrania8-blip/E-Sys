// src/app/school/leaders/page.tsx
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getSchoolId(supabase: any, userId: string) {
  const { data } = await supabase
    .from('user_school_permissions').select('school_id')
    .eq('user_id', userId).not('school_id', 'is', null).single();
  return data?.school_id ?? null;
}

export default async function SchoolLeadersPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  const schoolId = await getSchoolId(supabase, session.user.id);
  if (!schoolId) redirect('/login');

  const { data: leaders } = await supabase
    .from('school_leaders').select('*')
    .eq('school_id', schoolId).order('job_title');

  const list = leaders ?? [];

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      <h1 className="text-2xl font-black text-gray-900">القيادات المدرسية</h1>
      {list.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((l: any) => (
            <div key={l.id} className="card p-5 flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-black text-lg shrink-0">
                {l.full_name_ar?.[0]}
              </div>
              <div>
                <p className="font-black text-gray-900">{l.full_name_ar}</p>
                <p className="text-xs font-black text-emerald-600 mt-0.5">{l.job_title}</p>
                {l.phone && <p className="text-xs text-gray-400 mt-1">📞 {l.phone}</p>}
                {l.cadre && <p className="text-[10px] text-gray-400">الكادر: {l.cadre}</p>}
                {l.appointment_type && <p className="text-[10px] text-gray-400">نوع التعيين: {l.appointment_type}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-gray-400 font-bold">لم يتم تسجيل بيانات القيادات بعد</p>
          <a href="/school/upload" className="btn-primary inline-flex mt-4 text-sm">⬆️ رفع بيانات القيادات</a>
        </div>
      )}
    </div>
  );
}
