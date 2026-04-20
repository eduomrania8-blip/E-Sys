'use client';
// src/components/school/SchoolDashboard.tsx

import { useState } from 'react';
import type { SessionUser } from '@/types';
import SchoolUpload from './SchoolUpload';
import SchoolView from './SchoolView';

type Tab = 'upload' | 'view';

export default function SchoolDashboard({ session }: { session: SessionUser }) {
  const [tab, setTab] = useState<Tab>('upload');
  const [refreshKey, setRefreshKey] = useState(0);

  function onUploaded() {
    setRefreshKey((k) => k + 1);
    setTab('view');
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6">
      {/* School info banner */}
      <div className="bg-gradient-to-l from-brand to-navy text-white rounded-2xl p-5 mb-5 shadow-lg">
        <h2 className="text-lg font-bold">{session.schoolName}</h2>
        <p className="text-sm text-white/80 mt-0.5">كود الدخول: {session.schoolCode}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-xs bg-white/15 px-3 py-1 rounded-full">النوعية: {session.schoolType}</span>
          <span className="text-xs bg-white/15 px-3 py-1 rounded-full">المرحلة الابتدائية</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1.5 mb-5">
        {([['upload', '📤 رفع الكشف'], ['view', '📋 عرض الكشف']] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === id ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' && <SchoolUpload onUploaded={onUploaded} />}
      {tab === 'view' && <SchoolView key={refreshKey} session={session} />}
    </main>
  );
}
