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
    href: '/dashboard/leaders',
    label: 'دليل القادة',
    icon: '👔',
    description: 'مديري المدارس والتواصل',
  },
  {
    href: '/dashboard/analytics',
    label: 'مركز التحليلات',
    icon: '📈',
    exact: true,
    description: 'إحصاءات الطلاب',
  },
  {
    href: '/dashboard/analytics/staff',
    label: 'تقارير العاملين',
    icon: '👥',
    description: 'العجز والزيادة',
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 right-4 z-40 p-2 bg-blue-900 text-white rounded-xl shadow-lg hover:bg-blue-800 transition-colors"
      >
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed md:sticky top-0 right-0 h-screen z-50 shrink-0
        transition-all duration-300 ease-in-out flex flex-col
        ${collapsed ? 'md:w-[72px]' : 'md:w-72'}
        ${mobileOpen ? 'translate-x-0 w-72' : 'translate-x-full md:translate-x-0'}
      `}>
        {/* Background gradient */}
        <div className="flex flex-col flex-1 bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-950 text-white shadow-[0_0_20px_rgba(0,0,0,0.3)] md:shadow-xl z-20">

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
          
          {/* Desktop Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1.5 rounded-lg hover:bg-blue-700/50 transition-colors text-blue-300 hover:text-white shrink-0"
            title={collapsed ? 'توسيع' : 'طي'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>

          {/* Mobile Close Button */}
          <button 
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-white shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                onClick={() => setMobileOpen(false)}
                title={collapsed ? link.label : link.description}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group
                  ${active
                    ? 'bg-white/15 text-white shadow-lg backdrop-blur border border-white/10'
                    : 'text-blue-200/80 hover:text-white hover:bg-white/5'}
                  ${collapsed ? 'md:justify-center' : ''}
                `}
              >
                <span className={`text-base transition-transform group-hover:scale-110 ${collapsed ? '' : 'w-6 text-center'}`}>{link.icon}</span>
                <div className={`flex-1 min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
                  <span className="block">{link.label}</span>
                  {active && link.description && (
                    <span className="text-[9px] text-blue-300/70 block mt-0.5">{link.description}</span>
                  )}
                </div>
                {active && (
                  <div className={`w-1.5 h-6 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)] ${collapsed ? 'md:hidden' : ''}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-blue-700/30 space-y-2 bg-blue-950/20">
          {/* Quick Action */}
          <Link
            href="/dashboard/schools/new"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-blue-200/70 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'md:hidden' : ''}`}
          >
            <span className="text-sm">➕</span>
            إضافة مدرسة جديدة
          </Link>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            title={collapsed ? 'تسجيل الخروج' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-blue-300/70 hover:text-red-300 hover:bg-red-900/40 transition-all group ${collapsed ? 'md:justify-center' : ''}`}
          >
            <span className="text-base group-hover:rotate-12 transition-transform">🚪</span>
            <span className={collapsed ? 'md:hidden' : ''}>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
