'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const FIELD_GROUPS = [
  {
    title: '📐 المبنى والفصول',
    icon: '🏫',
    fields: [
      { name: 'actual_classrooms', label: 'الفصول الدراسية', icon: '🏫', max: 50, tooltip: 'عدد الفصول الدراسية الفعلية المستخدمة' },
      { name: 'admin_rooms', label: 'الغرف الإدارية', icon: '🗄️', max: 20, tooltip: 'غرف الإدارة والمكاتب' },
      { name: 'number_of_floors', label: 'عدد الأدوار', icon: '🏢', max: 10, tooltip: 'عدد أدوار المبنى المدرسي' },
    ],
  },
  {
    title: '🔬 المعامل والأنشطة',
    icon: '🔬',
    fields: [
      { name: 'total_labs', label: 'المعامل', icon: '🔬', max: 15, tooltip: 'معامل العلوم والحاسب الآلي' },
      { name: 'activity_rooms', label: 'حجرات الأنشطة', icon: '🎨', max: 15, tooltip: 'حجرات الموسيقى والفنون والأنشطة' },
      { name: 'playgrounds', label: 'الملاعب', icon: '⚽', max: 5, tooltip: 'الملاعب الرياضية' },
    ],
  },
  {
    title: '🚿 دورات المياه',
    icon: '🚿',
    fields: [
      { name: 'boys_toilets', label: 'دورات بنين', icon: '🚹', max: 20, tooltip: 'عدد دورات المياه المخصصة للطلاب' },
      { name: 'girls_toilets', label: 'دورات بنات', icon: '🚺', max: 20, tooltip: 'عدد دورات المياه المخصصة للطالبات' },
      { name: 'staff_toilets', label: 'دورات العاملين', icon: '👥', max: 10, tooltip: 'عدد دورات المياه المخصصة للعاملين' },
    ],
  },
  {
    title: '📷 الأمن والتجهيزات',
    icon: '📷',
    fields: [
      { name: 'surveillance_cameras', label: 'كاميرات المراقبة', icon: '📷', max: 50, tooltip: 'عدد كاميرات المراقبة المثبتة' },
    ],
  },
];

const FACILITY_TOGGLES = [
  { name: 'has_landline', label: 'تليفون أرضي', onIcon: '📞', offIcon: '📵', tooltip: 'هل يوجد خط تليفون أرضي؟' },
  { name: 'has_internet', label: 'إنترنت Wi-Fi', onIcon: '📶', offIcon: '📴', tooltip: 'هل تتوفر خدمة الإنترنت؟' },
  { name: 'has_library', label: 'مكتبة', onIcon: '📚', offIcon: '📕', tooltip: 'هل توجد مكتبة مدرسية؟' },
  { name: 'has_smart_lab', label: 'معمل أوائل', onIcon: '💻', offIcon: '🖥️', tooltip: 'هل يوجد معمل أوائل الطلبة (ذكي)؟' },
];

export default function BuildingForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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
    setHasChanges(true);
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const increment = (name: string, max: number) => {
    setHasChanges(true);
    setFormData((prev: any) => ({ ...prev, [name]: Math.min((prev[name] || 0) + 1, max) }));
  };

  const decrement = (name: string) => {
    setHasChanges(true);
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
      setHasChanges(false);
    }
    setLoading(false);
  };

  // Summary stats
  const facilitiesCount = [formData.has_landline, formData.has_internet, formData.has_library, formData.has_smart_lab].filter(Boolean).length;

  if (fetching) return (
    <div className="space-y-4" dir="rtl">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton-shimmer rounded-xl" />)}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`${toast.type === 'success' ? 'toast-success' : 'toast-error'} animate-slide-down`}>
          {toast.text}
        </div>
      )}

      {/* ═══════ Summary Cards ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-micro">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg shrink-0 shadow-md">🏫</div>
          <div>
            <p className="text-lg font-black text-gray-900">{formData.actual_classrooms}</p>
            <p className="text-[10px] font-bold text-gray-400">فصل دراسي</p>
          </div>
        </div>
        <div className="stat-micro">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-lg shrink-0 shadow-md">🔬</div>
          <div>
            <p className="text-lg font-black text-gray-900">{formData.total_labs}</p>
            <p className="text-[10px] font-bold text-gray-400">معمل</p>
          </div>
        </div>
        <div className="stat-micro">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-lg shrink-0 shadow-md">📷</div>
          <div>
            <p className="text-lg font-black text-gray-900">{formData.surveillance_cameras}</p>
            <p className="text-[10px] font-bold text-gray-400">كاميرا</p>
          </div>
        </div>
        <div className="stat-micro">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-lg shrink-0 shadow-md">📡</div>
          <div>
            <p className="text-lg font-black text-gray-900">{facilitiesCount}/4</p>
            <p className="text-[10px] font-bold text-gray-400">مرافق متاحة</p>
          </div>
        </div>
      </div>

      {/* ═══════ حالة المبنى + السور ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
          <label className="form-section-title">🏗️ حالة المبنى</label>
          <div className="grid grid-cols-2 gap-2">
            {['مستقل', 'يعمل مع مدارس أخرى'].map(opt => (
              <button key={opt} type="button" onClick={() => handleChange('building_status', opt)}
                className={`p-3.5 rounded-xl text-sm font-bold border-2 transition-all
                  ${formData.building_status === opt
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
              >
                {opt === 'مستقل' ? '🏫' : '🏘️'} {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/30">
          <label className="form-section-title">🧱 حالة السور</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'جيد', icon: '✅', bg: 'emerald' },
              { val: 'يحتاج صيانة', icon: '⚠️', bg: 'amber' },
              { val: 'غير موجود', icon: '❌', bg: 'red' },
            ].map(opt => (
              <button key={opt.val} type="button" onClick={() => handleChange('fence_condition', opt.val)}
                className={`p-3 rounded-xl text-xs font-bold border-2 transition-all text-center
                  ${formData.fence_condition === opt.val
                    ? `border-${opt.bg}-400 bg-${opt.bg}-50 text-${opt.bg}-700 shadow-md`
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
              >
                <span className="text-lg block mb-1">{opt.icon}</span>
                {opt.val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ مجموعات الحقول العددية ═══════ */}
      {FIELD_GROUPS.map(group => (
        <div key={group.title} className="p-4 rounded-xl border border-gray-100">
          <h3 className="form-section-title">{group.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {group.fields.map(field => {
              const val = formData[field.name] || 0;
              const pct = field.max > 0 ? Math.min((val / field.max) * 100, 100) : 0;
              return (
                <div key={field.name}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all tooltip-trigger
                    ${val > 0 ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-gray-50/30'}`}
                  data-tooltip={field.tooltip}
                >
                  <span className="text-xl shrink-0">{field.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-500">{field.label}</p>
                    <p className={`text-lg font-black ${val > 0 ? 'text-blue-700' : 'text-gray-300'}`}>{val}</p>
                    {/* Mini progress bar */}
                    <div className="w-full h-1 bg-gray-200 rounded-full mt-1">
                      <div className="h-1 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => increment(field.name, field.max)}
                      className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-black hover:bg-blue-200 transition-colors flex items-center justify-center text-sm active:scale-95">
                      +
                    </button>
                    <button type="button" onClick={() => decrement(field.name)}
                      disabled={val === 0}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 font-black hover:bg-gray-200 disabled:opacity-30 transition-colors flex items-center justify-center text-sm active:scale-95">
                      −
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ═══════ Toggles: مرافق ═══════ */}
      <div className="p-4 rounded-xl border border-gray-100">
        <h3 className="form-section-title">📡 المرافق والخدمات</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FACILITY_TOGGLES.map(toggle => {
            const isOn = !!formData[toggle.name];
            return (
              <button
                key={toggle.name}
                type="button"
                onClick={() => handleChange(toggle.name, !isOn)}
                className={`relative p-4 rounded-xl border-2 text-center transition-all tooltip-trigger
                  ${isOn
                    ? 'border-emerald-300 bg-emerald-50 shadow-md'
                    : 'border-gray-100 hover:border-gray-200'}`}
                data-tooltip={toggle.tooltip}
              >
                <span className="text-2xl block mb-2">{isOn ? toggle.onIcon : toggle.offIcon}</span>
                <p className={`text-xs font-bold ${isOn ? 'text-emerald-700' : 'text-gray-400'}`}>{toggle.label}</p>
                <div className={`absolute top-2 left-2 w-3 h-3 rounded-full transition-colors ${isOn ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════ Sticky Save Bar ═══════ */}
      <div className="sticky-save-bar">
        <div className="text-xs text-gray-400 font-bold flex items-center gap-2">
          {hasChanges && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              تغييرات غير محفوظة
            </span>
          )}
          {!hasChanges && formData.actual_classrooms > 0 && (
            <span className="text-emerald-600">✅ البيانات محفوظة</span>
          )}
          {formData.actual_classrooms > 0 && (
            <>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-teal-500">🏛️</span>
              {formData.actual_classrooms} فصل | {formData.total_labs} معمل | {formData.surveillance_cameras} كاميرا
            </>
          )}
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
