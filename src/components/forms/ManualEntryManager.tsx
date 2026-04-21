'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import BuildingForm from '@/components/forms/BuildingForm';
import StatsForm from '@/components/forms/StatsForm';
import StaffForm from '@/components/forms/StaffForm';
import LeadersForm from '@/components/forms/LeadersForm';
import StudentsListForm from '@/components/forms/StudentsListForm';

const SECTIONS = [
  { id: 'stats',    label: 'إحصاءات الفصول',       icon: '📊', description: 'عدد الطلاب والفصول لكل صف دراسي',     color: 'blue' },
  { id: 'building', label: 'المبنى المدرسي',        icon: '🏛️', description: 'الفصول، المعامل، دورات المياه، المرافق', color: 'teal' },
  { id: 'leaders',  label: 'القيادات المدرسية',      icon: '👤', description: 'المدير والوكلاء والمسؤولون',           color: 'purple' },
  { id: 'staff',    label: 'هيئة التدريس والعمال',   icon: '👨‍🏫', description: 'المعلمون والإداريون والعمال',           color: 'orange' },
  { id: 'students', label: 'كشوف الطلاب',           icon: '📋', description: 'الضعاف، الدمج، الوافدين، اللاجئين',    color: 'pink' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function ManualEntryManager({ schoolId }: { schoolId: string }) {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [activeTab, setActiveTab] = useState<SectionId>('stats');
  const [completion, setCompletion] = useState<Record<string, boolean>>({});

  // فحص اكتمال كل قسم
  useEffect(() => {
    const checkCompletion = async () => {
      const [statsRes, buildingRes, leadersRes, staffRes, lowRes] = await Promise.all([
        supabase.from('class_statistics').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('academic_year', '2025-2026'),
        supabase.from('school_buildings').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('school_leaders').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('school_staff').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('low_performer_students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('academic_year', '2025-2026'),
      ]);
      setCompletion({
        stats: (statsRes.count ?? 0) > 0,
        building: (buildingRes.count ?? 0) > 0,
        leaders: (leadersRes.count ?? 0) > 0,
        staff: (staffRes.count ?? 0) > 0,
        students: (lowRes.count ?? 0) > 0,
      });
    };
    checkCompletion();
  }, [schoolId, activeTab, supabase]);

  const completedCount = Object.values(completion).filter(Boolean).length;
  const progressPct = Math.round((completedCount / SECTIONS.length) * 100);

  const colorMap: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200', text: 'text-blue-700', activeBg: 'bg-blue-600' },
    teal:   { bg: 'bg-teal-50',   border: 'border-teal-200', text: 'text-teal-700', activeBg: 'bg-teal-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', activeBg: 'bg-purple-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', activeBg: 'bg-orange-600' },
    pink:   { bg: 'bg-pink-50',   border: 'border-pink-200', text: 'text-pink-700', activeBg: 'bg-pink-600' },
  };

  const activeSection = SECTIONS.find(s => s.id === activeTab)!;
  const colors = colorMap[activeSection.color];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              ✍️ الإدخال اليدوي للبيانات
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              أدخل بيانات المدرسة عبر الأقسام التالية — التغييرات تُحفظ فوراً
            </p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
            <div className="relative w-12 h-12">
              <svg className="transform -rotate-90 w-12 h-12" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke={progressPct >= 80 ? '#22c55e' : progressPct >= 40 ? '#eab308' : '#3b82f6'}
                  strokeWidth="3" strokeDasharray={`${progressPct} 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-700">
                {progressPct}%
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-gray-900">{completedCount} من {SECTIONS.length}</p>
              <p className="text-[10px] text-gray-400 font-bold">أقسام مكتملة</p>
            </div>
          </div>
        </div>

        {/* Section Navigation — Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {SECTIONS.map(section => {
            const isActive = activeTab === section.id;
            const isDone = completion[section.id];
            const c = colorMap[section.color];

            return (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`relative p-3.5 rounded-xl border-2 text-right transition-all group
                  ${isActive
                    ? `${c.border} ${c.bg} shadow-lg ring-2 ring-offset-1 ring-${section.color}-300`
                    : isDone
                      ? 'border-emerald-200 bg-emerald-50/50 hover:shadow-md'
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
              >
                {/* Status Badge */}
                <div className="absolute -top-1.5 -left-1.5">
                  {isDone ? (
                    <span className="flex items-center justify-center w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] shadow-sm">✓</span>
                  ) : isActive ? (
                    <span className={`flex items-center justify-center w-5 h-5 ${c.activeBg} text-white rounded-full text-[9px] shadow-sm animate-pulse`}>●</span>
                  ) : null}
                </div>

                <span className="text-xl block mb-1.5">{section.icon}</span>
                <p className={`text-xs font-black leading-tight ${isActive ? c.text : isDone ? 'text-emerald-700' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {section.label}
                </p>
                <p className="text-[9px] text-gray-400 mt-1 leading-snug line-clamp-2">{section.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Header */}
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl ${colors.bg} border ${colors.border}`}>
        <span className="text-2xl">{activeSection.icon}</span>
        <div>
          <p className={`text-sm font-black ${colors.text}`}>{activeSection.label}</p>
          <p className="text-[11px] text-gray-500">{activeSection.description}</p>
        </div>
        {completion[activeTab] && (
          <span className="mr-auto text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            ✓ تم إدخال البيانات
          </span>
        )}
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          {activeTab === 'stats' && <StatsForm schoolId={schoolId} />}
          {activeTab === 'building' && <BuildingForm schoolId={schoolId} />}
          {activeTab === 'leaders' && <LeadersForm schoolId={schoolId} />}
          {activeTab === 'staff' && <StaffForm schoolId={schoolId} />}
          {activeTab === 'students' && <StudentsListForm schoolId={schoolId} />}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            const idx = SECTIONS.findIndex(s => s.id === activeTab);
            if (idx > 0) setActiveTab(SECTIONS[idx - 1].id);
          }}
          disabled={SECTIONS.findIndex(s => s.id === activeTab) === 0}
          className="btn-secondary text-sm disabled:opacity-30"
        >
          ← القسم السابق
        </button>
        <p className="text-[11px] text-gray-400 font-bold">
          {SECTIONS.findIndex(s => s.id === activeTab) + 1} من {SECTIONS.length}
        </p>
        <button
          onClick={() => {
            const idx = SECTIONS.findIndex(s => s.id === activeTab);
            if (idx < SECTIONS.length - 1) setActiveTab(SECTIONS[idx + 1].id);
          }}
          disabled={SECTIONS.findIndex(s => s.id === activeTab) === SECTIONS.length - 1}
          className="btn-primary text-sm disabled:opacity-30"
        >
          القسم التالي →
        </button>
      </div>
    </div>
  );
}
