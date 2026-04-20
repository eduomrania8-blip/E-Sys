'use client';
// src/components/admin/AdminDashboard.tsx

import { useState } from 'react';
import AdminOverview from './AdminOverview';
import AdminStudents from './AdminStudents';
import AdminSchools from './AdminSchools';
import AdminAddSchool from './AdminAddSchool';

type Tab = 'overview' | 'students' | 'schools' | 'add';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '📊 نظرة عامة' },
  { id: 'students', label: '👥 جميع الطلاب' },
  { id: 'schools', label: '🏫 المدارس' },
  { id: 'add', label: '➕ إضافة مدرسة' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Tab bar */}
      <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1.5 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AdminOverview onNavigate={setTab} />}
      {tab === 'students' && <AdminStudents />}
      {tab === 'schools' && <AdminSchools />}
      {tab === 'add' && <AdminAddSchool />}
    </main>
  );
}
