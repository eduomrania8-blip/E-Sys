'use client';
// src/components/school/SchoolSidebar.tsx
// Sidebar مخصص لمديري المدارس

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const navLinks = [
  {
    href: '/school',
    label: 'نظرة عامة',
    icon: '📊',
    exact: true,
  },
  {
    href: '/school/upload',
    label: 'رفع البيانات',
    icon: '⬆️',
  },
  {
    href: '/school/manual',
    label: 'الإدخال اليدوي',
    icon: '✍️',
  },
  {
    href: '/school/students',
    label: 'كشوف الطلاب',
    icon: '📋',
  },
  {
    href: '/school/leaders',
    label: 'القيادات',
    icon: '👤',
  },
  {
    href: '/school/building',
    label: 'المبنى',
    icon: '🏗️',
  },
];

interface Props {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  canEdit: boolean;
}

export function SchoolSidebar({ schoolId, schoolName, schoolCode, canEdit }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className={`flex flex-col bg-emerald-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-72'} min-h-screen shrink-0`}>
      {/* School Logo */}
      <div className="flex items-center gap-3 p-5 border-b border-emerald-700">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-700 font-black text-xl shrink-0 shadow-lg">
          {schoolName[0]}
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-black text-sm leading-tight truncate">{schoolName}</p>
            <p className="text-[10px] text-emerald-300 font-bold">{schoolCode}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-emerald-700 transition-colors text-emerald-300 hover:text-white shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
      </div>

      {/* Permission Badge */}
      {!collapsed && (
        <div className="px-5 py-3 border-b border-emerald-700">
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${canEdit ? 'bg-emerald-600 text-white' : 'bg-emerald-800 text-emerald-200'}`}>
            {canEdit ? '✏️ قراءة وتعديل' : '👁️ قراءة فقط'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navLinks.map(link => {
          const active = isActive(link.href, link.exact);
          const show = link.href === '/school/upload' && !canEdit ? false : true;
          if (!show) return null;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all
                ${active ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-200 hover:text-white hover:bg-emerald-800'}
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <span className="text-base">{link.icon}</span>
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-emerald-700">
        <button
          onClick={handleSignOut}
          title={collapsed ? 'تسجيل الخروج' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-300 hover:text-red-300 hover:bg-red-900/30 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <span className="text-base">🚪</span>
          {!collapsed && 'تسجيل الخروج'}
        </button>
      </div>
    </aside>
  );
}
