// src/app/dashboard/school/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TopBar from '@/components/shared/TopBar';
import SchoolDashboard from '@/components/school/SchoolDashboard';

export default function SchoolPage() {
  const session = getSession();
  if (!session || session.role !== 'school') redirect('/login');
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar session={session} />
      <SchoolDashboard session={session} />
    </div>
  );
}
