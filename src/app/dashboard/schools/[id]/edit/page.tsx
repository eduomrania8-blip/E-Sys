'use client';
// src/app/dashboard/schools/[id]/edit/page.tsx
// صفحة تعديل بيانات المدرسة

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

const SCHOOL_TYPES = ['رسمية', 'رسمية لغات', 'خاصة', 'خاصة لغات', 'دولية', 'فنية'];
const STAGES = ['ابتدائي', 'اعدادي', 'ثانوي', 'تعليم اساسي', 'تعليم مجتمعي'];

export default function EditSchoolPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [administrations, setAdministrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    school_code: '',
    school_name_ar: '',
    school_type: '',
    educational_stage: '',
    administration_id: '',
    address: '',
    phone: '',
    email: '',
    established_year: '',
    is_active: true,
  });

  useEffect(() => {
    const loadData = async () => {
      const [schoolRes, admRes] = await Promise.all([
        supabase.from('schools').select('*').eq('id', params.id).single(),
        supabase.from('educational_administrations').select('id, name_ar').order('name_ar'),
      ]);

      if (schoolRes.data) {
        const s = schoolRes.data;
        setForm({
          school_code: s.school_code ?? '',
          school_name_ar: s.school_name_ar ?? '',
          school_type: s.school_type ?? '',
          educational_stage: s.educational_stage ?? '',
          administration_id: s.administration_id ?? '',
          address: s.address ?? '',
          phone: s.phone ?? '',
          email: s.email ?? '',
          established_year: s.established_year ? String(s.established_year) : '',
          is_active: s.is_active ?? true,
        });
      }

      setAdministrations(admRes.data ?? []);
      setLoading(false);
    };
    loadData();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_name_ar.trim()) return setError('اسم المدرسة مطلوب');
    if (!form.administration_id) return setError('يرجى اختيار الإدارة التعليمية');

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          school_name_ar: form.school_name_ar.trim(),
          school_type: form.school_type || null,
          educational_stage: form.educational_stage || null,
          administration_id: form.administration_id,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
          established_year: form.established_year ? Number(form.established_year) : null,
          is_active: form.is_active,
        })
        .eq('id', params.id);

      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/schools/${params.id}`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-bold text-gray-500">
        <Link href="/dashboard/schools" className="hover:text-blue-600 transition-colors">دليل المدارس</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/dashboard/schools/${params.id}`} className="hover:text-blue-600 transition-colors truncate max-w-[200px]">{form.school_name_ar}</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900">تعديل البيانات</span>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-l from-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-2xl font-black flex items-center gap-3">
          <span className="bg-white/15 p-2 rounded-xl">⚙️</span>
          تعديل بيانات المدرسة
        </h1>
        <p className="text-gray-400 mt-2 text-sm font-medium">
          كود: <span className="font-mono text-white">{form.school_code}</span>
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-800 font-bold flex items-center gap-3">
          <span className="text-2xl">✅</span>
          تم حفظ التعديلات بنجاح! جاري الانتقال لصفحة المدرسة...
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
            {/* كود المدرسة للقراءة فقط */}
            <Field label="كود المدرسة (لا يمكن تغييره)">
              <input value={form.school_code} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
            </Field>

            <Field label="اسم المدرسة بالعربية *" required>
              <input
                name="school_name_ar"
                value={form.school_name_ar}
                onChange={handleChange}
                className="input"
                required
              />
            </Field>

            <Field label="نوع المدرسة">
              <select name="school_type" value={form.school_type} onChange={handleChange} className="input">
                <option value="">-- اختر النوع --</option>
                {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="المرحلة الدراسية">
              <select name="educational_stage" value={form.educational_stage} onChange={handleChange} className="input">
                <option value="">-- اختر المرحلة --</option>
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
            <span className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs font-black">2</span>
            بيانات التواصل والموقع
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="عنوان المدرسة" className="md:col-span-2">
              <input name="address" value={form.address} onChange={handleChange} placeholder="شارع، حي، مدينة" className="input" />
            </Field>
            <Field label="رقم التليفون">
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="02-xxxxxxxx" className="input" type="tel" />
            </Field>
            <Field label="البريد الإلكتروني">
              <input name="email" value={form.email} onChange={handleChange} placeholder="school@edu.eg" className="input" type="email" />
            </Field>
            <Field label="سنة التأسيس">
              <input name="established_year" value={form.established_year} onChange={handleChange} placeholder="مثال: 1985" className="input" type="number" min="1900" max={new Date().getFullYear()} />
            </Field>
          </div>
        </div>

        {/* Section 3: حالة النشاط */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900 mb-5 flex items-center gap-2">
            <span className="w-7 h-7 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-xs font-black">3</span>
            حالة التشغيل
          </h2>
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className={`w-14 h-7 rounded-full relative transition-all ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'right-1' : 'left-1'}`} />
            </div>
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="sr-only" />
            <span className="font-black text-gray-900">
              المدرسة <span className={form.is_active ? 'text-emerald-600' : 'text-red-600'}>{form.is_active ? 'نشطة' : 'موقوفة'}</span>
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
          {error && (
            <p className="text-red-600 text-sm font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex-1">
              ⚠️ {error}
            </p>
          )}
          <div className="flex gap-3 mr-auto">
            <Link href={`/dashboard/schools/${params.id}`}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={saving || success}
              className="px-8 py-2.5 text-sm font-black text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 rounded-xl transition-all shadow-lg">
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التعديلات'}
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
