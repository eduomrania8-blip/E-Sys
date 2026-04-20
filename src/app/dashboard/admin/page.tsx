// src/app/dashboard/admin/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import TopBar from '@/components/shared/TopBar';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const session = getSession();
  if (!session || session.role !== 'admin') redirect('/login');
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar session={session} />
      <AdminDashboard />
    </div>
  );
}
