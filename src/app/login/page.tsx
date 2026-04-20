// src/app/login/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  const session = getSession();
  if (session?.role === 'admin') redirect('/dashboard/admin');
  if (session?.role === 'school') redirect('/dashboard/school');
  return <LoginForm />;
}
