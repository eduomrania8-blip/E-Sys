'use client';
// src/app/school/components/reports/OfficialShortageReport.tsx
// كشف العجز والزيادة الرسمي — مطابق للنموذج الوزاري

import React, { useMemo } from 'react';
import { ReportHeader, ReportFooter, PrintButton } from './PrintableReport';
import { CADRE_QUOTAS } from '@/utils/hrCalculator';

interface ClassStat {
  grade_level: string | null;
  number_of_classes: number;
}

interface StaffMember {
  job_category: string;
  subject_taught?: string | null;
  cadre_position?: string | null;
  work_status?: string | null;
}

interface Props {
  classStats: ClassStat[];
  staff: StaffMember[];
  school: any;
  stage?: 'primary' | 'preparatory';
}

// ═══ الخطة الدراسية الرسمية (فترات/أسبوع) - من النموذج الوزاري ═══
// كل فترة = حصتان → اللازم = فصول × فترات × 2
const OFFICIAL_PLAN = {
  primary: [
    // مواد تضاف للمجموع
    { subject: 'اللغة العربية',     short: 'عربى',    cat: 'يضاف', early: 4,   late: 4   },
    { subject: 'اللغة الإنجليزية', short: 'انجليزى', cat: 'يضاف', early: 2,   late: 2   },
    { subject: 'رياضيات',           short: 'رياضيات', cat: 'يضاف', early: 3,   late: 3   },
    { subject: 'دراسات اجتماعية',   short: 'دراسات',  cat: 'يضاف', early: 0,   late: 1.5 },
    { subject: 'علوم',              short: 'علوم',    cat: 'يضاف', early: 0,   late: 1.5 },
    // مواد لا تضاف
    { subject: 'تربية دينية',       short: 'دين',     cat: 'لا يضاف', early: 2.5, late: 2   },
    { subject: 'متعدد التخصصات (اكتشف)', short: 'متعدد', cat: 'لا يضاف', early: 2, late: 0 },
    { subject: 'توكاتسو',           short: 'توكاتسو', cat: 'لا يضاف', early: 0.5, late: 0.5 },
    { subject: 'تربية رياضية',      short: 'بدنية',   cat: 'لا يضاف', early: 1,   late: 1   },
    { subject: 'حاسب آلي',         short: 'ICT',     cat: 'لا يضاف', early: 0,   late: 0.5 },
    { subject: 'تربية فنية',        short: 'رسم',     cat: 'لا يضاف', early: 0,   late: 0.5 },
    { subject: 'تربية موسيقية',     short: 'موسيقى',  cat: 'لا يضاف', early: 0,   late: 0.5 },
  ],
  preparatory: [
    { subject: 'اللغة العربية',     short: 'عربى',     cat: 'يضاف', early: 4, late: 4 },
    { subject: 'اللغة الإنجليزية', short: 'انجليزى',  cat: 'يضاف', early: 2.5, late: 3 },
    { subject: 'رياضيات',           short: 'الرياضيات',cat: 'يضاف', early: 3, late: 3 },
    { subject: 'دراسات اجتماعية',   short: 'دراسات',   cat: 'يضاف', early: 2, late: 2 },
    { subject: 'علوم',              short: 'العلوم',   cat: 'يضاف', early: 2, late: 2 },
    { subject: 'تربية دينية',       short: 'دين',      cat: 'لا يضاف', early: 1.5, late: 1.5 },
    { subject: 'حاسب آلي',         short: 'حاسب',     cat: 'لا يضاف', early: 0.5, late: 0.5 },
    { subject: 'تربية فنية',        short: 'رسم',      cat: 'لا يضاف', early: 0.5, late: 0.5 },
    { subject: 'تربية موسيقية',     short: 'موسيقى',   cat: 'لا يضاف', early: 0.5, late: 0.5 },
    { subject: 'تربية رياضية',      short: 'ألعاب',    cat: 'لا يضاف', early: 0.5, late: 0  },
  ],
};

const EARLY_GRADES = new Set(['الأول', 'الثاني', 'الثالث', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', '1', '2', '3']);

const GRADE_CANONICAL: Record<string, string> = {
  'الصف الأول': 'الأول', 'الصف الثاني': 'الثاني', 'الصف الثالث': 'الثالث',
  'الصف الرابع': 'الرابع', 'الصف الخامس': 'الخامس', 'الصف السادس': 'السادس',
  'الأول الإعدادي': 'الأول-إعدادي', 'الثاني الإعدادي': 'الثاني-إعدادي', 'الثالث الإعدادي': 'الثالث-إعدادي',
};

function normalizeSubject(text: string) {
  return text.trim()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ي/g, 'ى')
    .replace(/^ال/, '').replace(/\sال/g, ' ').toLowerCase();
}

function matchSubject(subjectTaught: string, planSubject: string, planShort: string): boolean {
  const t = normalizeSubject(subjectTaught);
  const s = normalizeSubject(planSubject);
  const sh = normalizeSubject(planShort);
  if (t === s || t === sh) return true;
  // fuzzy
  if (s.includes('عربى') && t.includes('عربى')) return true;
  if (s.includes('انجليزى') && (t.includes('انجليزى') || t.includes('لغه اجنبيه'))) return true;
  if (s.includes('رياضيات') && t.includes('رياضيات')) return true;
  if (s.includes('دراسات') && t.includes('دراسات')) return true;
  if (s.includes('علوم') && t.includes('علوم')) return true;
  if (s.includes('دينيه') && (t.includes('دينيه') || t.includes('دين'))) return true;
  if (s.includes('متعدد') && (t.includes('متعدد') || t.includes('اكتشف'))) return true;
  if (s.includes('رياضيه') && (t.includes('رياضيه') || t.includes('بدنيه') || t.includes('العاب'))) return true;
  if (s.includes('حاسب') && (t.includes('حاسب') || t.includes('تكنولوجيا') || t.includes('ict'))) return true;
  if (s.includes('فنيه') && (t.includes('فنيه') || t.includes('رسم'))) return true;
  if (s.includes('موسيقيه') && (t.includes('موسيقيه') || t.includes('مهارات'))) return true;
  if (s.includes('توكاتسو') && t.includes('توكاتسو')) return true;
  return false;
}

export function OfficialShortageReport({ classStats, staff, school, stage = 'primary' }: Props) {
  const ea = school?.educational_administrations;
  const reportId = 'official-shortage-report';
  const plan = OFFICIAL_PLAN[stage];
  const quotas = CADRE_QUOTAS[stage];

  // تصنيف الفصول: أولى (1-3) وعليا (4-6)
  const earlyClasses = useMemo(() => {
    return classStats
      .filter(st => {
        const g = GRADE_CANONICAL[st.grade_level?.trim() ?? ''] ?? st.grade_level ?? '';
        return EARLY_GRADES.has(g) || EARLY_GRADES.has(st.grade_level?.trim() ?? '');
      })
      .reduce((s, st) => s + (st.number_of_classes || 0), 0);
  }, [classStats]);

  const lateClasses = useMemo(() => {
    return classStats
      .filter(st => {
        const g = GRADE_CANONICAL[st.grade_level?.trim() ?? ''] ?? st.grade_level ?? '';
        return !EARLY_GRADES.has(g) && !EARLY_GRADES.has(st.grade_level?.trim() ?? '');
      })
      .reduce((s, st) => s + (st.number_of_classes || 0), 0);
  }, [classStats]);

  const activeTeachers = staff.filter(s =>
    s.job_category === 'معلم' &&
    (!s.work_status || s.work_status === 'على رأس العمل' || s.work_status === 'يعمل')
  );

  // حساب الموجودين بالحصص لكل مادة
  // القاعدة: إذا كان التخصص موجود والكادر غير محدد أو غير موجود في القائمة → 24 حصة
  function getTeacherPeriodsForSubject(planItem: typeof plan[0]) {
    const matched = activeTeachers.filter(t =>
      matchSubject(t.subject_taught || '', planItem.subject, planItem.short)
    );
    let periods = 0;
    matched.forEach(t => {
      const cadre = (t.cadre_position || '').trim();
      const cadreQuotas = quotas as Record<string, number>;
      let quota = cadreQuotas[cadre];
      if (quota === undefined) {
        quota = 24; // إذا التخصص موجود والكادر مجهول = 24
      }
      periods += quota;
    });
    return { periods, count: matched.length, teachers: matched };
  }

  const rows = useMemo(() => {
    return plan.map(item => {
      const earlyPeriods = item.early > 0 ? earlyClasses * item.early * 2 : 0;
      const latePeriods  = item.late  > 0 ? lateClasses  * item.late  * 2 : 0;
      const required     = earlyPeriods + latePeriods;
      const { periods: available, count, teachers } = getTeacherPeriodsForSubject(item);
      const diff = available - required;
      return {
        ...item,
        earlyClasses, lateClasses,
        earlyPeriods, latePeriods,
        required, available, diff, count, teachers,
        deficit:  diff < 0 ? Math.abs(diff) : 0,
        surplus:  diff > 0 ? diff : 0,
      };
    });
  }, [plan, earlyClasses, lateClasses, activeTeachers]);

  const totalRequired  = rows.reduce((s, r) => s + r.required, 0);
  const totalAvailable = rows.reduce((s, r) => s + r.available, 0);
  const totalDeficit   = rows.reduce((s, r) => s + r.deficit, 0);
  const totalSurplus   = rows.reduce((s, r) => s + r.surplus, 0);
  const totalTeachers  = rows.reduce((s, r) => s + r.count, 0);

  const cadreRows = Object.entries(quotas).filter(([k]) => !['بدون كادر','غير مخاطب'].includes(k));

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="no-print flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-black text-slate-800 text-base">📉 كشف العجز والزيادة الرسمي</h3>
          <p className="text-xs text-slate-500">
            {stage === 'primary' ? 'المرحلة الابتدائية' : 'المرحلة الإعدادية'} —
            فصول أولى: {earlyClasses} | فصول عليا: {lateClasses}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
            ⚠ إذا كان التخصص موجود والكادر غير محدد = 24 حصة
          </span>
          <PrintButton label="🖨️ طباعة كشف العجز والزيادة" reportId={reportId} />
        </div>
      </div>

      <div id={reportId} className="bg-white">
        <ReportHeader
          title={`احصاء بعدد الفترات والحصص والفصول والمعلمين — ${stage === 'primary' ? 'المرحلة الابتدائية' : 'المرحلة الإعدادية'}`}
          schoolName={school?.school_name_ar ?? ''}
          adminName={ea?.name_ar}
          governorate={ea?.governorate}
          schoolCode={school?.school_code}
          subtitle={`العام الدراسي 2025 / 2026`}
        />

        <div className="overflow-x-auto">
          <table className="shortage-table w-full text-[10px] border-collapse border border-gray-500 text-center">
            {/* ═══ الرأس ═══ */}
            <thead>
              {/* صف الأنصبة القانونية */}
              <tr className="bg-gray-100">
                <th colSpan={2} className="p-1 border border-gray-500 text-right">اسم المـادة</th>
                <th colSpan={2} className="p-1 border border-gray-500">عدد الفترات</th>
                <th colSpan={2} className="p-1 border border-gray-500">الصفوف الأولى (1-3)</th>
                <th colSpan={2} className="p-1 border border-gray-500">الصفوف العليا (4-6)</th>
                <th className="p-1 border border-gray-500">اللازم بالحصص</th>
                {cadreRows.map(([cadre]) => (
                  <th key={cadre} className="p-1 border border-gray-500 text-[9px] max-w-[40px] leading-tight">{cadre}</th>
                ))}
                <th className="p-1 border border-gray-500">الموجودين بالحصص</th>
                <th className="p-1 border border-gray-500">عدد المعلمين</th>
                <th className="p-1 border border-gray-500">فرق الحصص</th>
                <th className="p-1 border border-gray-500 bg-red-50 text-red-700">عجز</th>
                <th className="p-1 border border-gray-500 bg-green-50 text-green-700">زيادة</th>
              </tr>
              {/* صف الأنصبة */}
              <tr className="bg-yellow-50 text-[9px] font-black">
                <td colSpan={2} className="p-1 border border-gray-500 text-right">النصاب القانوني (حصة/أسبوع)</td>
                <td className="p-1 border border-gray-500">أولى</td>
                <td className="p-1 border border-gray-500">عليا</td>
                <td className="p-1 border border-gray-500">حصص</td>
                <td className="p-1 border border-gray-500">فصول</td>
                <td className="p-1 border border-gray-500">حصص</td>
                <td className="p-1 border border-gray-500">فصول</td>
                <td className="p-1 border border-gray-500"></td>
                {cadreRows.map(([, quota]) => (
                  <td key={quota} className="p-1 border border-gray-500 font-black text-blue-700">{quota}</td>
                ))}
                <td className="p-1 border border-gray-500"></td>
                <td className="p-1 border border-gray-500"></td>
                <td className="p-1 border border-gray-500"></td>
                <td className="p-1 border border-gray-500"></td>
                <td className="p-1 border border-gray-500"></td>
              </tr>
            </thead>

            {/* ═══ البيانات ═══ */}
            <tbody>
              {/* مواد تضاف */}
              <tr className="bg-blue-50">
                <td className="p-1 border border-gray-400 font-black text-right text-[9px]" style={{ writingMode: 'vertical-rl', width: 16 }}>مواد تضاف</td>
                <td colSpan={13 + cadreRows.length} className="border border-gray-400"></td>
              </tr>
              {rows.filter(r => r.cat === 'يضاف').map((row, i) => (
                <tr key={row.subject} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 w-4"></td>
                  <td className="p-1 border border-gray-400 text-right font-bold">{row.short}</td>
                  <td className="p-1 border border-gray-400">{row.early || '—'}</td>
                  <td className="p-1 border border-gray-400">{row.late || '—'}</td>
                  <td className="p-1 border border-gray-400 bg-blue-50/50">{row.earlyPeriods || '—'}</td>
                  <td className="p-1 border border-gray-400 bg-blue-50/50">{earlyClasses}</td>
                  <td className="p-1 border border-gray-400 bg-slate-50/50">{row.latePeriods || '—'}</td>
                  <td className="p-1 border border-gray-400 bg-slate-50/50">{lateClasses}</td>
                  <td className="p-1 border border-gray-400 font-black">{row.required}</td>
                  {cadreRows.map(([cadre]) => {
                    const count = row.teachers.filter(t => {
                      const c = (t.cadre_position || '').trim();
                      return c === cadre;
                    }).length;
                    return <td key={cadre} className="p-1 border border-gray-400">{count || '—'}</td>;
                  })}
                  <td className="p-1 border border-gray-400 font-black text-emerald-700">{row.available || '—'}</td>
                  <td className="p-1 border border-gray-400 font-black">{row.count || '—'}</td>
                  <td className={`p-1 border border-gray-400 font-black ${row.diff > 0 ? 'text-emerald-600' : row.diff < 0 ? 'text-red-600' : ''}`}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff || '—'}
                  </td>
                  <td className="p-1 border border-gray-400 font-black text-red-700 bg-red-50/50">{row.deficit || '—'}</td>
                  <td className="p-1 border border-gray-400 font-black text-emerald-700 bg-green-50/50">{row.surplus || '—'}</td>
                </tr>
              ))}

              {/* مواد لا تضاف */}
              <tr className="bg-amber-50">
                <td className="p-1 border border-gray-400 font-black text-right text-[9px]" style={{ writingMode: 'vertical-rl', width: 16 }}>لا تضاف</td>
                <td colSpan={13 + cadreRows.length} className="border border-gray-400"></td>
              </tr>
              {rows.filter(r => r.cat === 'لا يضاف').map((row, i) => (
                <tr key={row.subject} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 w-4"></td>
                  <td className="p-1 border border-gray-400 text-right font-bold">{row.short}</td>
                  <td className="p-1 border border-gray-400">{row.early || '—'}</td>
                  <td className="p-1 border border-gray-400">{row.late || '—'}</td>
                  <td className="p-1 border border-gray-400 bg-blue-50/50">{row.earlyPeriods || '—'}</td>
                  <td className="p-1 border border-gray-400 bg-blue-50/50">{earlyClasses}</td>
                  <td className="p-1 border border-gray-400 bg-slate-50/50">{row.latePeriods || '—'}</td>
                  <td className="p-1 border border-gray-400 bg-slate-50/50">{lateClasses}</td>
                  <td className="p-1 border border-gray-400 font-black">{row.required}</td>
                  {cadreRows.map(([cadre]) => {
                    const count = row.teachers.filter(t => {
                      const c = (t.cadre_position || '').trim();
                      return c === cadre;
                    }).length;
                    return <td key={cadre} className="p-1 border border-gray-400">{count || '—'}</td>;
                  })}
                  <td className="p-1 border border-gray-400 font-black text-emerald-700">{row.available || '—'}</td>
                  <td className="p-1 border border-gray-400 font-black">{row.count || '—'}</td>
                  <td className={`p-1 border border-gray-400 font-black ${row.diff > 0 ? 'text-emerald-600' : row.diff < 0 ? 'text-red-600' : ''}`}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff || '—'}
                  </td>
                  <td className="p-1 border border-gray-400 font-black text-red-700 bg-red-50/50">{row.deficit || '—'}</td>
                  <td className="p-1 border border-gray-400 font-black text-emerald-700 bg-green-50/50">{row.surplus || '—'}</td>
                </tr>
              ))}
            </tbody>

            {/* ═══ الإجمالي ═══ */}
            <tfoot>
              <tr className="bg-gray-200 font-black">
                <td colSpan={2} className="p-1.5 border border-gray-500 text-right">الإجمالي</td>
                <td className="p-1 border border-gray-500">
                  {rows.reduce((s, r) => s + r.early, 0).toFixed(1)}
                </td>
                <td className="p-1 border border-gray-500">
                  {rows.reduce((s, r) => s + r.late, 0).toFixed(1)}
                </td>
                <td className="p-1 border border-gray-500">
                  {rows.reduce((s, r) => s + r.earlyPeriods, 0)}
                </td>
                <td className="p-1 border border-gray-500">{earlyClasses}</td>
                <td className="p-1 border border-gray-500">
                  {rows.reduce((s, r) => s + r.latePeriods, 0)}
                </td>
                <td className="p-1 border border-gray-500">{lateClasses}</td>
                <td className="p-1 border border-gray-500">{totalRequired}</td>
                {cadreRows.map(([cadre]) => {
                  const cnt = activeTeachers.filter(t => {
                    const c = (t.cadre_position || '').trim();
                    return c === cadre;
                  }).length;
                  return <td key={cadre} className="p-1 border border-gray-500">{cnt || '—'}</td>;
                })}
                <td className="p-1 border border-gray-500 text-emerald-700">{totalAvailable}</td>
                <td className="p-1 border border-gray-500">{totalTeachers}</td>
                <td className="p-1 border border-gray-500">{totalAvailable - totalRequired}</td>
                <td className="p-1 border border-gray-500 text-red-700">{totalDeficit || '—'}</td>
                <td className="p-1 border border-gray-500 text-emerald-700">{totalSurplus || '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* توقيعات */}
        <div className="mt-6 flex justify-between text-xs text-gray-600">
          <span>شئون العاملين</span>
          <span>وكيل المدرسة</span>
          <span>يعتمد .. مدير المدرسة</span>
        </div>

        <ReportFooter signers={[
          { label: 'مدير المدرسة' },
          { label: 'وكيل المدرسة' },
          { label: 'شئون العاملين' },
          { label: 'مدير الإدارة' },
        ]} />
      </div>
    </div>
  );
}
