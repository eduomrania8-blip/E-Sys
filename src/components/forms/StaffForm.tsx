'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function StaffForm({ schoolId }: { schoolId: string }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [newStaff, setNewStaff] = useState({
    national_id: '',
    full_name_ar: '',
    job_category: 'معلم',
    qualification: '',
    work_status: 'على رأس العمل',
    phone: ''
  });

  const fetchStaff = async () => {
    const { data } = await supabase.from('school_staff').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
    if (data) setStaff(data);
    setFetching(false);
  };

  useEffect(() => { fetchStaff(); }, [schoolId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.full_name_ar || newStaff.full_name_ar.length < 3) {
      setMsg({ text: 'الاسم قصير جداً', type: 'error' });
      return;
    }
    setLoading(true);
    setMsg({ text: '', type: '' });

    const validNid = newStaff.national_id.length >= 14 ? newStaff.national_id : ('00000000000000' + Math.floor(Math.random()*100000)).slice(-14);

    const payload = { school_id: schoolId, ...newStaff, national_id: validNid };
    const { error } = await supabase.from('school_staff').upsert(payload, { onConflict: 'national_id' });
    
    if (error) {
      setMsg({ text: `خطأ في الإضافة: ${error.message}`, type: 'error' });
    } else {
      setMsg({ text: 'تمت إضافة الموظف بنجاح ✅', type: 'success' });
      setNewStaff({ national_id: '', full_name_ar: '', job_category: 'معلم', qualification: '', work_status: 'على رأس العمل', phone: '' });
      fetchStaff();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    await supabase.from('school_staff').delete().eq('id', id);
    fetchStaff();
  };

  if (fetching) return <div className="text-center p-8 text-gray-400">جاري التحميل...</div>;

  return (
    <div className="space-y-8 animate-in fade-in" dir="rtl">
      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-bold ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {msg.text}
        </div>
      )}

      {/* نموذج الإضافة */}
      <form onSubmit={handleAdd} className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <h3 className="font-bold text-lg mb-4 text-gray-800">إضافة موظف (معلم / إداري / عامل)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الاسم بالكامل *</label>
            <input required type="text" value={newStaff.full_name_ar} onChange={e => setNewStaff({...newStaff, full_name_ar: e.target.value})} className="input-field w-full" placeholder="اسم الموظف" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الرقم القومي (14 رقم)</label>
            <input type="text" value={newStaff.national_id} onChange={e => setNewStaff({...newStaff, national_id: e.target.value})} className="input-field w-full" placeholder="سيتم توليد رقم وهمي إن تُرك فارغاً" maxLength={14} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">تصنيف الوظيفة</label>
            <select value={newStaff.job_category} onChange={e => setNewStaff({...newStaff, job_category: e.target.value})} className="input-field w-full">
              <option value="معلم">معلم</option>
              <option value="إداري">إداري</option>
              <option value="عامل">عامل</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الحالة الوظيفية</label>
            <select value={newStaff.work_status} onChange={e => setNewStaff({...newStaff, work_status: e.target.value})} className="input-field w-full">
              <option value="على رأس العمل">على رأس العمل</option>
              <option value="بالمعاش">بالمعاش</option>
              <option value="بالأجر">بالأجر</option>
              <option value="منتدب">منتدب</option>
              <option value="إجازة">إجازة</option>
              <option value="نصف الوقت">نصف الوقت</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">المؤهل الدراسي</label>
            <input type="text" value={newStaff.qualification} onChange={e => setNewStaff({...newStaff, qualification: e.target.value})} className="input-field w-full" placeholder="مثال: بكالوريوس تربية" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">رقم التليفون</label>
            <input type="text" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="input-field w-full" placeholder="اختياري" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto px-8">
          <span>➕</span> {loading ? 'جاري الإضافة...' : 'إضافة الموظف'}
        </button>
      </form>

      {/* قائمة الموظفين */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2 pt-4">قائمة العاملين الحالية ({staff.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(s => (
            <div key={s.id} className="relative p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
              <button type="button" onClick={() => handleDelete(s.id)} className="absolute top-3 left-3 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="حذف">
                🗑️
              </button>
              <h4 className="font-black text-gray-900 text-sm">{s.full_name_ar}</h4>
              <p className="text-xs text-gray-500 font-mono mt-1">{s.national_id}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold">{s.job_category}</span>
                <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-[10px] font-bold">{s.work_status}</span>
                {s.phone && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold inline-flex items-center gap-1">📞 {s.phone}</span>}
              </div>
            </div>
          ))}
          {staff.length === 0 && <p className="text-gray-400 text-sm p-4 col-span-3 text-center">لا يوجد موظفين مسجلين.</p>}
        </div>
      </div>
    </div>
  );
}
