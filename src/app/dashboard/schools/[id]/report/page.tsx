// src/app/dashboard/schools/[id]/report/page.tsx
// تقرير مدرسة رسمي — صفحة A4 قابلة للطباعة
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DownloadPdfButton from './DownloadPdfButton';
import ExportFullReportExcelButton from './ExportFullReportExcelButton';

export default async function SchoolReportPage({ params }: { params: { id: string } }) {
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
    supabase.from('class_statistics').select('*').eq('school_id', params.id).eq('academic_year', '2025-2026'),
  ]);

  const gradeOrder: Record<string, number> = {
    'رياض أطفال 1': 1, 'رياض اطفال 1': 1,
    'رياض أطفال 2': 2, 'رياض اطفال 2': 2,
    'الصف الأول': 3,
    'الصف الثاني': 4,
    'الصف الثالث': 5,
    'الصف الرابع': 6,
    'الصف الخامس': 7,
    'الصف السادس': 8,
    'الصف الأول الإعدادي': 9,
    'الصف الثاني الإعدادي': 10,
    'الصف الثالث الإعدادي': 11,
    'الصف الأول الثانوي': 12,
    'الصف الثاني الثانوي': 13,
    'الصف الثالث الثانوي': 14,
  };

  const school   = schoolRes.data;
  const building = buildingRes.data;
  const leaders  = leadersRes.data ?? [];
  const staff    = staffRes.data ?? [];
  const stats    = (statsRes.data ?? []).sort((a: any, b: any) => {
    const oA = gradeOrder[a.grade_level] || 99;
    const oB = gradeOrder[b.grade_level] || 99;
    return oA - oB;
  });

  if (!school) notFound();

  const ea: any = school.educational_administrations;
  const totalStudents = stats.reduce((a: number, s: any) => a + (s.boys_count || 0) + (s.girls_count || 0), 0);
  const totalClasses  = stats.reduce((a: number, s: any) => a + (s.number_of_classes || 0), 0);
  const avgDensity    = totalClasses > 0 ? (totalStudents / totalClasses).toFixed(1) : '0';
  const totalInclusion = stats.reduce((a: number, s: any) =>
    a + (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0), 0);
  const teachers = staff.filter((s: any) => s.job_category === 'معلم').length;
  const admins = staff.filter((s: any) => s.job_category === 'إداري').length;
  const workers = staff.filter((s: any) => s.job_category === 'عامل').length;

  const now = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div dir="rtl" className="max-w-5xl print:max-w-none mx-auto bg-white print:bg-white text-black p-4 print:p-0">
      {/* أزرار التحكم — لا تُطبع */}
      <div className="no-print flex items-center justify-between py-4 px-4 bg-gray-50 border-b mb-6 rounded-b-xl shadow-sm">
        <Link href={`/dashboard/schools/${params.id}`} className="text-sm font-black text-gray-500 hover:text-blue-600 flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm transition-all">
          ← العودة لتفاصيل المدرسة
        </Link>
        <div className="flex gap-3">
          <ExportFullReportExcelButton data={{ school, ea, stats, staff, building }} />
          <DownloadPdfButton schoolName={school.school_name_ar} />
        </div>
      </div>

      {/* المحتوى الفعلي للتقرير الذي سيتم توليده كـ PDF */}
      <div id="pdf-content" className="bg-white p-8">
        {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ترويسة رسمية */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="text-center border-b-2 border-gray-900 pb-4 mb-6">
        <p className="text-sm font-bold text-gray-600">جمهورية مصر العربية</p>
        <p className="text-sm font-bold text-gray-600">وزارة التربية والتعليم</p>
        <p className="text-base font-black text-gray-900 mt-1">
          {ea?.name_ar ?? 'الإدارة التعليمية'} — {ea?.governorate ?? ''}
        </p>
        <h1 className="text-2xl font-black text-gray-900 mt-3">
          📋 تقرير شامل — {school.school_name_ar}
        </h1>
        <p className="text-xs text-gray-500 mt-1">كود المدرسة: {school.school_code} | العام الدراسي: 2025-2026</p>
        <p className="text-xs text-gray-400 mt-0.5">{now}</p>
      </header>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* بيانات أساسية */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="mb-6 break-inside-avoid">
        <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">🏫 البيانات الأساسية</h2>
        <div className="flex flex-wrap gap-y-3 text-sm">
          <div className="w-1/4 pr-2"><InfoBox label="نوع المدرسة" value={school.school_type ?? '—'} /></div>
          <div className="w-1/4 pr-2"><InfoBox label="فترة الدراسة" value={school.period ?? '—'} /></div>
          <div className="w-1/4 pr-2"><InfoBox label="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-EG')} /></div>
          <div className="w-1/4 pr-2"><InfoBox label="عدد الفصول" value={totalClasses} /></div>
          <div className="w-1/4 pr-2"><InfoBox label="متوسط الكثافة" value={`${avgDensity} طالب/فصل`} /></div>
          <div className="w-1/4 pr-2"><InfoBox label="المعلمون" value={teachers} /></div>
          <div className="w-1/4 pr-2"><InfoBox label="الإداريون" value={admins} /></div>
          <div className="w-1/4 pr-2"><InfoBox label="العمال" value={workers} /></div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* إحصاءات الصفوف */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {stats.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">📊 إحصاءات الصفوف الدراسية</h2>
          <table id="stats-table" className="w-full text-xs text-center border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-200 font-black">
                <th className="p-1.5 border border-gray-400">الصف</th>
                <th className="p-1.5 border border-gray-400">الفصول</th>
                <th className="p-1.5 border border-gray-400">بنين</th>
                <th className="p-1.5 border border-gray-400">بنات</th>
                <th className="p-1.5 border border-gray-400">الإجمالي</th>
                <th className="p-1.5 border border-gray-400">الكثافة</th>
                <th className="p-1.5 border border-gray-400">مسلم</th>
                <th className="p-1.5 border border-gray-400">مسيحي</th>
                <th className="p-1.5 border border-gray-400">دمج</th>
                <th className="p-1.5 border border-gray-400">وافد</th>
                <th className="p-1.5 border border-gray-400">معيد</th>
                <th className="p-1.5 border border-gray-400">منقطع</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s: any) => {
                const total = (s.boys_count || 0) + (s.girls_count || 0);
                const d = s.number_of_classes > 0 ? Math.round(total / s.number_of_classes * 10) / 10 : 0;
                const incl = (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0);
                return (
                  <tr key={s.id}>
                    <td className="p-1.5 border border-gray-300 font-bold text-right">{s.grade_level}</td>
                    <td className="p-1.5 border border-gray-300">{s.number_of_classes}</td>
                    <td className="p-1.5 border border-gray-300">{s.boys_count}</td>
                    <td className="p-1.5 border border-gray-300">{s.girls_count}</td>
                    <td className="p-1.5 border border-gray-300 font-black">{total}</td>
                    <td className={`p-1.5 border border-gray-300 font-black ${d > 50 ? 'bg-red-100 text-red-700' : ''}`}>{d}</td>
                    <td className="p-1.5 border border-gray-300">{s.muslim_count || 0}</td>
                    <td className="p-1.5 border border-gray-300">{s.christian_count || 0}</td>
                    <td className="p-1.5 border border-gray-300">{incl}</td>
                    <td className="p-1.5 border border-gray-300">{s.expatriate_count || 0}</td>
                    <td className="p-1.5 border border-gray-300">{s.retained_for_repeat || 0}</td>
                    <td className="p-1.5 border border-gray-300">{s.dropout_count || 0}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-black">
                <td className="p-1.5 border border-gray-400">الإجمالي</td>
                <td className="p-1.5 border border-gray-400">{totalClasses}</td>
                <td className="p-1.5 border border-gray-400">{stats.reduce((a: number, s: any) => a + (s.boys_count || 0), 0)}</td>
                <td className="p-1.5 border border-gray-400">{stats.reduce((a: number, s: any) => a + (s.girls_count || 0), 0)}</td>
                <td className="p-1.5 border border-gray-400">{totalStudents}</td>
                <td className="p-1.5 border border-gray-400">{avgDensity}</td>
                <td className="p-1.5 border border-gray-400">{stats.reduce((a: number, s: any) => a + (s.muslim_count || 0), 0)}</td>
                <td className="p-1.5 border border-gray-400">{stats.reduce((a: number, s: any) => a + (s.christian_count || 0), 0)}</td>
                <td className="p-1.5 border border-gray-400">{totalInclusion}</td>
                <td className="p-1.5 border border-gray-400">{stats.reduce((a: number, s: any) => a + (s.expatriate_count || 0), 0)}</td>
                <td className="p-1.5 border border-gray-400">{stats.reduce((a: number, s: any) => a + (s.retained_for_repeat || 0), 0)}</td>
                <td className="p-1.5 border border-gray-400">{stats.reduce((a: number, s: any) => a + (s.dropout_count || 0), 0)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* القيادات */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {leaders.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">👤 القيادات المدرسية</h2>
          <table className="w-full text-xs text-right border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-200 font-black">
                <th className="p-1.5 border border-gray-400">#</th>
                <th className="p-1.5 border border-gray-400">الاسم</th>
                <th className="p-1.5 border border-gray-400">الوظيفة</th>
                <th className="p-1.5 border border-gray-400">الهاتف</th>
                <th className="p-1.5 border border-gray-400">الرقم القومي</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((l: any, i: number) => (
                <tr key={l.id}>
                  <td className="p-1.5 border border-gray-300 text-center">{i + 1}</td>
                  <td className="p-1.5 border border-gray-300 font-bold">{l.full_name_ar}</td>
                  <td className="p-1.5 border border-gray-300">{l.job_title}</td>
                  <td className="p-1.5 border border-gray-300">{l.phone ?? '—'}</td>
                  <td className="p-1.5 border border-gray-300">{l.national_id ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* بيانات المبنى */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {building && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">🏗️ بيانات المبنى</h2>
          <div className="flex flex-wrap gap-y-3 text-xs">
            <div className="w-1/4 pr-2"><InfoBox label="حالة المبنى" value={building.building_status ?? '—'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="الفصول الفعلية" value={building.actual_classrooms ?? '—'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="المعامل" value={building.total_labs ?? '—'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="غرف الإدارة" value={building.admin_rooms ?? '—'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="حمامات بنين" value={building.boys_toilets ?? '—'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="حمامات بنات" value={building.girls_toilets ?? '—'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="الكاميرات" value={building.surveillance_cameras ?? '—'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="إنترنت" value={building.has_internet ? '✅ متوفر' : '❌ لا يوجد'} /></div>
            <div className="w-1/4 pr-2"><InfoBox label="حالة السور" value={building.fence_condition ?? '—'} /></div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* العاملون */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {staff.length > 0 && (
        <section className="mb-6 break-inside-avoid">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">👥 ملخص العاملين</h2>
          <div className="flex w-full gap-3 text-center text-sm">
            <div className="flex-1 border rounded-lg p-3">
              <p className="text-2xl font-black text-blue-700">{teachers}</p>
              <p className="text-xs font-bold text-gray-500">معلم</p>
            </div>
            <div className="flex-1 border rounded-lg p-3">
              <p className="text-2xl font-black text-purple-700">{admins}</p>
              <p className="text-xs font-bold text-gray-500">إداري</p>
            </div>
            <div className="flex-1 border rounded-lg p-3">
              <p className="text-2xl font-black text-teal-700">{workers}</p>
              <p className="text-xs font-bold text-gray-500">عامل</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            الإجمالي: {staff.length} موظف | نسبة طالب/معلم: {teachers > 0 ? Math.round(totalStudents / teachers) : '—'}
          </p>
        </section>
      )}

      <footer className="mt-12 pt-6 border-t-2 border-gray-300 flex w-full justify-between break-inside-avoid">
        <div className="text-center w-1/3 px-4">
          <p className="font-black text-gray-700 mb-8">مدير المدرسة</p>
          <div className="border-t border-gray-400 pt-1 text-gray-400 text-xs">التوقيع والختم</div>
        </div>
        <div className="text-center w-1/3 px-4">
          <p className="font-black text-gray-700 mb-8">الموجه الفني</p>
          <div className="border-t border-gray-400 pt-1 text-gray-400 text-xs">التوقيع</div>
        </div>
        <div className="text-center w-1/3 px-4">
          <p className="font-black text-gray-700 mb-8">مدير الإدارة</p>
          <div className="border-t border-gray-400 pt-1 text-gray-400 text-xs">التوقيع والختم</div>
        </div>
      </footer>
      </div> {/* End pdf-content */}

    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-gray-200 rounded-lg p-2">
      <p className="text-[10px] text-gray-400 font-bold">{label}</p>
      <p className="text-sm font-black text-gray-900">{value}</p>
    </div>
  );
}
