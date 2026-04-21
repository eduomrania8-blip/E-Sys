'use client';
// src/app/dashboard/upload/page.tsx
// نظام رفع مرن: كل ورقة (Sheet) تُرفع منفردة أو مجمّعة حسب الاختيار

import React, { useState, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// تعريف أنواع الأوراق المدعومة
const SHEET_TYPES = [
  {
    id: 'basic',
    label: 'البيانات الأساسية للمدرسة',
    description: 'اسم المدرسة، الكود، النوع، العنوان، التواصل',
    icon: '🏫',
    color: 'blue',
    tables: ['schools'],
  },
  {
    id: 'leaders',
    label: 'القيادات المدرسية',
    description: 'المدير، الوكلاء، مسؤول الإحصاء، القرائية، التدريب، رئيس الكنترول',
    icon: '👤',
    color: 'purple',
    tables: ['school_leaders'],
  },
  {
    id: 'stats',
    label: 'إحصاءات الصفوف',
    description: 'عدد الفصول، البنين، البنات، الدمج، الوافدين لكل صف دراسي',
    icon: '📊',
    color: 'green',
    tables: ['class_statistics'],
  },
  {
    id: 'low_performers',
    label: 'كشف الضعاف',
    description: 'أسماء الطلاب ضعيفي التحصيل مع الصف والفصل',
    icon: '📋',
    color: 'orange',
    tables: ['low_performer_students'],
  },
  {
    id: 'inclusion',
    label: 'كشف الدمج',
    description: 'أسماء طلاب الدمج مع نوع الإعاقة (ذهني/سمعي/بصري/حركي/متعدد)',
    icon: '♿',
    color: 'teal',
    tables: ['inclusion_students_list'],
  },
  {
    id: 'expatriates',
    label: 'كشف الوافدين',
    description: 'أسماء الطلاب الوافدين مع الجنسية ورقم الجواز',
    icon: '🌍',
    color: 'cyan',
    tables: ['expatriate_students_list'],
  },
  {
    id: 'refugees',
    label: 'كشف اللاجئين',
    description: 'أسماء الطلاب اللاجئين مع التصنيف (سوري/فلسطيني/سوداني...)',
    icon: '🛡️',
    color: 'red',
    tables: ['refugee_students_list'],
  },
  {
    id: 'building',
    label: 'بيانات المبنى',
    description: 'الفصول، المعامل، دورات المياه، الكاميرات، الإنترنت، السور',
    icon: '🏗️',
    color: 'gray',
    tables: ['school_buildings'],
  },
  {
    id: 'staff',
    label: 'بيانات العاملين',
    description: 'المعلمون، الإداريون، العمال مع بيانات الكادر وحالة العمل',
    icon: '👥',
    color: 'indigo',
    tables: ['school_staff'],
  },
] as const;

type SheetId = (typeof SHEET_TYPES)[number]['id'];

interface UploadResult {
  sheetId: SheetId;
  label: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  count?: number;
}

const colorMap: Record<string, { border: string; bg: string; text: string; check: string }> = {
  blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700',   check: 'accent-blue-600'   },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', check: 'accent-purple-600' },
  green:  { border: 'border-green-200',  bg: 'bg-green-50',  text: 'text-green-700',  check: 'accent-green-600'  },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', check: 'accent-orange-600' },
  teal:   { border: 'border-teal-200',   bg: 'bg-teal-50',   text: 'text-teal-700',   check: 'accent-teal-600'   },
  cyan:   { border: 'border-cyan-200',   bg: 'bg-cyan-50',   text: 'text-cyan-700',   check: 'accent-cyan-600'   },
  red:    { border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-700',    check: 'accent-red-600'    },
  gray:   { border: 'border-gray-200',   bg: 'bg-gray-50',   text: 'text-gray-700',   check: 'accent-gray-600'   },
  indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-700', check: 'accent-indigo-600' },
};

export default function UploadPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fileRef  = useRef<HTMLInputElement>(null);
  const [file, setFile]             = useState<File | null>(null);
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedSheets, setSelectedSheets] = useState<Set<SheetId>>(new Set());
  const [uploading, setUploading]   = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [results, setResults]       = useState<UploadResult[]>([]);
  const [step, setStep]             = useState<'select' | 'result'>('select');

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

  const toggleSheet = (id: SheetId) =>
    setSelectedSheets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll   = () => setSelectedSheets(new Set(SHEET_TYPES.map(s => s.id)));
  const clearAll    = () => setSelectedSheets(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f);
  };

  const handleUpload = async () => {
    if (!file)                     return alert('يرجى اختيار ملف Excel أولاً');
    if (!schoolCode.trim())        return alert('يرجى إدخال كود المدرسة');
    if (selectedSheets.size === 0) return alert('يرجى اختيار ورقة واحدة على الأقل');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('school_code', schoolCode.trim());
      formData.append('sheets', JSON.stringify([...selectedSheets]));

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? 'فشل الرفع');

      setResults(json.results ?? []);
      setStep('result');
    } catch (err: any) {
      alert(`❌ خطأ: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setSchoolCode('');
    setSelectedSheets(new Set());
    setResults([]);
    setStep('select');
    if (fileRef.current) fileRef.current.value = '';
  };

  if (step === 'result') {
    const ok    = results.filter(r => r.status === 'success').length;
    const errs  = results.filter(r => r.status === 'error').length;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in" dir="rtl">
        <header>
          <h1 className="text-3xl font-black text-gray-900">نتائج الرفع</h1>
        </header>
        <div className={`p-5 rounded-2xl border font-bold text-sm flex items-center gap-3 ${errs > 0 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
          <span className="text-2xl">{errs > 0 ? '⚠️' : '✅'}</span>
          {ok} ورقة بنجاح{errs > 0 && ` — ${errs} بها أخطاء`}
        </div>
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.sheetId} className={`p-4 rounded-xl border ${r.status === 'success' ? 'border-green-100 bg-green-50' : r.status === 'error' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-gray-900">{r.label}</p>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  r.status === 'success' ? 'badge-success' :
                  r.status === 'error'   ? 'badge-danger'  : 'badge-neutral'
                }`}>
                  {r.status === 'success' ? '✓ نجح' : r.status === 'error' ? '✗ خطأ' : '— تخطى'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{r.message}</p>
              {r.count != null && <p className="text-xs font-black text-green-600 mt-1">تم معالجة {r.count} صف</p>}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="btn-primary">رفع ملف آخر</button>
          <a href="/dashboard/schools" className="btn-secondary">العودة لدليل المدارس</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in" dir="rtl">
      <header>
        <h1 className="text-3xl font-black text-gray-900">رفع بيانات المدرسة</h1>
        <p className="text-gray-500 mt-1">اختر الأوراق التي تريد تحديثها — يمكن رفع ورقة واحدة أو أكثر بحرية</p>
      </header>

      {/* Template Download */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl shrink-0">📥</div>
          <div>
            <p className="font-black text-emerald-900">قالب Excel الموحّد</p>
            <p className="text-xs text-emerald-700 mt-1 max-w-md">حمّل القالب الجاهز بكل الأوراق المطلوبة (إحصاءات، ضعاف، دمج، وافدين، لاجئين، قيادات، مبنى، عاملون) مع قائمة المدارس وأكوادها</p>
          </div>
        </div>
        <button
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 shrink-0"
        >
          {isDownloading ? '⏳ جاري الإعداد...' : '📥 تحميل القالب'}
        </button>
      </div>

      {/* Step 1: School Code */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">1</span>
          كود المدرسة
        </h2>
        <input
          value={schoolCode}
          onChange={e => setSchoolCode(e.target.value)}
          placeholder="أدخل الكود الوزاري للمدرسة (مثال: 21030101)"
          className="input max-w-sm"
        />
      </section>

      {/* Step 2: File Upload */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">2</span>
          ملف Excel
        </h2>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}
          `}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
          {file ? (
            <div>
              <p className="text-4xl mb-2">📄</p>
              <p className="font-black text-green-700">{file.name}</p>
              <p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(1)} KB — انقر لتغيير الملف</p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-3">⬆️</p>
              <p className="font-bold text-gray-700">اسحب وأفلت ملف Excel هنا</p>
              <p className="text-sm text-gray-400 mt-1">أو انقر للاختيار — يدعم .xlsx و .xls</p>
            </div>
          )}
        </div>
      </section>

      {/* Step 3: Sheet Selection */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">3</span>
            اختر الأوراق التي تريد رفعها
          </h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs font-bold text-blue-600 hover:underline">اختيار الكل</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-xs font-bold text-gray-500 hover:underline">إلغاء الكل</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHEET_TYPES.map((sheet) => {
            const selected = selectedSheets.has(sheet.id);
            const c = colorMap[sheet.color] ?? colorMap.gray;
            return (
              <label
                key={sheet.id}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${selected ? `${c.border} ${c.bg}` : 'border-gray-100 hover:border-gray-200'}
                `}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSheet(sheet.id)}
                  className={`mt-0.5 w-4 h-4 rounded ${c.check}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{sheet.icon}</span>
                    <p className={`text-sm font-black ${selected ? c.text : 'text-gray-800'}`}>{sheet.label}</p>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{sheet.description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {selectedSheets.size > 0 && (
          <p className="mt-4 text-sm font-bold text-blue-700 bg-blue-50 rounded-xl px-4 py-2">
            ✓ تم اختيار {selectedSheets.size} {selectedSheets.size === 1 ? 'ورقة' : 'أوراق'} للرفع
          </p>
        )}
      </section>

      {/* Upload Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleUpload}
          disabled={uploading || !file || !schoolCode || selectedSheets.size === 0}
          className="btn-primary flex items-center gap-2 text-base py-3 px-8 disabled:opacity-40"
        >
          {uploading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              جاري الرفع...
            </>
          ) : (
            <>⬆️ رفع البيانات</>
          )}
        </button>
        {(file || schoolCode || selectedSheets.size > 0) && (
          <button onClick={reset} className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors">
            إعادة تعيين
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
        <span className="text-xl shrink-0">💡</span>
        <div>
          <p className="font-black text-blue-900 text-sm mb-1">تعليمات الرفع</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside font-medium">
            <li>يمكن رفع ورقة واحدة أو عدة أوراق في نفس الملف — لا يشترط وجود كل الأوراق</li>
            <li>يجب أن تحتوي كل ورقة على <strong>كود المدرسة</strong> في الخلية المخصصة</li>
            <li>سيتم التحقق من صحة البيانات قبل حفظها نهائياً</li>
            <li>البيانات الموجودة مسبقاً سيتم تحديثها (Upsert) وليس مضاعفتها</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
