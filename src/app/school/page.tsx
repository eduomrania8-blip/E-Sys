// src/app/school/page.tsx
// الصفحة الرئيسية لبوابة المدرسة — يرى مدير المدرسة بياناته فقط
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function getSchoolContext(supabase: any, userId: string) {
  const { data: perm } = await supabase
    .from('user_school_permissions')
    .select('school_id, permission_level')
    .eq('user_id', userId)
    .not('school_id', 'is', null)
    .single();
  if (!perm) return null;

  const [schoolRes, buildingRes, statsRes, leadersRes, staffRes, lowRes, inclusionRes] = await Promise.all([
    supabase.from('schools').select('*, educational_administrations(name_ar, governorate)').eq('id', perm.school_id).single(),
    supabase.from('school_buildings').select('*').eq('school_id', perm.school_id).single(),
    supabase.from('class_statistics').select('*').eq('school_id', perm.school_id).eq('academic_year', '2025-2026').order('grade_level'),
    supabase.from('school_leaders').select('*').eq('school_id', perm.school_id).order('job_title'),
    supabase.from('school_staff').select('id, job_category').eq('school_id', perm.school_id),
    supabase.from('low_performer_students').select('id').eq('school_id', perm.school_id).eq('academic_year', '2025-2026'),
    supabase.from('inclusion_students_list').select('id').eq('school_id', perm.school_id).eq('academic_year', '2025-2026'),
  ]);

  return {
    school: schoolRes.data,
    building: buildingRes.data,
    stats: statsRes.data ?? [],
    leaders: leadersRes.data ?? [],
    staff: staffRes.data ?? [],
    lowCount: lowRes.data?.length ?? 0,
    inclusionCount: inclusionRes.data?.length ?? 0,
    perm,
  };
}

export default async function SchoolHomePage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const ctx = await getSchoolContext(supabase, session.user.id);
  if (!ctx || !ctx.school) redirect('/login?error=no_school');

  const { school, building, stats, leaders, staff, lowCount, inclusionCount, perm } = ctx;
  const ea: any = school.educational_administrations;

  const totalStudents  = stats.reduce((a: number, s: any) => a + (s.boys_count || 0) + (s.girls_count || 0), 0);
  const totalClasses   = stats.reduce((a: number, s: any) => a + (s.number_of_classes || 0), 0);
  const avgDensity     = totalClasses > 0
    ? (totalStudents / totalClasses).toFixed(1)
    : '0';
  const teachers = staff.filter((s: any) => s.job_category === 'معلم').length;
  const adminsN  = staff.filter((s: any) => s.job_category === 'إداري').length;
  const workers  = staff.filter((s: any) => s.job_category === 'عامل').length;

  const canEdit = perm.permission_level === 'edit' || perm.permission_level === 'admin';

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      {/* Header */}
      <header>
        <p className="text-sm font-bold text-emerald-600 mb-1">بوابة المدرسة</p>
        <h1 className="text-3xl font-black text-gray-900">{school.school_name_ar}</h1>
        <p className="text-gray-500 mt-1 font-medium">
          {ea?.name_ar ?? ''} — {ea?.governorate ?? ''} | كود المدرسة: {school.school_code}
        </p>
      </header>

      {/* 7 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MiniStat title="الطلاب"     value={totalStudents.toLocaleString('ar-EG')} icon="👥" />
        <MiniStat title="الفصول"     value={totalClasses}     icon="🏫" />
        <MiniStat title="الكثافة"    value={avgDensity}       icon="📊" subtitle="طالب/فصل" />
        <MiniStat title="المعلمون"   value={teachers}         icon="📚" />
        <MiniStat title="الضعاف"     value={lowCount}         icon="📋" />
        <MiniStat title="الدمج"      value={inclusionCount}   icon="♿" />
        <MiniStat title="العاملون"   value={staff.length}     icon="👥" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Class Stats Table */}
        <section className="lg:col-span-2 card p-6">
          <h2 className="text-base font-black text-gray-900 mb-4">📊 إحصاءات الصفوف — 2025/2026</h2>
          {stats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-black text-gray-400">
                    <th className="pb-3 pr-2">الصف</th>
                    <th className="pb-3">الفصول</th>
                    <th className="pb-3">بنين</th>
                    <th className="pb-3">بنات</th>
                    <th className="pb-3">الإجمالي</th>
                    <th className="pb-3">الدمج</th>
                    <th className="pb-3 text-center">الكثافة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.map((s: any) => {
                    const total = (s.boys_count || 0) + (s.girls_count || 0);
                    const d = s.number_of_classes > 0 ? Math.round(total / s.number_of_classes * 10) / 10 : 0;
                    const inclusionTotal = (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-2 font-bold text-gray-900">{s.grade_level}</td>
                        <td className="py-2.5">{s.number_of_classes}</td>
                        <td className="py-2.5">{s.boys_count}</td>
                        <td className="py-2.5">{s.girls_count}</td>
                        <td className="py-2.5 font-black">{total}</td>
                        <td className="py-2.5">{inclusionTotal}</td>
                        <td className="py-2.5 text-center">
                          <span className={
                            d > 60 ? 'badge-danger' : d > 50 ? 'badge-warning' : d > 40 ? 'badge-info' : 'badge-success'
                          }>{d}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-black text-gray-900">
                    <td className="pt-3 pr-2">الإجمالي</td>
                    <td className="pt-3">{totalClasses}</td>
                    <td className="pt-3">{stats.reduce((a: number, s: any) => a + (s.boys_count || 0), 0)}</td>
                    <td className="pt-3">{stats.reduce((a: number, s: any) => a + (s.girls_count || 0), 0)}</td>
                    <td className="pt-3">{totalStudents.toLocaleString('ar-EG')}</td>
                    <td className="pt-3">{stats.reduce((a: number, s: any) => a + (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0), 0)}</td>
                    <td className="pt-3 text-center font-black text-blue-600">{avgDensity}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-gray-400 font-bold">لا توجد بيانات إحصائية بعد</p>
              {canEdit && (
                <Link href="/school/upload" className="btn-primary inline-flex mt-4 text-sm">⬆️ رفع البيانات الآن</Link>
              )}
            </div>
          )}
        </section>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Quick Actions */}
          {canEdit && (
            <section className="card p-5">
              <h2 className="text-base font-black text-gray-900 mb-4">🚀 إجراءات سريعة</h2>
              <div className="space-y-2">
                <Link href="/school/upload" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all">
                  <span>⬆️</span> رفع ملف Excel
                </Link>
                <Link href="/school/students" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all">
                  <span>📋</span> عرض كشوف الطلاب
                </Link>
              </div>
            </section>
          )}

          {/* Leaders */}
          <section className="card p-5">
            <h2 className="text-base font-black text-gray-900 mb-4">👤 القيادات</h2>
            {leaders.length > 0 ? (
              <div className="space-y-2">
                {leaders.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">
                      {l.full_name_ar?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{l.full_name_ar}</p>
                      <p className="text-[10px] font-black text-emerald-600">{l.job_title}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-4">لا توجد بيانات</p>
            )}
          </section>

          {/* Building */}
          {building && (
            <section className="card p-5">
              <h2 className="text-base font-black text-gray-900 mb-4">🏗️ المبنى</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <BldgStat label="الفصول" value={building.actual_classrooms} />
                <BldgStat label="المعامل" value={building.total_labs} />
                <BldgStat label="الكاميرات" value={building.surveillance_cameras} />
                <BldgStat label="إنترنت" value={building.has_internet ? '✅' : '❌'} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ title, value, icon, subtitle }: any) {
  return (
    <div className="card p-3 text-center">
      <span className="text-lg">{icon}</span>
      <p className="text-lg font-black text-gray-900 mt-1">{value}</p>
      <p className="text-[10px] font-bold text-gray-400">{title}</p>
      {subtitle && <p className="text-[9px] text-gray-300">{subtitle}</p>}
    </div>
  );
}

function BldgStat({ label, value }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-[10px] text-gray-400 font-bold">{label}</p>
    </div>
  );
}
