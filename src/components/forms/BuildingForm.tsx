'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const FIELD_GROUPS = [
  {
    title: '📐 المبنى والفصول',
    fields: [
      { name: 'actual_classrooms', label: 'الفصول الدراسية', icon: '🏫', max: 50 },
      { name: 'admin_rooms', label: 'الغرف الإدارية', icon: '🗄️', max: 20 },
      { name: 'number_of_floors', label: 'عدد الأدوار', icon: '🏢', max: 10 },
    ],
  },
  {
    title: '🔬 المعامل والأنشطة',
    fields: [
      { name: 'total_labs', label: 'المعامل', icon: '🔬', max: 15 },
      { name: 'activity_rooms', label: 'حجرات الأنشطة', icon: '🎨', max: 15 },
      { name: 'playgrounds', label: 'الملاعب', icon: '⚽', max: 5 },
    ],
  },
  {
    title: '🚿 دورات المياه',
    fields: [
      { name: 'boys_toilets', label: 'دورات بنين', icon: '🚹', max: 20 },
      { name: 'girls_toilets', label: 'دورات بنات', icon: '🚺', max: 20 },
      { name: 'staff_toilets', label: 'دورات العاملين', icon: '👥', max: 10 },
    ],
  },
  {
    title: '📷 الأمن والتجهيزات',
    fields: [
      { name: 'surveillance_cameras', label: 'كاميرات المراقبة', icon: '📷', max: 50 },
    ],
  },
];

export default function BuildingForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState<any>({
    building_status: 'مستقل',
    number_of_floors: 0,
    actual_classrooms: 0,
    admin_rooms: 0,
    total_labs: 0,
    activity_rooms: 0,
    playgrounds: 0,
    boys_toilets: 0,
    girls_toilets: 0,
    staff_toilets: 0,
    surveillance_cameras: 0,
    fence_condition: 'غير موجود',
    has_landline: false,
    has_internet: false,
    has_library: false,
    has_smart_lab: false,
  });

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    supabase.from('school_buildings').select('*').eq('school_id', schoolId).single().then(({ data }) => {
      if (data) setFormData((prev: any) => ({ ...prev, ...data }));
      setFetching(false);
    });
  }, [schoolId, supabase]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const increment = (name: string, max: number) => {
    setFormData((prev: any) => ({ ...prev, [name]: Math.min((prev[name] || 0) + 1, max) }));
  };

  const decrement = (name: string) => {
    setFormData((prev: any) => ({ ...prev, [name]: Math.max((prev[name] || 0) - 1, 0) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { id, created_at, updated_at, ...cleanData } = formData;
    const payload = { school_id: schoolId, ...cleanData };
    const { error } = await supabase.from('school_buildings').upsert(payload, { onConflict: 'school_id' });

    if (error) {
      showToast(`❌ خطأ في الحفظ: ${error.message}`, 'error');
    } else {
      showToast('✅ تم حفظ بيانات المبنى بنجاح', 'success');
    }
    setLoading(false);
  };

  if (fetching) return (
    <div className="space-y-4 animate-pulse" dir="rtl">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl transition-all animate-in slide-in-from-top-2
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* حالة المبنى + السور */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
          <label className="block text-xs font-black text-gray-600 mb-2">🏗️ حالة المبنى</label>
          <div className="grid grid-cols-2 gap-2">
            {['مستقل', 'يعمل مع مدارس أخرى'].map(opt => (
              <button key={opt} type="button" onClick={() => handleChange('building_status', opt)}
                className={`p-3 rounded-xl text-sm font-bold border-2 transition-all
                  ${formData.building_status === opt
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
              >
                {opt === 'مستقل' ? '🏫' : '🏘️'} {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
          <label className="block text-xs font-black text-gray-600 mb-2">🧱 حالة السور</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'جيد', icon: '✅', color: 'emerald' },
              { val: 'يحتاج صيانة', icon: '⚠️', color: 'amber' },
              { val: 'غير موجود', icon: '❌', color: 'red' },
            ].map(opt => (
              <button key={opt.val} type="button" onClick={() => handleChange('fence_condition', opt.val)}
                className={`p-3 rounded-xl text-xs font-bold border-2 transition-all text-center
                  ${formData.fence_condition === opt.val
                    ? `border-${opt.color}-400 bg-${opt.color}-50 text-${opt.color}-700 shadow-sm`
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
              >
                <span className="text-lg block mb-1">{opt.icon}</span>
                {opt.val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* مجموعات الحقول العددية */}
      {FIELD_GROUPS.map(group => (
        <div key={group.title} className="p-4 rounded-xl border border-gray-100">
          <h3 className="text-sm font-black text-gray-800 mb-4">{group.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {group.fields.map(field => {
              const val = formData[field.name] || 0;
              return (
                <div key={field.name} className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                  ${val > 0 ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                  <span className="text-xl">{field.icon}</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-gray-500">{field.label}</p>
                    <p className={`text-lg font-black ${val > 0 ? 'text-blue-700' : 'text-gray-300'}`}>{val}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => increment(field.name, field.max)}
                      className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-black hover:bg-blue-200 transition-colors flex items-center justify-center text-sm">
                      +
                    </button>
                    <button type="button" onClick={() => decrement(field.name)}
                      disabled={val === 0}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 font-black hover:bg-gray-200 disabled:opacity-30 transition-colors flex items-center justify-center text-sm">
                      −
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Toggles: مرافق */}
      <div className="p-4 rounded-xl border border-gray-100">
        <h3 className="text-sm font-black text-gray-800 mb-4">📡 المرافق والخدمات</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'has_landline', label: 'تليفون أرضي', icon: '📞', onIcon: '📞', offIcon: '📵' },
            { name: 'has_internet', label: 'إنترنت Wi-Fi', icon: '📶', onIcon: '📶', offIcon: '📴' },
            { name: 'has_library', label: 'مكتبة', icon: '📚', onIcon: '📚', offIcon: '📕' },
            { name: 'has_smart_lab', label: 'معمل أوائل', icon: '💻', onIcon: '💻', offIcon: '🖥️' },
          ].map(toggle => {
            const isOn = !!formData[toggle.name];
            return (
              <button
                key={toggle.name}
                type="button"
                onClick={() => handleChange(toggle.name, !isOn)}
                className={`relative p-4 rounded-xl border-2 text-center transition-all
                  ${isOn
                    ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                    : 'border-gray-100 hover:border-gray-200'}`}
              >
                <span className="text-2xl block mb-2">{isOn ? toggle.onIcon : toggle.offIcon}</span>
                <p className={`text-xs font-bold ${isOn ? 'text-emerald-700' : 'text-gray-400'}`}>{toggle.label}</p>
                {/* Toggle indicator */}
                <div className={`absolute top-2 left-2 w-3 h-3 rounded-full transition-colors ${isOn ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 -mx-6 px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="text-xs text-gray-400 font-bold flex items-center gap-2">
          <span className="text-teal-500">🏛️</span>
          {formData.actual_classrooms > 0
            ? `${formData.actual_classrooms} فصل | ${formData.total_labs} معمل | ${formData.surveillance_cameras} كاميرا`
            : 'لم يتم إدخال بيانات المبنى بعد'}
        </div>
        <button type="submit" disabled={loading}
          className="px-8 py-2.5 text-sm font-black bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-teal-200 transition-all flex items-center gap-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الحفظ...</>
          ) : '💾 حفظ بيانات المبنى'}
        </button>
      </div>
    </form>
  );
}
