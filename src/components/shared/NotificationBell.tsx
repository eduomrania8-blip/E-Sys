'use client';
// src/components/shared/NotificationBell.tsx
// جرس الإشعارات — يعرض آخر 5 إشعارات + عداد غير المقروء

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('system_notifications')
      .select('id, type, title, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll كل 60 ثانية
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  // إغلاق عند النقر خارج القائمة
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('system_notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'density_alert': return '⚠️';
      case 'missing_data': return '📋';
      case 'visit_reminder': return '🗓️';
      case 'upload_success': return '✅';
      default: return '🔔';
    }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `${mins} د`;
    if (mins < 1440) return `${Math.floor(mins / 60)} س`;
    return `${Math.floor(mins / 1440)} ي`;
  };

  return (
    <div className="relative" ref={ref} dir="rtl">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-400 hover:text-blue-600 transition-all rounded-full hover:bg-blue-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
            <h3 className="font-black text-sm text-gray-900">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-bold text-blue-600 hover:underline">
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length > 0 ? notifications.slice(0, 5).map(n => (
              <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30 border-r-2 border-blue-500' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-600'} truncate`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 font-bold shrink-0">{timeAgo(n.created_at)}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-300">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-xs font-bold">لا توجد إشعارات</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
