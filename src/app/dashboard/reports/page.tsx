'use client';
// src/app/dashboard/reports/page.tsx
// مركز التقارير — عرض وطباعة تقارير المدارس والطلاب

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const REPORT_TYPES = [
  { id: 'density',    label: 'تقرير الكثافة الطلابية',             icon: '📊', description: 'ملخص الكثافة لجميع المدارس مع التنبيهات' },
  { id: 'schools',    label: 'ملخص شامل لكل المدارس',             icon: '🏫', description: 'بيانات أساسية + إحصاءات لكل مدرسة' },
  { id: 'inclusion',  label: 'كشف طلاب الدمج',                    icon: '♿', description: 'قائمة جميع طلاب الدمج بكل المدارس' },
  { id: 'low',        label: 'كشف الطلاب الضعاف',                 icon: '📋', description: 'قائمة جميع الطلاب الضعاف بكل المدارس' },
  { id: 'expat',      label: 'كشف الوافدين واللاجئين',            icon: '🌍', description: 'الطلاب الوافدين واللاجئين بكل المدارس' },
  { id: 'staff',      label: 'تقرير العاملين الإحصائي',           icon: '👥', description: 'عدد المعلمين والإداريين والعمال بكل مدرسة' },
] as const;

type ReportId = (typeof REPORT_TYPES)[number]['id'];

export default function ReportsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [selectedReport, setSelectedReport] = useState<ReportId | null>(null);
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async (reportId: ReportId) => {
    setSelectedReport(reportId);
    setLoading(true);
    setData(null);

    try {
      switch (reportId) {
        case 'density': {
          const { data } = await supabase.from('high_density_schools').select('*');
          const { data: summary } = await supabase.from('school_summary').select('school_name_ar, school_code, avg_density, total_students, total_classes');
          setData({ density: data ?? [], summary: summary ?? [] });
          break;
        }
        case 'schools': {
          const { data } = await supabase.from('school_summary').select('*').order('school_name_ar');
          setData(data ?? []);
          break;
        }
        case 'inclusion': {
          const { data } = await supabase.from('inclusion_students_list')
            .select('*, schools(school_name_ar, school_code)')
            .eq('academic_year', '2025-2026').order('school_id');
          setData(data ?? []);
          break;
        }
        case 'low': {
          const { data } = await supabase.from('low_performer_students')
            .select('*, schools(school_name_ar, school_code, school_type)')
            .eq('academic_year', '2025-2026').order('school_id');
          setData(data ?? []);
          break;
        }
        case 'expat': {
          const [expatRes, refRes] = await Promise.all([
            supabase.from('expatriate_students_list').select('*, schools(school_name_ar)').eq('academic_year', '2025-2026'),
            supabase.from('refugee_students_list').select('*, schools(school_name_ar)').eq('academic_year', '2025-2026'),
          ]);
          setData({ expatriates: expatRes.data ?? [], refugees: refRes.data ?? [] });
          break;
        }
        case 'staff': {
          const { data } = await supabase.from('school_summary')
            .select('school_name_ar, school_code, teacher_count, admin_count, worker_count, total_students')
            .order('school_name_ar');
          setData(data ?? []);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in" dir="rtl">
      <header className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">مركز التقارير</h1>
          <p className="text-gray-500 mt-1 font-medium">إنشاء تقارير جاهزة للطباعة</p>
        </div>
        {data && (
          <button onClick={() => window.print()} className="btn-primary no-print flex items-center gap-2">
            🖨️ طباعة التقرير
          </button>
        )}
      </header>

      {/* Report Selector */}
      {!selectedReport && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map(r => (
            <button
              key={r.id}
              onClick={() => generate(r.id)}
              className="card p-6 text-right hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <span className="text-3xl mb-3 block">{r.icon}</span>
              <p className="font-black text-gray-900 group-hover:text-blue-700 transition-colors">{r.label}</p>
              <p className="text-xs text-gray-500 mt-1">{r.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Back Button */}
      {selectedReport && (
        <button onClick={() => { setSelectedReport(null); setData(null); }} className="btn-secondary no-print text-sm">
          ← العودة لقائمة التقارير
        </button>
      )}

      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 font-bold">جاري إعداد التقرير...</p>
        </div>
      )}

      {/* ─── عرض التقرير ──────────────────── */}

      {selectedReport === 'density' && data && (
        <ReportDensity data={data} />
      )}
      {selectedReport === 'schools' && data && (
        <ReportSchools data={data} />
      )}
      {selectedReport === 'inclusion' && data && (
        <ReportStudentList title="كشف طلاب الدمج" data={data} cols={['الاسم', 'الصف', 'الفصل', 'نوع الإعاقة', 'المدرسة']} fields={['student_full_name', 'grade_level', 'class_name', 'disability_type']} />
      )}
      {selectedReport === 'low' && data && (
        <LowPerformersReport data={data} onRefresh={() => generate('low')} />
      )}
      {selectedReport === 'expat' && data && (
        <ReportExpat data={data} />
      )}
      {selectedReport === 'staff' && data && (
        <ReportStaff data={data} />
      )}
    </div>
  );
}

function ReportDensity({ data }: { data: any }) {
  const { density, summary } = data;
  const sorted = [...(summary ?? [])].sort((a: any, b: any) => Number(b.avg_density) - Number(a.avg_density));
  
  const danger = sorted.filter(s => Number(s.avg_density) > 50).length;
  const warning = sorted.filter(s => Number(s.avg_density) > 40 && Number(s.avg_density) <= 50).length;
  const safe = sorted.filter(s => Number(s.avg_density) <= 40).length;

  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-gray-900 mb-1 text-center">تقرير الكثافة الطلابية</h2>
      <p className="text-xs text-gray-400 text-center mb-6">العام الدراسي 2025-2026 | إجمالي المدارس: {sorted.length}</p>

      {/* Data Storytelling Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-6 text-right">
        <h3 className="text-sm font-black text-blue-900 mb-2 flex items-center gap-2">
          <span>💡</span> رؤية تحليلية
        </h3>
        <p className="text-sm text-blue-800 leading-relaxed font-medium">
          من بين <strong>{sorted.length}</strong> مدرسة، تبين أن هناك <strong>{danger}</strong> مدرسة تعاني من كثافة شديدة (أكثر من 50 طالب/فصل) وتحتاج إلى تدخل عاجل، 
          بينما يوجد <strong>{warning}</strong> مدرسة في منطقة الحذر (40-50). وتظل <strong>{safe}</strong> مدرسة ضمن المعدلات الآمنة.
        </p>
      </div>

      <table className="w-full text-sm text-right border-collapse">
        <thead><tr className="bg-gray-100 text-xs font-black text-gray-600">
          <th className="p-2 border">#</th><th className="p-2 border">المدرسة</th><th className="p-2 border">الكود</th>
          <th className="p-2 border">الطلاب</th><th className="p-2 border">الفصول</th><th className="p-2 border">الكثافة</th><th className="p-2 border">الحالة</th>
        </tr></thead>
        <tbody>{sorted.map((s: any, i: number) => {
          const d = Number(s.avg_density) || 0;
          return (<tr key={i} className="border-b hover:bg-gray-50">
            <td className="p-2 border text-center">{i + 1}</td>
            <td className="p-2 border font-bold">{s.school_name_ar}</td>
            <td className="p-2 border text-center">{s.school_code}</td>
            <td className="p-2 border text-center">{s.total_students}</td>
            <td className="p-2 border text-center">{s.total_classes}</td>
            <td className="p-2 border text-center font-black">{d}</td>
            <td className="p-2 border text-center"><span className={d > 60 ? 'badge-danger' : d > 50 ? 'badge-warning' : d > 40 ? 'badge-info' : 'badge-success'}>{d > 60 ? 'خطر' : d > 50 ? 'مرتفع' : d > 40 ? 'متوسط' : 'مقبول'}</span></td>
          </tr>);
        })}</tbody>
      </table>
    </div>
  );
}

function ReportSchools({ data }: { data: any[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-gray-900 mb-4 text-center">ملخص شامل لكل المدارس</h2>
      <table className="w-full text-xs text-right border-collapse">
        <thead><tr className="bg-gray-100 font-black text-gray-600">
          <th className="p-2 border">#</th><th className="p-2 border">المدرسة</th><th className="p-2 border">الكود</th>
          <th className="p-2 border">النوع</th><th className="p-2 border">الطلاب</th><th className="p-2 border">فصول</th>
          <th className="p-2 border">كثافة</th><th className="p-2 border">معلمون</th><th className="p-2 border">دمج</th><th className="p-2 border">ضعاف</th>
        </tr></thead>
        <tbody>{data.map((s: any, i: number) => (
          <tr key={i} className="border-b"><td className="p-1.5 border text-center">{i+1}</td>
            <td className="p-1.5 border font-bold">{s.school_name_ar}</td><td className="p-1.5 border text-center">{s.school_code}</td>
            <td className="p-1.5 border">{s.school_type}</td><td className="p-1.5 border text-center">{s.total_students}</td>
            <td className="p-1.5 border text-center">{s.total_classes}</td><td className="p-1.5 border text-center font-black">{s.avg_density}</td>
            <td className="p-1.5 border text-center">{s.teacher_count}</td><td className="p-1.5 border text-center">{s.total_inclusion}</td>
            <td className="p-1.5 border text-center">{s.low_performer_count}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

function ReportStudentList({ title, data, cols, fields }: { title: string; data: any[]; cols: string[]; fields: string[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-gray-900 mb-1 text-center">{title}</h2>
      <p className="text-xs text-gray-400 text-center mb-4">إجمالي: {data.length} طالب</p>
      <table className="w-full text-xs text-right border-collapse">
        <thead><tr className="bg-gray-100 font-black text-gray-600">
          <th className="p-2 border">#</th>{cols.map(c => <th key={c} className="p-2 border">{c}</th>)}
        </tr></thead>
        <tbody>{data.map((s: any, i: number) => (
          <tr key={i} className="border-b"><td className="p-1.5 border text-center">{i+1}</td>
            {fields.map(f => <td key={f} className="p-1.5 border">{s[f] ?? '—'}</td>)}
            <td className="p-1.5 border">{s.schools?.school_name_ar ?? '—'}</td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

function ReportExpat({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-black text-gray-900 mb-4 text-center">كشف الوافدين ({data.expatriates.length})</h2>
        <table className="w-full text-xs text-right border-collapse">
          <thead><tr className="bg-gray-100 font-black"><th className="p-2 border">#</th><th className="p-2 border">الاسم</th><th className="p-2 border">الصف</th><th className="p-2 border">الجنسية</th><th className="p-2 border">المدرسة</th></tr></thead>
          <tbody>{data.expatriates.map((s: any, i: number) => (
            <tr key={i} className="border-b"><td className="p-1.5 border text-center">{i+1}</td><td className="p-1.5 border">{s.student_full_name}</td><td className="p-1.5 border">{s.grade_level}</td><td className="p-1.5 border">{s.country ?? '—'}</td><td className="p-1.5 border">{s.schools?.school_name_ar}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card p-6">
        <h2 className="text-xl font-black text-gray-900 mb-4 text-center">كشف اللاجئين ({data.refugees.length})</h2>
        <table className="w-full text-xs text-right border-collapse">
          <thead><tr className="bg-gray-100 font-black"><th className="p-2 border">#</th><th className="p-2 border">الاسم</th><th className="p-2 border">الصف</th><th className="p-2 border">التصنيف</th><th className="p-2 border">المدرسة</th></tr></thead>
          <tbody>{data.refugees.map((s: any, i: number) => (
            <tr key={i} className="border-b"><td className="p-1.5 border text-center">{i+1}</td><td className="p-1.5 border">{s.student_full_name}</td><td className="p-1.5 border">{s.grade_level}</td><td className="p-1.5 border">{s.refugee_classification ?? '—'}</td><td className="p-1.5 border">{s.schools?.school_name_ar}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function ReportStaff({ data }: { data: any[] }) {
  const totals = { teachers: 0, admins: 0, workers: 0, students: 0 };
  data.forEach((s: any) => { 
    totals.teachers += Number(s.teacher_count) || 0; 
    totals.admins += Number(s.admin_count) || 0; 
    totals.workers += Number(s.worker_count) || 0; 
    totals.students += Number(s.total_students) || 0; 
  });
  
  const totalStaff = totals.teachers + totals.admins + totals.workers;
  const ratio = totals.teachers > 0 ? (totals.students / totals.teachers).toFixed(1) : '—';

  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-gray-900 mb-4 text-center">تقرير القوة العاملة (إحصائي)</h2>

      {/* Data Storytelling Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 mb-6 text-right">
        <h3 className="text-sm font-black text-emerald-900 mb-2 flex items-center gap-2">
          <span>📊</span> قراءة في الأرقام
        </h3>
        <p className="text-sm text-emerald-800 leading-relaxed font-medium">
          يبلغ إجمالي القوة العاملة في المدارس <strong>{totalStaff}</strong> موظفاً، ويشكل المعلمون النسبة الأكبر بـ <strong>{totals.teachers}</strong> معلماً.
          وبناءً على إجمالي عدد الطلاب، فإن نسبة "الطالب للمعلم" الإجمالية هي <strong>{ratio}</strong> طالب لكل معلم.
        </p>
      </div>

      <table className="w-full text-xs text-right border-collapse">
        <thead><tr className="bg-gray-100 font-black"><th className="p-2 border">#</th><th className="p-2 border">المدرسة</th><th className="p-2 border">الكود</th><th className="p-2 border">معلمون</th><th className="p-2 border">إداريون</th><th className="p-2 border">عمال</th><th className="p-2 border">الإجمالي</th><th className="p-2 border">طلاب</th><th className="p-2 border">طالب/معلم</th></tr></thead>
        <tbody>{data.map((s: any, i: number) => {
          const t = (Number(s.teacher_count) || 0); const ratio = t > 0 ? (Number(s.total_students) / t).toFixed(0) : '—';
          return (<tr key={i} className="border-b"><td className="p-1.5 border text-center">{i+1}</td><td className="p-1.5 border font-bold">{s.school_name_ar}</td><td className="p-1.5 border text-center">{s.school_code}</td><td className="p-1.5 border text-center">{s.teacher_count}</td><td className="p-1.5 border text-center">{s.admin_count}</td><td className="p-1.5 border text-center">{s.worker_count}</td><td className="p-1.5 border text-center font-black">{t + (Number(s.admin_count) || 0) + (Number(s.worker_count) || 0)}</td><td className="p-1.5 border text-center">{s.total_students}</td><td className="p-1.5 border text-center">{ratio}</td></tr>);
        })}</tbody>
        <tfoot><tr className="bg-gray-100 font-black"><td className="p-2 border"></td><td className="p-2 border" colSpan={2}>الإجمالي</td><td className="p-2 border text-center">{totals.teachers}</td><td className="p-2 border text-center">{totals.admins}</td><td className="p-2 border text-center">{totals.workers}</td><td className="p-2 border text-center">{totals.teachers + totals.admins + totals.workers}</td><td className="p-2 border" colSpan={2}></td></tr></tfoot>
      </table>
    </div>
  );
}

function LowPerformersReport({ data, onRefresh }: { data: any[]; onRefresh: () => void }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // استخراج القوائم الفريدة للفلاتر
  const uniqueSchools = Array.from(new Set(data.map(d => d.schools?.school_name_ar).filter(Boolean))) as string[];
  const uniqueTypes = Array.from(new Set(data.map(d => d.schools?.school_type).filter(Boolean))) as string[];
  const uniqueGrades = Array.from(new Set(data.map(d => d.grade_level).filter(Boolean))) as string[];

  // الفرز
  const filteredData = data.filter(s => {
    const matchSchool = selectedSchool ? s.schools?.school_name_ar === selectedSchool : true;
    const matchType = selectedType ? s.schools?.school_type === selectedType : true;
    const matchGrade = selectedGrade ? s.grade_level === selectedGrade : true;
    return matchSchool && matchType && matchGrade;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب من كشف الضعاف؟')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('low_performer_students').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('خطأ في الحذف: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllForSchool = async () => {
    if (!selectedSchool) return;
    const schoolId = data.find(s => s.schools?.school_name_ar === selectedSchool)?.school_id;
    if (!schoolId) return;
    
    if (!confirm(`تحذير خطير: سيتم حذف جميع الطلاب الضعاف المسجلين لمدرسة (${selectedSchool}) بالكامل! هل توافق؟`)) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('low_performer_students').delete().eq('school_id', schoolId).eq('academic_year', '2025-2026');
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      alert('خطأ في الحذف: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const exportData = filteredData.map((s, i) => ({
      'م': i + 1,
      'اسم التلميذ': s.student_full_name,
      'الصف': s.grade_level,
      'الفصل': s.class_name || '—',
      'المدرسة': s.schools?.school_name_ar || '—',
      'نوعية المدرسة': s.schools?.school_type || '—',
      'ملاحظات / الضعف': s.notes || '—',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 35 }, { wch: 15 }, { wch: 30 }];
    
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الضعاف');
    XLSX.writeFile(wb, `كشف_الطلاب_الضعاف_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* قسم الفلاتر */}
      <div className="card p-6 bg-white no-print">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-gray-900">أدوات الفرز المتقدمة</h3>
          <button onClick={exportToExcel} className="btn-success text-sm py-1.5 px-3 flex items-center gap-2">
            📊 تصدير Excel
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">نوعية المدرسة</label>
            <select className="input-field py-1.5 text-sm" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
              <option value="">الكل</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">المدرسة</label>
            <select className="input-field py-1.5 text-sm" value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>
              <option value="">الكل</option>
              {uniqueSchools.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الصف الدراسي</label>
            <select className="input-field py-1.5 text-sm" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
              <option value="">الكل</option>
              {uniqueGrades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        
        {/* أزرار الحذف */}
        {selectedSchool && (
          <div className="mt-4 pt-4 border-t border-red-100 flex justify-end">
            <button 
              onClick={handleDeleteAllForSchool} 
              disabled={isDeleting}
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              {isDeleting ? 'جاري الحذف...' : `🗑️ حذف جميع ضعاف مدرسة (${selectedSchool})`}
            </button>
          </div>
        )}
      </div>

      {/* الجدول */}
      <div className="card p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">كشف الطلاب الضعاف</h2>
            <p className="text-sm text-gray-500 mt-1">إجمالي المعروض: <span className="font-black text-blue-600 text-lg">{filteredData.length}</span> طالب</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-gray-100 font-black text-gray-600">
                <th className="p-2 border">#</th>
                <th className="p-2 border">الاسم</th>
                <th className="p-2 border">الصف</th>
                <th className="p-2 border">الفصل</th>
                <th className="p-2 border">المدرسة</th>
                <th className="p-2 border">النوعية</th>
                <th className="p-2 border">ملاحظات</th>
                <th className="p-2 border w-16 no-print text-center">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((s: any, i: number) => (
                <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-1.5 border text-center text-gray-500">{i + 1}</td>
                  <td className="p-1.5 border font-bold text-gray-900">{s.student_full_name}</td>
                  <td className="p-1.5 border text-center">{s.grade_level}</td>
                  <td className="p-1.5 border text-center">{s.class_name || '—'}</td>
                  <td className="p-1.5 border">{s.schools?.school_name_ar || '—'}</td>
                  <td className="p-1.5 border text-center">{s.schools?.school_type || '—'}</td>
                  <td className="p-1.5 border">{s.notes || '—'}</td>
                  <td className="p-1.5 border text-center no-print">
                    <button 
                      onClick={() => handleDelete(s.id)}
                      disabled={isDeleting}
                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                      title="حذف الطالب"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                    لا يوجد طلاب ضعاف يطابقون خيارات الفرز المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
