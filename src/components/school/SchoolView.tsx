'use client';
// src/components/school/SchoolView.tsx

import { useState, useEffect, useCallback } from 'react';
import { Spinner, EmptyState, Pagination, Alert } from '@/components/ui';
import type { SessionUser } from '@/types';

interface UploadMeta {
  district: string | null;
  school_name_snapshot: string | null;
  address_snapshot: string | null;
  uploaded_at: string;
}

interface StudentRow {
  id: string;
  name: string;
  grade: string | null;
  class_room: string | null;
  row_num: number | null;
}

interface PageData {
  items: StudentRow[];
  total: number;
  totalPages: number;
  page: number;
}

export default function SchoolView({ session }: { session: SessionUser }) {
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);

  // Load upload metadata
  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then((d) => {
      setHasData(!!d.upload);
      setUploadMeta(d.upload ?? null);
    });
  }, []);

  const loadStudents = useCallback(async (p = 1) => {
    if (hasData === false) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (search) params.set('search', search);
    if (grade) params.set('grade', grade);
    const res = await fetch(`/api/students?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [search, grade, hasData]);

  useEffect(() => { if (hasData !== null) { setPage(1); loadStudents(1); } }, [search, grade, hasData, loadStudents]);
  useEffect(() => { if (hasData !== null) loadStudents(page); }, [page, loadStudents, hasData]);

  async function handleDelete() {
    if (!confirm('حذف الكشف المرفوع نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    setDeleting(true);
    const res = await fetch('/api/school/data', { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) {
      setHasData(false);
      setUploadMeta(null);
      setData(null);
      setMsg({ text: '🗑️ تم حذف الكشف بنجاح', type: 'success' });
    } else {
      const d = await res.json();
      setMsg({ text: d.error ?? 'فشل الحذف', type: 'error' });
    }
  }

  function exportExcel() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (grade) params.set('grade', grade);
    window.location.href = `/api/export?${params}`;
  }

  // No data state
  if (hasData === false) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {msg && <div className="mb-4"><Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} /></div>}
        <EmptyState icon="📭" message="لم يتم رفع أي كشف بعد — ارفع ملف Excel من تبويب رفع الكشف" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && <Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} />}

      {/* Header metadata card */}
      {uploadMeta && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-navy mb-3 pb-3 border-b border-gray-100">📋 بيانات الترويسة</h2>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            {[
              ['الإدارة', uploadMeta.district],
              ['المدرسة', uploadMeta.school_name_snapshot ?? session.schoolName],
              ['العنوان', uploadMeta.address_snapshot],
              ['تاريخ الرفع', uploadMeta.uploaded_at ? new Date(uploadMeta.uploaded_at).toLocaleDateString('ar-EG') : null],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-gray-400 font-semibold min-w-[70px] text-xs">{label}:</span>
                <span className="font-semibold text-navy text-xs">{value || '—'}</span>
              </div>
            ))}
          </div>
          {data && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-2xl font-bold text-brand">{data.total.toLocaleString('ar-EG')}</span>
              <span className="text-xs text-gray-500 mr-1.5">طالب في الكشف</span>
            </div>
          )}
        </div>
      )}

      {/* Students table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b border-gray-100">👥 بيانات الطلاب</h2>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">بحث بالاسم</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الطالب..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand w-44"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">الصف</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand w-32">
              <option value="">الكل</option>
              {['الأول','الثاني','الثالث','الرابع','الخامس','السادس'].map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mr-auto">
            <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
              ⬇️ تصدير Excel
            </button>
            <button onClick={handleDelete} disabled={deleting} className="border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors">
              {deleting ? '...' : '🗑️ حذف الكشف'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : !data?.items.length ? (
          <EmptyState icon="🔍" message="لا توجد نتائج مطابقة للبحث" />
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">عرض {data.items.length} من {data.total} طالب</p>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">م</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">اسم التلميذ رباعياً</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">الصف</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-500">الفصل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s, i) => (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-gray-400">{((page - 1) * 20) + i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-navy">{s.name}</td>
                      <td className="px-3 py-2.5">{s.grade ?? '-'}</td>
                      <td className="px-3 py-2.5">{s.class_room ?? '-'}</td>
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
