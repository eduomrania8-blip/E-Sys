'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({ schools: [], leaders: [] });
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search logic
  useEffect(() => {
    if (query.length < 2) {
      setResults({ schools: [], leaders: [] });
      return;
    }

    const fetchSearch = async () => {
      setLoading(true);
      
      const [schoolsRes, leadersRes] = await Promise.all([
        supabase.from('schools').select('id, school_name_ar, school_code').ilike('school_name_ar', `%${query}%`).limit(4),
        supabase.from('school_leaders')
          .select('id, full_name_ar, job_title, school_id, schools(id, school_name_ar)')
          .ilike('full_name_ar', `%${query}%`)
          .limit(4)
      ]);

      setResults({
        schools: schoolsRes.data ?? [],
        leaders: leadersRes.data ?? []
      });
      setLoading(false);
    };

    const timer = setTimeout(fetchSearch, 300); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={ref} className="relative z-50 flex-1 max-w-lg" dir="rtl">
      {/* Search Trigger Button */}
      <button 
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm hover:border-blue-400 hover:ring-2 hover:ring-blue-100 transition-all w-full justify-between shadow-sm"
      >
        <span className="flex items-center gap-2 font-bold opacity-70 truncate"><span>🔍</span> <span className="hidden sm:inline">بحث سريع عن أي شيء...</span><span className="sm:hidden">بحث...</span></span>
        <span className="hidden sm:block text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded border text-gray-400">Ctrl K</span>
      </button>

      {/* Omnibar Dialog */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-gray-50 flex items-center gap-3">
            <span className="text-xl">🔍</span>
            <input 
              ref={inputRef}
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن مدرسة، قائد، كود..." 
              className="w-full border-none outline-none text-base font-bold text-gray-900 bg-transparent placeholder-gray-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-2 bg-gray-50/50">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm font-bold animate-pulse">جاري البحث المتقدم...</div>
            ) : query.length < 2 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-bold">اكتب حرفين على الأقل للبحث</div>
            ) : results.schools.length === 0 && results.leaders.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm font-bold">لا توجد نتائج مطابقة لبحثك</div>
            ) : (
              <div className="space-y-4">
                {results.schools.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">🏫 المدارس</h3>
                    {results.schools.map((s: any) => (
                      <button key={`s-${s.id}`} onClick={() => { setIsOpen(false); router.push(`/dashboard/schools/${s.id}`); }} className="w-full text-right p-3 hover:bg-blue-50 rounded-xl transition-colors flex justify-between items-center group">
                        <div>
                          <p className="text-sm font-black text-gray-900 group-hover:text-blue-700">{s.school_name_ar}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">كود: {s.school_code}</p>
                        </div>
                        <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">←</span>
                      </button>
                    ))}
                  </div>
                )}

                {results.leaders.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">👔 القيادات</h3>
                    {results.leaders.map((l: any) => {
                      const schoolId = l.school_id;
                      const href = schoolId
                        ? `/dashboard/schools/${schoolId}`
                        : `/dashboard/leaders`;
                      return (
                        <button
                          key={`l-${l.id}`}
                          onClick={() => { setIsOpen(false); setQuery(''); router.push(href); }}
                          className="w-full text-right p-3 hover:bg-emerald-50 rounded-xl transition-colors flex justify-between items-center group"
                        >
                          <div>
                            <p className="text-sm font-black text-gray-900 group-hover:text-emerald-700">{l.full_name_ar}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-500">{l.schools?.school_name_ar ?? '—'}</span>
                              {l.job_title && (
                                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{l.job_title}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">صفحة المدرسة →</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-100/50 border-t border-gray-100 text-[10px] text-gray-400 font-bold flex items-center justify-center gap-6">
            <span className="flex items-center gap-2">للتنقل المباشر <span className="flex gap-1"><kbd className="px-1 py-0.5 bg-white shadow-sm border rounded font-mono">↑</kbd><kbd className="px-1 py-0.5 bg-white shadow-sm border rounded font-mono">↓</kbd></span></span>
            <span className="flex items-center gap-2">للاختيار <kbd className="px-1.5 py-0.5 bg-white shadow-sm border rounded font-mono">Enter</kbd></span>
          </div>
        </div>
      )}
    </div>
  );
}
