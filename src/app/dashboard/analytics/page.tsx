'use client';
// src/app/dashboard/analytics/page.tsx
// مركز التحليلات — رسوم بيانية تفاعلية شاملة

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
  RadialBarChart, RadialBar,
} from 'recharts';
import { SkeletonPage } from '@/components/shared/SkeletonLoader';
import { sortStatsByGrade, gradeOrderMap } from '@/utils/gradeSorter';

export default function AnalyticsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [schools, setSchools]     = useState<any[]>([]);
  const [density, setDensity]     = useState<any[]>([]);
  const [classStats, setClassStats] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const [summaryRes, densityRes, statsRes] = await Promise.all([
        supabase.from('school_summary').select('*'),
        supabase.from('high_density_schools').select('*'),
        supabase.from('class_statistics').select('*, schools(school_name_ar)').eq('academic_year', '2025-2026'),
      ]);
      setSchools(summaryRes.data ?? []);
      setDensity(densityRes.data ?? []);
      setClassStats(sortStatsByGrade(statsRes.data ?? []));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <SkeletonPage />;
  }

  // ─── حساب البيانات ──────────────────────────────────────

  const totalStudents  = schools.reduce((a, s) => a + (Number(s.total_students) || 0), 0);
  const totalBoys      = schools.reduce((a, s) => a + (Number(s.total_boys) || 0), 0);
  const totalGirls     = schools.reduce((a, s) => a + (Number(s.total_girls) || 0), 0);
  const totalInclusion = schools.reduce((a, s) => a + (Number(s.total_inclusion) || 0), 0);
  const totalLow       = schools.reduce((a, s) => a + (Number(s.low_performer_count) || 0), 0);
  const totalTeachers  = schools.reduce((a, s) => a + (Number(s.teacher_count) || 0), 0);
  const totalExpat     = schools.reduce((a, s) => a + (Number(s.total_expatriate) || 0), 0);

  // توزيع الكثافة (حسب المدرسة)
  const densityDistribution = [
    { name: 'مقبول (≤40)',   value: schools.filter(s => (Number(s.avg_density) || 0) <= 40).length,                                      fill: '#10b981' },
    { name: 'متوسط (41-50)', value: schools.filter(s => { const d = Number(s.avg_density) || 0; return d > 40 && d <= 50; }).length,     fill: '#f59e0b' },
    { name: 'مرتفع (51-60)', value: schools.filter(s => { const d = Number(s.avg_density) || 0; return d > 50 && d <= 60; }).length,     fill: '#f97316' },
    { name: 'خطر (>60)',     value: schools.filter(s => (Number(s.avg_density) || 0) > 60).length,                                       fill: '#ef4444' },
  ].filter(d => d.value > 0);

  // بنين / بنات
  const genderData = [
    { name: 'بنين', value: totalBoys,  fill: '#3b82f6' },
    { name: 'بنات', value: totalGirls, fill: '#ec4899' },
  ];

  // أنواع المدارس
  const typeData = schools.reduce((acc: any[], s) => {
    const t = s.school_type ?? 'غير محدد';
    const found = acc.find(x => x.name === t);
    if (found) { found.count++; found.students += Number(s.total_students) || 0; }
    else acc.push({ name: t, count: 1, students: Number(s.total_students) || 0 });
    return acc;
  }, []).sort((a, b) => b.count - a.count);

  // ترتيب المدارس حسب الكثافة (top 10)
  const topDensity = [...schools]
    .filter(s => Number(s.avg_density) > 0)
    .sort((a, b) => Number(b.avg_density) - Number(a.avg_density))
    .slice(0, 10)
    .map(s => ({
      name: s.school_name_ar?.substring(0, 20) ?? '',
      density: Number(s.avg_density) || 0,
      students: Number(s.total_students) || 0,
    }));

  // ترتيب المدارس حسب عدد الطلاب (top 10)
  const topStudents = [...schools]
    .sort((a, b) => Number(b.total_students) - Number(a.total_students))
    .slice(0, 10)
    .map(s => ({
      name: s.school_name_ar?.substring(0, 20) ?? '',
      students: Number(s.total_students) || 0,
      teachers: Number(s.teacher_count) || 0,
    }));

  // نسبة طالب/معلم
  const studentTeacherRatio = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : '—';

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* ═══════ Hero Header ═══════ */}
      <header className="relative overflow-hidden bg-gradient-to-l from-indigo-800 via-purple-800 to-indigo-900 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%)' }} />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-4xl shadow-lg border border-white/20">
              📈
            </div>
            <div>
              <p className="text-indigo-200 text-xs font-bold tracking-widest uppercase mb-1">مركز التحليلات الاستراتيجية</p>
              <h1 className="text-3xl font-black leading-tight tracking-tight">البيانات ومؤشرات الأداء</h1>
              <p className="text-indigo-100 mt-1 text-sm font-medium opacity-90">تحليل تفصيلي لمدارس الإدارة — 2025/2026</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-2.5 text-center">
              <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">المدارس المحللة</p>
              <p className="text-xl font-black">{schools.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-2.5 text-center">
              <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">إجمالي الطلاب</p>
              <p className="text-xl font-black">{Number(totalStudents).toLocaleString('ar-EG')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ KPI: مؤشرات الأداء الرئيسية ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* نسبة المدارس التي رفعت بيانات */}
        {(() => {
          const uploadedSchools = schools.filter(s => (Number(s.total_students) || 0) > 0).length;
          const pct = schools.length > 0 ? Math.round((uploadedSchools / schools.length) * 100) : 0;
          return (
            <KpiCard label="اكتمال البيانات" value={`${pct}%`} detail={`${uploadedSchools} من ${schools.length} مدرسة`}
              color={pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'red'} icon="📥" />
          );
        })()}
        {/* متوسط الكثافة العام */}
        {(() => {
          const totalS = schools.reduce((a, s) => a + (Number(s.total_students) || 0), 0);
          const totalC = schools.reduce((a, s) => a + (Number(s.total_classes) || 0), 0);
          const avg = totalC > 0 ? (totalS / totalC).toFixed(1) : '0';
          return (
            <KpiCard label="الكثافة العامة" value={avg} detail="متوسط طالب / فصل"
              color={Number(avg) > 50 ? 'red' : Number(avg) > 40 ? 'amber' : 'emerald'} icon="📊" />
          );
        })()}
        {/* نسبة الدمج */}
        {(() => {
          const pct = totalStudents > 0 ? ((totalInclusion / totalStudents) * 100).toFixed(1) : '0';
          return <KpiCard label="نسبة الدمج" value={`${pct}%`} detail={`${totalInclusion} طالب مدمج`} color="blue" icon="♿" />;
        })()}
        {/* نسبة طالب / معلم */}
        <KpiCard label="نصاب المعلم" value={studentTeacherRatio} detail="طالب لكل معلم"
          color={Number(studentTeacherRatio) > 30 ? 'red' : Number(studentTeacherRatio) > 20 ? 'amber' : 'emerald'} icon="👨‍🏫" />
      </div>

      {/* ═══════ Row 1: Density + Gender ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* توزيع الكثافة */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-xs">📈</span>
            توزيع الكثافة الطلابية (مدارس)
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">نسبة المدارس المصنفة في كل فئة كثافة</p>
          {densityDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={densityDistribution}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                  paddingAngle={5}
                >
                  {densityDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} className="drop-shadow-sm" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', direction: 'rtl' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* نسبة البنين/البنات */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-pink-100 text-pink-600 rounded flex items-center justify-center text-xs">👥</span>
            التركيبة الجندرية
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">
            بنين: <span className="text-blue-600">{totalBoys.toLocaleString('ar-EG')}</span> | بنات: <span className="text-pink-600">{totalGirls.toLocaleString('ar-EG')}</span>
          </p>
          {totalStudents > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={0}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {genderData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => v.toLocaleString('ar-EG')} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', direction: 'rtl' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* ═══════ Row 2: Top Density Bar + Top Students ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* أعلى 10 كثافة */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center text-xs">🔥</span>
            أعلى 10 مدارس في الكثافة
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">مرتبة تنازلياً حسب متوسط الكثافة (طالب/فصل)</p>
          {topDensity.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topDensity} layout="vertical" margin={{ right: 10, left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#4b5563' }} width={140} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => `${v} طالب`} cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="density" radius={[0, 4, 4, 0]} barSize={16}>
                  {topDensity.map((entry, idx) => (
                    <Cell key={idx} fill={entry.density > 60 ? '#ef4444' : entry.density > 50 ? '#f97316' : '#eab308'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* أعلى 10 عدد طلاب */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">📈</span>
            أكبر 10 مدارس كثافة عددية
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">تصنيف حسب إجمالي قوة الطلاب</p>
          {topStudents.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topStudents} layout="vertical" margin={{ right: 10, left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#4b5563' }} width={140} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="students" name="إجمالي الطلاب" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* ═══════ Row 3: School Types + Special Categories ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* توزيع أنواع المدارس */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded flex items-center justify-center text-xs">🏛️</span>
            توزيع المنشآت حسب النوعية
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">عدد المدارس العاملة في كل قطاع</p>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData} margin={{ top: 20, right: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#4b5563' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6' }} />
                <Bar dataKey="count" name="عدد المدارس" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* الفئات الخاصة */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-teal-100 text-teal-600 rounded flex items-center justify-center text-xs">📋</span>
            متابعة الفئات الخاصة
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">نسب وتوزيعات الدمج، الضعاف، والوافدين</p>
          
          <div className="space-y-5">
            <CategoryBar label="منظومة الدمج" count={totalInclusion} total={totalStudents} color="bg-teal-500" icon="♿" />
            <CategoryBar label="برامج العلاج للضعاف" count={totalLow} total={totalStudents} color="bg-orange-500" icon="📉" />
            <CategoryBar label="الطلاب الوافدين" count={totalExpat} total={totalStudents} color="bg-indigo-500" icon="🌍" />
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            <div className="bg-teal-50 rounded-xl py-2">
              <p className="text-xl font-black text-teal-600">{totalInclusion.toLocaleString('ar-EG')}</p>
              <p className="text-[10px] text-teal-700/70 font-bold mt-0.5">طالب مدمج</p>
            </div>
            <div className="bg-orange-50 rounded-xl py-2">
              <p className="text-xl font-black text-orange-600">{totalLow.toLocaleString('ar-EG')}</p>
              <p className="text-[10px] text-orange-700/70 font-bold mt-0.5">طالب ضعيف</p>
            </div>
            <div className="bg-indigo-50 rounded-xl py-2">
              <p className="text-xl font-black text-indigo-600">{totalExpat.toLocaleString('ar-EG')}</p>
              <p className="text-[10px] text-indigo-700/70 font-bold mt-0.5">طالب وافد</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Heatmap Grid ═══════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
          <span className="w-6 h-6 bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs">🗺️</span>
          المسح الحراري للكثافة (Heatmap)
        </h2>
        <p className="text-xs text-gray-400 mb-6 font-bold">كل مربع يمثل مدرسة. الألوان تشير إلى مستويات الكثافة.</p>
        
        <div className="flex flex-wrap gap-1.5 p-4 bg-gray-50 rounded-xl border border-gray-100">
          {schools.map((s, i) => {
            const d = Number(s.avg_density) || 0;
            const bg =
              d > 60 ? 'bg-red-500'    :
              d > 50 ? 'bg-orange-500' :
              d > 40 ? 'bg-yellow-400' :
              d > 0  ? 'bg-emerald-500'  : 'bg-gray-200';
            return (
              <div
                key={i}
                title={`${s.school_name_ar}\nالكثافة: ${d} طالب/فصل\nالطلاب: ${s.total_students}`}
                className={`w-6 h-6 sm:w-8 sm:h-8 ${bg} rounded-md cursor-pointer hover:scale-125 hover:shadow-lg transition-transform`}
              />
            );
          })}
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4 text-[11px] font-black text-gray-500 justify-center">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-sm" /> مقبول (≤40)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-400 rounded-sm" /> متوسط (41-50)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-500 rounded-sm" /> مرتفع (51-60)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm" /> خطر (&gt;60)</span>
        </div>
      </div>

      {/* ═══════ Pivot Table: الكثافة حسب المدرسة × الصف ═══════ */}
      {classStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs">📐</span>
            المصفوفة الاستقرائية للكثافات (مدرسة × صف)
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">متوسط كثافة كل صف على مستوى المدارس (طالب/فصل)</p>
          
          {(() => {
            // استخراج الصفوف الموجودة فعلياً وترتيبها
            const uniqueGrades = Array.from(new Set(classStats.map(s => s.grade_level))).sort((a, b) => (gradeOrderMap[a] || 99) - (gradeOrderMap[b] || 99));
            // تجميع البيانات حسب المدرسة
            const schoolMap = new Map<string, { name: string; grades: Map<string, { boys: number; girls: number; classes: number }> }>();
            classStats.forEach((s: any) => {
              const schoolKey = s.school_id;
              if (!schoolMap.has(schoolKey)) {
                schoolMap.set(schoolKey, {
                  name: s.schools?.school_name_ar ?? 'بدون اسم',
                  grades: new Map(),
                });
              }
              schoolMap.get(schoolKey)!.grades.set(s.grade_level, {
                boys: s.boys_count || 0,
                girls: s.girls_count || 0,
                classes: s.number_of_classes || 0,
              });
            });

            const schoolEntries = Array.from(schoolMap.entries());

            return (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-[11px] text-center border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-900 text-white font-black tracking-wider">
                      <th className="p-3 border-b border-gray-800 text-right sticky right-0 bg-gray-900 z-10 whitespace-nowrap min-w-[200px]">المدرسة</th>
                      {uniqueGrades.map(g => <th key={g} className="p-3 border-l border-b border-gray-800 whitespace-nowrap">{g}</th>)}
                      <th className="p-3 border-l border-b border-gray-800 bg-gray-800 text-blue-300">المتوسط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolEntries.map(([id, school], index) => {
                      const densities = uniqueGrades.map(g => {
                        const data = school.grades.get(g);
                        if (!data || data.classes === 0) return null;
                        return Math.round((data.boys + data.girls) / data.classes * 10) / 10;
                      });
                      const validDensities = densities.filter((d): d is number => d !== null);
                      const avg = validDensities.length > 0 ? (validDensities.reduce((a, b) => a + b, 0) / validDensities.length).toFixed(1) : '—';
                      const isEven = index % 2 === 0;

                      return (
                        <tr key={id} className={`hover:bg-blue-50/50 transition-colors ${isEven ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="p-3 border-b border-gray-100 text-right font-black text-gray-800 sticky right-0 bg-white z-10 whitespace-nowrap shadow-[1px_0_0_0_#f3f4f6]">
                            {school.name.substring(0, 30)}
                          </td>
                          {densities.map((d, i) => {
                            if (d === null) return <td key={i} className="p-3 border-l border-b border-gray-100 bg-gray-50/50 text-gray-300">—</td>;
                            const bg = d > 60 ? 'bg-red-50 text-red-700' : d > 50 ? 'bg-orange-50 text-orange-700' : d > 40 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700';
                            return <td key={i} className={`p-3 border-l border-b border-gray-100 font-black ${bg}`}>{d}</td>;
                          })}
                          <td className={`p-3 border-l border-b border-gray-100 font-black text-sm ${Number(avg) > 50 ? 'text-red-600 bg-red-50/50' : 'text-blue-600 bg-blue-50/50'}`}>{avg}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════ Grade Breakdown: بنين/بنات لكل صف ═══════ */}
      {classStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-6 h-6 bg-pink-100 text-pink-600 rounded flex items-center justify-center text-xs">📊</span>
            التكوين الديموغرافي للطلاب (على مستوى الإدارة)
          </h2>
          <p className="text-xs text-gray-400 mb-6 font-bold">مجموع بنين وبنات كل صف عبر جميع المدارس المستهدفة</p>
          {(() => {
            const uniqueGrades = Array.from(new Set(classStats.map(s => s.grade_level))).sort((a, b) => (gradeOrderMap[a] || 99) - (gradeOrderMap[b] || 99));
            const gradeData = uniqueGrades.map(g => {
              const matching = classStats.filter((s: any) => s.grade_level === g);
              return {
                name: g,
                بنين: matching.reduce((a: number, s: any) => a + (s.boys_count || 0), 0),
                بنات: matching.reduce((a: number, s: any) => a + (s.girls_count || 0), 0),
              };
            }).filter(g => g.بنين + g.بنات > 0);

            return (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={gradeData} margin={{ right: 10, left: 10, top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: 'rtl' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px', direction: 'rtl' }} />
                  <Bar dataKey="بنين" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="بنات" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function CategoryBar({ label, count, total, color, icon }: any) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
          <span className="text-sm">{icon}</span> {label}
        </span>
        <span className="text-xs font-black text-gray-900">{count.toLocaleString('ar-EG')} <span className="text-[10px] text-gray-400 font-bold ml-1">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(Number(pct), 100)}%` }} />
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-48 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
      <div className="text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-xl">📉</span>
        </div>
        <p className="text-gray-500 font-black text-sm">لا توجد بيانات متاحة</p>
        <p className="text-[10px] text-gray-400 font-bold mt-1">يلزم استيراد بيانات المدارس لبناء الرسم</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, detail, color, icon }: { label: string; value: string | number; detail: string; color: string; icon: string }) {
  const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
    emerald: { bg: 'bg-white border-emerald-100', text: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600' },
    amber:   { bg: 'bg-white border-amber-100',   text: 'text-amber-600',   iconBg: 'bg-amber-50 text-amber-600' },
    red:     { bg: 'bg-white border-red-100',      text: 'text-red-600',      iconBg: 'bg-red-50 text-red-600' },
    blue:    { bg: 'bg-white border-blue-100',     text: 'text-blue-600',     iconBg: 'bg-blue-50 text-blue-600' },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className={`rounded-2xl p-5 border shadow-sm ${c.bg}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-[11px] font-bold text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${c.iconBg}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-black ${c.text}`}>{value}</p>
      <p className="text-[10px] font-bold text-gray-400 mt-1">{detail}</p>
    </div>
  );
}
