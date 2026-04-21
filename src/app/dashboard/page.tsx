// src/app/dashboard/page.tsx
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const [summaryRes, highDensityRes, adminSummaryRes] = await Promise.all([
    supabase.from('school_summary').select('*'),
    supabase.from('high_density_schools').select('*').limit(5),
    supabase.from('administration_summary').select('*').single(),
  ]);

  const summary = summaryRes.data ?? [];
  const highDensity = highDensityRes.data ?? [];
  const adminSummary = adminSummaryRes.data;

  const totalStudents = adminSummary?.total_students ?? 0;
  const totalSchools  = adminSummary?.total_schools ?? 0;
  const avgDensity    = adminSummary?.avg_density ?? 0;
  const highDensityCount = adminSummary?.high_density_schools_count ?? 0;
  const totalInclusion   = adminSummary?.total_inclusion ?? 0;
  const totalExpatriate  = adminSummary?.total_expatriate ?? 0;

  // إجمالي الضعاف من ملخص المدارس
  const totalLowPerformers = summary.reduce(
    (acc: number, s: any) => acc + (Number(s.low_performer_count) || 0), 0
  );

  const dangerSchools  = highDensity.filter((s: any) => s.density_status === 'خطر').length;
  const warningSchools = highDensity.filter((s: any) => s.density_status === 'مرتفع').length;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-black text-gray-900">لوحة القيادة</h1>
        <p className="text-gray-500 mt-1 font-medium">نظرة عامة على الإدارة التعليمية — العام الدراسي 2025-2026</p>
      </header>

      {/* Alert Banner */}
      {(dangerSchools > 0 || warningSchools > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <div>
            <p className="font-black text-red-900">تنبيهات الكثافة الطلابية</p>
            <div className="flex gap-4 mt-2 flex-wrap">
              {dangerSchools > 0 && (
                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black">
                  🔴 {dangerSchools} مدرسة في حالة خطر (&gt; 60 طالب/فصل)
                </span>
              )}
              {warningSchools > 0 && (
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-black">
                  🟡 {warningSchools} مدرسة مرتفعة الكثافة (50-60 طالب/فصل)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid — 7 بطاقات */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard title="إجمالي الطلاب"   value={Number(totalStudents).toLocaleString('ar-EG')} color="blue"   icon="👥" />
        <StatCard title="عدد المدارس"     value={totalSchools}           color="purple" icon="🏫" />
        <StatCard title="متوسط الكثافة"   value={`${avgDensity}`}        color="orange" icon="📊" subtitle="طالب/فصل" />
        <StatCard title="كثافة مرتفعة"    value={highDensityCount}        color="red"    icon="⚠️" />
        <StatCard title="طلاب الدمج"      value={Number(totalInclusion).toLocaleString('ar-EG')}      color="teal"   icon="♿" />
        <StatCard title="الوافدين"         value={Number(totalExpatriate).toLocaleString('ar-EG')}    color="gray"   icon="🌍" />
        <StatCard title="الضعاف"          value={Number(totalLowPerformers).toLocaleString('ar-EG')} color="pink"   icon="📋" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* High Density Table */}
        <section className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-gray-900">مدارس الكثافة المرتفعة</h2>
            <Link href="/dashboard/analytics" className="text-xs font-bold text-blue-600 hover:underline">
              عرض التحليلات الكاملة ←
            </Link>
          </div>
          {highDensity.length > 0 ? (
            <div className="space-y-3">
              {highDensity.map((school: any) => (
                <Link
                  key={`${school.school_id}-${school.grade_level}`}
                  href={`/dashboard/schools/${school.school_id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border hover:border-blue-200 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-10 rounded-full ${
                      school.density_status === 'خطر'    ? 'bg-red-500' :
                      school.density_status === 'مرتفع'  ? 'bg-orange-500' : 'bg-yellow-400'
                    }`} />
                    <div>
                      <p className="font-bold text-gray-900 text-sm group-hover:text-blue-700">{school.school_name_ar}</p>
                      <p className="text-xs text-gray-500">{school.grade_level} — {school.total_students} طالب في {school.number_of_classes} فصول</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-black ${
                      school.density_status === 'خطر' ? 'text-red-600' :
                      school.density_status === 'مرتفع' ? 'text-orange-500' : 'text-yellow-600'
                    }`}>{school.density_per_class}</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      school.density_status === 'خطر'   ? 'bg-red-100 text-red-600' :
                      school.density_status === 'مرتفع' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-700'
                    }`}>{school.density_status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-bold text-gray-400">لا توجد مدارس ذات كثافة مرتفعة</p>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-5">روابط سريعة</h2>
            <div className="space-y-2">
              <QuickLink href="/dashboard/schools/new"   label="إضافة مدرسة جديدة" color="blue"   icon="+" />
              <QuickLink href="/dashboard/upload"        label="رفع ملف Excel"       color="green"  icon="↑" />
              <QuickLink href="/dashboard/analytics"     label="التحليلات والرسوم"   color="purple" icon="📊" />
              <QuickLink href="/dashboard/reports"       label="طباعة التقارير"      color="orange" icon="🖨" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white shadow-xl shadow-blue-200">
            <p className="text-sm font-bold opacity-80 mb-1">السنة الدراسية الحالية</p>
            <p className="text-3xl font-black">2025-2026</p>
            <div className="mt-4 pt-4 border-t border-blue-500 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xl font-black">{totalSchools}</p>
                <p className="text-[10px] opacity-70 font-bold">مدرسة</p>
              </div>
              <div>
                <p className="text-xl font-black">{Number(totalStudents).toLocaleString('ar-EG')}</p>
                <p className="text-[10px] opacity-70 font-bold">طالب</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color, icon, span }: any) {
  const colors: Record<string, string> = {
    blue:   'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red:    'from-red-500 to-red-600',
    teal:   'from-teal-500 to-teal-600',
    gray:   'from-gray-500 to-gray-600',
    pink:   'from-pink-500 to-pink-600',
  };
  return (
    <div className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm ${span ? 'col-span-2 md:col-span-1' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold text-gray-500">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-black text-gray-900">{value}</p>
        {subtitle && <span className="text-[10px] text-gray-400 font-bold">{subtitle}</span>}
      </div>
      <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${colors[color]}`} />
    </div>
  );
}

function QuickLink({ href, label, color, icon }: any) {
  const colors: Record<string, string> = {
    blue:   'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700',
    green:  'hover:bg-green-50 hover:border-green-200 hover:text-green-700',
    purple: 'hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700',
    orange: 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700',
  };
  return (
    <Link href={href} className={`flex items-center gap-3 p-3 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 transition-all ${colors[color]}`}>
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </Link>
  );
}
