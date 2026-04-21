'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const JOB_TITLES = [
  { value: 'مدير', icon: '👑', color: 'amber' },
  { value: 'وكيل شئون الطلاب', icon: '👨‍💼', color: 'blue' },
  { value: 'وكيل شئون العاملين', icon: '👩‍💼', color: 'purple' },
  { value: 'مسئول الإحصاء', icon: '📊', color: 'teal' },
  { value: 'مسئول وحدة التدريب', icon: '📚', color: 'orange' },
];

export default function LeadersForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToastMsg = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const [form, setForm] = useState({
    national_id: '',
    full_name_ar: '',
    job_title: 'مدير',
    phone: '',
    cadre: '',
    appointment_type: 'أساسي'
  });

  const fetchLeaders = async () => {
    const { data } = await supabase.from('school_leaders').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
    if (data) setLeaders(data);
    setFetching(false);
  };

  useEffect(() => { fetchLeaders(); }, [schoolId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name_ar.length < 3) {
      showToastMsg('⚠️ اسم القائد يجب أن يكون 3 حروف على الأقل', 'error');
      return;
    }
    setLoading(true);

    const validNid = form.national_id.length >= 14
      ? form.national_id
      : ('00000000000000' + Math.floor(Math.random() * 100000)).slice(-14);

    const payload = { school_id: schoolId, ...form, national_id: validNid };
    const { error } = await supabase.from('school_leaders').upsert(payload, { onConflict: 'national_id' });

    if (error) {
      showToastMsg(`❌ ${error.message}`, 'error');
    } else {
      showToastMsg('✅ تمت إضافة القائد بنجاح', 'success');
      setForm({ national_id: '', full_name_ar: '', job_title: 'مدير', phone: '', cadre: '', appointment_type: 'أساسي' });
      setShowForm(false);
      fetchLeaders();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القائد؟')) return;
    await supabase.from('school_leaders').delete().eq('id', id);
    showToastMsg('🗑️ تم حذف القائد', 'success');
    fetchLeaders();
  };

  const getJobInfo = (title: string) => JOB_TITLES.find(j => j.value === title) ?? { icon: '👤', color: 'gray' };

  if (fetching) return (
    <div className="space-y-3 animate-pulse" dir="rtl">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-in slide-in-from-top-2
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* القيادات المسجلة */}
      <div className="flex items-center justify-between">
        <h3 className="font-black text-gray-800 flex items-center gap-2">
          👤 القيادات المسجلة
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{leaders.length}</span>
        </h3>
        <button type="button" onClick={() => setShowForm(!showForm)}
          className={`text-sm font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2
            ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-purple-600 text-white shadow-lg shadow-purple-200 hover:bg-purple-700'}`}>
          {showForm ? '✕ إلغاء' : '+ إضافة قائد'}
        </button>
      </div>

      {/* Leader Cards */}
      {leaders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {leaders.map(l => {
            const job = getJobInfo(l.job_title);
            return (
              <div key={l.id} className="relative p-4 rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-all group">
                {/* Delete */}
                <button type="button" onClick={() => handleDelete(l.id)}
                  className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 text-sm">
                  ×
                </button>
                {/* Icon + Name */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${job.color}-100 flex items-center justify-center text-lg shrink-0`}>
                    {job.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-gray-900 text-sm truncate">{l.full_name_ar}</h4>
                    <p className={`text-xs font-bold text-${job.color}-600 mt-0.5`}>{l.job_title}</p>
                  </div>
                </div>
                {/* Details */}
                <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-mono">
                  {l.national_id && <span>🪪 {l.national_id}</span>}
                  {l.phone && <span className="text-emerald-600 font-bold">📞 {l.phone}</span>}
                  {l.cadre && <span>📋 {l.cadre}</span>}
                </div>
                <div className="mt-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full
                    ${l.appointment_type === 'أساسي' ? 'bg-blue-50 text-blue-600' : l.appointment_type === 'بالأجر' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                    {l.appointment_type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <span className="text-4xl block mb-3">👤</span>
          <p className="text-gray-400 font-bold text-sm">لا يوجد قيادات مسجلة</p>
          <button type="button" onClick={() => setShowForm(true)} className="text-purple-600 text-sm font-bold mt-2 hover:underline">
            + إضافة أول قائد
          </button>
        </div>
      )}

      {/* Form — Slide Down */}
      {showForm && (
        <form onSubmit={handleAdd} className="p-5 bg-purple-50/50 border-2 border-purple-200 rounded-2xl animate-in slide-in-from-top-2 space-y-4">
          <h3 className="font-black text-purple-900 text-sm flex items-center gap-2">
            ✨ إضافة قائد جديد
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الاسم بالكامل *</label>
              <input required type="text" value={form.full_name_ar}
                onChange={e => setForm({ ...form, full_name_ar: e.target.value })}
                className="input-field w-full" placeholder="الاسم الرباعي" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الرقم القومي</label>
              <input type="text" value={form.national_id}
                onChange={e => setForm({ ...form, national_id: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                className="input-field w-full font-mono" maxLength={14} placeholder="14 رقم" dir="ltr" />
              {form.national_id.length > 0 && form.national_id.length < 14 && (
                <p className="text-[10px] text-amber-500 mt-1 font-bold">⚠️ يجب أن يكون 14 رقم</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">المسمى الوظيفي</label>
              <div className="grid grid-cols-1 gap-1.5">
                {JOB_TITLES.map(job => (
                  <button key={job.value} type="button" onClick={() => setForm({ ...form, job_title: job.value })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-right
                      ${form.job_title === job.value ? `bg-${job.color}-100 text-${job.color}-700 ring-1 ring-${job.color}-300` : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                    <span>{job.icon}</span> {job.value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">نوع التعيين</label>
              <div className="flex gap-2">
                {['أساسي', 'بالأجر', 'معاش'].map(opt => (
                  <button key={opt} type="button" onClick={() => setForm({ ...form, appointment_type: opt })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
                      ${form.appointment_type === opt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الكادر</label>
              <input type="text" value={form.cadre}
                onChange={e => setForm({ ...form, cadre: e.target.value })}
                className="input-field w-full" placeholder="معلم خبير، كبير..." />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">رقم التليفون</label>
              <input type="text" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                className="input-field w-full font-mono" placeholder="01XXXXXXXXX" dir="ltr" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="btn-primary flex items-center gap-2 px-8">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الإضافة...</> : '✅ إضافة القائد'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">إلغاء</button>
          </div>
        </form>
      )}
    </div>
  );
}
