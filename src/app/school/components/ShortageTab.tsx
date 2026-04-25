'use client';
// src/app/school/components/ShortageTab.tsx
// تبويب العجز والزيادة في بوابة المدرسة - مبني على النموذج الرسمي

import React, { useMemo } from 'react';
import { calculateSubjectShortage, PRIMARY_CURRICULUM, PREPARATORY_CURRICULUM, CADRE_QUOTAS } from '@/utils/hrCalculator';

interface ShortageTabProps {
  classStats: Array<{
    grade_level: string | null;
    number_of_classes: number;
  }>;
  staffData: Array<{
    job_category: string;
    subject_taught?: string | null;
    cadre_position?: string | null;
    work_status?: string | null;
  }>;
  stage?: 'primary' | 'preparatory' | 'secondary';
}

const GRADE_CANONICAL: Record<string, string> = {
  'الصف الأول': 'الأول', 'الصف الثاني': 'الثاني', 'الصف الثالث': 'الثالث',
  'الصف الرابع': 'الرابع', 'الصف الخامس': 'الخامس', 'الصف السادس': 'السادس',
  'الأول الابتدائي': 'الأول', 'الثاني الابتدائي': 'الثاني', 'الثالث الابتدائي': 'الثالث',
  'الرابع الابتدائي': 'الرابع', 'الخامس الابتدائي': 'الخامس', 'السادس الابتدائي': 'السادس',
  'الأول الإعدادي': 'الأول', 'الثاني الإعدادي': 'الثاني', 'الثالث الإعدادي': 'الثالث',
};

function normalizeGrade(g: string | null | undefined) {
  if (!g) return '';
  return GRADE_CANONICAL[g.trim()] || g.trim();
}

function normalizeSubject(text: string) {
  if (!text) return '';
  let s = text.trim();
  s = s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ي/g, 'ى');
  return s;
}

function matchTeacherToSubject(taught: string, subject: string): boolean {
  const t = normalizeSubject(taught);
  const s = normalizeSubject(subject);
  if (s.includes('دينيه')) return t.includes('دينيه');
  if (s.includes('حاسب')) return t.includes('حاسب') || t.includes('تكنولوجيا') || t.includes('ict');
  return t === s;
}

export function ShortageTab({ classStats, staffData, stage = 'primary' }: ShortageTabProps) {
  const curriculum = stage === 'primary' ? PRIMARY_CURRICULUM : PREPARATORY_CURRICULUM;
  const subjects = Object.keys(curriculum);
  
  const normalizedStats = useMemo(() =>
    classStats.map(st => ({ ...st, grade_level: normalizeGrade(st.grade_level) })),
    [classStats]
  );

  const teachers = useMemo(() =>
    // المعلمون فقط (حسب الفئة الوظيفية) — الوظيفة داخل المدرسة لا دخل لها
    staffData.filter(s => s.job_category === 'معلم'),
    [staffData]
  );

  const results = useMemo(() => {
    return subjects.map(subject => {
      const matchedTeachers = teachers.filter(t =>
        matchTeacherToSubject(t.subject_taught || '', subject)
      );
      // إصلاح: إذا التخصص موجود والكادر غير محدد → يُعامل كـ 24 حصة
      const fixedTeachers = matchedTeachers.map(t => ({
        ...t,
        cadre_position: t.cadre_position || null, // null يُعطي 24 في hrCalculator
      }));
      return {
        subject,
        ...calculateSubjectShortage(subject, normalizedStats, fixedTeachers, stage),
      };
    });
  }, [subjects, teachers, normalizedStats, stage]);

  const totalDeficit = results.filter(r => r.netPeriods < 0).reduce((sum, r) => sum + Math.abs(r.netPeriods), 0);
  const totalSurplus = results.filter(r => r.netPeriods > 0).reduce((sum, r) => sum + r.netPeriods, 0);
  const totalTeachers = results.reduce((sum, r) => sum + r.activeTeachersCount, 0);

  return (
    <div className="space-y-5">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-blue-700">{totalTeachers}</p>
          <p className="text-xs font-bold text-blue-500 mt-0.5">إجمالي المعلمين</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-slate-700">
            {results.reduce((s, r) => s + r.requiredPeriods, 0)}
          </p>
          <p className="text-xs font-bold text-slate-500 mt-0.5">الحصص اللازمة</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-red-600">-{totalDeficit.toFixed(0)}</p>
          <p className="text-xs font-bold text-red-500 mt-0.5">حصص العجز الكلي</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">+{totalSurplus.toFixed(0)}</p>
          <p className="text-xs font-bold text-emerald-500 mt-0.5">حصص الزيادة الكلية</p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-3 font-black">المادة الدراسية</th>
              <th className="px-3 py-3 font-black text-center">المعلمون</th>
              <th className="px-3 py-3 font-black text-center text-emerald-700">الموجودون بالحصص</th>
              <th className="px-3 py-3 font-black text-center text-blue-700">اللازم بالحصص</th>
              <th className="px-3 py-3 font-black text-center">فرق الحصص</th>
              <th className="px-3 py-3 font-black text-center text-red-700 bg-red-50/50">عجز</th>
              <th className="px-3 py-3 font-black text-center text-emerald-700 bg-emerald-50/50">زيادة</th>
              <th className="px-3 py-3 font-black text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {results.map((row, idx) => (
              <tr key={row.subject} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/20'}`}>
                <td className="px-3 py-3 font-bold text-slate-800">{row.subject}</td>
                <td className="px-3 py-3 text-center font-bold text-slate-500">{row.activeTeachersCount}</td>
                <td className="px-3 py-3 text-center font-mono text-emerald-700 bg-emerald-50/20">{row.availablePeriods}</td>
                <td className="px-3 py-3 text-center font-mono text-blue-700 bg-blue-50/20">{row.requiredPeriods}</td>
                <td className="px-3 py-3 text-center font-mono font-bold" dir="ltr">
                  <span className={row.netPeriods > 0 ? 'text-emerald-600' : row.netPeriods < 0 ? 'text-red-600' : 'text-slate-400'}>
                    {row.netPeriods > 0 ? '+' : ''}{row.netPeriods}
                  </span>
                </td>
                <td className="px-3 py-3 text-center bg-red-50/20">
                  <span className="font-black text-red-600">{row.netPeriods < 0 ? Math.abs(row.netPeriods) : '—'}</span>
                </td>
                <td className="px-3 py-3 text-center bg-emerald-50/20">
                  <span className="font-black text-emerald-600">{row.netPeriods > 0 ? row.netPeriods : '—'}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  {row.requiredPeriods === 0 ? (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full font-bold">لا تُدرس</span>
                  ) : row.status === 'متزن' ? (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">✓ متزن</span>
                  ) : row.status === 'عجز' ? (
                    <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">⚠ عجز</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">↑ زيادة</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 text-xs font-black text-slate-600">
            <tr>
              <td className="px-3 py-3">الإجمالي</td>
              <td className="px-3 py-3 text-center">{totalTeachers}</td>
              <td className="px-3 py-3 text-center text-emerald-700">
                {results.reduce((s, r) => s + r.availablePeriods, 0)}
              </td>
              <td className="px-3 py-3 text-center text-blue-700">
                {results.reduce((s, r) => s + r.requiredPeriods, 0)}
              </td>
              <td className="px-3 py-3 text-center" colSpan={2}></td>
              <td className="px-3 py-3 text-center text-red-700">-{totalDeficit.toFixed(0)}</td>
              <td className="px-3 py-3 text-center text-emerald-700">+{totalSurplus.toFixed(0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legal quota info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-black text-blue-700 mb-2">📋 الأنصبة القانونية المعتمدة</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CADRE_QUOTAS[stage]).filter(([k]) => !['بدون كادر','غير مخاطب'].includes(k)).map(([cadre, quota]) => (
            <div key={cadre} className="flex items-center gap-1.5 bg-white border border-blue-100 rounded-lg px-3 py-1.5">
              <span className="text-xs font-black text-blue-700">{cadre}:</span>
              <span className="text-xs font-mono text-slate-600 font-bold">{quota} حصة/أسبوع</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
