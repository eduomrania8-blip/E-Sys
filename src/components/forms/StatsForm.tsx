'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { GRADE_CONFIGS, type EducationStage } from '@/services/excelImporter';

// ─── إعدادات المراحل — قابلة للتوسع مستقبلاً ────────────────────────

interface StageTab {
  id: EducationStage;
  label: string;
  icon: string;
  active: boolean; // هل هي مفعّلة في هذا النظام؟
}

const STAGE_TABS: StageTab[] = [
  { id: 'kg',          label: 'رياض الأطفال',  icon: '🌱', active: true },
  { id: 'primary',     label: 'المرحلة الابتدائية', icon: '📚', active: true },
  { id: 'preparatory', label: 'المرحلة الإعدادية', icon: '🎓', active: false }, // مستقبلاً
  { id: 'secondary',   label: 'المرحلة الثانوية',  icon: '🏛️', active: false }, // مستقبلاً
];

const ACTIVE_STAGE_TABS = STAGE_TABS.filter(s => s.active);

// الصفوف لكل مرحلة
const GRADE_KEYS_BY_STAGE: Record<EducationStage, string[]> = {
  kg:          GRADE_CONFIGS.filter(g => g.stage === 'kg').map(g => g.key),
  primary:     GRADE_CONFIGS.filter(g => g.stage === 'primary').map(g => g.key),
  preparatory: GRADE_CONFIGS.filter(g => g.stage === 'preparatory').map(g => g.key),
  secondary:   GRADE_CONFIGS.filter(g => g.stage === 'secondary').map(g => g.key),
};

// ─── نوع صف الإحصاءات ────────────────────────────────────────────────

interface GradeStat {
  grade_level: string;
  number_of_classes: number;
  boys_count: number;
  girls_count: number;
  muslim_count: number;
  christian_count: number;
  inclusion_mental: number;
  inclusion_hearing: number;
  inclusion_visual: number;
  inclusion_physical: number;
  inclusion_multiple: number;
  expatriate_count: number;
  transferred_or_new: number;
  retained_for_repeat: number;
  dropout_count: number;
}

function emptyGrade(gradeKey: string): GradeStat {
  return {
    grade_level: gradeKey, number_of_classes: 0,
    boys_count: 0, girls_count: 0, muslim_count: 0, christian_count: 0,
    inclusion_mental: 0, inclusion_hearing: 0, inclusion_visual: 0,
    inclusion_physical: 0, inclusion_multiple: 0,
    expatriate_count: 0, transferred_or_new: 0,
    retained_for_repeat: 0, dropout_count: 0,
  };
}

// ─── المكوّن الرئيسي ──────────────────────────────────────────────────

export default function StatsForm({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [activeStage, setActiveStage] = useState<EducationStage>('primary');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [stats, setStats] = useState<Record<string, GradeStat>>({});

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // جلب البيانات الموجودة مرة واحدة فقط
  useEffect(() => {
    supabase.from('class_statistics')
      .select('*')
      .eq('school_id', schoolId)
      .eq('academic_year', '2025-2026')
      .then(({ data }) => {
        const initStats: Record<string, GradeStat> = {};
        // تهيئة جميع الصفوف المفعّلة بقيم افتراضية
        for (const stage of ACTIVE_STAGE_TABS) {
          for (const gradeKey of GRADE_KEYS_BY_STAGE[stage.id]) {
            const existing = data?.find(d => d.grade_level === gradeKey);
            initStats[gradeKey] = existing
              ? { ...emptyGrade(gradeKey), ...existing }
              : emptyGrade(gradeKey);
          }
        }
        setStats(initStats);
        setFetching(false);
      });
  }, [schoolId, supabase]);

  const handleChange = useCallback((grade: string, field: keyof GradeStat, value: string) => {
    setStats(prev => ({
      ...prev,
      [grade]: { ...prev[grade], [field]: Math.max(0, parseInt(value) || 0) }
    }));
  }, []);

  // إجماليات لحظية للمرحلة الحالية
  const totals = useMemo(() => {
    const grades = GRADE_KEYS_BY_STAGE[activeStage];
    const t = {
      classes: 0, boys: 0, girls: 0, total: 0,
      muslim: 0, christian: 0, inclusionTotal: 0,
      expats: 0, dropout: 0,
    };
    grades.forEach(g => {
      const s = stats[g];
      if (!s) return;
      t.classes += s.number_of_classes;
      t.boys    += s.boys_count;
      t.girls   += s.girls_count;
      t.total   += s.boys_count + s.girls_count;
      t.muslim  += s.muslim_count;
      t.christian += s.christian_count;
      t.inclusionTotal += s.inclusion_mental + s.inclusion_hearing + s.inclusion_visual + s.inclusion_physical + s.inclusion_multiple;
      t.expats  += s.expatriate_count;
      t.dropout += s.dropout_count;
    });
    return t;
  }, [stats, activeStage]);

  const handleSave = async () => {
    setLoading(true);
    const grades = GRADE_KEYS_BY_STAGE[activeStage];
    const rows = grades
      .map(g => stats[g])
      .filter(s => s && (s.number_of_classes > 0 || s.boys_count + s.girls_count > 0))
      .map(s => ({ ...s, school_id: schoolId, academic_year: '2025-2026' }));

    if (rows.length === 0) {
      showToast('لم يتم إدخال أي بيانات — يرجى إدخال عدد الفصول أو الطلاب أولاً', 'error');
      setLoading(false);
      return;
    }

    try {
      // حذف الصفوف القديمة لهذه المرحلة ثم إدراج الجديدة
      await supabase
        .from('class_statistics')
        .delete()
        .eq('school_id', schoolId)
        .eq('academic_year', '2025-2026')
        .in('grade_level', grades);

      const { error } = await supabase
        .from('class_statistics')
        .insert(rows);

      if (error) throw error;
      showToast(`✅ تم حفظ ${rows.length} صف دراسي بنجاح`, 'success');
    } catch (err: any) {
      showToast(`خطأ في الحفظ: ${err.message}`, 'error');
    }
    setLoading(false);
  };

  if (fetching) return (
    <div className="space-y-3 animate-pulse" dir="rtl">
      {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
    </div>
  );

  const currentGrades = GRADE_KEYS_BY_STAGE[activeStage];

  return (
    <div className="space-y-4 animate-in fade-in" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl transition-all animate-in slide-in-from-top-2
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* تبويبات المراحل */}
      <div className="flex gap-2 flex-wrap">
        {ACTIVE_STAGE_TABS.map(stage => (
          <button
            key={stage.id}
            onClick={() => setActiveStage(stage.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${activeStage === stage.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <span>{stage.icon}</span>
            {stage.label}
            {/* إظهار عدد الصفوف المدخلة */}
            {(() => {
              const count = GRADE_KEYS_BY_STAGE[stage.id].filter(g =>
                stats[g] && (stats[g].number_of_classes > 0 || stats[g].boys_count + stats[g].girls_count > 0)
              ).length;
              return count > 0 ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeStage === stage.id ? 'bg-white/30' : 'bg-blue-100 text-blue-700'}`}>
                  {count}
                </span>
              ) : null;
            })()}
          </button>
        ))}

        {/* المراحل المستقبلية (معطَّلة حالياً) */}
        {STAGE_TABS.filter(s => !s.active).map(stage => (
          <button
            key={stage.id}
            disabled
            title="سيُتاح في النسخة القادمة"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-gray-50 text-gray-300 cursor-not-allowed border border-dashed border-gray-200"
          >
            <span>{stage.icon}</span>
            {stage.label}
            <span className="text-[9px] bg-gray-200 text-gray-400 px-1.5 py-0.5 rounded-full">قريباً</span>
          </button>
        ))}
      </div>

      {/* الجدول */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-lg">
        <table className="w-full text-right bg-white text-xs" dir="rtl">
          <thead className="bg-[#1e293b] text-white">
            <tr className="text-center">
              <th className="px-3 py-4 text-sm font-black sticky right-0 bg-[#0f172a] z-10">الصف الدراسي</th>
              <th className="px-2 py-4 border-r border-white/10">الفصول</th>
              <th className="px-2 py-4 border-r border-white/10 bg-blue-900/30">بنين</th>
              <th className="px-2 py-4 border-r border-white/10 bg-blue-900/30">بنات</th>
              <th className="px-2 py-4 border-r border-white/10 bg-slate-700 font-black text-blue-300">المجموع</th>
              <th className="px-2 py-4 border-r border-white/10">مسلم</th>
              <th className="px-2 py-4 border-r border-white/10">مسيحي</th>
              <th className="px-2 py-4 border-r border-emerald-800/50 bg-emerald-900/30">ذهني</th>
              <th className="px-2 py-4 border-r border-emerald-800/50 bg-emerald-900/30">سمعي</th>
              <th className="px-2 py-4 border-r border-emerald-800/50 bg-emerald-900/30">بصري</th>
              <th className="px-2 py-4 border-r border-emerald-800/50 bg-emerald-900/30">حركي</th>
              <th className="px-2 py-4 border-r border-emerald-800/50 bg-emerald-900/30">متعدد</th>
              <th className="px-2 py-4 border-r border-white/10">وافد</th>
              <th className="px-2 py-4 border-r border-white/10">مستجد</th>
              <th className="px-2 py-4 border-r border-white/10">راسب</th>
              <th className="px-2 py-4">متسرب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {currentGrades.map(g => {
              const s = stats[g] ?? emptyGrade(g);
              const total = s.boys_count + s.girls_count;
              const hasData = s.number_of_classes > 0 || total > 0;

              return (
                <tr key={g} className={`hover:bg-blue-50/40 transition-colors group text-center ${hasData ? '' : 'opacity-60'}`}>
                  <td className={`px-3 py-2 font-black text-sm text-right sticky right-0 z-10 border-r border-gray-100
                    ${hasData ? 'bg-blue-50 text-blue-900' : 'bg-white text-gray-400 group-hover:bg-blue-50/40'}`}>
                    {g}
                  </td>
                  {/* الفصول */}
                  <NumCell val={s.number_of_classes} onChange={v => handleChange(g, 'number_of_classes', v)} />
                  {/* بنين/بنات */}
                  <NumCell val={s.boys_count}   onChange={v => handleChange(g, 'boys_count', v)}   bg="bg-blue-50/30" />
                  <NumCell val={s.girls_count}  onChange={v => handleChange(g, 'girls_count', v)}  bg="bg-blue-50/30" />
                  {/* المجموع محسوب */}
                  <td className="px-2 py-2 font-black text-blue-700 bg-slate-50 text-sm">{total || '—'}</td>
                  {/* ديانة */}
                  <NumCell val={s.muslim_count}    onChange={v => handleChange(g, 'muslim_count', v)} />
                  <NumCell val={s.christian_count} onChange={v => handleChange(g, 'christian_count', v)} />
                  {/* دمج */}
                  <NumCell val={s.inclusion_mental}   onChange={v => handleChange(g, 'inclusion_mental', v)}   bg="bg-emerald-50/40" />
                  <NumCell val={s.inclusion_hearing}  onChange={v => handleChange(g, 'inclusion_hearing', v)}  bg="bg-emerald-50/40" />
                  <NumCell val={s.inclusion_visual}   onChange={v => handleChange(g, 'inclusion_visual', v)}   bg="bg-emerald-50/40" />
                  <NumCell val={s.inclusion_physical} onChange={v => handleChange(g, 'inclusion_physical', v)} bg="bg-emerald-50/40" />
                  <NumCell val={s.inclusion_multiple} onChange={v => handleChange(g, 'inclusion_multiple', v)} bg="bg-emerald-50/40" />
                  {/* أخرى */}
                  <NumCell val={s.expatriate_count}    onChange={v => handleChange(g, 'expatriate_count', v)} />
                  <NumCell val={s.transferred_or_new}  onChange={v => handleChange(g, 'transferred_or_new', v)} />
                  <NumCell val={s.retained_for_repeat} onChange={v => handleChange(g, 'retained_for_repeat', v)} />
                  <NumCell val={s.dropout_count}       onChange={v => handleChange(g, 'dropout_count', v)} />
                </tr>
              );
            })}
          </tbody>
          {/* صف الإجماليات */}
          <tfoot className="bg-[#0f172a] text-white font-black text-center">
            <tr>
              <td className="px-3 py-3 text-right sticky right-0 bg-[#020617] text-sm">الإجمالي</td>
              <td className="px-2 py-3">{totals.classes || '—'}</td>
              <td className="px-2 py-3 bg-blue-900/30">{totals.boys || '—'}</td>
              <td className="px-2 py-3 bg-blue-900/30">{totals.girls || '—'}</td>
              <td className="px-2 py-3 bg-slate-800 text-blue-300 text-sm">{totals.total || '—'}</td>
              <td className="px-2 py-3">{totals.muslim || '—'}</td>
              <td className="px-2 py-3">{totals.christian || '—'}</td>
              <td colSpan={5} className="px-2 py-3 bg-emerald-900/30 text-emerald-300">{totals.inclusionTotal || '—'} (دمج)</td>
              <td className="px-2 py-3">{totals.expats || '—'}</td>
              <td colSpan={2} className="px-2 py-3" />
              <td className="px-2 py-3 text-rose-300">{totals.dropout || '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Sticky Footer للحفظ */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-100 -mx-6 px-6 py-4 flex items-center justify-between shadow-xl mt-6">
        <div className="text-xs text-gray-400 font-bold">
          {totals.total > 0
            ? `إجمالي طلاب المرحلة: ${totals.total.toLocaleString('ar-EG')} طالب في ${totals.classes} فصل`
            : 'لم يتم إدخال بيانات بعد'}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            تجاهل التغييرات
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-2.5 text-sm font-black bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />جاري الحفظ...</>
            ) : '💾 حفظ الإحصاءات'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── مكوّن حقل الإدخال الرقمي ─────────────────────────────────────────

function NumCell({
  val,
  onChange,
  bg = '',
}: {
  val: number;
  onChange: (v: string) => void;
  bg?: string;
}) {
  return (
    <td className={`px-1 py-1 border-r border-gray-50 ${bg}`}>
      <input
        type="number"
        min="0"
        // الإصلاح الجوهري: نعرض 0 فعلاً وليس string فارغة
        value={val === 0 ? '0' : val}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { if (e.target.value === '0') e.target.select(); }}
        className={`w-12 text-center font-mono text-xs py-1.5 rounded-lg border border-transparent
          focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all
          ${val > 0 ? 'bg-white font-bold text-gray-900' : 'bg-transparent text-gray-300'}`}
      />
    </td>
  );
}
