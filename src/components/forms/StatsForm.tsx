'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { GRADE_CONFIGS, type EducationStage } from '@/services/excelImporter';

// ─── إعدادات المراحل — قابلة للتوسع مستقبلاً ────────────────────────

interface StageTab {
  id: EducationStage;
  label: string;
  icon: string;
  active: boolean;
}

const STAGE_TABS: StageTab[] = [
  { id: 'kg',          label: 'رياض الأطفال',  icon: '🌱', active: true },
  { id: 'primary',     label: 'المرحلة الابتدائية', icon: '📚', active: true },
  { id: 'preparatory', label: 'المرحلة الإعدادية', icon: '🎓', active: false },
  { id: 'secondary',   label: 'المرحلة الثانوية',  icon: '🏛️', active: false },
];

const ACTIVE_STAGE_TABS = STAGE_TABS.filter(s => s.active);

const GRADE_KEYS_BY_STAGE: Record<EducationStage, string[]> = {
  kg:          GRADE_CONFIGS.filter(g => g.stage === 'kg').map(g => g.key),
  primary:     GRADE_CONFIGS.filter(g => g.stage === 'primary').map(g => g.key),
  preparatory: GRADE_CONFIGS.filter(g => g.stage === 'preparatory').map(g => g.key),
  secondary:   GRADE_CONFIGS.filter(g => g.stage === 'secondary').map(g => g.key),
};

// ─── Column Groups for better organization ──────────────────────────

const COLUMN_GROUPS = [
  { id: 'basic', label: 'بيانات أساسية', columns: ['number_of_classes', 'boys_count', 'girls_count'], color: 'blue' },
  { id: 'religion', label: 'الديانة', columns: ['muslim_count', 'christian_count'], color: 'slate' },
  { id: 'inclusion', label: 'الدمج', columns: ['inclusion_mental', 'inclusion_hearing', 'inclusion_visual', 'inclusion_physical', 'inclusion_multiple'], color: 'emerald' },
  { id: 'other', label: 'أخرى', columns: ['expatriate_count', 'transferred_or_new', 'retained_for_repeat', 'dropout_count'], color: 'gray' },
];

const COLUMN_LABELS: Record<string, { short: string; full: string; tooltip: string }> = {
  number_of_classes:   { short: 'الفصول', full: 'عدد الفصول', tooltip: 'عدد الفصول الدراسية المخصصة لهذا الصف' },
  boys_count:          { short: 'بنين', full: 'عدد البنين', tooltip: 'عدد الطلاب الذكور المقيدين في هذا الصف' },
  girls_count:         { short: 'بنات', full: 'عدد البنات', tooltip: 'عدد الطالبات الإناث المقيدات في هذا الصف' },
  muslim_count:        { short: 'مسلم', full: 'عدد المسلمين', tooltip: 'عدد الطلاب المسلمين' },
  christian_count:     { short: 'مسيحي', full: 'عدد المسيحيين', tooltip: 'عدد الطلاب المسيحيين' },
  inclusion_mental:    { short: 'ذهني', full: 'إعاقة ذهنية', tooltip: 'طلاب الدمج ذوو الإعاقة الذهنية (صعوبات التعلم)' },
  inclusion_hearing:   { short: 'سمعي', full: 'إعاقة سمعية', tooltip: 'طلاب الدمج ذوو الإعاقة السمعية' },
  inclusion_visual:    { short: 'بصري', full: 'إعاقة بصرية', tooltip: 'طلاب الدمج ذوو الإعاقة البصرية' },
  inclusion_physical:  { short: 'حركي', full: 'إعاقة حركية', tooltip: 'طلاب الدمج ذوو الإعاقة الحركية' },
  inclusion_multiple:  { short: 'متعدد', full: 'إعاقة متعددة', tooltip: 'طلاب الدمج ذوو إعاقات متعددة' },
  expatriate_count:    { short: 'وافد', full: 'عدد الوافدين', tooltip: 'عدد الطلاب الوافدين (غير مصريين)' },
  transferred_or_new:  { short: 'مستجد', full: 'محول/مستجد', tooltip: 'عدد الطلاب المحولين من مدارس أخرى أو المستجدين' },
  retained_for_repeat: { short: 'راسب', full: 'باقٍ للإعادة', tooltip: 'عدد الطلاب الراسبين (الباقين للإعادة)' },
  dropout_count:       { short: 'متسرب', full: 'متسرب/منقطع', tooltip: 'عدد الطلاب المتسربين أو المنقطعين عن الدراسة' },
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
  const [focusedCell, setFocusedCell] = useState<{ grade: string; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

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
    setHasChanges(true);
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
      expats: 0, dropout: 0, transferred: 0, retained: 0,
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
      t.transferred += s.transferred_or_new;
      t.retained += s.retained_for_repeat;
    });
    return t;
  }, [stats, activeStage]);

  const avgDensity = totals.classes > 0 ? (totals.total / totals.classes).toFixed(1) : '0';

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
      setHasChanges(false);
    } catch (err: any) {
      showToast(`خطأ في الحفظ: ${err.message}`, 'error');
    }
    setLoading(false);
  };

  if (fetching) return (
    <div className="space-y-3" dir="rtl">
      {[...Array(6)].map((_, i) => <div key={i} className="h-12 skeleton-shimmer rounded-xl" />)}
    </div>
  );

  const currentGrades = GRADE_KEYS_BY_STAGE[activeStage];

  return (
    <div className="space-y-5 animate-in" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={`${toast.type === 'success' ? 'toast-success' : 'toast-error'} animate-slide-down`}>
          {toast.text}
        </div>
      )}

      {/* ═══════ Summary Cards ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="إجمالي الطلاب" value={totals.total} icon="👥" color="blue" />
        <SummaryCard label="عدد الفصول" value={totals.classes} icon="🏫" color="teal" />
        <SummaryCard label="متوسط الكثافة" value={avgDensity} icon="📊" color={Number(avgDensity) > 50 ? 'red' : 'green'} suffix="ط/ف" />
        <SummaryCard label="طلاب الدمج" value={totals.inclusionTotal} icon="♿" color="purple" />
      </div>

      {/* ═══════ تبويبات المراحل ═══════ */}
      <div className="flex gap-2 flex-wrap">
        {ACTIVE_STAGE_TABS.map(stage => {
          const stageGrades = GRADE_KEYS_BY_STAGE[stage.id];
          const filledCount = stageGrades.filter(g =>
            stats[g] && (stats[g].number_of_classes > 0 || stats[g].boys_count + stats[g].girls_count > 0)
          ).length;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${activeStage === stage.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <span>{stage.icon}</span>
              {stage.label}
              {filledCount > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeStage === stage.id ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-700'
                }`}>
                  {filledCount}/{stageGrades.length}
                </span>
              )}
            </button>
          );
        })}

        {/* المراحل المستقبلية */}
        {STAGE_TABS.filter(s => !s.active).map(stage => (
          <button
            key={stage.id}
            disabled
            title="سيُتاح في النسخة القادمة"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-50 text-gray-300 cursor-not-allowed border border-dashed border-gray-200"
          >
            <span>{stage.icon}</span>
            {stage.label}
            <span className="text-[9px] bg-gray-200 text-gray-400 px-1.5 py-0.5 rounded-full">قريباً</span>
          </button>
        ))}
      </div>

      {/* ═══════ الجدول ═══════ */}
      <div ref={tableRef} className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
        <table className="w-full text-right bg-white text-xs" dir="rtl">
          <thead>
            {/* Group Headers */}
            <tr className="bg-gray-800 text-white text-[10px]">
              <th className="px-3 py-2 sticky right-0 bg-gray-900 z-10" rowSpan={2}>الصف</th>
              {COLUMN_GROUPS.map(group => (
                <th key={group.id} colSpan={group.columns.length + (group.id === 'basic' ? 1 : 0)}
                  className={`px-2 py-2 text-center border-r border-white/10 font-black ${
                    group.id === 'inclusion' ? 'bg-emerald-900/40' : group.id === 'basic' ? 'bg-blue-900/40' : ''
                  }`}>
                  {group.label}
                </th>
              ))}
            </tr>
            {/* Column Headers */}
            <tr className="bg-gray-700 text-white">
              {COLUMN_GROUPS.flatMap(group => {
                const cols = group.columns.map(col => (
                  <th key={col} className={`px-2 py-3 text-center border-r border-white/10 cursor-help ${
                    group.id === 'inclusion' ? 'bg-emerald-900/20' : group.id === 'basic' ? 'bg-blue-900/20' : ''
                  }`}
                    title={COLUMN_LABELS[col]?.tooltip}
                  >
                    <span className="tooltip-trigger" data-tooltip={COLUMN_LABELS[col]?.tooltip}>
                      {COLUMN_LABELS[col]?.short}
                    </span>
                  </th>
                ));
                // Add computed total column after basic group
                if (group.id === 'basic') {
                  cols.push(
                    <th key="total" className="px-2 py-3 text-center border-r border-white/10 bg-slate-600 font-black text-blue-200">
                      المجموع
                    </th>
                  );
                }
                return cols;
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {currentGrades.map((g, rowIdx) => {
              const s = stats[g] ?? emptyGrade(g);
              const total = s.boys_count + s.girls_count;
              const density = s.number_of_classes > 0 ? Math.round(total / s.number_of_classes * 10) / 10 : 0;
              const hasData = s.number_of_classes > 0 || total > 0;
              const isHighDensity = density > 50;

              return (
                <tr key={g} className={`group transition-colors text-center ${
                  hasData ? 'hover:bg-blue-50/40' : 'hover:bg-gray-50 opacity-50'
                } ${isHighDensity ? 'bg-red-50/30' : ''}`}>
                  {/* Grade name */}
                  <td className={`px-3 py-2 font-black text-sm text-right sticky right-0 z-10 border-r border-gray-100
                    ${hasData ? 'bg-blue-50 text-blue-900' : 'bg-white text-gray-400 group-hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{g}</span>
                      {density > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                          density > 60 ? 'bg-red-100 text-red-700' :
                          density > 50 ? 'bg-orange-100 text-orange-700' :
                          density > 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {density}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* All columns */}
                  {COLUMN_GROUPS.flatMap(group => {
                    const cells = group.columns.map(col => (
                      <td key={col} className={`px-1 py-1 border-r border-gray-50 ${
                        group.id === 'inclusion' ? 'bg-emerald-50/20' :
                        group.id === 'basic' && col !== 'number_of_classes' ? 'bg-blue-50/20' : ''
                      }`}>
                        <input
                          type="number"
                          min="0"
                          value={s[col as keyof GradeStat] === 0 ? '0' : s[col as keyof GradeStat]}
                          onChange={e => handleChange(g, col as keyof GradeStat, e.target.value)}
                          onFocus={e => {
                            setFocusedCell({ grade: g, field: col });
                            if (e.target.value === '0') e.target.select();
                          }}
                          onBlur={() => setFocusedCell(null)}
                          className={`num-input ${
                            (s[col as keyof GradeStat] as number) > 0 ? 'bg-white font-bold text-gray-900' : 'bg-transparent text-gray-300'
                          } ${focusedCell?.grade === g && focusedCell?.field === col ? 'ring-2 ring-blue-400 border-blue-400' : ''}`}
                        />
                      </td>
                    ));
                    // Computed total
                    if (group.id === 'basic') {
                      cells.push(
                        <td key="total" className="px-2 py-2 font-black text-blue-700 bg-slate-50/80 text-sm">
                          {total || '—'}
                        </td>
                      );
                    }
                    return cells;
                  })}
                </tr>
              );
            })}
          </tbody>
          {/* صف الإجماليات */}
          <tfoot className="bg-gray-900 text-white font-black text-center">
            <tr>
              <td className="px-3 py-3 text-right sticky right-0 bg-gray-950 text-sm">
                <div className="flex items-center justify-between">
                  <span>الإجمالي</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                    Number(avgDensity) > 50 ? 'bg-red-500/30 text-red-200' : 'bg-emerald-500/30 text-emerald-200'
                  }`}>
                    كثافة: {avgDensity}
                  </span>
                </div>
              </td>
              <td className="px-2 py-3">{totals.classes || '—'}</td>
              <td className="px-2 py-3 bg-blue-900/20">{totals.boys || '—'}</td>
              <td className="px-2 py-3 bg-blue-900/20">{totals.girls || '—'}</td>
              <td className="px-2 py-3 bg-slate-800 text-blue-300 text-sm font-black">{totals.total || '—'}</td>
              <td className="px-2 py-3">{totals.muslim || '—'}</td>
              <td className="px-2 py-3">{totals.christian || '—'}</td>
              <td colSpan={5} className="px-2 py-3 bg-emerald-900/20 text-emerald-300">
                {totals.inclusionTotal || '—'} <span className="text-[9px] opacity-60">(إجمالي الدمج)</span>
              </td>
              <td className="px-2 py-3">{totals.expats || '—'}</td>
              <td className="px-2 py-3">{totals.transferred || '—'}</td>
              <td className="px-2 py-3">{totals.retained || '—'}</td>
              <td className="px-2 py-3 text-rose-300">{totals.dropout || '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ═══════ Validation Warnings ═══════ */}
      {Number(avgDensity) > 50 && totals.total > 0 && (
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-slide-up">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-black text-orange-800">تحذير: كثافة مرتفعة</p>
            <p className="text-xs text-orange-600">
              متوسط الكثافة ({avgDensity} طالب/فصل) يتجاوز الحد المسموح (50 طالب/فصل).
              يُنصح بزيادة عدد الفصول أو تحويل بعض الطلاب.
            </p>
          </div>
        </div>
      )}

      {/* ═══════ Sticky Footer للحفظ ═══════ */}
      <div className="sticky-save-bar mt-6">
        <div className="text-xs text-gray-400 font-bold flex items-center gap-2">
          {hasChanges && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              تغييرات غير محفوظة
            </span>
          )}
          {!hasChanges && totals.total > 0 && (
            <span className="text-emerald-600">✅ البيانات محفوظة</span>
          )}
          {totals.total > 0 && (
            <span className="mx-2 text-gray-300">|</span>
          )}
          {totals.total > 0
            ? `${totals.total.toLocaleString('ar-EG')} طالب في ${totals.classes} فصل — كثافة ${avgDensity}`
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
            disabled={loading || !hasChanges}
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

// ─── Summary Card Component ─────────────────────────────────────────

function SummaryCard({ label, value, icon, color, suffix }: {
  label: string; value: number | string; icon: string; color: string; suffix?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    teal: 'from-teal-500 to-teal-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
  };
  return (
    <div className="stat-micro">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color] ?? colorMap.blue} flex items-center justify-center text-white text-lg shrink-0 shadow-md`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-black text-gray-900 leading-tight">
          {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
          {suffix && <span className="text-[10px] text-gray-400 mr-1">{suffix}</span>}
        </p>
        <p className="text-[10px] font-bold text-gray-400">{label}</p>
      </div>
    </div>
  );
}
