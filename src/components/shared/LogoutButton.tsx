'use client';
// LogoutButton — زر تسجيل الخروج في الشريط العلوي

import { createBrowserClient } from '@supabase/ssr';

export default function LogoutButton() {
  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <button
      onClick={handleSignOut}
      title="تسجيل الخروج"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-gray-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all group"
    >
      <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      <span className="hidden sm:block">خروج</span>
    </button>
  );
}
