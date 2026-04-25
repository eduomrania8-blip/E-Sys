'use client';

import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export default function LeadersPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  // Unique options for filters
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableJobs, setAvailableJobs] = useState<string[]>([]);

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from('school_leaders')
      .select(`
        *,
        schools (
          school_name_ar,
          school_code,
          school_type
        )
      `)
      .order('full_name_ar');

    if (data) {
      setLeaders(data);
      
      // Extract unique types and jobs for filters
      const types = new Set<string>();
      const jobs = new Set<string>();
      data.forEach(l => {
        if (l.schools?.school_type) types.add(l.schools.school_type);
        if (l.job_title) jobs.add(l.job_title);
      });
      setAvailableTypes(Array.from(types));
      setAvailableJobs(Array.from(jobs));
    }
    setLoading(false);
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleJob = (job: string) => {
    setSelectedJobs(prev => 
      prev.includes(job) ? prev.filter(j => j !== job) : [...prev, job]
    );
  };

  const filteredLeaders = leaders.filter(l => {
    const matchSearch = 
      l.full_name_ar?.includes(searchQuery) || 
      l.schools?.school_name_ar?.includes(searchQuery) ||
      l.schools?.school_code?.includes(searchQuery);
    
    const matchType = selectedTypes.length === 0 || selectedTypes.includes(l.schools?.school_type);
    const matchJob = selectedJobs.length === 0 || selectedJobs.includes(l.job_title);

    return matchSearch && matchType && matchJob;
  });

  const exportToExcel = () => {
    const dataToExport = filteredLeaders.map(l => ({
      'كود المدرسة': l.schools?.school_code || '',
      'المدرسة': l.schools?.school_name_ar || '',
      'النوعية': l.schools?.school_type || '',
      'الاسم': l.full_name_ar || '',
      'الوظيفة': l.job_title || '',
      'الرقم القومي': l.national_id || '',
      'الموبايل': l.phone || '',
      'الحالة': l.is_current ? 'حالي' : 'سابق'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    // Add RTL formatting
    if (!ws['!cols']) ws['!cols'] = [];
    const colWidths = [{ wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "بيانات القادة");
    XLSX.writeFile(wb, "دليل_القادة.xlsx");
  };

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-900 to-blue-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-4">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3">
            <span className="bg-white/20 p-2 rounded-xl backdrop-blur">👔</span>
            لوحة امتثال القيادات
          </h1>
          <p className="text-blue-200 mt-2 text-sm font-medium">سجل القيادات وإدارة مدى اكتمال البيانات التشغيلية</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="text-center bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
            <p className="text-2xl font-black">{leaders.length}</p>
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">إجمالي القيادات</p>
          </div>
          <div className="text-center bg-red-500/20 backdrop-blur rounded-xl px-4 py-3 border border-red-500/30">
            <p className="text-2xl font-black text-red-200">
              {leaders.filter(l => !l.phone || !l.national_id || l.national_id.length < 14).length}
            </p>
            <p className="text-[10px] text-red-200 font-bold uppercase tracking-widest">بيانات غير مكتملة</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-5">
        
        {/* Search */}
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">بحث عام</label>
          <div className="relative">
            <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو اسم المدرسة أو الكود..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-sm font-bold rounded-xl pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Multi-Select Filters */}
        <div className="flex-1 flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">نوع المدرسة (اختيار متعدد)</label>
            <div className="flex flex-wrap gap-1.5">
              {availableTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    selectedTypes.includes(type) 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">الوظيفة (اختيار متعدد)</label>
            <div className="flex flex-wrap gap-1.5">
              {availableJobs.map(job => (
                <button
                  key={job}
                  onClick={() => toggleJob(job)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    selectedJobs.includes(job) 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {job}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-end shrink-0">
          <button 
            onClick={exportToExcel}
            className="h-11 w-full xl:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
          >
            <span>📥</span>
            تصدير القائمة ({filteredLeaders.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-bold animate-pulse">جاري تحميل البيانات...</div>
        ) : filteredLeaders.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-bold text-lg">لا توجد نتائج تطابق بحثك</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500">
                  <th className="px-6 py-4 font-black">الاسم</th>
                  <th className="px-6 py-4 font-black">الوظيفة</th>
                  <th className="px-6 py-4 font-black">المدرسة</th>
                  <th className="px-6 py-4 font-black text-center">النوعية</th>
                  <th className="px-6 py-4 font-black">الموبايل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeaders.map(leader => (
                  <tr key={leader.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{leader.full_name_ar}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{leader.national_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {leader.job_title || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-700">{leader.schools?.school_name_ar}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{leader.schools?.school_code}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[11px] font-bold">
                        {leader.schools?.school_type || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {leader.phone ? (
                        <a href={`tel:${leader.phone}`} className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1.5" dir="ltr">
                          {leader.phone}
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">📞</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded border border-red-100">
                          ⚠️ مفقود
                        </span>
                      )}
                      
                      {(!leader.national_id || leader.national_id.length < 14) && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 bg-orange-50 text-orange-600 text-[10px] font-black rounded border border-orange-100">
                            ⚠️ هوية غير مكتملة
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
