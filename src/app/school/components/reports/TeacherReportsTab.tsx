'use client';
// src/app/school/components/reports/TeacherReportsTab.tsx
// التبويب الرئيسي لتقارير المعلمين — يضم جميع الكشوف

import React, { useState } from 'react';
import { FullStaffReport } from './FullStaffReport';
import { SpecializationReport } from './SpecializationReport';
import { OfficialShortageReport } from './OfficialShortageReport';
import { WorkforceStructure } from './WorkforceStructure';

type SubTab =
  | 'structure'
  | 'full_teachers'
  | 'leaders'
  | 'spec_appointed'
  | 'spec_hourly'
  | 'spec_pension'
  | 'shortage_primary'
  | 'shortage_prep';

interface Props {
  staff: any[];
  leaders: any[];
  classStats: any[];
  school: any;
}

const SUB_TABS: { id: SubTab; label: string; icon: string; desc: string }[] = [
  { id: 'structure',       icon: '📊', label: 'الهيكل الوظيفي',         desc: 'إحصاءات وتوزيعات' },
  { id: 'full_teachers',   icon: '📋', label: 'كامل بيانات المعلمين',   desc: 'جميع المعلمين' },
  { id: 'leaders',         icon: '👤', label: 'كشف القيادات',            desc: 'بيانات كاملة' },
  { id: 'spec_appointed',  icon: '✅', label: 'المعينون بالتخصص',        desc: 'تعيين أصلي' },
  { id: 'spec_hourly',     icon: '💰', label: 'بالأجر بالتخصص',          desc: 'عقد / أجر' },
  { id: 'spec_pension',    icon: '🔵', label: 'بالمعاش بالتخصص',         desc: 'معاش' },
  { id: 'shortage_primary',icon: '📉', label: 'العجز والزيادة ابتدائي',  desc: 'نموذج وزاري' },
  { id: 'shortage_prep',   icon: '📉', label: 'العجز والزيادة إعدادي',   desc: 'نموذج وزاري' },
];

export function TeacherReportsTab({ staff, leaders, classStats, school }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('structure');

  const teachers = staff.filter(s => s.job_category === 'معلم');
  const appointed = teachers.filter(t => ['تعيين', 'أساسي', 'أصلي'].includes(t.employment_type || ''));
  const hourly    = teachers.filter(t => ['بالأجر','بالحصة (أجر)','بالحصة','بالمكافأة','بالعقد'].includes(t.employment_type || ''));
  const pension   = teachers.filter(t => ['بالمعاش','بالحصة (معاش)','معاش'].includes(t.employment_type || ''));

  const kpis = [
    { label: 'إجمالي المعلمين', value: teachers.length,  color: 'blue' },
    { label: 'معينون',          value: appointed.length,  color: 'emerald' },
    { label: 'بالأجر',          value: hourly.length,     color: 'indigo' },
    { label: 'بالمعاش',         value: pension.length,    color: 'amber' },
    { label: 'القيادات',         value: leaders.length,   color: 'purple' },
  ];

  const colorClass: Record<string, string> = {
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    indigo:  'bg-indigo-50 border-indigo-200 text-indigo-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    purple:  'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className="space-y-4">

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {kpis.map(k => (
          <div key={k.label} className={`border rounded-xl p-3 text-center ${colorClass[k.color]}`}>
            <p className="text-2xl font-black">{k.value}</p>
            <p className="text-[10px] font-bold mt-0.5 opacity-80">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-right transition-all ${
                activeSubTab === tab.id
                  ? 'bg-white shadow-sm border border-slate-200 text-slate-800'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
              }`}
            >
              <span className="text-base shrink-0">{tab.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-tight truncate">{tab.label}</p>
                <p className="text-[9px] text-slate-400 font-medium truncate">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 min-h-[400px]">

        {activeSubTab === 'structure' && (
          <WorkforceStructure staff={staff} leaders={leaders} school={school} />
        )}

        {activeSubTab === 'full_teachers' && (
          <FullStaffReport staff={staff} leaders={leaders} school={school} mode="teachers" />
        )}

        {activeSubTab === 'leaders' && (
          <FullStaffReport staff={staff} leaders={leaders} school={school} mode="leaders" />
        )}

        {activeSubTab === 'spec_appointed' && (
          <SpecializationReport staff={staff} school={school} filterType="appointed" />
        )}

        {activeSubTab === 'spec_hourly' && (
          <SpecializationReport staff={staff} school={school} filterType="hourly" />
        )}

        {activeSubTab === 'spec_pension' && (
          <SpecializationReport staff={staff} school={school} filterType="pension" />
        )}

        {activeSubTab === 'shortage_primary' && (
          <OfficialShortageReport
            classStats={classStats}
            staff={staff}
            school={school}
            stage="primary"
          />
        )}

        {activeSubTab === 'shortage_prep' && (
          <OfficialShortageReport
            classStats={classStats}
            staff={staff}
            school={school}
            stage="preparatory"
          />
        )}
      </div>
    </div>
  );
}
