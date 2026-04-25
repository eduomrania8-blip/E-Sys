'use client';
// src/app/school/components/SchoolTabs.tsx
// نظام التبويبات لبوابة المدرسة

import React, { useState } from 'react';
import { ShortageTab } from './ShortageTab';
import { TeacherReportsTab } from './reports/TeacherReportsTab';
import Link from 'next/link';

interface SchoolTabsProps {
  stats: any[];
  staff: any[];
  leaders: any[];
  building: any;
  school: any;
  canEdit: boolean;
  totalStudents: number;
  totalClasses: number;
  totalBoys: number;
  totalGirls: number;
  avgDensity: string;
  teachers: number;
  adminsN: number;
  workers: number;
  lowCount: number;
  inclusionCount: number;
  schoolId: string;
}

export function SchoolTabs({
  stats, staff, leaders, building, school, canEdit,
  totalStudents, totalClasses, totalBoys, totalGirls, avgDensity,
  teachers, adminsN, workers, lowCount, inclusionCount, schoolId
}: SchoolTabsProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'shortage' | 'staff' | 'leaders' | 'reports'>('stats');

  const tabs = [
    { id: 'stats',    label: '📊 الإحصاءات',         count: stats.length   },
    { id: 'shortage', label: '📉 العجز والزيادة',     count: null           },
    { id: 'staff',    label: '👨‍🏫 العاملون',           count: staff.length   },
    { id: 'leaders',  label: '👤 القيادات',            count: leaders.length },
    { id: 'reports',  label: '📑 تقارير المعلمين',    count: null           },
  ] as const;

  return (
    <div className="card overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            {tab.label}
            {tab.count !== null && tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">

        {/* ═══ TAB: Statistics ═══ */}
        {activeTab === 'stats' && (
          <div>
            {/* Totals row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-700">{totalStudents.toLocaleString('ar-EG')}</p>
                <p className="text-[10px] font-bold text-blue-500">إجمالي الطلاب</p>
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-teal-700">{totalClasses}</p>
                <p className="text-[10px] font-bold text-teal-500">الفصول</p>
              </div>
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-pink-700">{totalBoys}</p>
                <p className="text-[10px] font-bold text-pink-500">بنين</p>
              </div>
              <div className={`border rounded-xl p-3 text-center ${Number(avgDensity) > 50 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className={`text-xl font-black ${Number(avgDensity) > 50 ? 'text-red-700' : 'text-emerald-700'}`}>{avgDensity}</p>
                <p className={`text-[10px] font-bold ${Number(avgDensity) > 50 ? 'text-red-500' : 'text-emerald-500'}`}>الكثافة</p>
              </div>
            </div>

            {stats.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-black text-slate-400 bg-slate-50">
                      <th className="pb-3 pt-3 px-3">الصف</th>
                      <th className="pb-3 pt-3 px-3">الفصول</th>
                      <th className="pb-3 pt-3 px-3 text-blue-600/70">بنين</th>
                      <th className="pb-3 pt-3 px-3 text-pink-600/70">بنات</th>
                      <th className="pb-3 pt-3 px-3">الإجمالي</th>
                      <th className="pb-3 pt-3 px-3 text-teal-600/70">الدمج</th>
                      <th className="pb-3 pt-3 px-3 text-center">الكثافة</th>
                      <th className="pb-3 pt-3 px-3 text-gray-500">مسلم</th>
                      <th className="pb-3 pt-3 px-3 text-gray-500">مسيحي</th>
                      <th className="pb-3 pt-3 px-3 text-cyan-600/70">وافد</th>
                      <th className="pb-3 pt-3 px-3 text-orange-600/70">معيد</th>
                      <th className="pb-3 pt-3 px-3 text-red-600/70">منقطع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.map((s: any) => {
                      const total = (s.boys_count || 0) + (s.girls_count || 0);
                      const d = s.number_of_classes > 0 ? Math.round(total / s.number_of_classes * 10) / 10 : 0;
                      const inclusionTotal = (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{s.grade_level}</td>
                          <td className="py-2.5 px-3">{s.number_of_classes}</td>
                          <td className="py-2.5 px-3 text-blue-600">{s.boys_count}</td>
                          <td className="py-2.5 px-3 text-pink-600">{s.girls_count}</td>
                          <td className="py-2.5 px-3 font-black">{total}</td>
                          <td className="py-2.5 px-3 text-teal-600">{inclusionTotal > 0 ? inclusionTotal : '—'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              d > 60 ? 'bg-red-100 text-red-700' : d > 50 ? 'bg-orange-100 text-orange-700' : d > 40 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>{d}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{s.muslim_count || 0}</td>
                          <td className="py-2.5 px-3 text-slate-500">{s.christian_count || 0}</td>
                          <td className="py-2.5 px-3 text-cyan-600">{s.expatriate_count || 0}</td>
                          <td className="py-2.5 px-3 text-orange-600">{s.retained_for_repeat || 0}</td>
                          <td className="py-2.5 px-3 text-red-600">{s.dropout_count || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 font-black text-slate-900 bg-slate-50">
                    <tr>
                      <td className="pt-3 pb-3 px-3">الإجمالي</td>
                      <td className="pt-3 pb-3 px-3">{totalClasses}</td>
                      <td className="pt-3 pb-3 px-3 text-blue-600">{totalBoys}</td>
                      <td className="pt-3 pb-3 px-3 text-pink-600">{totalGirls}</td>
                      <td className="pt-3 pb-3 px-3">{totalStudents.toLocaleString('ar-EG')}</td>
                      <td className="pt-3 pb-3 px-3 text-teal-600">{stats.reduce((a: number, s: any) => a + (s.inclusion_mental || 0) + (s.inclusion_hearing || 0) + (s.inclusion_visual || 0) + (s.inclusion_physical || 0) + (s.inclusion_multiple || 0), 0)}</td>
                      <td className="pt-3 pb-3 px-3 text-center font-black text-emerald-600">{avgDensity}</td>
                      <td className="pt-3 pb-3 px-3 text-slate-500">{stats.reduce((a: number, s: any) => a + (s.muslim_count || 0), 0)}</td>
                      <td className="pt-3 pb-3 px-3 text-slate-500">{stats.reduce((a: number, s: any) => a + (s.christian_count || 0), 0)}</td>
                      <td className="pt-3 pb-3 px-3 text-cyan-600">{stats.reduce((a: number, s: any) => a + (s.expatriate_count || 0), 0)}</td>
                      <td className="pt-3 pb-3 px-3 text-orange-600">{stats.reduce((a: number, s: any) => a + (s.retained_for_repeat || 0), 0)}</td>
                      <td className="pt-3 pb-3 px-3 text-red-600">{stats.reduce((a: number, s: any) => a + (s.dropout_count || 0), 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-slate-400 font-bold">لا توجد بيانات إحصائية بعد</p>
                {canEdit && (
                  <div className="flex justify-center gap-3 mt-4">
                    <Link href="/school/upload" className="text-sm px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition">⬆️ رفع ملف Excel</Link>
                    <Link href="/school/manual" className="text-sm px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition">✍️ إدخال يدوي</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Shortage Analysis ═══ */}
        {activeTab === 'shortage' && (
          <div>
            {staff.length > 0 && stats.length > 0 ? (
              <ShortageTab
                classStats={stats.map((s: any) => ({ grade_level: s.grade_level, number_of_classes: s.number_of_classes }))}
                staffData={staff}
                stage="primary"
              />
            ) : (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📉</p>
                <p className="text-slate-500 font-bold text-lg">لا يمكن حساب العجز والزيادة</p>
                <p className="text-slate-400 text-sm mt-1">
                  {staff.length === 0 && 'بيانات العاملين غير متوفرة. '}
                  {stats.length === 0 && 'إحصاءات الفصول غير متوفرة.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Staff ═══ */}
        {activeTab === 'staff' && (
          <div>
            {staff.length > 0 ? (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-blue-700">{teachers}</p>
                    <p className="text-[10px] font-bold text-blue-500">معلم</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-purple-700">{adminsN}</p>
                    <p className="text-[10px] font-bold text-purple-500">إداري</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-orange-700">{workers}</p>
                    <p className="text-[10px] font-bold text-orange-500">عامل</p>
                  </div>
                </div>
                {/* Staff list */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 text-xs text-slate-400">
                      <tr>
                        <th className="px-3 py-3 font-black">الاسم</th>
                        <th className="px-3 py-3 font-black">الفئة</th>
                        <th className="px-3 py-3 font-black">التخصص / الدور</th>
                        <th className="px-3 py-3 font-black">الكادر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {staff.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-slate-800">{s.full_name_ar || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              s.job_category === 'معلم' ? 'bg-blue-100 text-blue-700' :
                              s.job_category === 'إداري' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                            }`}>{s.job_category}</span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 text-xs">{s.subject_taught || s.school_role || s.worker_type || '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{s.cadre_position || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">👨‍🏫</p>
                <p className="text-slate-400 font-bold">لا توجد بيانات عاملين مسجلة</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Leaders ═══ */}
        {activeTab === 'leaders' && (
          <div>
            {leaders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {leaders.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-emerald-200 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-black shrink-0 shadow-sm">
                      {l.full_name_ar?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-800 truncate">{l.full_name_ar}</p>
                      <p className="text-xs font-bold text-emerald-600">{l.job_title}</p>
                      {l.phone && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{l.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">👤</p>
                <p className="text-slate-400 font-bold">لا توجد قيادات مسجلة</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Teacher Reports ═══ */}
        {activeTab === 'reports' && (
          <TeacherReportsTab
            staff={staff}
            leaders={leaders}
            classStats={stats.map((s: any) => ({ grade_level: s.grade_level, number_of_classes: s.number_of_classes }))}
            school={school}
          />
        )}

      </div>
    </div>
  );
}
