// src/app/school/building/page.tsx
import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getSchoolId(supabase: any, userId: string) {
  const { data } = await supabase
    .from('user_school_permissions').select('school_id')
    .eq('user_id', userId).not('school_id', 'is', null).single();
  return data?.school_id ?? null;
}

export default async function SchoolBuildingPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  const schoolId = await getSchoolId(supabase, session.user.id);
  if (!schoolId) redirect('/login');

  const { data: building } = await supabase
    .from('school_buildings').select('*')
    .eq('school_id', schoolId).single();

  if (!building) {
    return (
      <div className="animate-in" dir="rtl">
        <h1 className="text-2xl font-black text-gray-900 mb-6">بيانات المبنى</h1>
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="text-gray-400 font-bold">لم يتم تسجيل بيانات المبنى بعد</p>
          <a href="/school/upload" className="btn-primary inline-flex mt-4 text-sm">⬆️ رفع بيانات المبنى</a>
        </div>
      </div>
    );
  }

  const items = [
    { label: 'حالة المبنى',      value: building.building_status, icon: '🏛️' },
    { label: 'الفصول الدراسية',  value: building.actual_classrooms, icon: '🚪' },
    { label: 'الغرف الإدارية',   value: building.admin_rooms,      icon: '🗂️' },
    { label: 'المعامل',          value: building.total_labs,        icon: '🔬' },
    { label: 'غرف الأنشطة',     value: building.activity_rooms,    icon: '🎨' },
    { label: 'الملاعب',          value: building.playgrounds,       icon: '⚽' },
    { label: 'دورات مياه (بنين)', value: building.boys_toilets,     icon: '🚹' },
    { label: 'دورات مياه (بنات)', value: building.girls_toilets,    icon: '🚺' },
    { label: 'دورات مياه (هيئة)', value: building.staff_toilets,    icon: '🚻' },
    { label: 'كاميرات المراقبة',  value: building.surveillance_cameras, icon: '📹' },
    { label: 'حالة السور',       value: building.fence_condition,   icon: '🧱' },
    { label: 'تليفون أرضي',      value: building.has_landline ? '✅ يوجد' : '❌ لا يوجد', icon: '📞' },
    { label: 'إنترنت',           value: building.has_internet ? '✅ متوفر' : '❌ غير متوفر', icon: '🌐' },
  ];

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      <h1 className="text-2xl font-black text-gray-900">بيانات المبنى</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <div key={i} className="card p-4 text-center hover:shadow-md transition-shadow">
            <span className="text-2xl">{item.icon}</span>
            <p className="text-lg font-black text-gray-900 mt-2">{item.value ?? '—'}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
