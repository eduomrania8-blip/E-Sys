'use client';
// src/app/school/upload/page.tsx
// صفحة رفع بيانات خاصة بمدير المدرسة — مع معاينة قبل الحفظ

import React, { useState, useRef, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const SHEET_TYPES = [
  { id: 'stats',          label: 'إحصاءات الصفوف',     icon: '📊', description: 'الفصول، البنين، البنات، الدمج لكل صف' },
  { id: 'low_performers', label: 'كشف الضعاف',         icon: '📋', description: 'أسماء الطلاب ضعيفي التحصيل' },
  { id: 'inclusion',      label: 'كشف الدمج',          icon: '♿', description: 'طلاب الدمج مع نوع الإعاقة' },
  { id: 'expatriates',    label: 'كشف الوافدين',       icon: '🌍', description: 'الطلاب الوافدين مع الجنسية' },
  { id: 'refugees',       label: 'كشف اللاجئين',       icon: '🛡️', description: 'الطلاب اللاجئين مع التصنيف' },
  { id: 'leaders',        label: 'القيادات',            icon: '👤', description: 'المدير والوكلاء والمسؤولون' },
  { id: 'building',       label: 'بيانات المبنى',       icon: '🏗️', description: 'الفصول، المعامل، الكاميرات' },
  { id: 'staff',          label: 'العاملون',            icon: '👥', description: 'المعلمون والإداريون والعمال' },
] as const;

type SheetId = (typeof SHEET_TYPES)[number]['id'];

export default function SchoolUploadPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<SheetId>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null); // بيانات المعاينة
  const [step, setStep] = useState<'form' | 'preview' | 'done'>('form');

  // جلب كود المدرسة تلقائياً
  useEffect(() => {
    const fetchCode = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: perm } = await supabase
        .from('user_school_permissions')
        .select('school_id')
        .eq('user_id', session.user.id)
        .not('school_id', 'is', null)
        .single();
      if (!perm) return;
      const { data: school } = await supabase
        .from('schools')
        .select('school_code')
        .eq('id', perm.school_id)
        .single();
      if (school) setSchoolCode(school.school_code);
    };
    fetchCode();
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch('/api/template');
      if (!res.ok) throw new Error('فشل التحميل');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_school_data.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('حدث خطأ أثناء تحميل القالب');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggle = (id: SheetId) =>
    setSelectedSheets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // الخطوة 1: استخراج البيانات ومعاينتها
  const handleExtract = async () => {
    if (!file) return alert('اختر ملف Excel أولاً');
    if (selectedSheets.size === 0) return alert('اختر ورقة واحدة على الأقل');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('school_code', schoolCode ?? '');
      formData.append('sheets', JSON.stringify([...selectedSheets]));
      formData.append('preview_only', 'true'); // طلب معاينة فقط

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'فشل الاستخراج');

      setPreview(json);
      setStep('preview');
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // الخطوة 2: تأكيد وحفظ البيانات
  const handleConfirmSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('school_code', schoolCode ?? '');
      formData.append('sheets', JSON.stringify([...selectedSheets]));
      // بدون preview_only = حفظ فعلي

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'فشل الحفظ');

      setResults(json.results ?? []);
      setStep('done');
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // الخطوة 3: عرض النتائج النهائية
  // ═══════════════════════════════════════════════════════
  if (step === 'done') {
    const ok      = results.filter((r: any) => r.status === 'success').length;
    const skipped = results.filter((r: any) => r.status === 'skipped').length;
    const failed  = results.filter((r: any) => r.status === 'error').length;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in" dir="rtl">
        <h1 className="text-2xl font-black text-gray-900">نتائج الرفع</h1>

        {/* ملخص */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
            <p className="text-3xl font-black text-emerald-600">{ok}</p>
            <p className="text-xs font-bold text-emerald-700 mt-1">ورقة تم حفظها</p>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <p className="text-3xl font-black text-amber-600">{skipped}</p>
            <p className="text-xs font-bold text-amber-700 mt-1">ورقة تم تخطيها</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
            <p className="text-3xl font-black text-red-600">{failed}</p>
            <p className="text-xs font-bold text-red-700 mt-1">ورقة فشلت</p>
          </div>
        </div>

        {/* التفاصيل */}
        <div className="space-y-3">
          {results.map((r: any) => {
            const colors = {
              success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
              error:   'bg-red-50 border-red-200 text-red-800',
              skipped: 'bg-amber-50 border-amber-200 text-amber-800',
            };
            const icons = { success: '✅', error: '❌', skipped: '⏭️' };
            return (
              <div key={r.sheetId} className={`p-4 rounded-2xl border ${colors[r.status as keyof typeof colors]}`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>{icons[r.status as keyof typeof icons]}</span>
                  <span>{r.label}</span>
                  {r.count > 0 && <span className="mr-auto text-xs bg-white/60 px-2 py-0.5 rounded-full">{r.count} صف</span>}
                </div>
                <p className="text-xs mt-1 opacity-80">{r.message}</p>
                {r.warnings?.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer font-bold opacity-70">⚠️ {r.warnings.length} تحذير (انقر للعرض)</summary>
                    <ul className="mt-1 space-y-1">
                      {r.warnings.map((w: string, i: number) => (
                        <li key={i} className="text-[11px] opacity-70 pr-2 border-r-2 border-current">• {w}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { setStep('form'); setFile(null); setSelectedSheets(new Set()); setResults([]); setPreview(null); }}
            className="btn-primary"
          >
            رفع ملف آخر
          </button>
          <a href="/school" className="btn-secondary">العودة للرئيسية</a>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // خطوة المعاينة — عرض البيانات المستخرجة قبل الحفظ
  // ═══════════════════════════════════════════════════════
  if (step === 'preview' && preview) {
    const previewResults = preview.results ?? [];
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in" dir="rtl">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">📋 معاينة البيانات</h1>
            <p className="text-sm text-gray-500 mt-1">راجع البيانات المستخرجة قبل الحفظ — الأخطاء مظللة بالأحمر</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setStep('form'); setPreview(null); }} className="btn-secondary text-sm">
              ← العودة للتعديل
            </button>
            <button onClick={handleConfirmSave} disabled={saving} className="btn-primary text-sm">
              {saving ? '⏳ جاري الحفظ...' : '✅ تأكيد وحفظ البيانات'}
            </button>
          </div>
        </header>

        {previewResults.map((r: any) => {
          if (r.status === 'skipped' || r.status === 'error') {
            return (
              <div key={r.sheetId} className="p-4 rounded-2xl border bg-amber-50 border-amber-200">
                <p className="font-bold text-sm text-amber-800">⏭️ {r.label}: {r.message}</p>
              </div>
            );
          }

          // إحصاءات الصفوف
          if (r.sheetId === 'stats' && r.preview) {
            return (
              <div key={r.sheetId} className="card p-5">
                <h2 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
                  📊 {r.label}
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{r.preview.length} صف</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center border-collapse">
                    <thead>
                      <tr className="bg-[#1e293b] text-white font-black text-xs">
                        <th className="p-2 border">الصف</th>
                        <th className="p-2 border">الفصول</th>
                        <th className="p-2 border">بنين</th>
                        <th className="p-2 border">بنات</th>
                        <th className="p-2 border">الإجمالي</th>
                        <th className="p-2 border">الكثافة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.preview.map((row: any, i: number) => {
                        const total = (row.boys_count || 0) + (row.girls_count || 0);
                        const density = row.number_of_classes > 0 ? Math.round(total / row.number_of_classes * 10) / 10 : 0;
                        const isHigh = density > 50;
                        return (
                          <tr key={i} className={`border-b ${isHigh ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="p-2 border font-bold text-right">{row.grade_level}</td>
                            <td className="p-2 border">{row.number_of_classes}</td>
                            <td className="p-2 border text-blue-600 font-bold">{row.boys_count}</td>
                            <td className="p-2 border text-pink-600 font-bold">{row.girls_count}</td>
                            <td className="p-2 border font-black">{total}</td>
                            <td className={`p-2 border font-black ${isHigh ? 'text-red-600' : 'text-emerald-600'}`}>{density}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-black text-xs">
                        <td className="p-2 border">الإجمالي</td>
                        <td className="p-2 border">{r.preview.reduce((a: number, row: any) => a + (row.number_of_classes || 0), 0)}</td>
                        <td className="p-2 border">{r.preview.reduce((a: number, row: any) => a + (row.boys_count || 0), 0)}</td>
                        <td className="p-2 border">{r.preview.reduce((a: number, row: any) => a + (row.girls_count || 0), 0)}</td>
                        <td className="p-2 border">{r.preview.reduce((a: number, row: any) => a + (row.boys_count || 0) + (row.girls_count || 0), 0)}</td>
                        <td className="p-2 border">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {r.warnings?.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 mb-1">⚠️ تحذيرات:</p>
                    {r.warnings.map((w: string, i: number) => (
                      <p key={i} className="text-[11px] text-amber-600">• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // كشوف الطلاب (ضعاف، دمج، وافدين، لاجئين) --- جدول عام
          if (['low_performers', 'inclusion', 'expatriates', 'refugees'].includes(r.sheetId) && r.preview) {
            return (
              <div key={r.sheetId} className="card p-5">
                <h2 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
                  {SHEET_TYPES.find(s => s.id === r.sheetId)?.icon} {r.label}
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{r.preview.length} طالب</span>
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-gray-100 font-black">
                        <th className="p-2 border">#</th>
                        <th className="p-2 border">الاسم</th>
                        <th className="p-2 border">الصف</th>
                        <th className="p-2 border">الفصل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.preview.slice(0, 20).map((row: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-1.5 border text-center">{i + 1}</td>
                          <td className="p-1.5 border font-bold">{row.student_full_name || '—'}</td>
                          <td className="p-1.5 border">{row.grade_level || '—'}</td>
                          <td className="p-1.5 border">{row.class_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {r.preview.length > 20 && (
                    <p className="text-xs text-gray-400 mt-2 text-center">... و {r.preview.length - 20} طالب آخر</p>
                  )}
                </div>
              </div>
            );
          }

          // قيادات أو عاملين أو مبنى — عرض JSON بسيط
          if (r.preview) {
            return (
              <div key={r.sheetId} className="card p-5">
                <h2 className="text-base font-black text-gray-900 mb-3 flex items-center gap-2">
                  {SHEET_TYPES.find(s => s.id === r.sheetId)?.icon} {r.label}
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ بيانات جاهزة</span>
                </h2>
                <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600 max-h-40 overflow-y-auto">
                  {Array.isArray(r.preview) ? `${r.preview.length} سجل` : 'بيانات جاهزة للحفظ'}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Sticky Save Bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 p-4 -mx-4 flex items-center justify-between gap-4 rounded-t-2xl shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 text-xl">📋</span>
            <div>
              <p className="text-sm font-black text-gray-900">
                {previewResults.filter((r: any) => r.status === 'success').length} ورقة جاهزة للحفظ
              </p>
              <p className="text-[11px] text-gray-400">راجع البيانات ثم اضغط "تأكيد وحفظ"</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setStep('form'); setPreview(null); }} className="btn-secondary text-sm py-2">إلغاء</button>
            <button onClick={handleConfirmSave} disabled={saving} className="btn-primary text-sm py-2 px-6">
              {saving ? '⏳ جاري الحفظ...' : '✅ تأكيد وحفظ'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // خطوة النموذج — اختيار الملف والأوراق
  // ═══════════════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in" dir="rtl">
      <header>
        <h1 className="text-2xl font-black text-gray-900">رفع بيانات المدرسة</h1>
        <p className="text-gray-500 mt-1 text-sm">كود المدرسة: <strong className="text-emerald-700">{schoolCode || '...'}</strong></p>
      </header>

      {/* Template Download */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📥</span>
          <div>
            <p className="font-black text-emerald-900 text-sm">حمّل القالب قبل البدء</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">ملف Excel جاهز بكل الأوراق المطلوبة + قائمة المدارس وأكوادها</p>
          </div>
        </div>
        <button 
          onClick={handleDownloadTemplate} 
          disabled={isDownloading}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-200 transition-all"
        >
          {isDownloading ? '⏳ جاري...' : '📥 تحميل القالب'}
        </button>
      </div>

      {/* File */}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
        onDragOver={e => e.preventDefault()}
        className={`card p-8 text-center cursor-pointer border-2 border-dashed transition-all ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-emerald-400'}`}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} className="hidden" />
        {file ? (
          <><p className="text-3xl mb-2">📄</p><p className="font-black text-green-700">{file.name}</p><p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(0)} KB</p></>
        ) : (
          <><p className="text-3xl mb-2">⬆️</p><p className="font-bold text-gray-600">اسحب ملف Excel هنا أو انقر للاختيار</p></>
        )}
      </div>

      {/* Sheets */}
      <section className="card p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-black text-gray-900">اختر البيانات المطلوب رفعها</h2>
          <button onClick={() => setSelectedSheets(new Set(SHEET_TYPES.map(s => s.id)))} className="text-xs font-bold text-emerald-600 hover:underline">الكل</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SHEET_TYPES.map(s => {
            const sel = selectedSheets.has(s.id);
            return (
              <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="checkbox" checked={sel} onChange={() => toggle(s.id)} className="accent-emerald-600 w-4 h-4" />
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${sel ? 'text-emerald-700' : 'text-gray-700'}`}>{s.label}</p>
                  <p className="text-[10px] text-gray-400">{s.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      <button
        onClick={handleExtract}
        disabled={uploading || !file || selectedSheets.size === 0}
        className="btn-primary py-3 px-8 text-base disabled:opacity-40 w-full sm:w-auto"
      >
        {uploading ? '⏳ جاري الاستخراج...' : `📋 معاينة ${selectedSheets.size} ورقة`}
      </button>
    </div>
  );
}
