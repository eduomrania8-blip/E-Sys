'use client';
// src/app/school/components/reports/FullStaffReport.tsx
// كشف كامل بيانات المعلمين / كشف القيادات

import React from 'react';
import { ReportHeader, ReportFooter, PrintButton } from './PrintableReport';
import DownloadPdfButton from './DownloadPdfButton';
import ExportExcelButton from '@/components/shared/ExportExcelButton';

interface Props {
  staff: any[];
  leaders: any[];
  school: any;
  mode: 'teachers' | 'leaders' | 'all';
}

export function FullStaffReport({ staff, leaders, school, mode }: Props) {
  const ea = school?.educational_administrations;
  const reportId = `full-staff-report-${mode}`;

  const filteredStaff = mode === 'leaders'
    ? leaders
    : mode === 'teachers'
      ? staff.filter(s => s.job_category === 'معلم')
      : staff;

  const isLeaders = mode === 'leaders';
  const title = mode === 'leaders'
    ? '📋 كشف القيادات المدرسية'
    : mode === 'teachers'
      ? '📋 كشف كامل بيانات المعلمين'
      : '📋 كشف كامل بيانات العاملين';

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="no-print flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-800 text-base">{title}</h3>
          <p className="text-xs text-slate-500">إجمالي: {filteredStaff.length} سجل</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton tableId={`${reportId}-table`} fileName={title.replace('📋 ', '').replace(/ /g, '_')} sheetName="بيانات العاملين" buttonText="إكسيل" />
          <DownloadPdfButton title={title} targetId={reportId} />
          <PrintButton label="🖨️ طباعة" reportId={reportId} />
        </div>
      </div>

      {/* Printable Content */}
      <div id={reportId} className="bg-white">
        <ReportHeader
          title={title}
          schoolName={school?.school_name_ar ?? ''}
          adminName={ea?.name_ar}
          governorate={ea?.governorate}
          schoolCode={school?.school_code}
          subtitle={`إجمالي: ${filteredStaff.length} ${isLeaders ? 'قيادة' : 'معلم'}`}
        />

        {/* شريط إحصائي داخل الكشف */}
        {!isLeaders && (
          <div className="kpi-grid mb-3">
            {[
              { label: 'إجمالي المعلمين', val: filteredStaff.length, color: '#1d4ed8' },
              { label: 'على رأس العمل', val: filteredStaff.filter((s:any) => !s.work_status || s.work_status === 'على رأس العمل').length, color: '#047857' },
              { label: 'معينون أصليون', val: filteredStaff.filter((s:any) => ['تعيين','أساسي'].includes(s.employment_type||'')).length, color: '#0369a1' },
              { label: 'بالأجر', val: filteredStaff.filter((s:any) => (s.employment_type||'').includes('بالأجر')||(s.employment_type||'').includes('بالحصة')).length, color: '#7c3aed' },
              { label: 'بالمعاش', val: filteredStaff.filter((s:any) => (s.employment_type||'').includes('معاش')).length, color: '#b45309' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-value" style={{ color: k.color }}>{k.val}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table id={`${reportId}-table`} className="w-full text-xs border-collapse border border-gray-400 text-right">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-1.5 border border-gray-400 text-center w-7">#</th>
                <th className="p-1.5 border border-gray-400">الاسم كاملاً</th>
                {isLeaders ? (
                  <>
                    <th className="p-1.5 border border-gray-400">المسمى الوظيفي</th>
                    <th className="p-1.5 border border-gray-400">المؤهل</th>
                    <th className="p-1.5 border border-gray-400">تاريخ التعيين</th>
                    <th className="p-1.5 border border-gray-400">الهاتف</th>
                    <th className="p-1.5 border border-gray-400">الرقم القومي</th>
                    <th className="p-1.5 border border-gray-400">ملاحظات</th>
                  </>
                ) : (
                  <>
                    <th className="p-1.5 border border-gray-400">الوظيفة</th>
                    <th className="p-1.5 border border-gray-400">التخصص / المادة</th>
                    <th className="p-1.5 border border-gray-400">الكادر</th>
                    <th className="p-1.5 border border-gray-400">نوع التعيين</th>
                    <th className="p-1.5 border border-gray-400">تاريخ التعيين</th>
                    <th className="p-1.5 border border-gray-400">الرقم القومي</th>
                    <th className="p-1.5 border border-gray-400">الهاتف</th>
                    <th className="p-1.5 border border-gray-400">حالة العمل</th>
                    <th className="p-1.5 border border-gray-400">ملاحظات</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s: any, i: number) => (
                <tr key={s.id ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-1.5 border border-gray-300 text-center font-bold">{i + 1}</td>
                  <td className="p-1.5 border border-gray-300 font-bold">{s.full_name_ar ?? '—'}</td>
                  {isLeaders ? (
                    <>
                      <td className="p-1.5 border border-gray-300">{s.job_title ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300">{s.qualification ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300 text-center">{s.appointment_date ? new Date(s.appointment_date).toLocaleDateString('ar-EG') : '—'}</td>
                      <td className="p-1.5 border border-gray-300 text-center">{s.phone ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono">{s.national_id ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300">{s.notes ?? ''}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-1.5 border border-gray-300">{s.job_category ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300">{s.subject_taught ?? s.school_role ?? s.worker_type ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300">{s.cadre_position ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300">{s.employment_type ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300 text-center">{s.appointment_date ? new Date(s.appointment_date).toLocaleDateString('ar-EG') : '—'}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono text-[10px]">{s.national_id ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300 text-center">{s.phone ?? '—'}</td>
                      <td className="p-1.5 border border-gray-300 text-center">
                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${s.work_status === 'على رأس العمل' || !s.work_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.work_status ?? 'على رأس العمل'}
                        </span>
                      </td>
                      <td className="p-1.5 border border-gray-300">{s.notes ?? ''}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-black">
                <td colSpan={isLeaders ? 2 : 2} className="p-1.5 border border-gray-400">الإجمالي</td>
                <td colSpan={isLeaders ? 6 : 8} className="p-1.5 border border-gray-400 text-center">
                  {filteredStaff.length} {isLeaders ? 'قيادة' : 'موظف'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <ReportFooter />
      </div>
    </div>
  );
}
