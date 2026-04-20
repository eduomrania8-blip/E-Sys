'use client';
// src/components/admin/AdminSchools.tsx

import { useState, useEffect } from 'react';
import { Badge, Spinner, EmptyState } from '@/components/ui';
import type { SchoolWithStatus } from '@/types';

export default function AdminSchools() {
  const [schools, setSchools] = useState<SchoolWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/schools').then((r) => r.json()).then((s) => {
      setSchools(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`حذف مدرسة "${name}" وجميع بياناتها نهائياً؟`)) return;
    setDeleting(id);
    await fetch('/api/schools', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolId: id }) });
    setDeleting(null);
    load();
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b border-gray-100">🏫 المدارس المسجلة ({schools.length})</h2>
      {schools.length === 0 ? (
        <EmptyState icon="🏫" message="لا توجد مدارس مسجلة بعد" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100">
                <th className="px-3 py-2.5 font-semibold text-gray-500">الكود</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">اسم المدرسة</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">النوعية</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">الإدارة</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">الطلاب</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">آخر رفع</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">الكشف</th>
                <th className="px-3 py-2.5 font-semibold text-gray-500">حذف</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-2.5">
                    <code className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{s.code}</code>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-navy">{s.name}</td>
                  <td className="px-3 py-2.5"><Badge type={s.type} /></td>
                  <td className="px-3 py-2.5 text-gray-500">{s.district ?? '-'}</td>
                  <td className="px-3 py-2.5 font-bold text-brand">{s.studentCount.toLocaleString('ar-EG')}</td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {s.lastUpload ? new Date(s.lastUpload).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.uploadCount > 0
                      ? <span className="text-emerald-600 font-bold">✅ مرفوع</span>
                      : <span className="text-amber-600 font-bold">⏳ لم يُرفع</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      disabled={deleting === s.id}
                      className="text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      {deleting === s.id ? '...' : 'حذف'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
