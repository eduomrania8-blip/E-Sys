'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { sanitizeSubject, sanitizeQualification } from '@/utils/dataSanitizer';

const JOB_TITLES = [
  { value: 'مدير', icon: '👑', color: 'amber' },
  { value: 'وكيل شئون الطلاب', icon: '👨‍💼', color: 'blue' },
  { value: 'وكيل شئون العاملين', icon: '👩‍💼', color: 'purple' },
  { value: 'مسئول الإحصاء', icon: '📊', color: 'teal' },
  { value: 'مسئول الدمج', icon: '♿', color: 'emerald' },
  { value: 'مسئول القرائية', icon: '📖', color: 'rose' },
  { value: 'مسئول وحدة التدريب', icon: '📚', color: 'orange' },
  { value: 'رئيس الكنترول', icon: '📝', color: 'indigo' },
  { value: 'مسئول أمن', icon: '🛡️', color: 'red' },
];

export default function LeadersForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [schoolType, setSchoolType] = useState<string>('رسمية');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToastMsg = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const emptyForm = {
    national_id: '',
    full_name_ar: '',
    job_title: 'مدير',
    phone: '',
    cadre: '',
    appointment_type: 'أساسي'
  };

  const [form, setForm] = useState(emptyForm);

  const fetchLeaders = useCallback(async () => {
    const [leadersRes, schoolRes] = await Promise.all([
      supabase.from('school_leaders').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('schools').select('school_type').eq('id', schoolId).single()
    ]);
    if (leadersRes.data) setLeaders(leadersRes.data);
    if (schoolRes.data?.school_type) setSchoolType(schoolRes.data.school_type);
    setFetching(false);
  }, [schoolId, supabase]);

  useEffect(() => { fetchLeaders(); }, [fetchLeaders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.full_name_ar.trim().length < 3) {
      showToastMsg('⚠️ اسم القائد يجب أن يكون 3 حروف على الأقل', 'error');
      return;
    }
    if (form.national_id && form.national_id.length > 0 && form.national_id.length < 14) {
      showToastMsg('⚠️ الرقم القومي يجب أن يكون 14 رقم', 'error');
      return;
    }
    if (form.phone && form.phone.length > 0 && form.phone.length < 11) {
      showToastMsg('⚠️ رقم التليفون يجب أن يكون 11 رقم', 'error');
      return;
    }

    setLoading(true);
    const validNid = form.national_id.length >= 14
      ? form.national_id
      : ('00000000000000' + Math.floor(Math.random() * 100000)).slice(-14);

    const payload = { 
      school_id: schoolId, 
      ...form, 
      national_id: validNid,
      qualification: sanitizeQualification(form.qualification),
      subject_taught: sanitizeSubject(form.subject_taught)
    };

    let error;
    if (editId) {
      // تعديل
      const { error: updateError } = await supabase.from('school_leaders').update(payload).eq('id', editId);
      error = updateError;
    } else {
      // إضافة
      const { error: insertError } = await supabase.from('school_leaders').upsert(payload, { onConflict: 'national_id' });
      error = insertError;
    }

    if (error) {
      showToastMsg(`❌ ${error.message}`, 'error');
    } else {
      showToastMsg(editId ? '✅ تم تعديل بيانات القائد' : '✅ تمت إضافة القائد بنجاح', 'success');
      setForm(emptyForm);
      setShowForm(false);
      setEditId(null);
      fetchLeaders();
    }
    setLoading(false);
  };

  const handleEdit = (leader: any) => {
    setEditId(leader.id);
    setForm({
      national_id: leader.national_id || '',
      full_name_ar: leader.full_name_ar || '',
      job_title: leader.job_title || 'مدير',
      phone: leader.phone || '',
      cadre: leader.cadre || '',
      appointment_type: leader.appointment_type || 'أساسي',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('school_leaders').delete().eq('id', id);
    showToastMsg('🗑️ تم حذف القائد', 'success');
    setConfirmDelete(null);
    fetchLeaders();
  };

  const getJobInfo = (title: string) => JOB_TITLES.find(j => j.value === title) ?? { icon: '👤', color: 'gray' };

  if (fetching) return (
    <div className="space-y-3" dir="rtl">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton-shimmer rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-in" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`${toast.type === 'success' ? 'toast-success' : 'toast-error'} animate-slide-down`}>
          {toast.text}
        </div>
      )}

      {/* Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay animate-scale-in" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="text-center">
              <span className="text-4xl block mb-3">⚠️</span>
              <h3 className="text-lg font-black text-gray-900">تأكيد الحذف</h3>
              <p className="text-sm text-gray-500 mt-2">هل أنت متأكد من حذف هذا القائد؟</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">🗑️ نعم، احذف</button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* القيادات المسجلة */}
      <div className="flex items-center justify-between">
        <h3 className="font-black text-gray-800 flex items-center gap-2">
          👤 القيادات المسجلة
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{leaders.length}</span>
        </h3>
        <button type="button" onClick={() => { setShowForm(!showForm); if (showForm) { setEditId(null); setForm(emptyForm); } }}
          className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2
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
                {/* Actions */}
                <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button type="button" onClick={() => handleEdit(l)}
                    className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 text-sm">
                    ✏️
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(l.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 text-sm">
                    ×
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${job.color}-100 flex items-center justify-center text-lg shrink-0`}>
                    {job.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-gray-900 text-sm truncate">{l.full_name_ar}</h4>
                    <p className={`text-xs font-bold text-${job.color}-600 mt-0.5`}>{l.job_title}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                  {l.national_id && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <span>🪪</span> {l.national_id}
                    </div>
                  )}
                  {l.phone && (
                    <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold">
                      <span>📞</span> {l.phone}
                    </div>
                  )}
                  {l.cadre && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>📋</span> {l.cadre}
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full
                    ${l.appointment_type === 'أساسي' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                      l.appointment_type === 'بالأجر' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                    {l.appointment_type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-14 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <span className="text-5xl block mb-4">👤</span>
          <p className="text-gray-400 font-bold text-sm">لا يوجد قيادات مسجلة</p>
          <button type="button" onClick={() => setShowForm(true)} className="text-purple-600 text-sm font-bold mt-3 hover:underline">
            + إضافة أول قائد
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-purple-50/50 border-2 border-purple-200 rounded-2xl animate-slide-down space-y-4">
          <h3 className="font-black text-purple-900 text-sm flex items-center gap-2">
            {editId ? '✏️ تعديل بيانات القائد' : '✨ إضافة قائد جديد'}
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
                <p className="text-[10px] text-amber-500 mt-1 font-bold">⚠️ يجب أن يكون 14 رقم ({14 - form.national_id.length} متبقي)</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">المسمى الوظيفي</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
                {JOB_TITLES.map(job => (
                  <button key={job.value} type="button" onClick={() => setForm({ ...form, job_title: job.value })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all text-right
                      ${form.job_title === job.value ? `bg-${job.color}-100 text-${job.color}-700 ring-1 ring-${job.color}-300` : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}>
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
                {['رسمية', 'رسمية لغات', 'فنية'].includes(schoolType) ? (
                  <button type="button" onClick={() => setForm({ ...form, appointment_type: 'تعيين' })}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white shadow-md">
                    تعيين أساسي
                  </button>
                ) : (
                  ['أساسي', 'بالعقد', 'بالمكافأة'].map(opt => (
                    <button key={opt} type="button" onClick={() => setForm({ ...form, appointment_type: opt })}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all
                        ${form.appointment_type === opt ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {opt}
                    </button>
                  ))
                )}
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
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الحفظ...</> : editId ? '💾 حفظ التعديلات' : '✅ إضافة القائد'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }} className="btn-secondary text-sm">إلغاء</button>
          </div>
        </form>
      )}
    </div>
  );
}
