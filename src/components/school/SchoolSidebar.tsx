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
    description: 'لوحة المعلومات الرئيسية',
  },
  {
    href: '/school/upload',
    label: 'رفع البيانات',
    icon: '⬆️',
    description: 'رفع ملف Excel',
    editOnly: true,
  },
  {
    href: '/school/manual',
    label: 'الإدخال اليدوي',
    icon: '✍️',
    description: 'إدخال البيانات يدوياً',
    editOnly: true,
  },
  {
    href: '/school/students',
    label: 'كشوف الطلاب',
    icon: '📋',
    description: 'الضعاف والدمج والوافدين',
  },
  {
    href: '/school/leaders',
    label: 'القيادات',
    icon: '👤',
    description: 'المدير والوكلاء',
  },
  {
    href: '/school/building',
    label: 'المبنى',
    icon: '🏗️',
    description: 'بيانات المبنى المدرسي',
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
    <aside className={`flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-72'} min-h-screen shrink-0`}>
      {/* Background gradient */}
      <div className="flex flex-col flex-1 bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 text-white">

        {/* School Identity */}
        <div className={`flex items-center gap-3 p-5 border-b border-emerald-700/50 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-11 h-11 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg border border-white/10">
            {schoolName[0]}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="font-black text-sm leading-tight truncate">{schoolName}</p>
              <p className="text-[10px] text-emerald-300 font-bold font-mono">{schoolCode}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-emerald-700/50 transition-colors text-emerald-300 hover:text-white shrink-0"
            title={collapsed ? 'توسيع' : 'طي'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        {/* Permission Badge */}
        {!collapsed && (
          <div className="px-5 py-3 border-b border-emerald-700/30">
            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${
              canEdit
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                : 'bg-emerald-800/50 text-emerald-300 border border-emerald-700/50'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${canEdit ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
              {canEdit ? '✏️ قراءة وتعديل' : '👁️ قراءة فقط'}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {!collapsed && (
            <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-wider px-3 mb-2">القائمة الرئيسية</p>
          )}
          {navLinks.map(link => {
            const active = isActive(link.href, link.exact);
            if (link.editOnly && !canEdit) return null;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : link.description}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                  ${active
                    ? 'bg-white/15 text-white shadow-lg backdrop-blur border border-white/10'
                    : 'text-emerald-200/80 hover:text-white hover:bg-white/5'}
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <span className={`text-base ${collapsed ? '' : 'w-6 text-center'}`}>{link.icon}</span>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="block">{link.label}</span>
                    {active && link.description && (
                      <span className="text-[9px] text-emerald-300/70 block mt-0.5">{link.description}</span>
                    )}
                  </div>
                )}
                {active && !collapsed && (
                  <div className="w-1.5 h-6 bg-emerald-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-emerald-700/30 space-y-2">
          {/* Quick Export */}
          {!collapsed && (
            <a
              href={`/api/export-school-data?schoolId=${schoolId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-emerald-200/70 hover:text-white hover:bg-white/5 transition-all"
            >
              <span className="text-sm">📥</span>
              تصدير البيانات
            </a>
          )}

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            title={collapsed ? 'تسجيل الخروج' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-300/70 hover:text-red-300 hover:bg-red-900/20 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="text-base">🚪</span>
            {!collapsed && 'تسجيل الخروج'}
          </button>
        </div>
      </div>
    </aside>
  );
}
