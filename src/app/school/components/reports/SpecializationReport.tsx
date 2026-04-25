'use client';
// src/app/school/components/reports/SpecializationReport.tsx
// كشف حسب التخصصات (معينون / بالأجر / بالمعاش)

import React, { useMemo } from 'react';
import { ReportHeader, ReportFooter, PrintButton } from './PrintableReport';
import ExportExcelButton from '@/components/shared/ExportExcelButton';

type FilterType = 'appointed' | 'hourly' | 'pension' | 'all';

interface Props {
  staff: any[];
  school: any;
  filterType: FilterType;
}

const FILTER_CONFIG: Record<FilterType, { title: string; subtitle: string; keywords: string[]; color: string }> = {
  all: {
    title: 'كشف المعلمين حسب التخصصات',
    subtitle: 'جميع المعلمين',
    keywords: [],
    color: 'bg-slate-200',
  },
  appointed: {
    title: 'كشف المعلمين المعينين حسب التخصصات',
    subtitle: 'المعلمون المعينون (أصليون)',
    keywords: ['تعيين', 'أساسي', 'أصلي'],
    color: 'bg-emerald-100',
  },
  hourly: {
    title: 'كشف المعلمين بالأجر حسب التخصصات',
    subtitle: 'المعلمون بالأجر / بالعقد',
    keywords: ['بالأجر', 'بالحصة (أجر)', 'بالحصة', 'بالمكافأة', 'بالعقد', 'عقد'],
    color: 'bg-blue-100',
  },
  pension: {
    title: 'كشف المعلمين بالمعاش حسب التخصصات',
    subtitle: 'المعلمون بالمعاش',
    keywords: ['بالمعاش', 'بالحصة (معاش)', 'معاش'],
    color: 'bg-amber-100',
  },
};

export function SpecializationReport({ staff, school, filterType }: Props) {
  const config = FILTER_CONFIG[filterType];
  const ea = school?.educational_administrations;
  const reportId = `spec-report-${filterType}`;

  const grouped = useMemo(() => {
    const teachers = staff.filter(s => s.job_category === 'معلم');
    const filtered = filterType === 'all'
      ? teachers
      : teachers.filter(t => config.keywords.some(kw => (t.employment_type || '').includes(kw)));

    const map: Record<string, any[]> = {};
    filtered.forEach(t => {
      const subject = t.subject_taught || 'غير محدد';
      if (!map[subject]) map[subject] = [];
      map[subject].push(t);
    });

    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [staff, filterType, config.keywords]);

  const totalTeachers = grouped.reduce((s, [, list]) => s + list.length, 0);
  let globalIdx = 0;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="no-print flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-800 text-base">{config.title}</h3>
          <p className="text-xs text-slate-500">{config.subtitle} — إجمالي: {totalTeachers} معلم في {grouped.length} تخصص</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton tableId={`${reportId}-table`} fileName={config.title.replace(/ /g, '_')} sheetName="التخصصات" buttonText="إكسيل" />
          <PrintButton label="🖨️ طباعة" reportId={reportId} />
        </div>
      </div>

      {totalTeachers === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-slate-400 font-bold">لا توجد بيانات لهذا النوع من التعيين</p>
        </div>
      ) : (
        <div id={reportId} className="bg-white">
          <ReportHeader
            title={config.title}
            schoolName={school?.school_name_ar ?? ''}
            adminName={ea?.name_ar}
            governorate={ea?.governorate}
            schoolCode={school?.school_code}
            subtitle={`${config.subtitle} — إجمالي: ${totalTeachers} معلم في ${grouped.length} تخصص`}
          />

          {/* شريط إحصائي للطباعة */}
          <div className="kpi-grid mb-3">
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: '#1d4ed8' }}>{totalTeachers}</div>
              <div className="kpi-label">إجمالي المعلمين</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: '#047857' }}>{grouped.length}</div>
              <div className="kpi-label">عدد التخصصات</div>
            </div>
            {grouped.slice(0, 3).map(([subj, list]) => (
              <div key={subj} className="kpi-card">
                <div className="kpi-value" style={{ color: '#7c3aed' }}>{list.length}</div>
                <div className="kpi-label">{subj}</div>
              </div>
            ))}
          </div>

          <table id={`${reportId}-table`} className="w-full text-xs border-collapse border border-gray-400 text-right">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-1.5 border border-gray-400 text-center w-7">#</th>
                <th className="p-1.5 border border-gray-400">الاسم كاملاً</th>
                <th className="p-1.5 border border-gray-400">التخصص / المادة</th>
                <th className="p-1.5 border border-gray-400">الكادر</th>
                <th className="p-1.5 border border-gray-400">نوع التعيين</th>
                <th className="p-1.5 border border-gray-400">تاريخ التعيين</th>
                <th className="p-1.5 border border-gray-400">الرقم القومي</th>
                <th className="p-1.5 border border-gray-400">حالة العمل</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([subject, teachers]) => (
                <React.Fragment key={subject}>
                  {/* Subject group header row */}
                  <tr>
                    <td
                      colSpan={8}
                      className={`p-1.5 border border-gray-400 font-black text-sm ${config.color}`}
                    >
                      📚 {subject}
                      <span className="mr-3 text-xs font-bold bg-white/60 px-2 py-0.5 rounded-full">
                        {teachers.length} معلم
                      </span>
                    </td>
                  </tr>
                  {teachers.map((t: any, i: number) => {
                    globalIdx++;
                    return (
                      <tr key={t.id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-1.5 border border-gray-300 text-center text-gray-500">{globalIdx}</td>
                        <td className="p-1.5 border border-gray-300 font-bold">{t.full_name_ar ?? '—'}</td>
                        <td className="p-1.5 border border-gray-300">{t.subject_taught ?? '—'}</td>
                        <td className="p-1.5 border border-gray-300">{t.cadre_position ?? '—'}</td>
                        <td className="p-1.5 border border-gray-300">{t.employment_type ?? '—'}</td>
                        <td className="p-1.5 border border-gray-300 text-center">
                          {t.appointment_date ? new Date(t.appointment_date).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td className="p-1.5 border border-gray-300 text-center font-mono text-[10px]">{t.national_id ?? '—'}</td>
                        <td className="p-1.5 border border-gray-300 text-center text-[10px]">{t.work_status ?? 'على رأس العمل'}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-black">
                <td colSpan={2} className="p-1.5 border border-gray-400">الإجمالي</td>
                <td className="p-1.5 border border-gray-400 text-center">{grouped.length} تخصص</td>
                <td colSpan={5} className="p-1.5 border border-gray-400 text-center">{totalTeachers} معلم</td>
              </tr>
            </tfoot>
          </table>

          <ReportFooter />
        </div>
      )}
    </div>
  );
}
