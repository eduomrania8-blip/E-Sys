'use client';
// src/components/shared/Sidebar.tsx
// Sidebar مخصص للإدارة التعليمية

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

const navLinks = [
  {
    href: '/dashboard',
    label: 'نظرة عامة',
    icon: '📊',
    exact: true,
    description: 'ملخص الإدارة',
  },
  {
    href: '/dashboard/schools',
    label: 'دليل المدارس',
    icon: '🏫',
    description: 'قائمة مدارس الإدارة',
  },
  {
    href: '/dashboard/analytics',
    label: 'مركز التحليلات',
    icon: '📈',
    description: 'إحصاءات ورسوم',
  },
  {
    href: '/dashboard/upload',
    label: 'رفع البيانات',
    icon: '⬆️',
    description: 'استيراد من Excel',
  },
  {
    href: '/dashboard/reports',
    label: 'التقارير',
    icon: '🖨️',
    description: 'طباعة وتصدير',
  },
  {
    href: '/dashboard/settings',
    label: 'الإعدادات',
    icon: '⚙️',
    description: 'إعدادات المنظومة',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className={`flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-72'} min-h-screen shrink-0`}>
      {/* Background gradient */}
      <div className="flex flex-col flex-1 bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl z-20">

        {/* Brand Identity */}
        <div className={`flex items-center gap-3 p-5 border-b border-blue-700/50 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-11 h-11 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg border border-white/10">
            E
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="font-black text-sm leading-tight truncate">منظومة الإحصاء</p>
              <p className="text-[10px] text-blue-300 font-bold tracking-wide mt-0.5">الإدارة التعليمية</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-blue-700/50 transition-colors text-blue-300 hover:text-white shrink-0"
            title={collapsed ? 'توسيع' : 'طي'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

        {/* Permission Badge */}
        {!collapsed && (
          <div className="px-5 py-3 border-b border-blue-700/30">
            <span className="text-[10px] font-black px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-200 border border-blue-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              مدير النظام (Admin)
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {!collapsed && (
            <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-wider px-3 mb-2">القائمة الرئيسية</p>
          )}
          {navLinks.map(link => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : link.description}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group
                  ${active
                    ? 'bg-white/15 text-white shadow-lg backdrop-blur border border-white/10'
                    : 'text-blue-200/80 hover:text-white hover:bg-white/5'}
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <span className={`text-base transition-transform group-hover:scale-110 ${collapsed ? '' : 'w-6 text-center'}`}>{link.icon}</span>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="block">{link.label}</span>
                    {active && link.description && (
                      <span className="text-[9px] text-blue-300/70 block mt-0.5">{link.description}</span>
                    )}
                  </div>
                )}
                {active && !collapsed && (
                  <div className="w-1.5 h-6 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-blue-700/30 space-y-2 bg-blue-950/20">
          {/* Quick Action */}
          {!collapsed && (
            <Link
              href="/dashboard/schools/new"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-blue-200/70 hover:text-white hover:bg-white/5 transition-all"
            >
              <span className="text-sm">➕</span>
              إضافة مدرسة جديدة
            </Link>
          )}

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            title={collapsed ? 'تسجيل الخروج' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-blue-300/70 hover:text-red-300 hover:bg-red-900/40 transition-all group ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="text-base group-hover:rotate-12 transition-transform">🚪</span>
            {!collapsed && 'تسجيل الخروج'}
          </button>
        </div>
      </div>
    </aside>
  );
}
