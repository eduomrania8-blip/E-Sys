// src/app/dashboard/schools/page.tsx
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function SchoolsListPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; density?: string };
}) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  let query = supabase.from('school_summary').select('*').order('school_name_ar');

  if (searchParams.type)    query = query.eq('school_type', searchParams.type);
  if (searchParams.density === 'high') query = query.gt('avg_density', 50);
  if (searchParams.density === 'normal') query = query.lte('avg_density', 50);

  const { data: schools } = await query;

  const filtered = searchParams.q
    ? (schools ?? []).filter((s: any) =>
        s.school_name_ar.includes(searchParams.q!) ||
        s.school_code.includes(searchParams.q!)
      )
    : (schools ?? []);

  const totalStudents = filtered.reduce((a: number, s: any) => a + (Number(s.total_students) || 0), 0);

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      {/* ═══════ Header ═══════ */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-3">
            🏫
          </div>
          <h1 className="text-2xl font-black text-gray-900">دليل المدارس</h1>
          <p className="text-gray-500 mt-1 text-sm font-bold flex items-center gap-2">
            <span>إجمالي {filtered.length} مدرسة</span>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600">{totalStudents.toLocaleString('ar-EG')} طالب</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/api/admin-export" target="_blank" rel="noopener noreferrer" 
             className="px-5 py-2.5 rounded-xl text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-2">
            <span className="text-lg">📥</span> تصدير Excel
          </a>
          <Link href="/dashboard/schools/new" 
                className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors flex items-center gap-2">
            <span className="text-lg">➕</span> إضافة مدرسة
          </Link>
        </div>
      </header>

      {/* ═══════ Filters ═══════ */}
      <form method="get" className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-wrap gap-4 items-end shadow-inner">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">بحث حر</label>
          <div className="relative">
            <input
              name="q"
              defaultValue={searchParams.q}
              placeholder="ابحث باسم المدرسة أو الكود..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">نوعية المدرسة</label>
          <select name="type" defaultValue={searchParams.type} 
                  className="w-full min-w-[150px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none">
            <option value="">الكل</option>
            {['رسمي', 'رسمي لغات', 'خاص', 'خاص لغات', 'دولي', 'ثقافي'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">حالة الكثافة</label>
          <select name="density" defaultValue={searchParams.density} 
                  className="w-full min-w-[150px] px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none">
            <option value="">الجميع</option>
            <option value="high">مرتفعة (&gt;50 طالب)</option>
            <option value="normal">طبيعية (≤50 طالب)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-md">
            تصفية
          </button>
          {(searchParams.q || searchParams.type || searchParams.density) && (
            <Link href="/dashboard/schools" className="px-4 py-2.5 rounded-xl text-sm font-black text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors">
              إلغاء
            </Link>
          )}
        </div>
      </form>

      {/* ═══════ Grid ═══════ */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <p className="font-black text-gray-900 text-lg">لا توجد مدارس مطابقة للبحث</p>
          <p className="text-gray-500 mt-1 text-sm font-bold">جرّب تغيير معايير البحث أو إضافة مدرسة جديدة للقاعدة.</p>
          <Link href="/dashboard/schools/new" className="mt-6 inline-block px-6 py-2.5 rounded-xl text-sm font-black text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
            + إضافة مدرسة
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((school: any) => (
            <SchoolCard key={school.school_id} school={school} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolCard({ school }: { school: any }) {
  const density = Number(school.avg_density) || 0;
  const densityLevel =
    density > 60 ? { label: 'خطر', cls: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500' } :
    density > 50 ? { label: 'مرتفع', cls: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-500' } :
    density > 40 ? { label: 'متوسط', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', bar: 'bg-yellow-400' } :
                   { label: 'طبيعي', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' };

  return (
    <Link
      href={`/dashboard/schools/${school.school_id}`}
      className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all group block relative overflow-hidden"
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors z-0" />
      
      <div className="relative z-10">
        {/* Top */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black text-xl shadow-sm border border-gray-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
              {school.school_name_ar[0]}
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">
                {school.school_name_ar}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{school.school_code}</code>
                <span className="text-[10px] font-bold text-gray-400">{school.educational_stage ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Stat label="الطلاب"  value={Number(school.total_students).toLocaleString('ar-EG')} icon="👥" />
          <Stat label="الفصول"  value={school.total_classes ?? '—'} icon="🏫" />
          <Stat label="الدمج"   value={school.total_inclusion ?? 0} icon="♿" />
        </div>

        {/* Density Bar */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div className="flex justify-between text-[11px] font-bold mb-2">
            <span className="text-gray-500">متوسط الكثافة</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-black">{density} <span className="text-[9px] text-gray-400">طالب/فصل</span></span>
              <span className={`px-2 py-0.5 rounded text-[9px] border ${densityLevel.cls}`}>{densityLevel.label}</span>
            </div>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-100">
            <div
              className={`h-full rounded-full transition-all ${densityLevel.bar}`}
              style={{ width: `${Math.min((density / 70) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Bottom badges */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
          {school.school_type && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
              {school.school_type}
            </span>
          )}
          {school.is_active === false && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-100">
              🔴 غير نشطة
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, icon }: { label: string; value: any; icon: string }) {
  return (
    <div className="text-center bg-white border border-gray-100 rounded-xl py-2 px-1 shadow-sm">
      <span className="text-xs mb-1 block opacity-70">{icon}</span>
      <p className="text-sm font-black text-gray-900 leading-none">{value}</p>
      <p className="text-[9px] font-bold text-gray-400 mt-1">{label}</p>
    </div>
  );
}
