'use client';
// src/components/shared/TopBar.tsx

import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/types';

interface Props {
  session: SessionUser;
}

export default function TopBar({ session }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const typeColors: Record<string, string> = {
    admin: 'bg-amber-400 text-amber-900',
    school: 'bg-emerald-400 text-emerald-900',
  };

  return (
    <header className="bg-navy sticky top-0 z-50 h-14 flex items-center justify-between px-5 shadow-md">
      <div className="flex items-center gap-3 text-white font-bold text-sm">
        <span className="text-lg">🏛️</span>
        {session.role === 'admin' ? (
          'لوحة الإدارة التعليمية'
        ) : (
          <span className="truncate max-w-xs">{session.schoolName}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${typeColors[session.role]}`}>
          {session.role === 'admin' ? 'أدمن' : session.schoolType ?? 'مدرسة'}
        </span>
        <button
          onClick={logout}
          className="text-xs text-white/80 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-lg transition-colors"
        >
          خروج ↩
        </button>
      </div>
    </header>
  );
}
