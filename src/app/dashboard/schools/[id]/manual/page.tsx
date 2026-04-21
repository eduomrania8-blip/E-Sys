import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ManualEntryManager from '@/components/forms/ManualEntryManager';
import Link from 'next/link';

export default async function AdminSchoolManualEntryRoute({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { id: schoolId } = params;

  const { data: school } = await supabase
    .from('schools')
    .select('school_name_ar, school_code')
    .eq('id', schoolId)
    .single();

  if (!school) {
    return <div className="p-8 text-center" dir="rtl">المدرسة غير موجودة</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      {/* Admin Navigation Header */}
      <div className="flex items-center gap-4 bg-gray-50 border border-gray-100 p-4 rounded-xl">
        <Link href={`/dashboard/schools/${schoolId}`} className="text-gray-500 hover:text-blue-600 transition-colors bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
          ← العودة لملف المدرسة
        </Link>
        <div>
          <h2 className="text-lg font-black text-gray-900">{school.school_name_ar}</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">كود: {school.school_code}</p>
        </div>
      </div>

      <ManualEntryManager schoolId={schoolId} />
    </div>
  );
}
