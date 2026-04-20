'use client';
// src/components/admin/AdminOverview.tsx

import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { StatCard, Spinner, Badge, EmptyState } from '@/components/ui';
import type { AdminStats, SchoolWithStatus } from '@/types';

const TYPE_COLORS = ['#1a56db','#7c3aed','#db2777','#d97706','#057a55','#c81e1e'];

export default function AdminOverview({ onNavigate }: { onNavigate: (tab: 'students' | 'schools' | 'add') => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [schools, setSchools] = useState<SchoolWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/schools').then((r) => r.json()),
    ]).then(([s, sc]) => {
      setStats(s);
      setSchools(Array.isArray(sc) ? sc : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!stats) return null;

  const typeData = Object.entries(stats.byType).map(([name, value]) => ({ name, value }));
  const gradeData = Object.entries(stats.byGrade).map(([name, value]) => ({ name, value }));

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard num={stats.totalStudents.toLocaleString('ar-EG')} label="إجمالي الطلاب" accent="blue" />
        <StatCard num={stats.totalSchools} label="المدارس المسجلة" accent="green" />
        <StatCard num={stats.uploadedSchools} label="رفعت بياناتها" accent="amber" />
        <StatCard num={stats.pendingSchools} label="لم ترفع بعد" accent="red" />
      </div>

      {/* Charts row */}
      {typeData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-bold text-navy mb-3">توزيع الطلاب حسب النوعية</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-bold text-navy mb-3">توزيع الطلاب حسب الصف</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="value" fill="#1a56db" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Schools status table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-navy">🏫 حالة المدارس</h3>
          <button onClick={() => onNavigate('schools')} className="text-xs text-brand hover:underline">عرض الكل</button>
        </div>
        {schools.length === 0 ? (
          <EmptyState icon="🏫" message="لا توجد مدارس مسجلة. أضف مدارس من تبويب إضافة مدرسة." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 font-semibold text-gray-500">المدرسة</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">الكود</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">النوعية</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">الطلاب</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">آخر رفع</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold">{s.name}</td>
                    <td className="px-3 py-2"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{s.code}</code></td>
                    <td className="px-3 py-2"><Badge type={s.type} /></td>
                    <td className="px-3 py-2 font-bold text-brand">{s.studentCount.toLocaleString('ar-EG')}</td>
                    <td className="px-3 py-2 text-gray-500">{s.lastUpload ? new Date(s.lastUpload).toLocaleDateString('ar-EG') : '-'}</td>
                    <td className="px-3 py-2">
                      {s.uploadCount > 0
                        ? <span className="text-emerald-600 font-semibold">✅ مكتمل</span>
                        : <span className="text-amber-600 font-semibold">⏳ لم يُرفع</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
