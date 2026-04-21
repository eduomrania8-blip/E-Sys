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
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
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
  const avgDensity     = totalClasses > 0
    ? (totalStudents / totalClasses).toFixed(1)
    : '—';

  const teachers = staff.filter((s: any) => s.job_category === 'معلم').length;
  const admins   = staff.filter((s: any) => s.job_category === 'إداري').length;
  const workers  = staff.filter((s: any) => s.job_category === 'عامل').length;

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 font-bold">
        <Link href="/dashboard/schools" className="hover:text-blue-600">دليل المدارس</Link>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-xs">{school.school_name_ar}</span>
      </nav>

      {/* School Header Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-200">
              {school.school_name_ar[0]}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-gray-900">{school.school_name_ar}</h1>
                <span className="badge-info">{school.school_type ?? 'رسمية'}</span>
                {!school.is_active && <span className="badge-danger">غير نشطة</span>}
              </div>
              <p className="text-gray-500 font-medium mt-1 text-sm">
                📍 {ea?.name_ar ?? '—'} — {ea?.governorate ?? '—'}
                {school.phone && <span className="mr-4">📞 {school.phone}</span>}
              </p>
              <p className="text-xs text-gray-400 font-bold mt-1">
                كود المدرسة: {school.school_code}
                {school.established_year && ` | تأسست: ${school.established_year}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/upload?school=${params.id}`} className="btn-secondary text-sm">
              ↑ رفع الإكسيل
            </Link>
            <Link href={`/dashboard/schools/${params.id}/manual`} className="btn-secondary text-sm border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
              ✍️ إدخال يدوي
            </Link>
            <Link href={`/dashboard/schools/${params.id}/edit`} className="btn-primary text-sm">
              ✏️ تعديل المدرسة
            </Link>
            <Link href={`/dashboard/schools/${params.id}/report`} className="btn-secondary text-sm border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100">
              🖨️ تقرير للطباعة
            </Link>
            <DeleteSchoolButton schoolId={params.id} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <QuickStat label="إجمالي الطلاب"   value={totalStudents.toLocaleString('ar-EG')} />
          <QuickStat label="عدد الفصول"      value={totalClasses} />
          <QuickStat label="متوسط الكثافة"   value={`${avgDensity} طالب/فصل`} highlight={Number(avgDensity) > 50} />
          <QuickStat label="طلاب الدمج"      value={totalInclusion} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Right: Main Data */}
        <div className="lg:col-span-2 space-y-6">

          {/* Class Statistics */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-black text-gray-900 mb-4">📊 إحصاءات الصفوف — 2025/2026</h2>
            {stats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-black text-gray-400 uppercase">
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
                      const incl = (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-2 font-bold text-gray-900">{s.grade_level}</td>
                          <td className="py-3">{s.number_of_classes}</td>
                          <td className="py-3">{s.boys_count}</td>
                          <td className="py-3">{s.girls_count}</td>
                          <td className="py-3 font-black">{total}</td>
                          <td className="py-3">{incl}</td>
                          <td className="py-3 text-center">
                            <span className={
                              d > 60 ? 'badge-danger' :
                              d > 50 ? 'badge-warning' :
                              d > 40 ? 'badge-info' : 'badge-success'
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
                      <td className="pt-3">{totalInclusion}</td>
                      <td className="pt-3 text-center text-blue-600">{avgDensity}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <EmptyState msg="لا توجد بيانات إحصائية لهذا العام" cta="رفع ملف Excel" href={`/dashboard/upload?school=${params.id}`} />
            )}
          </section>

          {/* Building Data */}
          {building && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-gray-900 mb-4">🏗️ بيانات المبنى</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <BuildingItem label="حالة المبنى"        value={building.building_status ?? '—'} />
                <BuildingItem label="الفصول الدراسية"    value={building.actual_classrooms} />
                <BuildingItem label="الغرف الإدارية"     value={building.admin_rooms} />
                <BuildingItem label="المعامل"            value={building.total_labs} />
                <BuildingItem label="دورات مياه (بنين)"  value={building.boys_toilets} />
                <BuildingItem label="دورات مياه (بنات)"  value={building.girls_toilets} />
                <BuildingItem label="كاميرات المراقبة"   value={building.surveillance_cameras} />
                <BuildingItem label="السور"              value={building.fence_condition ?? '—'} />
                <BuildingItem label="الإنترنت"           value={building.has_internet ? '✅ متوفر' : '❌ غير متوفر'} />
              </div>
            </section>
          )}
        </div>

        {/* Left: Side panels */}
        <div className="space-y-6">
          {/* Leaders */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-black text-gray-900 mb-4">👤 القيادات المدرسية</h2>
            {leaders.length > 0 ? (
              <div className="space-y-3">
                {leaders.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black shrink-0">
                      {l.full_name_ar?.[0] ?? '؟'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{l.full_name_ar}</p>
                      <p className="text-[10px] font-black text-blue-600">{l.job_title}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState msg="لا توجد بيانات قيادات" />
            )}
          </section>

          {/* Staff Summary */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-black text-gray-900 mb-4">👥 العاملون</h2>
            <div className="space-y-3">
              <StaffRow label="معلمون"  count={teachers} icon="📚" color="blue"   />
              <StaffRow label="إداريون" count={admins}   icon="🗂️" color="purple" />
              <StaffRow label="عمال"    count={workers}  icon="🔧" color="gray"   />
              <div className="border-t pt-2 mt-2 flex justify-between text-sm font-black">
                <span className="text-gray-500">الإجمالي</span>
                <span>{staff.length} موظف</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, highlight }: any) {
  return (
    <div className={`p-3 rounded-xl text-center ${highlight ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
      <p className={`text-lg font-black ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs font-bold text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function BuildingItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[10px] font-bold text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

function StaffRow({ label, count, icon, color }: any) {
  const colors: Record<string, string> = { blue: 'bg-blue-50', purple: 'bg-purple-50', gray: 'bg-gray-100' };
  return (
    <div className={`flex items-center justify-between p-3 ${colors[color]} rounded-xl`}>
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <span className="text-sm font-black">{count}</span>
    </div>
  );
}

function EmptyState({ msg, cta, href }: { msg: string; cta?: string; href?: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-400 text-sm font-bold">{msg}</p>
      {cta && href && (
        <Link href={href} className="btn-primary inline-flex mt-3 text-sm">
          {cta}
        </Link>
      )}
    </div>
  );
}
