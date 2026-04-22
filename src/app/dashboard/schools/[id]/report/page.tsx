// src/app/dashboard/schools/[id]/report/page.tsx
// تقرير مدرسة رسمي — صفحة A4 قابلة للطباعة
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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
    supabase.from('class_statistics').select('*').eq('school_id', params.id).eq('academic_year', '2025-2026').order('grade_level'),
  ]);

  const school   = schoolRes.data;
  const building = buildingRes.data;
  const leaders  = leadersRes.data ?? [];
  const staff    = staffRes.data ?? [];
  const stats    = statsRes.data ?? [];

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
    <div dir="rtl" className="max-w-4xl mx-auto bg-white">
      {/* أزرار التحكم — لا تُطبع */}
      <div className="no-print flex items-center justify-between py-4 px-2 border-b mb-6">
        <Link href={`/dashboard/schools/${params.id}`} className="text-sm font-bold text-gray-500 hover:text-blue-600">
          ← العودة لتفاصيل المدرسة
        </Link>
        <button onClick={() => {}} id="print-btn" className="btn-primary text-sm">🖨️ طباعة التقرير</button>
        {/* Script for print button */}
      </div>

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
      <section className="mb-6">
        <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">🏫 البيانات الأساسية</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <InfoBox label="نوع المدرسة" value={school.school_type ?? '—'} />
          <InfoBox label="فترة الدراسة" value={school.period ?? '—'} />
          <InfoBox label="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-EG')} />
          <InfoBox label="عدد الفصول" value={totalClasses} />
          <InfoBox label="متوسط الكثافة" value={`${avgDensity} طالب/فصل`} />
          <InfoBox label="المعلمون" value={teachers} />
          <InfoBox label="الإداريون" value={admins} />
          <InfoBox label="العمال" value={workers} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* إحصاءات الصفوف */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {stats.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">📊 إحصاءات الصفوف الدراسية</h2>
          <table className="w-full text-xs text-center border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-200 font-black">
                <th className="p-1.5 border border-gray-400">الصف</th>
                <th className="p-1.5 border border-gray-400">الفصول</th>
                <th className="p-1.5 border border-gray-400">بنين</th>
                <th className="p-1.5 border border-gray-400">بنات</th>
                <th className="p-1.5 border border-gray-400">الإجمالي</th>
                <th className="p-1.5 border border-gray-400">دمج</th>
                <th className="p-1.5 border border-gray-400">الكثافة</th>
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
                    <td className="p-1.5 border border-gray-300">{incl}</td>
                    <td className={`p-1.5 border border-gray-300 font-black ${d > 50 ? 'bg-red-100 text-red-700' : ''}`}>{d}</td>
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
                <td className="p-1.5 border border-gray-400">{totalInclusion}</td>
                <td className="p-1.5 border border-gray-400">{avgDensity}</td>
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
                  <td className="p-1.5 border border-gray-300 font-bold">{l.full_name}</td>
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
        <section className="mb-6">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">🏗️ بيانات المبنى</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 text-xs">
            <InfoBox label="عدد الطوابق" value={building.number_of_floors ?? '—'} />
            <InfoBox label="فصول" value={building.classrooms_count ?? '—'} />
            <InfoBox label="معامل" value={building.labs_count ?? '—'} />
            <InfoBox label="ملاعب" value={building.playgrounds_count ?? '—'} />
            <InfoBox label="مكتبة" value={building.has_library ? '✅ نعم' : '❌ لا'} />
            <InfoBox label="معمل أوائل" value={building.has_smart_lab ? '✅ نعم' : '❌ لا'} />
            <InfoBox label="كاميرات" value={building.cameras_count ?? '—'} />
            <InfoBox label="حالة السور" value={building.fence_condition ?? '—'} />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* العاملون */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {staff.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-black text-gray-900 border-b border-gray-300 pb-1 mb-3">👥 ملخص العاملين</h2>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="border rounded-lg p-3">
              <p className="text-2xl font-black text-blue-700">{teachers}</p>
              <p className="text-xs font-bold text-gray-500">معلم</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-2xl font-black text-purple-700">{admins}</p>
              <p className="text-xs font-bold text-gray-500">إداري</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-2xl font-black text-teal-700">{workers}</p>
              <p className="text-xs font-bold text-gray-500">عامل</p>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            الإجمالي: {staff.length} موظف | نسبة طالب/معلم: {teachers > 0 ? Math.round(totalStudents / teachers) : '—'}
          </p>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* توقيع */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-300">
        <div className="grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <p className="font-black text-gray-700 mb-8">مدير المدرسة</p>
            <div className="border-t border-gray-400 pt-1 text-gray-400">التوقيع والختم</div>
          </div>
          <div>
            <p className="font-black text-gray-700 mb-8">الموجه الفني</p>
            <div className="border-t border-gray-400 pt-1 text-gray-400">التوقيع</div>
          </div>
          <div>
            <p className="font-black text-gray-700 mb-8">مدير الإدارة</p>
            <div className="border-t border-gray-400 pt-1 text-gray-400">التوقيع والختم</div>
          </div>
        </div>
      </footer>

      {/* Print Script */}
      <PrintScript />
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

function PrintScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.getElementById('print-btn')?.addEventListener('click', function() { window.print(); });`,
      }}
    />
  );
}
