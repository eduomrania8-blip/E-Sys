'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type ListType = 'low' | 'inclusion' | 'expatriate' | 'refugee';

const LIST_TYPES = [
  { id: 'low' as ListType, label: 'الضعاف', icon: '📋', color: 'red', description: 'الطلاب ضعاف المستوى الدراسي' },
  { id: 'inclusion' as ListType, label: 'الدمج', icon: '♿', color: 'emerald', description: 'طلاب ذوي الاحتياجات الخاصة' },
  { id: 'expatriate' as ListType, label: 'الوافدين', icon: '🌍', color: 'blue', description: 'الطلاب غير المصريين' },
  { id: 'refugee' as ListType, label: 'اللاجئين', icon: '🏠', color: 'purple', description: 'الطلاب اللاجئين' },
];

export default function StudentsListForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [listType, setListType] = useState<ListType>('low');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    student_full_name: '',
    grade_level: 'الأول',
    class_name: '',
    national_id: '',
    passport_number: '',
    country: '',
    disability_type: '',
    refugee_classification: '',
    notes: ''
  });

  const showToastMsg = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const getTableName = (type: ListType) => {
    switch(type) {
      case 'low': return 'low_performer_students';
      case 'inclusion': return 'inclusion_students_list';
      case 'expatriate': return 'expatriate_students_list';
      case 'refugee': return 'refugee_students_list';
    }
  };

  const fetchStudents = useCallback(async () => {
    setFetching(true);
    const { data } = await supabase.from(getTableName(listType)).select('*').eq('school_id', schoolId).eq('academic_year', '2025-2026').order('created_at', { ascending: false });
    if (data) setStudents(data);
    setFetching(false);
  }, [schoolId, listType, supabase]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s =>
      s.student_full_name?.toLowerCase().includes(q) ||
      s.grade_level?.includes(q)
    );
  }, [students, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.student_full_name.trim().length < 3) {
      showToastMsg('⚠️ اسم الطالب يجب أن يكون 3 حروف على الأقل', 'error');
      return;
    }
    setLoading(true);

    const payload: any = {
      school_id: schoolId,
      academic_year: '2025-2026',
      student_full_name: formData.student_full_name.trim(),
      grade_level: formData.grade_level,
      class_name: formData.class_name || null,
    };

    if (listType === 'low') payload.notes = formData.notes || null;
    if (listType === 'inclusion') {
      payload.national_id = formData.national_id || null;
      payload.disability_type = formData.disability_type || null;
    }
    if (listType === 'expatriate') {
      payload.passport_number = formData.passport_number || null;
      payload.country = formData.country || null;
    }
    if (listType === 'refugee') {
      payload.country = formData.country || null;
      payload.refugee_classification = formData.refugee_classification || null;
    }

    const { error } = await supabase.from(getTableName(listType)).insert(payload);

    if (error) {
      showToastMsg(`❌ خطأ في الحفظ: ${error.message}`, 'error');
    } else {
      showToastMsg('✅ تم تسجيل الطالب بنجاح', 'success');
      setFormData({ ...formData, student_full_name: '', national_id: '', passport_number: '', country: '', disability_type: '', refugee_classification: '', notes: '' });
      fetchStudents();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from(getTableName(listType)).delete().eq('id', id);
    showToastMsg('🗑️ تم حذف السجل', 'success');
    setConfirmDelete(null);
    fetchStudents();
  };

  const grades = ['KG1', 'KG2', 'الأول','الثاني','الثالث','الرابع','الخامس','السادس','الأول اعدادي','الثاني اعدادي','الثالث اعدادي','الأول ثانوي','الثاني ثانوي','الثالث ثانوي'];
  const activeListInfo = LIST_TYPES.find(l => l.id === listType)!;

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
              <p className="text-sm text-gray-500 mt-2">هل أنت متأكد من حذف هذا الطالب؟</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">🗑️ نعم، احذف</button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ List Type Selector ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LIST_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => { setListType(t.id); setSearchQuery(''); }}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              listType === t.id
                ? `border-${t.color}-400 bg-${t.color}-50 shadow-md`
                : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            <span className="text-2xl block mb-1">{t.icon}</span>
            <p className={`text-xs font-black ${listType === t.id ? `text-${t.color}-700` : 'text-gray-600'}`}>{t.label}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>

      {/* Counter + Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`stat-micro`}>
            <div className={`w-9 h-9 rounded-lg bg-${activeListInfo.color}-100 flex items-center justify-center text-lg`}>
              {activeListInfo.icon}
            </div>
            <div>
              <p className="text-base font-black text-gray-900">{students.length}</p>
              <p className="text-[10px] text-gray-400 font-bold">طالب في قائمة {activeListInfo.label}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم..."
              className="input-field pr-9 text-xs w-48"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
        </div>

        <button onClick={() => setShowForm(!showForm)}
          className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2
            ${showForm ? 'bg-gray-100 text-gray-600' : `bg-${activeListInfo.color}-600 text-white shadow-lg hover:opacity-90`}`}>
          {showForm ? '✕ إلغاء' : `+ إضافة طالب`}
        </button>
      </div>

      {/* ═══════ Form ═══════ */}
      {showForm && (
        <form onSubmit={handleSubmit} className={`p-5 bg-${activeListInfo.color}-50/30 border-2 border-${activeListInfo.color}-200 rounded-2xl animate-slide-down space-y-4`}>
          <h3 className={`font-black text-${activeListInfo.color}-900 text-sm flex items-center gap-2`}>
            ✨ إضافة طالب إلى قائمة {activeListInfo.label}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">اسم الطالب *</label>
              <input required type="text" value={formData.student_full_name}
                onChange={e => setFormData({...formData, student_full_name: e.target.value})}
                className="input-field w-full" placeholder="الاسم الرباعي" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الصف الدراسي</label>
              <select value={formData.grade_level}
                onChange={e => setFormData({...formData, grade_level: e.target.value})}
                className="input-field w-full">
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">الفصل</label>
              <input type="text" value={formData.class_name}
                onChange={e => setFormData({...formData, class_name: e.target.value})}
                className="input-field w-full" placeholder="مثال: 1/1" />
            </div>

            {/* Dynamic fields per list type */}
            {listType === 'inclusion' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">الرقم القومي</label>
                  <input type="text" value={formData.national_id}
                    onChange={e => setFormData({...formData, national_id: e.target.value.replace(/\D/g, '').slice(0, 14)})}
                    className="input-field w-full font-mono" maxLength={14} dir="ltr" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">نوع الإعاقة</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['ذهني', 'سمعي', 'بصري', 'حركي', 'متعدد'].map(d => (
                      <button key={d} type="button"
                        onClick={() => setFormData({...formData, disability_type: d})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          formData.disability_type === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {listType === 'expatriate' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">رقم الجواز</label>
                  <input type="text" value={formData.passport_number}
                    onChange={e => setFormData({...formData, passport_number: e.target.value})}
                    className="input-field w-full font-mono" dir="ltr" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">الجنسية</label>
                  <input type="text" value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    className="input-field w-full" placeholder="مثال: سوري" />
                </div>
              </>
            )}

            {listType === 'refugee' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">الجنسية</label>
                  <input type="text" value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">التصنيف</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['سوري', 'فلسطيني', 'سوداني', 'يمني', 'أجنبي', 'أخرى'].map(c => (
                      <button key={c} type="button"
                        onClick={() => setFormData({...formData, refugee_classification: c})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          formData.refugee_classification === c ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {listType === 'low' && (
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ملاحظات / سبب الضعف</label>
                <input type="text" value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="input-field w-full" placeholder="مثال: ضعف في القراءة والكتابة" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-8">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الإضافة...</> : `✅ إضافة إلى ${activeListInfo.label}`}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">إلغاء</button>
          </div>
        </form>
      )}

      {/* ═══════ Table ═══════ */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {fetching ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton-shimmer rounded-lg" />)}
          </div>
        ) : filteredStudents.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 font-black">
                  <tr>
                    <th className="px-5 py-4 text-xs">#</th>
                    <th className="px-5 py-4 text-xs">اسم الطالب</th>
                    <th className="px-5 py-4 text-xs">الصف</th>
                    <th className="px-5 py-4 text-xs">الفصل</th>
                    {listType === 'low' && <th className="px-5 py-4 text-xs">الملاحظات</th>}
                    {listType === 'inclusion' && <th className="px-5 py-4 text-xs">نوع الإعاقة</th>}
                    {listType === 'expatriate' && <th className="px-5 py-4 text-xs">الجنسية</th>}
                    {listType === 'refugee' && <th className="px-5 py-4 text-xs">التصنيف</th>}
                    <th className="px-5 py-4 text-xs text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-5 py-3 font-bold text-gray-900">{s.student_full_name}</td>
                      <td className="px-5 py-3 text-gray-600">{s.grade_level}</td>
                      <td className="px-5 py-3 text-gray-500">{s.class_name || '—'}</td>
                      {listType === 'low' && <td className="px-5 py-3 text-xs text-gray-500 max-w-[200px] truncate">{s.notes || '—'}</td>}
                      {listType === 'inclusion' && (
                        <td className="px-5 py-3">
                          <span className="badge-info">{s.disability_type || '—'}</span>
                        </td>
                      )}
                      {listType === 'expatriate' && <td className="px-5 py-3 text-gray-600">{s.country || '—'}</td>}
                      {listType === 'refugee' && (
                        <td className="px-5 py-3">
                          <span className="badge-neutral">{s.refugee_classification || '—'}</span>
                        </td>
                      )}
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => setConfirmDelete(s.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredStudents.map((s, idx) => (
                <div key={s.id} className="p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{idx + 1}. {s.student_full_name}</h4>
                      <p className="text-xs text-gray-500 mt-1">الصف {s.grade_level} {s.class_name ? `(${s.class_name})` : ''}</p>
                    </div>
                    {listType === 'inclusion' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">{s.disability_type || '—'}</span>}
                    {listType === 'refugee' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">{s.refugee_classification || '—'}</span>}
                    {listType === 'expatriate' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">{s.country || '—'}</span>}
                  </div>
                  
                  {listType === 'low' && s.notes && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <span className="font-bold">ملاحظات:</span> {s.notes}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-gray-50">
                    <button onClick={() => setConfirmDelete(s.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      🗑️ حذف السجل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">{activeListInfo.icon}</span>
            <p className="text-gray-400 font-bold text-sm">
              {searchQuery ? 'لا توجد نتائج مطابقة' : `لا يوجد طلاب في قائمة ${activeListInfo.label}`}
            </p>
            {!showForm && !searchQuery && (
              <button type="button" onClick={() => setShowForm(true)} className={`text-${activeListInfo.color}-600 text-sm font-bold mt-3 hover:underline`}>
                + إضافة أول طالب
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
