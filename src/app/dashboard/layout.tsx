// src/app/dashboard/layout.tsx
import React from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import NotificationBell from '@/components/shared/NotificationBell';
import AIInsightsPanel from '@/components/shared/AIInsightsPanel';
import GlobalSearch from '@/components/shared/GlobalSearch';
import UserGreeting from '@/components/shared/UserGreeting';
import LogoutButton from '@/components/shared/LogoutButton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Top Actions Bar */}
        <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur border-b border-gray-100 px-8 py-3 flex justify-between items-center gap-4">
          {/* Right side: Search */}
          <GlobalSearch />
          
          {/* Left side: Greeting + Actions */}
          <div className="flex items-center gap-3">
            <UserGreeting />
            <div className="h-6 w-px bg-gray-200" />
            <AIInsightsPanel />
            <NotificationBell />
            <div className="h-6 w-px bg-gray-200" />
            <LogoutButton />
          </div>
        </div>
        <div className="p-8 max-w-screen-xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
