'use client';
// src/components/admin/AdminStudents.tsx

import { useState, useEffect, useCallback } from 'react';
import { Badge, Spinner, EmptyState, Pagination } from '@/components/ui';

interface StudentRow {
  id: string;
  name: string;
  grade: string | null;
  class_room: string | null;
  school_name: string;
  school_type: string;
  district: string;
  created_at: string;
}

interface PageData {
  items: StudentRow[];
  total: number;
  totalPages: number;
  page: number;
}

export default function AdminStudents() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [type, setType] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/schools').then((r) => r.json()).then((s) => setSchools(Array.isArray(s) ? s : []));
  }, []);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (search) params.set('search', search);
    if (schoolId) params.set('schoolId', schoolId);
    if (type) params.set('type', type);
    if (grade) params.set('grade', grade);
    const res = await fetch(`/api/students?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, schoolId, type, grade]);

  useEffect(() => { load(1); setPage(1); }, [search, schoolId, type, grade, load]);
  useEffect(() => { load(page); }, [page, load]);

  function exportExcel() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (schoolId) params.set('schoolId', schoolId);
    if (type) params.set('type', type);
    if (grade) params.set('grade', grade);
    window.location.href = `/api/export?${params}`;
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">اسم الطالب</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">المدرسة</label>
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand">
              <option value="">الكل</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">النوعية</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand">
              <option value="">الكل</option>
              {['رسمي','رسمي لغات','خاص','خاص لغات','دولي','ثقافي'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">الصف</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand">
              <option value="">الكل</option>
              {['الأول','الثاني','الثالث','الرابع','الخامس','السادس'].map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">إجمالي: <strong>{data?.total?.toLocaleString('ar-EG') ?? '...'}</strong> طالب</span>
          <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
            ⬇️ تصدير Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : !data?.items.length ? (
          <EmptyState icon="🔍" message="لا توجد سجلات مطابقة للبحث" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-100">
                    <th className="px-3 py-2.5 font-semibold text-gray-500">#</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">اسم التلميذ رباعياً</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">الصف</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">الفصل</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">المدرسة</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">الإدارة</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">النوعية</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s, i) => (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-gray-400">{((page - 1) * 20) + i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-navy">{s.name}</td>
                      <td className="px-3 py-2">{s.grade ?? '-'}</td>
                      <td className="px-3 py-2">{s.class_room ?? '-'}</td>
                      <td className="px-3 py-2">{s.school_name}</td>
                      <td className="px-3 py-2 text-gray-500">{s.district || '-'}</td>
                      <td className="px-3 py-2"><Badge type={s.school_type} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
