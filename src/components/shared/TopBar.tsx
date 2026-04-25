// src/components/shared/TopBar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';
import AIInsightsPanel from './AIInsightsPanel';

export const TopBar: React.FC = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 py-4 shadow-sm no-print">
      <div className="container mx-auto px-4 max-w-7xl flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-200">
              E
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              منظومة التعليم الابتدائى
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-600">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">الرئيسية</Link>
            <Link href="/dashboard/schools" className="hover:text-blue-600 transition-colors">دليل المدارس</Link>
            <Link href="/dashboard/upload" className="hover:text-blue-600 transition-colors">رفع البيانات</Link>
            <Link href="/dashboard/analytics" className="hover:text-blue-600 transition-colors">التحليلات</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AIInsightsPanel />
          <NotificationBell />
          
          <div className="h-8 w-px bg-gray-100 mx-2"></div>
          
          <button 
            onClick={handleSignOut}
            className="text-sm font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
          >
            تسجيل الخروج
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};
