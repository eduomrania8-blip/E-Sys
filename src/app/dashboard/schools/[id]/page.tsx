// src/app/dashboard/schools/[id]/page.tsx
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeleteSchoolButton from './DeleteSchoolButton';

export default async function SchoolDetailsPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  const [schoolRes, buildingRes, leadersRes, staffRes, statsRes] = await Promise.all([
    supabase.from('schools').select('*, educational_administrations(name_ar, governorate)').eq('id', params.id).single(),
    supabase.from('school_buildings').select('*').eq('school_id', params.id).single(),
    supabase.from('school_leaders').select('*').eq('school_id', params.id).order('job_title'),
    supabase.from('school_staff').select('*').eq('school_id', params.id).order('job_category'),
    supabase.from('class_statistics').select('*').eq('school_id', params.id).eq('academic_year', '2025-2026').order('grade_level'),
  ]);

  const school   = schoolRes.data;
  const building = buildingRes.data;
  const leaders  = leadersRes.data ?? [];
  const staff    = staffRes.data ?? [];
  const stats    = statsRes.data ?? [];

  if (!school) notFound();

  const ea: any = school.educational_administrations;
  const totalStudents  = stats.reduce((a: number, s: any) => a + (s.boys_count || 0) + (s.girls_count || 0), 0);
  const totalClasses   = stats.reduce((a: number, s: any) => a + (s.number_of_classes || 0), 0);
  const totalInclusion = stats.reduce((a: number, s: any) => a + (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0), 0);
  const avgDensity     = totalClasses > 0 ? (totalStudents / totalClasses).toFixed(1) : '—';
  
  const teachers = staff.filter((s: any) => s.job_category === 'معلم').length;
  const admins   = staff.filter((s: any) => s.job_category === 'إداري').length;
  const workers  = staff.filter((s: any) => s.job_category === 'عامل').length;

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* ═══════ Breadcrumb ═══════ */}
      <nav className="flex items-center gap-2 text-xs font-bold bg-white px-4 py-2.5 rounded-full shadow-sm w-fit border border-gray-100">
        <Link href="/dashboard/schools" className="text-gray-400 hover:text-blue-600 transition-colors">دليل المدارس</Link>
        <span className="text-gray-300">/</span>
        <span className="text-blue-900 truncate max-w-xs">{school.school_name_ar}</span>
      </nav>

      {/* ═══════ Hero Header ═══════ */}
      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-md p-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-70 pointer-events-none" />
        
        <div className="relative z-10 flex flex-wrap justify-between items-start gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-200">
              {school.school_name_ar[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{school.school_name_ar}</h1>
                {school.school_type && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md text-[11px] font-black">
                    {school.school_type}
                  </span>
                )}
                {!school.is_active && (
                  <span className="bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-md text-[11px] font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> غير نشطة
                  </span>
                )}
              </div>
              <p className="text-gray-500 font-bold text-sm flex items-center gap-2">
                <span>📍 {ea?.name_ar ?? '—'} — {ea?.governorate ?? '—'}</span>
                {school.phone && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span>📞 {school.phone}</span>
                  </>
                )}
              </p>
              <div className="flex gap-4 mt-2">
                <p className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  الكود: <span className="text-gray-700 font-mono">{school.school_code}</span>
                </p>
                {school.established_year && (
                  <p className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    تأسست: <span className="text-gray-700 font-mono">{school.established_year}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/upload?school=${params.id}`} className="btn-secondary text-xs px-4 py-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              ⬆️ استيراد البيانات
            </Link>
            <Link href={`/dashboard/schools/${params.id}/manual`} className="btn-secondary text-xs px-4 py-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              ✍️ إدخال يدوي
            </Link>
            <Link href={`/dashboard/schools/${params.id}/report`} className="btn-secondary text-xs px-4 py-2 border-orange-200 text-orange-700 hover:bg-orange-50">
              🖨️ تقرير المدرسة
            </Link>
            <a href={`/api/export-school-data?schoolId=${params.id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-4 py-2 border-green-200 text-green-700 hover:bg-green-50">
              📥 استخراج كامل
            </a>
            <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block" />
            <Link href={`/dashboard/schools/${params.id}/edit`} className="btn-secondary text-xs px-3 border-gray-200 text-gray-600">
               ⚙️ إعدادات
            </Link>
            <DeleteSchoolButton schoolId={params.id} />
          </div>
        </div>

        {/* ═══════ Micro Stats ═══════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100 relative z-10">
          <MicroStat label="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-EG')} icon="👥" theme="blue" />
          <MicroStat label="عدد الفصول" value={totalClasses} icon="🏫" theme="indigo" />
          <MicroStat label="الكثافة الحالية" value={avgDensity} unit="طالب/فصل" icon="📊" theme={Number(avgDensity) > 50 ? 'red' : 'emerald'} />
          <MicroStat label="طلاب الدمج" value={totalInclusion} icon="♿" theme="teal" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ═══════ Right: Main Data ═══════ */}
        <div className="xl:col-span-2 space-y-6">

          {/* Class Statistics */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm">📊</span>
                الإحصاء الاستقراري للفصول
              </h2>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">العام 2025/2026</span>
            </div>
            
            {stats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-[11px] font-black text-gray-400">
                      <th className="px-5 py-3">الصف الدراسي</th>
                      <th className="px-5 py-3">الفصول</th>
                      <th className="px-5 py-3 text-blue-600/70">بنين</th>
                      <th className="px-5 py-3 text-pink-600/70">بنات</th>
                      <th className="px-5 py-3 text-gray-900">الإجمالي</th>
                      <th className="px-5 py-3 text-center">الكثافة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.map((s: any) => {
                      const total = (s.boys_count || 0) + (s.girls_count || 0);
                      const d = s.number_of_classes > 0 ? Math.round(total / s.number_of_classes * 10) / 10 : 0;
                      return (
                        <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-3 font-bold text-gray-900">{s.grade_level}</td>
                          <td className="px-5 py-3 font-mono text-gray-500">{s.number_of_classes}</td>
                          <td className="px-5 py-3 text-blue-600 font-medium">{s.boys_count}</td>
                          <td className="px-5 py-3 text-pink-600 font-medium">{s.girls_count}</td>
                          <td className="px-5 py-3 font-black text-gray-900 bg-gray-50/50">{total}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-black border ${
                              d > 60 ? 'bg-red-50 text-red-700 border-red-200' :
                              d > 50 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              d > 40 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>{d}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr className="font-black text-gray-900 text-xs">
                      <td className="px-5 py-4">الإجمالي العام</td>
                      <td className="px-5 py-4 text-gray-600">{totalClasses}</td>
                      <td className="px-5 py-4 text-blue-600">{stats.reduce((a: number, s: any) => a + (s.boys_count || 0), 0)}</td>
                      <td className="px-5 py-4 text-pink-600">{stats.reduce((a: number, s: any) => a + (s.girls_count || 0), 0)}</td>
                      <td className="px-5 py-4 text-lg">{totalStudents.toLocaleString('ar-EG')}</td>
                      <td className="px-5 py-4 text-center text-emerald-600 text-lg">{avgDensity}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState msg="لم يتم إدخال الإحصاءات بعد" cta="استيراد البيانات" href={`/dashboard/upload?school=${params.id}`} />
            )}
          </section>

          {/* Building Data */}
          {building && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">🏗️</span>
                  مرافق المبنى المدرسي
                </h2>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded border ${
                  building.building_status === 'مستقل' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                }`}>
                  {building.building_status ?? 'غير محدد'}
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <BuildingItem label="الفصول" value={building.actual_classrooms} icon="🏫" />
                  <BuildingItem label="المعامل" value={building.total_labs} icon="🔬" />
                  <BuildingItem label="الإدارة" value={building.admin_rooms} icon="🗄️" />
                  <BuildingItem label="الكاميرات" value={building.surveillance_cameras} icon="📷" />
                  <BuildingItem label="حمامات بنين" value={building.boys_toilets} icon="🚹" />
                  <BuildingItem label="حمامات بنات" value={building.girls_toilets} icon="🚺" />
                  <BuildingItem label="الإنترنت" value={building.has_internet ? 'متوفر' : 'لا يوجد'} icon="📶" highlight={building.has_internet} />
                  <BuildingItem label="السور" value={building.fence_condition ?? '—'} icon="🧱" />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ═══════ Left: Side panels ═══════ */}
        <div className="space-y-6">
          {/* Leaders Panel */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span className="text-lg">👤</span> الهيكل القيادي
              </h2>
            </div>
            <div className="p-4">
              {leaders.length > 0 ? (
                <div className="space-y-2">
                  {leaders.map((l: any) => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 font-black shrink-0 shadow-inner group-hover:from-blue-100 group-hover:to-blue-200 group-hover:text-blue-700 transition-colors">
                        {l.full_name_ar?.[0] ?? '؟'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-gray-900 truncate">{l.full_name_ar}</p>
                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">{l.job_title}</p>
                      </div>
                      {l.phone && <span className="text-[9px] text-gray-400 font-mono hidden sm:block bg-gray-50 px-1.5 py-0.5 rounded">{l.phone}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState msg="لا يوجد هيكل قيادي مسجل" />
              )}
            </div>
          </section>

          {/* Staff Panel */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span className="text-lg">👥</span> القوة الوظيفية
              </h2>
            </div>
            <div className="p-4">
              {staff.length > 0 ? (
                <div className="space-y-2">
                  <StaffRow label="هيئة التدريس" count={teachers} icon="👨‍🏫" theme="blue" />
                  <StaffRow label="الإداريون" count={admins} icon="👨‍💻" theme="purple" />
                  <StaffRow label="العمال والخدمات" count={workers} icon="👷‍♂️" theme="orange" />
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-gray-500">القوة الإجمالية</span>
                    <span className="text-lg font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{staff.length}</span>
                  </div>
                </div>
              ) : (
                <EmptyState msg="لم يتم إدخال بيانات العاملين" />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MicroStat({ label, value, unit, icon, theme }: any) {
  const themes: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${themes[theme] || 'bg-gray-50'} flex items-start gap-3`}>
      <span className="text-xl mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] font-bold opacity-70 mb-0.5">{label}</p>
        <p className="text-lg font-black leading-none">
          {value} {unit && <span className="text-[9px] opacity-70 font-bold">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

function BuildingItem({ label, value, icon, highlight }: any) {
  return (
    <div className={`p-3 rounded-xl border ${highlight ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm opacity-70">{icon}</span>
        <p className="text-[10px] font-bold text-gray-500">{label}</p>
      </div>
      <p className={`text-sm font-black ${highlight ? 'text-emerald-700' : 'text-gray-900'}`}>{value ?? '—'}</p>
    </div>
  );
}

function StaffRow({ label, count, icon, theme }: any) {
  const themes: Record<string, string> = { 
    blue: 'bg-blue-50 text-blue-700', 
    purple: 'bg-purple-50 text-purple-700', 
    orange: 'bg-orange-50 text-orange-700' 
  };
  
  return (
    <div className={`flex items-center justify-between p-3.5 rounded-xl border border-white hover:border-${theme}-200 transition-colors ${themes[theme]}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg bg-white w-8 h-8 rounded-md flex items-center justify-center shadow-sm">{icon}</span>
        <span className="text-xs font-black">{label}</span>
      </div>
      <span className="text-base font-black bg-white px-3 py-1 rounded-md shadow-sm">{count}</span>
    </div>
  );
}

function EmptyState({ msg, cta, href }: { msg: string; cta?: string; href?: string }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-gray-100">
        <span className="text-xl">📄</span>
      </div>
      <p className="text-gray-400 text-xs font-bold">{msg}</p>
      {cta && href && (
        <Link href={href} className="mt-3 inline-flex px-4 py-1.5 rounded-lg text-[11px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
          {cta}
        </Link>
      )}
    </div>
  );
}
