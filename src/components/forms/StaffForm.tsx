'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  sanitizeSubject, 
  sanitizeQualification, 
  sanitizeCadre, 
  sanitizeAppointment,
  STANDARD_SUBJECTS 
} from '@/utils/dataSanitizer';

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

const CADRE_POSITIONS = [
  'معلم مساعد', 'معلم', 'معلم أول', 'معلم أول أ', 'معلم خبير', 'كبير معلمين'
];

export default function StaffForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [schoolType, setSchoolType] = useState<string>('رسمية');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name_ar: '',
    national_id: '',
    phone: '',
    job_category: 'معلم',
    qualification: '',
    qualification_date: '',
    hire_date: '',
    school_role: '',
    subject_taught: '',
    cadre_position: '',
    employment_type: 'تعيين',
    assignment_status: 'أصل',
    worker_type: '',
    work_status: 'على رأس العمل'
  });

  const showToastMsg = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchStaff = useCallback(async () => {
    const [staffRes, schoolRes] = await Promise.all([
      supabase.from('school_staff').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('schools').select('school_type').eq('id', schoolId).single()
    ]);
    if (staffRes.data) setStaff(staffRes.data);
    if (schoolRes.data?.school_type) setSchoolType(schoolRes.data.school_type);
    setFetching(false);
  }, [schoolId, supabase]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const isPublicSchool = ['رسمية', 'رسمية لغات', 'فنية'].includes(schoolType);

  const staffCounts = useMemo(() => {
    const teachers = staff.filter(s => s.job_category === 'معلم').length;
    const admins = staff.filter(s => s.job_category === 'إداري').length;
    const workers = staff.filter(s => s.job_category === 'عامل').length;
    return { teachers, admins, workers, total: staff.length };
  }, [staff]);

  const filteredStaff = useMemo(() => {
    let result = staff;
    if (filter !== 'all') result = result.filter(s => s.job_category === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        s.full_name_ar?.toLowerCase().includes(q) ||
        s.national_id?.includes(q) ||
        s.phone?.includes(q) ||
        s.subject_taught?.includes(q)
      );
    }
    // Tweak: Sort by Subject automatically!
    result.sort((a, b) => (a.subject_taught || '').localeCompare(b.subject_taught || '', 'ar'));
    return result;
  }, [staff, filter, searchQuery]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name_ar || form.full_name_ar.trim().length < 3) return showToastMsg('⚠️ اسم الموظف يجب أن يكون 3 حروف على الأقل', 'error');
    if (form.national_id && form.national_id.length > 0 && form.national_id.length < 14) return showToastMsg('⚠️ الرقم القومي يجب أن يكون 14 رقم', 'error');
    if (form.phone && form.phone.length > 0 && form.phone.length < 11) return showToastMsg('⚠️ رقم التليفون يجب أن يكون 11 رقم', 'error');

    setLoading(true);
    const validNid = form.national_id.length >= 14 ? form.national_id : ('00000000000000' + Math.floor(Math.random() * 100000)).slice(-14);

    const payload = { 
      school_id: schoolId,
      full_name_ar: form.full_name_ar.trim(),
      national_id: validNid,
      phone: form.phone,
      job_category: form.job_category,
      qualification: sanitizeQualification(form.qualification),
      qualification_date: form.qualification_date || null,
      hire_date: form.hire_date || null,
      school_role: form.school_role.trim(),
      subject_taught: form.job_category === 'معلم' ? sanitizeSubject(form.subject_taught) : null,
      cadre_position: form.job_category === 'معلم' && isPublicSchool ? sanitizeCadre(form.cadre_position) : null,
      employment_type: sanitizeAppointment(form.employment_type),
      assignment_status: form.job_category === 'معلم' ? form.assignment_status : null,
      worker_type: form.job_category === 'عامل' ? form.worker_type : null,
      work_status: form.work_status
    };

    const { error } = await supabase.from('school_staff').upsert(payload as any, { onConflict: 'national_id' });

    if (error) {
      showToastMsg(`❌ ${error.message}`, 'error');
    } else {
      showToastMsg('✅ تمت إضافة الموظف بنجاح', 'success');
      setForm({ ...form, national_id: '', full_name_ar: '', phone: '' }); // keep categories selected for fast entry
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

  if (fetching) return <div className="h-32 skeleton-shimmer rounded-xl" />;

  return (
    <div className="space-y-5 animate-in" dir="rtl">
      {toast && <div className={`${toast.type === 'success' ? 'toast-success' : 'toast-error'} animate-slide-down`}>{toast.text}</div>}

      {/* Delete Modal */}
      {confirmDelete && (
        <div className="modal-overlay animate-scale-in" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content text-center" onClick={e => e.stopPropagation()}>
            <span className="text-4xl block mb-3">⚠️</span>
            <h3 className="text-lg font-black text-gray-900">تأكيد الحذف</h3>
            <div className="flex gap-3 pt-4">
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger flex-1">نعم، احذف</button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-black ${filter === 'all' ? 'bg-white shadow-sm' : 'bg-transparent'}`}>الكل ({staffCounts.total})</button>
          {JOB_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setFilter(c.value)} className={`px-4 py-2 rounded-xl text-xs font-black ${filter === c.value ? 'bg-white shadow-sm text-'+c.color+'-600' : 'bg-transparent text-gray-500'}`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث..." className="input-field w-48 text-xs" />
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-4 bg-blue-600 border-blue-600 hover:bg-blue-700">{showForm ? '✕ إلغاء' : '+ إضافة موظف'}</button>
        </div>
      </div>

      {/* Smart Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 shadow-xl rounded-2xl animate-slide-down overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-800">إضافة سجل وظيفي جديد</h2>
            <p className="text-xs text-slate-500 mt-1">يرجى إدخال البيانات بدقة لضمان صحة التقارير والإحصاءات.</p>
          </div>

          <div className="p-6 space-y-8">
            {/* Category Selector */}
            <div className="flex gap-3">
              {JOB_CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setForm({ ...form, job_category: cat.value, employment_type: isPublicSchool ? 'تعيين' : 'بالعقد' })}
                  className={`flex-1 py-3 rounded-xl text-sm font-black transition-all border ${form.job_category === cat.value ? `bg-${cat.color}-50 border-${cat.color}-200 text-${cat.color}-700 shadow-sm ring-1 ring-${cat.color}-500` : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <span className="text-xl block mb-1">{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>

            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 border-b pb-2">البيانات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">الاسم رباعياً <span className="text-red-500">*</span></label>
                  <input required type="text" className={`input-field w-full ${form.full_name_ar.length > 0 && form.full_name_ar.trim().length < 3 ? 'border-red-300 bg-red-50 focus:ring-red-500' : ''}`} value={form.full_name_ar} onChange={e => setForm({...form, full_name_ar: e.target.value})} placeholder="الاسم بالكامل" />
                  {form.full_name_ar.length > 0 && form.full_name_ar.trim().length < 3 && <p className="text-[10px] text-red-600 font-bold">⚠️ يجب أن يكون 3 حروف على الأقل</p>}
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">الرقم القومي</label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-slate-400">🪪</span>
                    <input type="text" className={`input-field w-full font-mono pl-3 pr-9 ${form.national_id.length > 0 && form.national_id.length < 14 ? 'border-red-300 bg-red-50 focus:ring-red-500' : ''}`} maxLength={14} value={form.national_id} onChange={e => setForm({...form, national_id: e.target.value.replace(/\D/g, '').slice(0, 14)})} placeholder="14 رقم" dir="ltr" />
                  </div>
                  {form.national_id.length > 0 && form.national_id.length < 14 && <p className="text-[10px] text-red-600 font-bold">⚠️ يجب أن يتكون من 14 رقماً</p>}
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">رقم الهاتف</label>
                  <div className="relative">
                    <span className="absolute right-3 top-2.5 text-slate-400">📱</span>
                    <input type="text" className={`input-field w-full font-mono pl-3 pr-9 ${form.phone.length > 0 && form.phone.length < 11 ? 'border-red-300 bg-red-50 focus:ring-red-500' : ''}`} maxLength={11} value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11)})} placeholder="01XXXXXXXXX" dir="ltr" />
                  </div>
                  {form.phone.length > 0 && form.phone.length < 11 && <p className="text-[10px] text-red-600 font-bold">⚠️ يجب أن يتكون من 11 رقماً</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Qualifications */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 border-b pb-2">بيانات المؤهل والتعيين</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600 block">المؤهل الدراسي</label><input type="text" className="input-field w-full" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="مثال: بكالوريوس تربية" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600 block">تاريخ المؤهل</label><input type="date" className="input-field w-full" value={form.qualification_date} onChange={e => setForm({...form, qualification_date: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600 block">تاريخ التعيين</label><input type="date" className="input-field w-full" value={form.hire_date} onChange={e => setForm({...form, hire_date: e.target.value})} /></div>
              </div>
            </div>

            {/* Section 3: Job Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 border-b pb-2">التفاصيل الوظيفية ({form.job_category})</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                {/* المشترك */}
                <div className="space-y-1"><label className="text-xs font-bold text-slate-600 block">العمل المكلف به بالمدرسة</label><input type="text" className="input-field w-full bg-white" value={form.school_role} onChange={e => setForm({...form, school_role: e.target.value})} placeholder="مثال: شئون طلبة / تدريس" /></div>
            
            {/* نوع التعيين (Hiring Type) */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">نوع التعيين</label>
              <select className="input-field w-full font-bold text-blue-700" value={form.employment_type} onChange={e => setForm({...form, employment_type: e.target.value})}>
                {isPublicSchool ? (
                  <>
                    <option value="تعيين">تعيين أساسي</option>
                    <option value="صناديق خاصة">صناديق خاصة</option>
                    <option value="بالحصة (أجر)">بالحصة (أجر)</option>
                    <option value="بالحصة (معاش)">بالحصة (معاش)</option>
                  </>
                ) : (
                  <>
                    <option value="بالعقد">بالعقد</option>
                    <option value="بالحصة (أجر)">بالحصة</option>
                    <option value="بالمكافأة">بالمكافأة</option>
                  </>
                )}
              </select>
            </div>

            {/* خاص بالمعلمين */}
            {form.job_category === 'معلم' && (
              <>
                <div>
                  <label className="text-xs font-bold text-blue-600 mb-1 block">مادة التدريس (التخصص) *</label>
                  <input required type="text" list="subjectList" className="input-field w-full border-blue-200 bg-blue-50/50" value={form.subject_taught} onChange={e => setForm({...form, subject_taught: e.target.value})} placeholder="عربي، رياضيات، الخ" />
                  <datalist id="subjectList">
                    {STANDARD_SUBJECTS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-blue-600 mb-1 block">الوضع بالمدرسة</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({...form, assignment_status: 'أصل'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${form.assignment_status === 'أصل' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>أصلي</button>
                    <button type="button" onClick={() => setForm({...form, assignment_status: 'منتدب'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${form.assignment_status === 'منتدب' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>منتدب</button>
                  </div>
                </div>
                {isPublicSchool && (
                  <div>
                    <label className="text-xs font-bold text-blue-600 mb-1 block">الوظيفة على الكادر</label>
                    <select className="input-field w-full border-blue-200" value={form.cadre_position} onChange={e => setForm({...form, cadre_position: e.target.value})}>
                      <option value="">بدون كادر</option>
                      {CADRE_POSITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* خاص بالعمال */}
            {form.job_category === 'عامل' && (
              <div>
                <label className="text-xs font-bold text-orange-600 mb-1 block">تخصيص العامل</label>
                <select className="input-field w-full border-orange-200 bg-orange-50/50" value={form.worker_type} onChange={e => setForm({...form, worker_type: e.target.value})}>
                  <option value="">عامل عادي</option>
                  <option value="عامل بالأجر">عامل بالأجر</option>
                  <option value="عامل نوبتجي ليلي">عامل نوبتجي ليلي</option>
                  <option value="عامل عهدة">عامل عهدة</option>
                </select>
              </div>
            )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors">إلغاء</button>
            <button type="submit" disabled={loading} className="btn-primary px-8 py-2.5 text-sm shadow-lg shadow-blue-200">
              {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
            </button>
          </div>
        </form>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {filteredStaff.map(s => {
          const cat = JOB_CATEGORIES.find(c => c.value === s.job_category) || JOB_CATEGORIES[0];
          return (
            <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
              <button onClick={() => setConfirmDelete(s.id)} className="absolute top-2 left-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 w-7 h-7 rounded flex items-center justify-center">×</button>
              
              <div className="flex gap-3 items-center border-b border-gray-50 pb-3 mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${cat.color}-100 flex items-center justify-center text-xl`}>{cat.icon}</div>
                <div>
                  <h4 className="font-black text-gray-900 text-sm leading-tight">{s.full_name_ar}</h4>
                  <p className={`text-xs font-bold text-${cat.color}-600`}>{s.job_category} {s.subject_taught ? `(${s.subject_taught})` : ''}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-[10px] text-gray-500 font-bold">
                {s.school_role && <div className="flex gap-2"><span className="w-4">🎯</span> تكليف: <span className="text-gray-800">{s.school_role}</span></div>}
                {s.employment_type && <div className="flex gap-2"><span className="w-4">📝</span> تعيين: <span className="text-blue-700">{s.employment_type}</span></div>}
                {s.cadre_position && <div className="flex gap-2"><span className="w-4">🎖️</span> الكادر: <span className="text-indigo-700">{s.cadre_position}</span></div>}
                {s.assignment_status && <div className="flex gap-2"><span className="w-4">📍</span> الوضع: <span className={s.assignment_status === 'أصل' ? 'text-emerald-600' : 'text-orange-600'}>{s.assignment_status}</span></div>}
                {s.worker_type && <div className="flex gap-2"><span className="w-4">🔧</span> نوع العامل: <span className="text-orange-600">{s.worker_type}</span></div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
