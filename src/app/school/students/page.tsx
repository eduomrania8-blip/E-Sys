// src/app/school/students/page.tsx
// كشوف الطلاب الخاصة بالمدرسة (ضعاف، دمج، وافدين، لاجئين)
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getSchoolId(supabase: any, userId: string) {
  const { data } = await supabase
    .from('user_school_permissions')
    .select('school_id')
    .eq('user_id', userId)
    .not('school_id', 'is', null)
    .single();
  return data?.school_id ?? null;
}

export default async function SchoolStudentsPage() {
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

  const year = '2025-2026';
  const [lowRes, incRes, expRes, refRes] = await Promise.all([
    supabase.from('low_performer_students').select('*').eq('school_id', schoolId).eq('academic_year', year).order('grade_level'),
    supabase.from('inclusion_students_list').select('*').eq('school_id', schoolId).eq('academic_year', year).order('grade_level'),
    supabase.from('expatriate_students_list').select('*').eq('school_id', schoolId).eq('academic_year', year).order('grade_level'),
    supabase.from('refugee_students_list').select('*').eq('school_id', schoolId).eq('academic_year', year).order('grade_level'),
  ]);

  const low  = lowRes.data ?? [];
  const inc  = incRes.data ?? [];
  const exp  = expRes.data ?? [];
  const ref  = refRes.data ?? [];

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      <header>
        <h1 className="text-2xl font-black text-gray-900">كشوف الطلاب</h1>
        <p className="text-gray-500 text-sm mt-1">العام الدراسي {year}</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StudentStat label="الضعاف"   count={low.length} icon="📋" color="orange" />
        <StudentStat label="الدمج"    count={inc.length} icon="♿" color="teal" />
        <StudentStat label="الوافدين" count={exp.length} icon="🌍" color="indigo" />
        <StudentStat label="اللاجئين" count={ref.length} icon="🛡️" color="red" />
      </div>

      {/* الضعاف */}
      <StudentTable title="📋 كشف الطلاب الضعاف" data={low} cols={['الاسم', 'الصف', 'الفصل', 'ملاحظات']} fields={['student_full_name', 'grade_level', 'class_name', 'notes']} empty="لا يوجد طلاب ضعاف مسجلين" />

      {/* الدمج */}
      <StudentTable title="♿ كشف طلاب الدمج" data={inc} cols={['الاسم', 'الصف', 'الفصل', 'نوع الإعاقة']} fields={['student_full_name', 'grade_level', 'class_name', 'disability_type']} empty="لا يوجد طلاب دمج مسجلين" />

      {/* الوافدين */}
      <StudentTable title="🌍 كشف الوافدين" data={exp} cols={['الاسم', 'الصف', 'الجنسية', 'رقم الجواز']} fields={['student_full_name', 'grade_level', 'country', 'passport_number']} empty="لا يوجد طلاب وافدين" />

      {/* اللاجئين */}
      <StudentTable title="🛡️ كشف اللاجئين" data={ref} cols={['الاسم', 'الصف', 'الدولة', 'التصنيف']} fields={['student_full_name', 'grade_level', 'country', 'refugee_classification']} empty="لا يوجد طلاب لاجئين" />
    </div>
  );
}

function StudentStat({ label, count, icon, color }: any) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-700', teal: 'bg-teal-50 text-teal-700',
    indigo: 'bg-indigo-50 text-indigo-700', red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`card p-4 text-center ${colors[color]}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-black mt-1">{count}</p>
      <p className="text-[10px] font-bold mt-0.5">{label}</p>
    </div>
  );
}

function StudentTable({ title, data, cols, fields, empty }: any) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-black text-gray-900 mb-3">{title} ({data.length})</h2>
      {data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead><tr className="border-b text-xs font-black text-gray-400">
              <th className="pb-2">#</th>
              {cols.map((c: string) => <th key={c} className="pb-2 px-2">{c}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row: any, i: number) => (
                <tr key={row.id ?? i} className="hover:bg-gray-50">
                  <td className="py-2 text-gray-400 text-xs">{i + 1}</td>
                  {fields.map((f: string) => (
                    <td key={f} className="py-2 px-2">{row[f] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-400 text-sm py-6">{empty}</p>
      )}
    </section>
  );
}
