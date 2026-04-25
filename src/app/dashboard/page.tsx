// src/app/dashboard/page.tsx
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import DensityChart from '@/components/dashboard/DensityChart';

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
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
  const safeSchools = totalSchools - highDensityCount;

  // حساب توزيع الكثافة الدقيق من بيانات school_summary
  const densitySafe    = summary.filter((s: any) => Number(s.avg_density) <= 40).length;
  const densityWarning = summary.filter((s: any) => { const d = Number(s.avg_density); return d > 40 && d <= 50; }).length;
  const densityDanger  = summary.filter((s: any) => Number(s.avg_density) > 50).length;

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      {/* ═══════ Header ═══════ */}
      <header className="relative overflow-hidden bg-gradient-to-l from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-4xl shadow-lg border border-white/20">
              🌍
            </div>
            <div>
              <p className="text-blue-200 text-xs font-bold mb-1">لوحة القيادة — 2025/2026</p>
              <h1 className="text-2xl md:text-3xl font-black leading-tight">الإدارة التعليمية</h1>
              <p className="text-blue-200 mt-1 text-sm font-medium">نظرة عامة شاملة لجميع المدارس المسجلة</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
            <div className="text-center">
              <p className="text-2xl font-black">{totalSchools}</p>
              <p className="text-[10px] text-blue-200 font-bold">إجمالي المدارس</p>
            </div>
            <div className="w-px h-8 bg-white/20 mx-2" />
            <div className="text-center">
              <p className="text-2xl font-black">{Number(totalStudents).toLocaleString('ar-EG')}</p>
              <p className="text-[10px] text-blue-200 font-bold">إجمالي الطلاب</p>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ Alert Banner ═══════ */}
      {(dangerSchools > 0 || warningSchools > 0) && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-scale-in">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm relative">
             <span className="absolute inset-0 bg-red-400 rounded-xl animate-ping opacity-20" />
             <span className="text-red-600 text-2xl relative z-10">⚠️</span>
          </div>
          <div className="flex-1">
            <p className="font-black text-red-900 text-lg">تنبيهات الكثافة الطلابية</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {dangerSchools > 0 && (
                <span className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-black shadow-sm">
                  🔴 {dangerSchools} مدرسة في حالة خطر (&gt; 50 طالب/فصل)
                </span>
              )}
              {warningSchools > 0 && (
                <span className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-black shadow-sm">
                  🟡 {warningSchools} مدرسة مرتفعة الكثافة (40-50 طالب/فصل)
                </span>
              )}
            </div>
          </div>
          <Link href="/dashboard/analytics" className="btn-danger whitespace-nowrap px-6 py-2.5 text-sm shrink-0">
            عرض التفاصيل 🔍
          </Link>
        </div>
      )}

      {/* ═══════ 7 Stat Cards ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard title="إجمالي الطلاب" value={Number(totalStudents).toLocaleString('ar-EG')} icon="👥" gradient="from-blue-500 to-blue-600" />
        <StatCard title="عدد المدارس" value={totalSchools} icon="🏫" gradient="from-indigo-500 to-indigo-600" />
        <StatCard title="متوسط الكثافة" value={`${avgDensity}`} icon="📊" gradient={Number(avgDensity) > 50 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600'} subtitle="طالب/فصل" />
        <StatCard title="كثافة مرتفعة" value={highDensityCount} icon="⚠️" gradient={highDensityCount > 0 ? 'from-orange-500 to-orange-600' : 'from-emerald-500 to-emerald-600'} />
        <StatCard title="طلاب الدمج" value={Number(totalInclusion).toLocaleString('ar-EG')} icon="♿" gradient="from-teal-500 to-teal-600" />
        <StatCard title="الوافدين" value={Number(totalExpatriate).toLocaleString('ar-EG')} icon="🌍" gradient="from-purple-500 to-purple-600" />
        <StatCard title="الضعاف" value={Number(totalLowPerformers).toLocaleString('ar-EG')} icon="📋" gradient="from-pink-500 to-pink-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ═══════ Charts & Analytics ═══════ */}
        <section className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm">📊</span>
              التوزيع الكثافي للمدارس
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[250px]">
            <DensityChart safe={densitySafe} warning={densityWarning} danger={densityDanger} />
          </div>
        </section>

        {/* ═══════ High Density Table ═══════ */}
        <section className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-sm">🔥</span>
              المدارس الأعلى كثافة
            </h2>
            <Link href="/dashboard/analytics" className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
              عرض التحليلات الكاملة ←
            </Link>
          </div>
          
          {highDensity.length > 0 ? (
            <div className="space-y-2">
              {highDensity.map((school: any) => {
                const isDanger = school.density_status === 'خطر';
                const isWarning = school.density_status === 'مرتفع';
                const colorTheme = isDanger ? 'red' : isWarning ? 'orange' : 'yellow';

                return (
                  <Link
                    key={`${school.school_id}-${school.grade_level}`}
                    href={`/dashboard/schools/${school.school_id}`}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md bg-gray-50/50 hover:bg-white transition-all group gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-12 rounded-full bg-${colorTheme}-500 shadow-sm`} />
                      <div>
                        <p className="font-black text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                          {school.school_name_ar}
                        </p>
                        <p className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1.5">
                          <span className="bg-white border px-1.5 py-0.5 rounded text-gray-600">{school.grade_level}</span>
                          <span>إجمالي: <span className="text-gray-900">{school.total_students}</span> طالب</span>
                          <span className="text-gray-300">|</span>
                          <span><span className="text-gray-900">{school.number_of_classes}</span> فصول</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto bg-white border border-gray-100 p-2 rounded-lg shadow-sm">
                      <div className="text-center px-3">
                        <p className={`text-xl font-black text-${colorTheme}-600 leading-none`}>{school.density_per_class}</p>
                        <p className="text-[9px] font-black text-gray-400 mt-1 uppercase tracking-widest">طالب/فصل</p>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-md bg-${colorTheme}-100 text-${colorTheme}-700`}>
                        {school.density_status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <p className="font-black text-emerald-900 text-lg">الوضع مستقر</p>
              <p className="text-emerald-600 font-medium text-sm mt-1">لا توجد مدارس ذات كثافة طلابية مرتفعة حالياً.</p>
            </div>
          )}
        </section>

        {/* ═══════ Quick Actions & Links ═══════ */}
        <div className="space-y-5 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Quick Links Card */}
          <section className="card p-5 lg:col-span-2">
            <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-sm">⚡</span>
              روابط سريعة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <QuickLink href="/dashboard/schools/new" label="إضافة مدرسة جديدة" color="emerald" icon="➕" desc="تسجيل مدرسة في القاعدة" />
              <QuickLink href="/dashboard/upload" label="استيراد البيانات" color="blue" icon="⬆️" desc="رفع ملفات Excel" />
              <QuickLink href="/dashboard/analytics" label="الرسوم والتحليلات" color="purple" icon="📈" desc="مؤشرات الأداء" />
              <QuickLink href="/dashboard/analytics/staff" label="تقارير العاملين" color="indigo" icon="👥" desc="حساب العجز والزيادة" />
              <QuickLink href="/dashboard/reports" label="مركز التقارير" color="orange" icon="🖨️" desc="طباعة وتصدير الكشوف" />
            </div>
          </section>

          {/* Quick Export Card */}
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group hover:shadow-2xl transition-all h-full flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/10 transition-colors" />
            <h2 className="text-base font-black mb-1 relative z-10 flex items-center gap-2">
              <span>📥</span> تصدير الإدارة بالكامل
            </h2>
            <p className="text-xs text-gray-400 mb-4 relative z-10">تنزيل نسخة Excel لجميع المدارس</p>
            
            <a href="/api/admin-export" target="_blank" rel="noopener noreferrer" 
               className="relative z-10 block w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-center font-black py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
              تنزيل الآن (Excel)
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, subtitle }: any) {
  return (
    <div className="card p-4 text-center hover:shadow-md transition-shadow group cursor-default">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg mx-auto shadow-md group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-xl font-black text-gray-900 mt-2">{value}</p>
      <p className="text-[10px] font-bold text-gray-400">{title}</p>
      {subtitle && <p className="text-[9px] text-gray-300">{subtitle}</p>}
    </div>
  );
}

function QuickLink({ href, label, desc, color, icon }: any) {
  const themes: Record<string, string> = {
    blue:    'hover:bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-200',
    emerald: 'hover:bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-200',
    purple:  'hover:bg-purple-50 border-purple-100 text-purple-700 hover:border-purple-200',
    orange:  'hover:bg-orange-50 border-orange-100 text-orange-700 hover:border-orange-200',
    indigo:  'hover:bg-indigo-50 border-indigo-100 text-indigo-700 hover:border-indigo-200',
  };
  return (
    <Link href={href} className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${themes[color]}`}>
      <div className={`w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0`}>
        <span className="text-sm">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-black leading-tight">{label}</p>
        <p className="text-[10px] font-bold opacity-60 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}
