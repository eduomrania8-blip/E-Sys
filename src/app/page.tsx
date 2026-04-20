// src/app/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default function Home() {
  const session = getSession();
  if (session?.role === 'admin') redirect('/dashboard/admin');
  if (session?.role === 'school') redirect('/dashboard/school');
  redirect('/login');
}
