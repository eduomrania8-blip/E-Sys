'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import BuildingForm from '@/components/forms/BuildingForm';
import StatsForm from '@/components/forms/StatsForm';
import StaffForm from '@/components/forms/StaffForm';
import LeadersForm from '@/components/forms/LeadersForm';
import StudentsListForm from '@/components/forms/StudentsListForm';

const SECTIONS = [
  { id: 'stats',    label: 'إحصاءات الفصول',       icon: '📊', description: 'عدد الطلاب والفصول لكل صف دراسي',     color: 'blue',   gradient: 'from-blue-500 to-blue-600' },
  { id: 'building', label: 'المبنى المدرسي',        icon: '🏛️', description: 'الفصول، المعامل، دورات المياه، المرافق', color: 'teal',   gradient: 'from-teal-500 to-teal-600' },
  { id: 'leaders',  label: 'القيادات المدرسية',      icon: '👤', description: 'المدير والوكلاء والمسؤولون',           color: 'purple', gradient: 'from-purple-500 to-purple-600' },
  { id: 'staff',    label: 'هيئة التدريس والعمال',   icon: '👨‍🏫', description: 'المعلمون والإداريون والعمال',           color: 'orange', gradient: 'from-orange-500 to-orange-600' },
  { id: 'students', label: 'كشوف الطلاب',           icon: '📋', description: 'الضعاف، الدمج، الوافدين، اللاجئين',    color: 'pink',   gradient: 'from-pink-500 to-pink-600' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

interface CompletionData {
  stats: number;
  building: number;
  leaders: number;
  staff: number;
  students: number;
}

export default function ManualEntryManager({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [activeTab, setActiveTab] = useState<SectionId>('stats');
  const [counts, setCounts] = useState<CompletionData>({ stats: 0, building: 0, leaders: 0, staff: 0, students: 0 });
  const [transitioning, setTransitioning] = useState(false);

  // فحص اكتمال كل قسم
  const checkCompletion = useCallback(async () => {
    const [statsRes, buildingRes, leadersRes, staffRes, lowRes] = await Promise.all([
      supabase.from('class_statistics').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('academic_year', '2025-2026'),
      supabase.from('school_buildings').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('school_leaders').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('school_staff').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('low_performer_students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('academic_year', '2025-2026'),
    ]);
    setCounts({
      stats: statsRes.count ?? 0,
      building: buildingRes.count ?? 0,
      leaders: leadersRes.count ?? 0,
      staff: staffRes.count ?? 0,
      students: lowRes.count ?? 0,
    });
  }, [schoolId, supabase]);

  useEffect(() => { checkCompletion(); }, [checkCompletion]);

  const completion = useMemo(() => ({
    stats: counts.stats > 0,
    building: counts.building > 0,
    leaders: counts.leaders > 0,
    staff: counts.staff > 0,
    students: counts.students > 0,
  }), [counts]);

  const completedCount = Object.values(completion).filter(Boolean).length;
  const progressPct = Math.round((completedCount / SECTIONS.length) * 100);

  const switchTab = (id: SectionId) => {
    if (id === activeTab) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveTab(id);
      checkCompletion();
      setTransitioning(false);
    }, 150);
  };

  const activeIdx = SECTIONS.findIndex(s => s.id === activeTab);
  const activeSection = SECTIONS[activeIdx];

  const progressColor = progressPct >= 80 ? '#22c55e' : progressPct >= 40 ? '#eab308' : '#3b82f6';

  return (
    <div className="space-y-6" dir="rtl">
      {/* ═══════ Header with Progress ═══════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Gradient top bar */}
        <div className="h-1.5 bg-gradient-to-l from-blue-500 via-purple-500 to-pink-500" />

        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-lg">✍️</span>
                الإدخال اليدوي للبيانات
              </h1>
              <p className="text-sm text-gray-500 mt-1 mr-[52px]">
                أدخل بيانات المدرسة عبر الأقسام التالية — التغييرات تُحفظ فوراً في قاعدة البيانات
              </p>
            </div>

            {/* Progress Ring */}
            <div className="flex items-center gap-4 bg-gray-50/80 rounded-2xl px-5 py-3 border border-gray-100">
              <div className="relative w-14 h-14">
                <svg className="transform -rotate-90 w-14 h-14" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={progressColor}
                    strokeWidth="2.5" strokeDasharray={`${progressPct} 100`} strokeLinecap="round"
                    className="transition-all duration-700 ease-out" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-700">
                  {progressPct}%
                </span>
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">{completedCount} من {SECTIONS.length}</p>
                <p className="text-[10px] text-gray-400 font-bold">أقسام مكتملة</p>
                {progressPct === 100 && (
                  <p className="text-[10px] text-emerald-600 font-black mt-0.5">✅ اكتمل إدخال جميع البيانات!</p>
                )}
              </div>
            </div>
          </div>

          {/* ═══════ Section Navigation — Stepper ═══════ */}
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {SECTIONS.map((section, idx) => {
              const isActive = activeTab === section.id;
              const isDone = completion[section.id as keyof typeof completion];
              const isPast = idx < activeIdx;

              return (
                <React.Fragment key={section.id}>
                  {/* Connector line */}
                  {idx > 0 && (
                    <div className={`hidden md:block h-0.5 w-8 shrink-0 transition-colors duration-300 ${
                      isPast || (isDone && idx <= activeIdx) ? 'bg-emerald-400' : 'bg-gray-200'
                    }`} />
                  )}

                  <button
                    onClick={() => switchTab(section.id)}
                    className={`relative flex-1 min-w-[120px] p-3.5 rounded-xl border-2 text-center transition-all duration-300 group
                      ${isActive
                        ? `border-${section.color}-400 bg-gradient-to-br from-${section.color}-50 to-white shadow-lg ring-2 ring-${section.color}-200 ring-offset-1`
                        : isDone
                          ? 'border-emerald-200 bg-emerald-50/40 hover:shadow-md hover:border-emerald-300'
                          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}
                  >
                    {/* Status Badge */}
                    <div className="absolute -top-2 -left-2">
                      {isDone ? (
                        <span className="flex items-center justify-center w-6 h-6 bg-emerald-500 text-white rounded-full text-[10px] shadow-md font-black">✓</span>
                      ) : isActive ? (
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-[9px] shadow-md animate-pulse-ring">●</span>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 bg-gray-200 text-gray-500 rounded-full text-[10px] font-black">{idx + 1}</span>
                      )}
                    </div>

                    {/* Count badge */}
                    {counts[section.id as keyof CompletionData] > 0 && (
                      <div className="absolute -top-2 -right-2">
                        <span className="flex items-center justify-center min-w-[22px] h-5 bg-blue-600 text-white rounded-full text-[9px] font-black px-1.5 shadow-sm">
                          {counts[section.id as keyof CompletionData]}
                        </span>
                      </div>
                    )}

                    <span className="text-xl block mb-1.5">{section.icon}</span>
                    <p className={`text-[11px] font-black leading-tight ${
                      isActive ? `text-${section.color}-700` : isDone ? 'text-emerald-700' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {section.label}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1 leading-snug line-clamp-1 hidden sm:block">{section.description}</p>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════ Active Section Header ═══════ */}
      <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-${activeSection.color}-50 to-white border border-${activeSection.color}-200 shadow-sm`}>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeSection.gradient} flex items-center justify-center text-2xl text-white shadow-lg`}>
          {activeSection.icon}
        </div>
        <div className="flex-1">
          <p className={`text-base font-black text-${activeSection.color}-800`}>{activeSection.label}</p>
          <p className="text-xs text-gray-500">{activeSection.description}</p>
        </div>
        {completion[activeTab as keyof typeof completion] && (
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            تم إدخال البيانات
          </span>
        )}
      </div>

      {/* ═══════ Form Content ═══════ */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
        transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}>
        <div className="p-6">
          {activeTab === 'stats' && <StatsForm schoolId={schoolId} />}
          {activeTab === 'building' && <BuildingForm schoolId={schoolId} />}
          {activeTab === 'leaders' && <LeadersForm schoolId={schoolId} />}
          {activeTab === 'staff' && <StaffForm schoolId={schoolId} />}
          {activeTab === 'students' && <StudentsListForm schoolId={schoolId} />}
        </div>
      </div>

      {/* ═══════ Bottom Navigation ═══════ */}
      <div className="flex justify-between items-center bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <button
          onClick={() => {
            if (activeIdx > 0) switchTab(SECTIONS[activeIdx - 1].id);
          }}
          disabled={activeIdx === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
          {activeIdx > 0 ? SECTIONS[activeIdx - 1].label : 'القسم السابق'}
        </button>

        {/* Dots indicator */}
        <div className="flex items-center gap-2">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => switchTab(s.id)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === activeIdx ? `bg-${s.color}-500 w-6` :
                completion[s.id as keyof typeof completion] ? 'bg-emerald-400' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (activeIdx < SECTIONS.length - 1) switchTab(SECTIONS[activeIdx + 1].id);
          }}
          disabled={activeIdx === SECTIONS.length - 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
        >
          {activeIdx < SECTIONS.length - 1 ? SECTIONS[activeIdx + 1].label : 'القسم التالي'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}
