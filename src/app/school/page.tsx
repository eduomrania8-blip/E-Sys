// src/app/school/page.tsx
// الصفحة الرئيسية لبوابة المدرسة — يرى مدير المدرسة بياناته فقط
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { sortStatsByGrade } from '@/utils/gradeSorter';
import { SchoolTabs } from './components/SchoolTabs';

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
    supabase.from('class_statistics').select('*').eq('school_id', perm.school_id).eq('academic_year', '2025-2026'),
    supabase.from('school_leaders').select('*').eq('school_id', perm.school_id).order('job_title'),
    supabase.from('school_staff').select('id, job_category, subject_taught, cadre_position, work_status, full_name_ar, school_role, worker_type').eq('school_id', perm.school_id),
    supabase.from('low_performer_students').select('id').eq('school_id', perm.school_id).eq('academic_year', '2025-2026'),
    supabase.from('inclusion_students_list').select('id').eq('school_id', perm.school_id).eq('academic_year', '2025-2026'),
  ]);

  return {
    school: schoolRes.data,
    building: buildingRes.data,
    stats: sortStatsByGrade(statsRes.data ?? []),
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
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const ctx = await getSchoolContext(supabase, session.user.id);
  if (!ctx || !ctx.school) redirect('/login?error=no_school');

  const { school, building, stats, leaders, staff, lowCount, inclusionCount, perm } = ctx;
  const ea: any = school.educational_administrations;

  const totalStudents  = stats.reduce((a: number, s: any) => a + (s.boys_count || 0) + (s.girls_count || 0), 0);
  const totalClasses   = stats.reduce((a: number, s: any) => a + (s.number_of_classes || 0), 0);
  const avgDensity     = totalClasses > 0 ? (totalStudents / totalClasses).toFixed(1) : '0';
  const teachers = staff.filter((s: any) => s.job_category === 'معلم').length;
  const adminsN  = staff.filter((s: any) => s.job_category === 'إداري').length;
  const workers  = staff.filter((s: any) => s.job_category === 'عامل').length;
  const totalBoys  = stats.reduce((a: number, s: any) => a + (s.boys_count || 0), 0);
  const totalGirls = stats.reduce((a: number, s: any) => a + (s.girls_count || 0), 0);

  const canEdit = perm.permission_level === 'edit' || perm.permission_level === 'admin';

  // Data completeness
  const completeness = {
    stats: stats.length > 0,
    building: !!building,
    leaders: leaders.length > 0,
    staff: staff.length > 0,
    students: lowCount > 0 || inclusionCount > 0,
  };
  const completedSections = Object.values(completeness).filter(Boolean).length;
  const completePct = Math.round((completedSections / 5) * 100);

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* ═══════ Header ═══════ */}
      <header className="relative overflow-hidden bg-gradient-to-l from-emerald-600 via-emerald-700 to-emerald-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg border border-white/20">
              {school.school_name_ar?.[0]}
            </div>
            <div>
              <p className="text-emerald-200 text-xs font-bold mb-1">بوابة المدرسة — 2025/2026</p>
              <h1 className="text-2xl md:text-3xl font-black leading-tight">{school.school_name_ar}</h1>
              <p className="text-emerald-200 mt-1 text-sm font-medium">
                {ea?.name_ar ?? ''} — {ea?.governorate ?? ''} | كود: <span className="font-mono text-white">{school.school_code}</span>
              </p>
            </div>
          </div>

          {/* Completeness indicator */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
            <div className="relative w-12 h-12">
              <svg className="transform -rotate-90 w-12 h-12" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15" fill="none" stroke={completePct >= 80 ? '#4ade80' : '#fbbf24'}
                  strokeWidth="2.5" strokeDasharray={`${completePct} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{completePct}%</span>
            </div>
            <div>
              <p className="text-xs font-black">{completedSections}/5 مكتمل</p>
              <p className="text-[10px] text-emerald-200">اكتمال البيانات</p>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ Incomplete Data Alert ═══════ */}
      {completePct < 100 && canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div className="flex-1">
            <p className="text-sm font-black text-amber-800">بيانات غير مكتملة</p>
            <p className="text-xs text-amber-600">
              {!completeness.stats && 'الإحصاءات، '}
              {!completeness.building && 'المبنى، '}
              {!completeness.leaders && 'القيادات، '}
              {!completeness.staff && 'العاملون، '}
              {!completeness.students && 'كشوف الطلاب'}
              {' — '} لم يتم إدخالها بعد
            </p>
          </div>
          <Link href="/school/manual" className="btn-primary text-xs px-4 py-2 shrink-0">✍️ إدخال يدوي</Link>
        </div>
      )}

      {/* ═══════ 7 Stat Cards ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard title="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-EG')} icon="👥" gradient="from-blue-500 to-blue-600" />
        <StatCard title="الفصول" value={totalClasses} icon="🏫" gradient="from-teal-500 to-teal-600" />
        <StatCard title="الكثافة" value={avgDensity} icon="📊" gradient={Number(avgDensity) > 50 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600'} subtitle="طالب/فصل" />
        <StatCard title="المعلمون" value={teachers} icon="📚" gradient="from-purple-500 to-purple-600" />
        <StatCard title="الضعاف" value={lowCount} icon="📋" gradient="from-pink-500 to-pink-600" />
        <StatCard title="الدمج" value={inclusionCount} icon="♿" gradient="from-amber-500 to-amber-600" />
        <StatCard title="العاملون" value={staff.length} icon="👥" gradient="from-gray-500 to-gray-600" />
      </div>

      {/* ═══════ Main Layout ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Tabbed Panel */}
        <div className="lg:col-span-2">
          <SchoolTabs
            stats={stats}
            staff={staff}
            leaders={leaders}
            building={building}
            school={school}
            canEdit={canEdit}
            totalStudents={totalStudents}
            totalClasses={totalClasses}
            totalBoys={totalBoys}
            totalGirls={totalGirls}
            avgDensity={avgDensity}
            teachers={teachers}
            adminsN={adminsN}
            workers={workers}
            lowCount={lowCount}
            inclusionCount={inclusionCount}
            schoolId={perm.school_id}
          />
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <section className="card p-5">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">🚀</span>
              إجراءات سريعة
            </h2>
            <div className="space-y-2">
              {canEdit && (
                <>
                  <Link href="/school/upload" className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all">
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">⬆️</span> رفع ملف Excel
                  </Link>
                  <Link href="/school/manual" className="flex items-center gap-3 p-3 border border-blue-100 rounded-xl text-sm font-bold text-blue-700 bg-blue-50/50 hover:bg-blue-100 transition-all">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">✍️</span> الإدخال اليدوي
                  </Link>
                </>
              )}
              <a href={`/api/export-school-data?schoolId=${perm.school_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border border-green-200 rounded-xl text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-all">
                <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">📥</span> استخراج البيانات (Excel)
              </a>
              <a href={`/api/template?schoolId=${perm.school_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 border border-teal-200 rounded-xl text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-all">
                <span className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">📑</span> كشوف الطباعة فارغة
              </a>
            </div>
          </section>

          {/* Building */}
          {building && (
            <section className="card p-5">
              <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-sm">🏗️</span>
                المبنى
              </h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <BldgStat label="الفصول" value={building.actual_classrooms} icon="🏫" />
                <BldgStat label="المعامل" value={building.total_labs} icon="🔬" />
                <BldgStat label="الكاميرات" value={building.surveillance_cameras} icon="📷" />
                <BldgStat label="إنترنت" value={building.has_internet ? '✅' : '❌'} icon="📶" />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, subtitle }: any) {
  return (
    <div className="card p-4 text-center hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg mx-auto shadow-md`}>
        {icon}
      </div>
      <p className="text-xl font-black text-gray-900 mt-2">{value}</p>
      <p className="text-[10px] font-bold text-gray-400">{title}</p>
      {subtitle && <p className="text-[9px] text-gray-300">{subtitle}</p>}
    </div>
  );
}

function BldgStat({ label, value, icon }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 text-center hover:bg-gray-100 transition-colors">
      <span className="text-sm block mb-1">{icon}</span>
      <p className="font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-[10px] text-gray-400 font-bold">{label}</p>
    </div>
  );
}
