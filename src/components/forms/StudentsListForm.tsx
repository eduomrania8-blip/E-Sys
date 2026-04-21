'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type ListType = 'low' | 'inclusion' | 'expatriate' | 'refugee';

export default function StudentsListForm({ schoolId }: { schoolId: string }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [listType, setListType] = useState<ListType>('low');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [msg, setMsg] = useState({ text: '', type: '' });

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

  const getTableName = (type: ListType) => {
    switch(type) {
      case 'low': return 'low_performer_students';
      case 'inclusion': return 'inclusion_students_list';
      case 'expatriate': return 'expatriate_students_list';
      case 'refugee': return 'refugee_students_list';
    }
  };

  const fetchStudents = async () => {
    setFetching(true);
    const { data } = await supabase.from(getTableName(listType)).select('*').eq('school_id', schoolId).eq('academic_year', '2025-2026').order('created_at', { ascending: false });
    if (data) setStudents(data);
    setFetching(false);
  };

  useEffect(() => { fetchStudents(); }, [schoolId, listType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.student_full_name.length < 3) {
      setMsg({ text: 'اسم الطالب قصير جداً', type: 'error' });
      return;
    }
    setLoading(true);
    setMsg({ text: '', type: '' });

    const payload: any = {
      school_id: schoolId,
      academic_year: '2025-2026',
      student_full_name: formData.student_full_name,
      grade_level: formData.grade_level,
      class_name: formData.class_name,
    };

    if (listType === 'low') payload.notes = formData.notes;
    if (listType === 'inclusion') {
      payload.national_id = formData.national_id;
      payload.disability_type = formData.disability_type;
    }
    if (listType === 'expatriate') {
      payload.passport_number = formData.passport_number;
      payload.country = formData.country;
    }
    if (listType === 'refugee') {
      payload.country = formData.country;
      payload.refugee_classification = formData.refugee_classification;
    }

    const { error } = await supabase.from(getTableName(listType)).upsert(payload);
    
    if (error) {
      setMsg({ text: `خطأ في الحفظ: ${error.message}`, type: 'error' });
    } else {
      setMsg({ text: 'تم تسجيل الطالب بنجاح ✅', type: 'success' });
      setFormData({ ...formData, student_full_name: '', national_id: '', passport_number: '', country: '', disability_type: '', refugee_classification: '', notes: '' });
      fetchStudents();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    await supabase.from(getTableName(listType)).delete().eq('id', id);
    fetchStudents();
  };

  const grades = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','الأول اعدادي','الثاني اعدادي','الثالث اعدادي','الأول ثانوي','الثاني ثانوي','الثالث ثانوي'];

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      {/* Selector */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {(['low', 'inclusion', 'expatriate', 'refugee'] as ListType[]).map(t => (
          <button 
            key={t}
            onClick={() => setListType(t)}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${listType === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'low' ? 'الضعاف' : t === 'inclusion' ? 'الدمج' : t === 'expatriate' ? 'الوافدين' : 'اللاجئين'}
          </button>
        ))}
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-bold ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {msg.text}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-500 mb-1">اسم الطالب *</label>
          <input required type="text" value={formData.student_full_name} onChange={e => setFormData({...formData, student_full_name: e.target.value})} className="input-field w-full" placeholder="الاسم الرباعي" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">الصف الدراسي</label>
          <select value={formData.grade_level} onChange={e => setFormData({...formData, grade_level: e.target.value})} className="input-field w-full">
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">الفصل (مثال: 1/1)</label>
          <input type="text" value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} className="input-field w-full" placeholder="اختياري" />
        </div>

        {listType === 'inclusion' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">الرقم القومي</label>
              <input type="text" value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} className="input-field w-full" maxLength={14} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">نوع الإعاقة</label>
              <select value={formData.disability_type} onChange={e => setFormData({...formData, disability_type: e.target.value})} className="input-field w-full">
                <option value="">اختر...</option>
                <option value="ذهني">ذهني</option>
                <option value="سمعي">سمعي</option>
                <option value="بصري">بصري</option>
                <option value="حركي">حركي</option>
                <option value="متعدد">متعدد</option>
              </select>
            </div>
          </>
        )}

        {listType === 'expatriate' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">رقم الجواز</label>
              <input type="text" value={formData.passport_number} onChange={e => setFormData({...formData, passport_number: e.target.value})} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">الجنسية</label>
              <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="input-field w-full" placeholder="مثال: سوري" />
            </div>
          </>
        )}

        {listType === 'refugee' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">الجنسية</label>
              <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف</label>
              <input type="text" value={formData.refugee_classification} onChange={e => setFormData({...formData, refugee_classification: e.target.value})} className="input-field w-full" placeholder="سوداني، يمني..." />
            </div>
          </>
        )}

        {listType === 'low' && (
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-1">ملاحظات / سبب الضعف</label>
            <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field w-full" placeholder="..." />
          </div>
        )}

        <div className="md:col-span-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto px-12">
            {loading ? 'جاري الحفظ...' : `إضافة إلى قائمة ${listType === 'low' ? 'الضعاف' : listType === 'inclusion' ? 'الدمج' : listType === 'expatriate' ? 'الوافدين' : 'اللاجئين'}`}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-h-[300px]">
        {fetching ? (
          <div className="text-center py-20 text-gray-400">جاري تحميل القائمة...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 font-black">
                <tr>
                  <th className="px-6 py-4">اسم الطالب</th>
                  <th className="px-6 py-4">الصف</th>
                  <th className="px-6 py-4">الفصل</th>
                  {listType === 'low' && <th className="px-6 py-4">الملاحظات</th>}
                  {listType === 'inclusion' && <th className="px-6 py-4">الإعاقة</th>}
                  {listType === 'expatriate' && <th className="px-6 py-4">الجنسية</th>}
                  {listType === 'refugee' && <th className="px-6 py-4">التصنيف</th>}
                  <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{s.student_full_name}</td>
                    <td className="px-6 py-4">{s.grade_level}</td>
                    <td className="px-6 py-4">{s.class_name || '—'}</td>
                    {listType === 'low' && <td className="px-6 py-4 text-xs text-gray-500">{s.notes}</td>}
                    {listType === 'inclusion' && <td className="px-6 py-4"><span className="badge-info">{s.disability_type}</span></td>}
                    {listType === 'expatriate' && <td className="px-6 py-4">{s.country}</td>}
                    {listType === 'refugee' && <td className="px-6 py-4">{s.refugee_classification}</td>}
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-20 text-center text-gray-400 font-bold">لا يوجد طلاب مسجلين في هذه القائمة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
