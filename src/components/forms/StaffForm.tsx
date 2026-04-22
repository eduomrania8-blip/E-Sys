'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const JOB_CATEGORIES = [
  { value: 'معلم', icon: '👨‍🏫', color: 'blue', label: 'معلم' },
  { value: 'إداري', icon: '👔', color: 'purple', label: 'إداري' },
  { value: 'عامل', icon: '🔧', color: 'orange', label: 'عامل' },
];

const WORK_STATUSES = [
  { value: 'على رأس العمل', label: 'على رأس العمل', icon: '✅', color: 'emerald' },
  { value: 'إجازة مرضي', label: 'إجازة مرضية', icon: '🏥', color: 'amber' },
  { value: 'إجازة رعاية طفل', label: 'إجازة رعاية طفل', icon: '👶', color: 'amber' },
  { value: 'إجازة بدون مرتب', label: 'إجازة بدون مرتب', icon: '📋', color: 'gray' },
  { value: 'إعارة', label: 'إعارة', icon: '🔄', color: 'blue' },
  { value: 'مرافق مريض', label: 'مرافق مريض', icon: '🤝', color: 'rose' },
];

export default function StaffForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    national_id: '',
    full_name_ar: '',
    job_category: 'معلم',
    qualification: '',
    work_status: 'على رأس العمل',
    phone: ''
  });

  const showToastMsg = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase.from('school_staff').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
    if (data) setStaff(data);
    setFetching(false);
  }, [schoolId, supabase]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // إحصائيات مصغرة
  const staffCounts = useMemo(() => {
    const teachers = staff.filter(s => s.job_category === 'معلم').length;
    const admins = staff.filter(s => s.job_category === 'إداري').length;
    const workers = staff.filter(s => s.job_category === 'عامل').length;
    return { teachers, admins, workers, total: staff.length };
  }, [staff]);

  // فلترة + بحث
  const filteredStaff = useMemo(() => {
    let result = staff;
    if (filter !== 'all') result = result.filter(s => s.job_category === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        s.full_name_ar?.toLowerCase().includes(q) ||
        s.national_id?.includes(q) ||
        s.phone?.includes(q)
      );
    }
    return result;
  }, [staff, filter, searchQuery]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    if (!form.full_name_ar || form.full_name_ar.trim().length < 3) {
      showToastMsg('⚠️ اسم الموظف يجب أن يكون 3 حروف على الأقل', 'error');
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

    const payload = { school_id: schoolId, ...form, national_id: validNid };
    const { error } = await supabase.from('school_staff').upsert(payload, { onConflict: 'national_id' });

    if (error) {
      showToastMsg(`❌ ${error.message}`, 'error');
    } else {
      showToastMsg('✅ تمت إضافة الموظف بنجاح', 'success');
      setForm({ national_id: '', full_name_ar: '', job_category: 'معلم', qualification: '', work_status: 'على رأس العمل', phone: '' });
      setShowForm(false);
      fetchStaff();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('school_staff').delete().eq('id', id);
    showToastMsg('🗑️ تم حذف الموظف', 'success');
    setConfirmDelete(null);
    fetchStaff();
  };

  const getCategoryInfo = (cat: string) => JOB_CATEGORIES.find(c => c.value === cat) ?? JOB_CATEGORIES[2];
  const getStatusInfo = (status: string) => WORK_STATUSES.find(s => s.value === status) ?? WORK_STATUSES[0];

  if (fetching) return (
    <div className="space-y-3" dir="rtl">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton-shimmer rounded-xl" />)}
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

      {/* ═══════ Delete Confirmation Modal ═══════ */}
      {confirmDelete && (
        <div className="modal-overlay animate-scale-in" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="text-center">
              <span className="text-4xl block mb-3">⚠️</span>
              <h3 className="text-lg font-black text-gray-900">تأكيد الحذف</h3>
              <p className="text-sm text-gray-500 mt-2">هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">🗑️ نعم، احذف</button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Stats Bar ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العاملين', value: staffCounts.total, icon: '👥', color: 'from-gray-500 to-gray-600' },
          { label: 'المعلمون', value: staffCounts.teachers, icon: '👨‍🏫', color: 'from-blue-500 to-blue-600' },
          { label: 'الإداريون', value: staffCounts.admins, icon: '👔', color: 'from-purple-500 to-purple-600' },
          { label: 'العمال', value: staffCounts.workers, icon: '🔧', color: 'from-orange-500 to-orange-600' },
        ].map(stat => (
          <div key={stat.label} className="stat-micro">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white text-lg shrink-0 shadow-md`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-lg font-black text-gray-900 leading-tight">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ Controls Bar ═══════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              الكل ({staff.length})
            </button>
            {JOB_CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setFilter(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  filter === cat.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم القومي..."
              className="input-field w-full pr-9 text-xs"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Add Button */}
        <button onClick={() => setShowForm(!showForm)}
          className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0
            ${showForm
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-orange-600 text-white shadow-lg shadow-orange-200 hover:bg-orange-700'}`}>
          {showForm ? '✕ إلغاء' : '+ إضافة موظف'}
        </button>
      </div>

      {/* ═══════ Add Form — Slide Down ═══════ */}
      {showForm && (
        <form onSubmit={handleAdd} className="p-5 bg-orange-50/50 border-2 border-orange-200 rounded-2xl animate-slide-down space-y-4">
          <h3 className="font-black text-orange-900 text-sm flex items-center gap-2">
            ✨ إضافة موظف جديد (معلم / إداري / عامل)
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
                className="input-field w-full font-mono" maxLength={14} placeholder="14 رقم (اختياري)" dir="ltr" />
              {form.national_id.length > 0 && form.national_id.length < 14 && (
                <p className="text-[10px] text-amber-500 mt-1 font-bold">⚠️ يجب أن يكون 14 رقم ({14 - form.national_id.length} متبقي)</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">تصنيف الوظيفة</label>
              <div className="flex gap-2">
                {JOB_CATEGORIES.map(cat => (
                  <button key={cat.value} type="button"
                    onClick={() => setForm({ ...form, job_category: cat.value })}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all
                      ${form.job_category === cat.value
                        ? `bg-${cat.color}-600 text-white shadow-md`
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    <span>{cat.icon}</span> {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الحالة الوظيفية</label>
              <select value={form.work_status}
                onChange={e => setForm({ ...form, work_status: e.target.value })}
                className="input-field w-full">
                {WORK_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">المؤهل الدراسي</label>
              <input type="text" value={form.qualification}
                onChange={e => setForm({ ...form, qualification: e.target.value })}
                className="input-field w-full" placeholder="مثال: بكالوريوس تربية" />
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
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الإضافة...</> : '✅ إضافة الموظف'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">إلغاء</button>
          </div>
        </form>
      )}

      {/* ═══════ Staff Cards Grid ═══════ */}
      {filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStaff.map(s => {
            const cat = getCategoryInfo(s.job_category);
            const status = getStatusInfo(s.work_status);
            return (
              <div key={s.id} className="relative p-4 rounded-xl border border-gray-100 bg-white hover:shadow-lg transition-all group">
                {/* Delete Button */}
                <button type="button" onClick={() => setConfirmDelete(s.id)}
                  className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 text-sm">
                  ×
                </button>

                {/* Category & Name */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${cat.color}-100 flex items-center justify-center text-lg shrink-0`}>
                    {cat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-gray-900 text-sm truncate">{s.full_name_ar}</h4>
                    <p className={`text-xs font-bold text-${cat.color}-600 mt-0.5`}>{s.job_category}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
                  {s.national_id && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <span>🪪</span> {s.national_id}
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold">
                      <span>📞</span> {s.phone}
                    </div>
                  )}
                  {s.qualification && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>🎓</span> {s.qualification}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-${status.color}-50 text-${status.color}-700 border border-${status.color}-200`}>
                    {status.icon} {s.work_status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <span className="text-5xl block mb-4">👨‍🏫</span>
          <p className="text-gray-400 font-bold text-sm">
            {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد موظفين مسجلين'}
          </p>
          {!showForm && !searchQuery && (
            <button type="button" onClick={() => setShowForm(true)} className="text-orange-600 text-sm font-bold mt-3 hover:underline">
              + إضافة أول موظف
            </button>
          )}
        </div>
      )}
    </div>
  );
}
