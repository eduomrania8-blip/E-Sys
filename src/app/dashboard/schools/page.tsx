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
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
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
      {/* Header */}
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">دليل المدارس</h1>
          <p className="text-gray-500 mt-1">
            {filtered.length} مدرسة — {totalStudents.toLocaleString('ar-EG')} طالب إجمالاً
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/api/admin-export" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100">
            📊 تصدير (Excel)
          </a>
          <Link href="/dashboard/schools/new" className="btn-primary flex items-center gap-2">
            <span className="text-lg">+</span>
            إضافة مدرسة
          </Link>
        </div>
      </header>

      {/* Filters */}
      <form method="get" className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-500 mb-1">بحث</label>
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="اسم المدرسة أو الكود..."
            className="input"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">نوع المدرسة</label>
          <select name="type" defaultValue={searchParams.type} className="input min-w-[140px]">
            <option value="">الكل</option>
            {['رسمية', 'رسمية لغات', 'خاصة', 'خاصة لغات', 'دولية', 'فنية'].map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">الكثافة</label>
          <select name="density" defaultValue={searchParams.density} className="input min-w-[140px]">
            <option value="">الكل</option>
            <option value="high">مرتفعة (&gt;50)</option>
            <option value="normal">طبيعية (≤50)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">بحث</button>
          <Link href="/dashboard/schools" className="btn-secondary">إعادة ضبط</Link>
        </div>
      </form>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 card">
          <p className="text-5xl mb-4">🏫</p>
          <p className="font-black text-gray-900 text-lg">لا توجد مدارس مطابقة</p>
          <p className="text-gray-500 mt-2 font-medium">جرّب تغيير معايير البحث أو أضف مدرسة جديدة</p>
          <Link href="/dashboard/schools/new" className="btn-primary inline-flex mt-6">+ إضافة مدرسة</Link>
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
    density > 60 ? { label: 'خطر', cls: 'badge-danger', bar: 'bg-red-500' } :
    density > 50 ? { label: 'مرتفع', cls: 'badge-warning', bar: 'bg-orange-500' } :
    density > 40 ? { label: 'متوسط', cls: 'badge-info', bar: 'bg-yellow-400' } :
                   { label: 'مقبول', cls: 'badge-success', bar: 'bg-green-500' };

  return (
    <Link
      href={`/dashboard/schools/${school.school_id}`}
      className="card p-5 hover:shadow-md hover:border-blue-200 transition-all group block"
    >
      {/* Top */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
            {school.school_name_ar[0]}
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 leading-tight group-hover:text-blue-700 transition-colors">
              {school.school_name_ar}
            </p>
            <p className="text-xs text-gray-400 font-bold mt-0.5">
              {school.school_code} — {school.administration_name ?? '—'}
            </p>
          </div>
        </div>
        <span className={densityLevel.cls}>{densityLevel.label}</span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="الطلاب"  value={Number(school.total_students).toLocaleString('ar-EG')} />
        <Stat label="الفصول"  value={school.total_classes ?? '—'} />
        <Stat label="الدمج"   value={school.total_inclusion ?? 0} />
      </div>

      {/* Density Bar */}
      <div>
        <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
          <span>متوسط الكثافة</span>
          <span className="font-black text-gray-900">{density} طالب/فصل</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${densityLevel.bar}`}
            style={{ width: `${Math.min((density / 70) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Bottom badges */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {school.school_type && <span className="badge-neutral">{school.school_type}</span>}
        {school.has_internet && <span className="badge-success">إنترنت ✓</span>}
        {!school.is_active && <span className="badge-danger">غير نشطة</span>}
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-center bg-gray-50 rounded-xl py-2 px-1">
      <p className="text-sm font-black text-gray-900">{value}</p>
      <p className="text-[10px] font-bold text-gray-400">{label}</p>
    </div>
  );
}
