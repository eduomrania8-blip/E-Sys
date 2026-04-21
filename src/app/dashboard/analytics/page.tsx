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
      setClassStats(statsRes.data ?? []);
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
    { name: 'مقبول (≤40)',   value: schools.filter(s => (Number(s.avg_density) || 0) <= 40).length,                                      fill: '#22c55e' },
    { name: 'متوسط (41-50)', value: schools.filter(s => { const d = Number(s.avg_density) || 0; return d > 40 && d <= 50; }).length,     fill: '#eab308' },
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

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      <header>
        <h1 className="text-3xl font-black text-gray-900">مركز التحليلات</h1>
        <p className="text-gray-500 mt-1 font-medium">تحليلات تفاعلية شاملة — العام الدراسي 2025-2026</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-EG')} icon="👥" color="blue" />
        <SummaryCard label="عدد المدارس"   value={schools.length}           icon="🏫" color="purple" />
        <SummaryCard label="نسبة طالب/معلم" value={studentTeacherRatio}     icon="📏" color="orange" />
        <SummaryCard label="المعلمون"       value={totalTeachers}           icon="📚" color="green" />
      </div>

      {/* Row 1: Density + Gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* توزيع الكثافة */}
        <div className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">📊 توزيع الكثافة حسب المدرسة</h2>
          <p className="text-xs text-gray-400 mb-4">عدد المدارس في كل فئة كثافة</p>
          {densityDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={densityDistribution}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {densityDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* نسبة البنين/البنات */}
        <div className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">👥 نسبة البنين والبنات</h2>
          <p className="text-xs text-gray-400 mb-4">
            بنين: {totalBoys.toLocaleString('ar-EG')} | بنات: {totalGirls.toLocaleString('ar-EG')}
          </p>
          {totalStudents > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {genderData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => v.toLocaleString('ar-EG')} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Row 2: Top Density Bar + Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* أعلى 10 كثافة */}
        <div className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">🏆 أعلى 10 مدارس كثافة</h2>
          <p className="text-xs text-gray-400 mb-4">مرتبة تنازلياً حسب متوسط الكثافة</p>
          {topDensity.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topDensity} layout="vertical" margin={{ right: 10, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} width={120} />
                <Tooltip formatter={(v: number) => `${v} طالب/فصل`} />
                <Bar dataKey="density" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={18}>
                  {topDensity.map((entry, idx) => (
                    <Cell key={idx} fill={entry.density > 60 ? '#ef4444' : entry.density > 50 ? '#f97316' : '#eab308'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* أعلى 10 عدد طلاب */}
        <div className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">📈 أكبر 10 مدارس عدداً</h2>
          <p className="text-xs text-gray-400 mb-4">مرتبة حسب عدد الطلاب</p>
          {topStudents.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topStudents} layout="vertical" margin={{ right: 10, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} width={120} />
                <Tooltip />
                <Bar dataKey="students" name="طلاب" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={14} />
                <Bar dataKey="teachers" name="معلمين" fill="#22c55e" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Row 3: School Types + Special Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* توزيع أنواع المدارس */}
        <div className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">🏫 توزيع أنواع المدارس</h2>
          <p className="text-xs text-gray-400 mb-4">عدد المدارس والطلاب حسب النوع</p>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData} margin={{ right: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="عدد المدارس" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* الفئات الخاصة */}
        <div className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">📋 الفئات الخاصة</h2>
          <p className="text-xs text-gray-400 mb-4">طلاب الدمج والضعاف والوافدين</p>
          <div className="grid grid-cols-1 gap-4 mt-4">
            <CategoryBar label="طلاب الدمج"    count={totalInclusion} total={totalStudents} color="#14b8a6" icon="♿" />
            <CategoryBar label="الطلاب الضعاف" count={totalLow}       total={totalStudents} color="#f97316" icon="📋" />
            <CategoryBar label="الوافدين"       count={totalExpat}     total={totalStudents} color="#6366f1" icon="🌍" />
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-black text-teal-600">{totalInclusion}</p>
              <p className="text-[10px] text-gray-400 font-bold">دمج</p>
            </div>
            <div>
              <p className="text-xl font-black text-orange-600">{totalLow}</p>
              <p className="text-[10px] text-gray-400 font-bold">ضعاف</p>
            </div>
            <div>
              <p className="text-xl font-black text-indigo-600">{totalExpat}</p>
              <p className="text-[10px] text-gray-400 font-bold">وافدين</p>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="card p-6">
        <h2 className="text-base font-black text-gray-900 mb-1">🗺️ خريطة كثافة المدارس</h2>
        <p className="text-xs text-gray-400 mb-4">كل خلية = مدرسة — اللون يمثل مستوى الكثافة</p>
        <div className="flex flex-wrap gap-2">
          {schools.map((s, i) => {
            const d = Number(s.avg_density) || 0;
            const bg =
              d > 60 ? 'bg-red-500'    :
              d > 50 ? 'bg-orange-400' :
              d > 40 ? 'bg-yellow-400' :
              d > 0  ? 'bg-green-400'  : 'bg-gray-200';
            return (
              <div
                key={i}
                title={`${s.school_name_ar}\nالكثافة: ${d} طالب/فصل\nالطلاب: ${s.total_students}`}
                className={`w-8 h-8 ${bg} rounded-lg cursor-pointer hover:scale-125 hover:shadow-lg transition-all`}
              />
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-[10px] font-bold text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded" /> مقبول</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded" /> متوسط</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded" /> مرتفع</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> خطر</span>
        </div>
      </div>

      {/* ─── KPI: مؤشرات الأداء الرئيسية ──────────────── */}
      <div className="card p-6">
        <h2 className="text-base font-black text-gray-900 mb-4">📌 مؤشرات الأداء</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* نسبة المدارس التي رفعت بيانات */}
          {(() => {
            const uploadedSchools = schools.filter(s => (Number(s.total_students) || 0) > 0).length;
            const pct = schools.length > 0 ? Math.round((uploadedSchools / schools.length) * 100) : 0;
            return (
              <KpiCard label="المدارس التي رفعت بيانات" value={`${pct}%`} detail={`${uploadedSchools} من ${schools.length}`}
                color={pct >= 80 ? 'emerald' : pct >= 50 ? 'amber' : 'red'} />
            );
          })()}
          {/* متوسط الكثافة العام */}
          {(() => {
            const totalS = schools.reduce((a, s) => a + (Number(s.total_students) || 0), 0);
            const totalC = schools.reduce((a, s) => a + (Number(s.total_classes) || 0), 0);
            const avg = totalC > 0 ? (totalS / totalC).toFixed(1) : '0';
            return (
              <KpiCard label="متوسط الكثافة العام" value={avg} detail="طالب / فصل"
                color={Number(avg) > 50 ? 'red' : Number(avg) > 40 ? 'amber' : 'emerald'} />
            );
          })()}
          {/* نسبة الدمج */}
          {(() => {
            const pct = totalStudents > 0 ? ((totalInclusion / totalStudents) * 100).toFixed(1) : '0';
            return <KpiCard label="نسبة طلاب الدمج" value={`${pct}%`} detail={`${totalInclusion} طالب`} color="blue" />;
          })()}
          {/* نسبة طالب / معلم */}
          <KpiCard label="نسبة طالب / معلم" value={studentTeacherRatio} detail="طالب لكل معلم"
            color={Number(studentTeacherRatio) > 30 ? 'red' : Number(studentTeacherRatio) > 20 ? 'amber' : 'emerald'} />
        </div>
      </div>

      {/* ─── Pivot Table: الكثافة حسب المدرسة × الصف ──────────── */}
      {classStats.length > 0 && (
        <div className="card p-6 overflow-x-auto">
          <h2 className="text-base font-black text-gray-900 mb-1">📐 جدول الكثافة (مدرسة × صف)</h2>
          <p className="text-xs text-gray-400 mb-4">كل خلية = كثافة الصف في المدرسة (طالب/فصل) — اللون يمثل المستوى</p>
          {(() => {
            const grades = ['KG1', 'KG2', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
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
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-[#1e293b] text-white font-black">
                    <th className="p-2 border border-gray-700 text-right sticky right-0 bg-[#0f172a] z-10">المدرسة</th>
                    {grades.map(g => <th key={g} className="p-2 border border-gray-700 whitespace-nowrap">{g}</th>)}
                    <th className="p-2 border border-gray-700 bg-[#0f172a]">المتوسط</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolEntries.map(([id, school]) => {
                    const densities = grades.map(g => {
                      const data = school.grades.get(g);
                      if (!data || data.classes === 0) return null;
                      return Math.round((data.boys + data.girls) / data.classes * 10) / 10;
                    });
                    const validDensities = densities.filter((d): d is number => d !== null);
                    const avg = validDensities.length > 0 ? (validDensities.reduce((a, b) => a + b, 0) / validDensities.length).toFixed(1) : '—';

                    return (
                      <tr key={id} className="hover:bg-gray-50 border-b">
                        <td className="p-2 border text-right font-bold text-gray-900 sticky right-0 bg-white z-10 whitespace-nowrap">{school.name.substring(0, 25)}</td>
                        {densities.map((d, i) => {
                          if (d === null) return <td key={i} className="p-2 border bg-gray-50 text-gray-200">—</td>;
                          const bg = d > 60 ? 'bg-red-100 text-red-700' : d > 50 ? 'bg-orange-100 text-orange-700' : d > 40 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';
                          return <td key={i} className={`p-2 border font-bold ${bg}`}>{d}</td>;
                        })}
                        <td className={`p-2 border font-black ${Number(avg) > 50 ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>{avg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {/* ─── Grade Breakdown: بنين/بنات لكل صف ──────────── */}
      {classStats.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-1">📊 توزيع الطلاب حسب الصف الدراسي</h2>
          <p className="text-xs text-gray-400 mb-4">مجموع بنين وبنات كل صف عبر جميع المدارس</p>
          {(() => {
            const gradeOrder = ['KG1', 'KG2', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
            const gradeData = gradeOrder.map(g => {
              const matching = classStats.filter((s: any) => s.grade_level === g);
              return {
                name: g,
                بنين: matching.reduce((a: number, s: any) => a + (s.boys_count || 0), 0),
                بنات: matching.reduce((a: number, s: any) => a + (s.girls_count || 0), 0),
              };
            }).filter(g => g.بنين + g.بنات > 0);

            return (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={gradeData} margin={{ right: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="بنين" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={25} />
                  <Bar dataKey="بنات" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: any) {
  const bgs: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600', purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600', green: 'from-green-500 to-green-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-bold text-gray-500">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${bgs[color]}`} />
    </div>
  );
}

function CategoryBar({ label, count, total, color, icon }: any) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
          <span>{icon}</span> {label}
        </span>
        <span className="text-xs font-black text-gray-900">{count.toLocaleString('ar-EG')} ({pct}%)</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Number(pct), 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-4xl mb-3">📉</p>
        <p className="text-gray-400 font-bold text-sm">لا توجد بيانات كافية</p>
        <p className="text-xs text-gray-300 mt-1">قم برفع بيانات المدارس لمشاهدة التحليلات</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, detail, color }: { label: string; value: string | number; detail: string; color: string }) {
  const colors: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200' },
    red:     { bg: 'bg-red-50',      text: 'text-red-700',      ring: 'ring-red-200' },
    blue:    { bg: 'bg-blue-50',     text: 'text-blue-700',     ring: 'ring-blue-200' },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-4 ring-1 ${c.ring}`}>
      <p className="text-[11px] font-bold text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-black ${c.text}`}>{value}</p>
      <p className="text-[10px] font-bold text-gray-400 mt-1">{detail}</p>
    </div>
  );
}
