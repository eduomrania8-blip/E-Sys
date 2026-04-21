'use client';
// src/app/dashboard/schools/new/page.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const SCHOOL_TYPES = ['رسمية', 'رسمية لغات', 'خاصة', 'خاصة لغات', 'دولية', 'فنية'];
const STAGES = ['ابتدائي', 'اعدادي', 'ثانوي', 'تعليم اساسي', 'تعليم مجتمعي'];

export default function NewSchoolPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [administrations, setAdministrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    school_code:       '',
    school_name_ar:    '',
    school_type:       'رسمية',
    educational_stage: 'ابتدائي',
    administration_id: '',
    address:           '',
    phone:             '',
    email:             '',
    established_year:  '',
  });

  useEffect(() => {
    supabase.from('educational_administrations').select('id, name_ar').order('name_ar')
      .then(({ data }) => setAdministrations(data ?? []));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_code.trim()) return setError('كود المدرسة مطلوب');
    if (!form.school_name_ar.trim()) return setError('اسم المدرسة مطلوب');
    if (!form.administration_id) return setError('يرجى اختيار الإدارة التعليمية');

    setLoading(true);
    try {
      // التحقق من عدم تكرار الكود
      const { data: existing } = await supabase
        .from('schools')
        .select('id')
        .eq('school_code', form.school_code.trim())
        .single();

      if (existing) throw new Error(`كود المدرسة "${form.school_code}" مستخدم بالفعل`);

      const { data, error: insertError } = await supabase
        .from('schools')
        .insert({
          school_code:       form.school_code.trim(),
          school_name_ar:    form.school_name_ar.trim(),
          school_type:       form.school_type,
          educational_stage: form.educational_stage,
          administration_id: form.administration_id,
          address:           form.address || null,
          phone:             form.phone || null,
          email:             form.email || null,
          established_year:  form.established_year ? Number(form.established_year) : null,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/schools/${data.id}`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <header>
        <nav className="flex items-center gap-2 text-sm text-gray-500 font-bold mb-4">
          <a href="/dashboard/schools" className="hover:text-blue-600">دليل المدارس</a>
          <span>/</span>
          <span className="text-gray-900">إضافة مدرسة جديدة</span>
        </nav>
        <h1 className="text-3xl font-black text-gray-900">إضافة مدرسة جديدة</h1>
        <p className="text-gray-500 mt-1">أدخل البيانات الأساسية للمدرسة</p>
      </header>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-green-800 font-bold flex items-center gap-3">
          <span className="text-2xl">✅</span>
          تم إضافة المدرسة بنجاح! جاري الانتقال لصفحة المدرسة...
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Section 1: البيانات الأساسية */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">1</span>
            البيانات الأساسية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="كود المدرسة الوزاري *" required>
              <input
                name="school_code"
                value={form.school_code}
                onChange={handleChange}
                placeholder="مثال: 21030101"
                className="input"
                required
              />
            </Field>
            <Field label="اسم المدرسة بالعربية *" required>
              <input
                name="school_name_ar"
                value={form.school_name_ar}
                onChange={handleChange}
                placeholder="مثال: مدرسة الأندلس الابتدائية"
                className="input"
                required
              />
            </Field>
            <Field label="نوع المدرسة">
              <select name="school_type" value={form.school_type} onChange={handleChange} className="input">
                {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="المرحلة الدراسية">
              <select name="educational_stage" value={form.educational_stage} onChange={handleChange} className="input">
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="الإدارة التعليمية *" className="md:col-span-2">
              <select name="administration_id" value={form.administration_id} onChange={handleChange} className="input" required>
                <option value="">-- اختر الإدارة --</option>
                {administrations.map(a => (
                  <option key={a.id} value={a.id}>{a.name_ar}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Section 2: بيانات التواصل */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">2</span>
            بيانات التواصل والموقع
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="عنوان المدرسة" className="md:col-span-2">
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="مثال: شارع الهرم، العمرانية، الجيزة"
                className="input"
              />
            </Field>
            <Field label="رقم التليفون">
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="02-xxxxxxxx"
                className="input"
                type="tel"
              />
            </Field>
            <Field label="البريد الإلكتروني">
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="school@edu.eg"
                className="input"
                type="email"
              />
            </Field>
            <Field label="سنة التأسيس">
              <input
                name="established_year"
                value={form.established_year}
                onChange={handleChange}
                placeholder="مثال: 1985"
                className="input"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
              />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 flex items-center justify-between gap-4">
          {error && (
            <p className="text-red-600 text-sm font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
              ⚠️ {error}
            </p>
          )}
          <div className="flex gap-3 mr-auto">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-8 py-2.5 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl transition-all shadow-lg shadow-blue-200"
            >
              {loading ? '⏳ جاري الحفظ...' : '+ إضافة المدرسة'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, required, className }: any) {
  return (
    <div className={className}>
      <label className="block text-sm font-bold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
