'use client';
// src/app/school/components/reports/WorkforceStructure.tsx
// ملخص الهيكل الوظيفي الإحصائي — مع دعم الطباعة الاحترافية

import React, { useMemo } from 'react';
import { ReportHeader, ReportFooter, PrintButton } from './PrintableReport';

interface Props {
  staff: any[];
  leaders: any[];
  school?: any;
}

export function WorkforceStructure({ staff, leaders, school }: Props) {
  const reportId = 'workforce-structure-report';
  const ea = school?.educational_administrations;
  const stats = useMemo(() => {
    const teachers = staff.filter(s => s.job_category === 'معلم');
    const admins   = staff.filter(s => s.job_category === 'إداري');
    const workers  = staff.filter(s => s.job_category === 'عامل');

    const byEmployment = (list: any[], type: string) =>
      list.filter(s => (s.employment_type || '').includes(type) || (s.cadre_position || '').includes(type));

    const appointed = teachers.filter(s => ['تعيين','أساسي'].includes(s.employment_type || ''));
    const hourly    = teachers.filter(s => ['بالأجر','بالحصة (أجر)','بالحصة','بالمكافأة','بالعقد'].includes(s.employment_type || ''));
    const pension   = teachers.filter(s => ['بالمعاش','بالحصة (معاش)','معاش'].includes(s.employment_type || ''));

    const cadreMap: Record<string, number> = {};
    teachers.forEach(t => {
      const c = t.cadre_position || 'غير محدد';
      cadreMap[c] = (cadreMap[c] || 0) + 1;
    });

    const subjectMap: Record<string, number> = {};
    teachers.forEach(t => {
      const s = t.subject_taught || 'غير محدد';
      subjectMap[s] = (subjectMap[s] || 0) + 1;
    });

    return {
      total: staff.length,
      teachers: teachers.length,
      admins: admins.length,
      workers: workers.length,
      leaders: leaders.length,
      appointed: appointed.length,
      hourly: hourly.length,
      pension: pension.length,
      other: teachers.length - appointed.length - hourly.length - pension.length,
      cadreMap,
      subjectMap,
    };
  }, [staff, leaders]);

  const rows = [
    { label: 'إجمالي العاملين', value: stats.total, color: 'slate', icon: '👥' },
    { label: 'المعلمون', value: stats.teachers, color: 'blue', icon: '📚' },
    { label: 'الإداريون', value: stats.admins, color: 'purple', icon: '💼' },
    { label: 'العمال', value: stats.workers, color: 'orange', icon: '🔧' },
    { label: 'القيادات', value: stats.leaders, color: 'emerald', icon: '🎖️' },
  ];

  const colorMap: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };

  return (
    <div className="space-y-6">
      {/* زر الطباعة */}
      <div className="no-print flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-800 text-base">📊 ملخص الهيكل الوظيفي</h3>
          <p className="text-xs text-slate-500">توزيعات وإحصاءات القوى العاملة بالمدرسة</p>
        </div>
        <PrintButton label="🖨️ طباعة ملخص الهيكل" reportId={reportId} />
      </div>

      <div id={reportId} className="bg-white space-y-6">
      {school && (
        <ReportHeader
          title="ملخص الهيكل الوظيفي للمدرسة"
          schoolName={school?.school_name_ar ?? ''}
          adminName={ea?.name_ar}
          governorate={ea?.governorate}
          schoolCode={school?.school_code}
          subtitle={`إجمالي العاملين: ${staff.length + leaders.length} — العام الدراسي 2025/2026`}
        />
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        {rows.map(r => (
          <div key={r.label} className={`kpi-card border rounded-2xl p-4 text-center ${colorMap[r.color]}`}>
            <div className="text-2xl mb-1 no-print">{r.icon}</div>
            <p className="kpi-value text-2xl font-black">{r.value}</p>
            <p className="kpi-label text-[11px] font-bold mt-0.5 opacity-80">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Teacher Employment Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h4 className="font-black text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-sm">📋</span>
            المعلمون حسب نوع التعيين
          </h4>
          <div className="space-y-2">
            {[
              { label: 'معينون (أصليون)', val: stats.appointed, color: 'bg-emerald-500' },
              { label: 'بالأجر / بالعقد', val: stats.hourly,   color: 'bg-blue-500' },
              { label: 'بالمعاش',          val: stats.pension,  color: 'bg-amber-500' },
              { label: 'أخرى / غير محدد', val: stats.other,    color: 'bg-slate-400' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="text-slate-800">{item.val}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all`}
                    style={{ width: stats.teachers > 0 ? `${(item.val / stats.teachers) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Distribution */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h4 className="font-black text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-sm">📚</span>
            توزيع التخصصات
          </h4>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {Object.entries(stats.subjectMap)
              .sort((a, b) => b[1] - a[1])
              .map(([subject, count]) => (
                <div key={subject} className="flex justify-between items-center text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-600 font-bold truncate max-w-[180px]">{subject}</span>
                  <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Cadre Distribution */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h4 className="font-black text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">🏅</span>
          توزيع الكوادر الوظيفية
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(stats.cadreMap)
            .sort((a, b) => b[1] - a[1])
            .map(([cadre, count]) => (
              <div key={cadre} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-indigo-700">{count}</p>
                <p className="text-[10px] font-bold text-indigo-500 mt-0.5 leading-tight">{cadre}</p>
              </div>
            ))}
        </div>
      </div>

      <ReportFooter signers={[
        { label: 'مدير المدرسة' },
        { label: 'شئون العاملين' },
        { label: 'مدير الإدارة' },
      ]} />
      </div>{/* end printable div */}
    </div>
  );
}
