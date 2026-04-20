'use client';
// src/components/school/SchoolUpload.tsx

import { useState, useRef, useCallback } from 'react';
import { Alert, Spinner } from '@/components/ui';

interface PreviewData {
  header: { district: string; schoolName: string; address: string };
  students: { rowNum: number; name: string; grade: string; classRoom: string }[];
  totalCount: number;
}

export default function SchoolUpload({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setStatus({ text: 'يُقبل فقط ملفات Excel (.xlsx أو .xls)', type: 'error' });
      return;
    }
    setLoading(true);
    setStatus(null);
    setPreviewData(null);

    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/upload', { method: 'PUT', body: fd });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setStatus({ text: data.error ?? 'فشل في قراءة الملف', type: 'error' });
      return;
    }
    setPendingFile(file);
    setPreviewData(data);
    setStatus({ text: `✅ تم قراءة "${file.name}" — ${data.totalCount} طالب`, type: 'success' });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  async function confirmSave() {
    if (!pendingFile) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('file', pendingFile);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus({ text: data.error ?? 'فشل في الحفظ', type: 'error' });
      return;
    }
    setStatus({ text: `✅ تم حفظ ${data.count} طالب بنجاح!`, type: 'success' });
    setPreviewData(null);
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setTimeout(onUploaded, 800);
  }

  function cancelPreview() {
    setPreviewData(null);
    setPendingFile(null);
    setStatus(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
        <p className="font-bold mb-2">📌 تنسيق ملف Excel المطلوب:</p>
        <div className="grid md:grid-cols-2 gap-1 text-xs leading-6">
          <div>
            <span className="font-semibold">السطر 1:</span> الإدارة: [اسم الإدارة]<br />
            <span className="font-semibold">السطر 2:</span> المدرسة: [اسم المدرسة]<br />
            <span className="font-semibold">السطر 3:</span> العنوان: [العنوان]
          </div>
          <div>
            <span className="font-semibold">رأس الجدول:</span> م | اسم التلميذ رباعياً | الصف | الفصل<br />
            <span className="font-semibold">ثم:</span> بيانات الطلاب في الصفوف التالية
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b border-gray-100">📂 رفع كشف الطلاب الضعاف</h2>

        {status && <div className="mb-4"><Alert message={status.text} type={status.type} onClose={() => setStatus(null)} /></div>}

        {!previewData && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragging ? 'border-brand bg-brand/5 scale-[1.01]' : 'border-gray-300 hover:border-brand hover:bg-gray-50'
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-gray-500">جاري قراءة الملف...</p>
              </div>
            ) : (
              <>
                <div className="text-5xl mb-3">📊</div>
                <h3 className="text-base font-bold text-navy">اضغط لاختيار ملف Excel أو اسحبه هنا</h3>
                <p className="text-xs text-gray-400 mt-2">يدعم ملفات .xlsx و .xls</p>
              </>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        />
      </div>

      {/* Preview */}
      {previewData && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b border-gray-100">👁️ معاينة البيانات قبل الحفظ</h2>

          {/* Header info */}
          <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 mb-4 text-sm">
            <div className="flex flex-wrap gap-4">
              <span><strong>الإدارة:</strong> {previewData.header.district || '—'}</span>
              <span><strong>المدرسة:</strong> {previewData.header.schoolName || '—'}</span>
              <span><strong>العنوان:</strong> {previewData.header.address || '—'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">
              معاينة أول 50 طالب من <strong>{previewData.totalCount}</strong> طالب
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmSave}
                disabled={saving}
                className="bg-brand hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {saving ? <><Spinner size="sm" /> جاري الحفظ...</> : '✅ حفظ الكشف'}
              </button>
              <button
                onClick={cancelPreview}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                ❌ إلغاء
              </button>
            </div>
          </div>

          <div className="overflow-auto max-h-72 rounded-lg border border-gray-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 font-semibold text-gray-500 border-b border-gray-200">م</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-500 border-b border-gray-200">اسم التلميذ رباعياً</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-500 border-b border-gray-200">الصف</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-500 border-b border-gray-200">الفصل</th>
                </tr>
              </thead>
              <tbody>
                {previewData.students.map((s) => (
                  <tr key={s.rowNum} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-400">{s.rowNum}</td>
                    <td className="px-3 py-2 font-semibold text-navy">{s.name}</td>
                    <td className="px-3 py-2">{s.grade}</td>
                    <td className="px-3 py-2">{s.classRoom}</td>
                  </tr>
                ))}
                {previewData.totalCount > 50 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-xs text-gray-400 italic bg-gray-50">
                      ... و {previewData.totalCount - 50} طالب آخر لم يُعرض
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
