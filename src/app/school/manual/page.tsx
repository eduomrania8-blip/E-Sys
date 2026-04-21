import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ManualEntryManager from '@/components/forms/ManualEntryManager';

async function getSchoolId(supabase: any, userId: string) {
  const { data } = await supabase
    .from('user_school_permissions')
    .select('school_id')
    .eq('user_id', userId)
    .not('school_id', 'is', null)
    .single();
  return data?.school_id ?? null;
}

export default async function SchoolManualEntryRoute() {
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

  return (
    <div className="animate-in fade-in">
      <ManualEntryManager schoolId={schoolId} />
    </div>
  );
}
