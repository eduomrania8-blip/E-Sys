'use client';
// AIInsightsPanel — مساعد ذكي حقيقي يعتمد على بيانات قاعدة البيانات

import React, { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface Insight {
  id: string;
  level: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: { label: string; href?: string; fn?: () => void };
}

const LEVEL_CONFIG = {
  danger:  { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700',      border: 'border-red-100',    icon: '🔴', label: 'تنبيه خطر' },
  warning: { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-100', icon: '🟡', label: 'تحذير' },
  info:    { bar: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700',     border: 'border-blue-100',   icon: '🔵', label: 'معلومة' },
  success: { bar: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700',border: 'border-emerald-100',icon: '🟢', label: 'إيجابي' },
};

export default function AIInsightsPanel() {
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [badgeCount, setBadgeCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // إغلاق عند الضغط خارجاً
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // تحليل البيانات عند الفتح
  useEffect(() => {
    if (!open || insights.length > 0) return;
    analyzeData();
  }, [open]);

  const analyzeData = async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // جلب كل المدارس + ملخص الإحصاءات بالتوازي
      const [allSchoolsRes, summaryRes] = await Promise.all([
        supabase.from('schools').select('id, school_name_ar').eq('is_active', true),
        supabase.from('school_summary').select('school_id, school_name_ar, avg_density, total_students, total_classes'),
      ]);

      const allSchools = allSchoolsRes.data ?? [];
      const summary    = summaryRes.data    ?? [];
      const newInsights: Insight[] = [];

      // معرّفات المدارس التي لديها بيانات فعلاً
      const schoolsWithData = new Set(summary.map(s => s.school_id));

      // ── تنبيه ١: مدارس ذات كثافة خطر (>60)
      const criticalDensity = summary.filter(s => Number(s.avg_density) > 60);
      if (criticalDensity.length > 0) {
        newInsights.push({
          id: 'critical-density',
          level: 'danger',
          title: `${criticalDensity.length} مدرسة بكثافة حرجة`,
          message: `كثافة تتجاوز 60 طالب/فصل: ${criticalDensity.slice(0, 2).map(s => s.school_name_ar).join('، ')}${criticalDensity.length > 2 ? ` وأخرى...` : ''}`,
          action: {
            label: '📊 عرض تقرير الكثافة',
            href: '/dashboard/reports',
          },
        });
      }

      // ── تنبيه ٢: مدارس ذات كثافة مرتفعة (50-60)
      const highDensity = summary.filter(s => { const d = Number(s.avg_density); return d > 50 && d <= 60; });
      if (highDensity.length > 0) {
        newInsights.push({
          id: 'high-density',
          level: 'warning',
          title: `${highDensity.length} مدرسة بكثافة مرتفعة`,
          message: `تتجاوز 50 طالب/فصل وتحتاج متابعة: ${highDensity.slice(0, 2).map(s => s.school_name_ar).join('، ')}${highDensity.length > 2 ? '...' : ''}`,
          action: {
            label: '🏫 عرض قائمة المدارس',
            href: '/dashboard/schools?density=high',
          },
        });
      }

      // ── تنبيه ٣: مدارس بدون بيانات إحصاء (موجودة في schools لكن غائبة عن school_summary)
      const noStats = allSchools.filter(s => !schoolsWithData.has(s.id));
      if (noStats.length > 0) {
        newInsights.push({
          id: 'no-stats',
          level: 'warning',
          title: `${noStats.length} مدرسة بدون بيانات`,
          message: `لم يتم رفع إحصاءات ${noStats.slice(0, 2).map(s => s.school_name_ar).join('، ')}${noStats.length > 2 ? ` و${noStats.length - 2} أخرى` : ''} للعام الدراسي الحالي.`,
          action: {
            label: '⬆️ الانتقال لرفع البيانات',
            href: '/dashboard/upload',
          },
        });
      }

      // ── مؤشر إيجابي: مدارس بكثافة طبيعية
      const safeDensity = summary.filter(s => Number(s.avg_density) > 0 && Number(s.avg_density) <= 50);
      if (safeDensity.length > 0 && criticalDensity.length === 0) {
        newInsights.push({
          id: 'safe-density',
          level: 'success',
          title: `${safeDensity.length} مدرسة بكثافة طبيعية`,
          message: `جميع المدارس المُسجَّلة ضمن الحد الآمن (≤ 50 طالب/فصل). 👏`,
        });
      }

      // إذا لا توجد مشاكل
      if (newInsights.length === 0) {
        newInsights.push({
          id: 'all-good',
          level: 'success',
          title: 'النظام يعمل بكفاءة',
          message: 'لا توجد تنبيهات تشغيلية حالياً. جميع المؤشرات ضمن الحدود الطبيعية.',
        });
      }

      setInsights(newInsights);
      // عدد التنبيهات الحرجة لتظهر على الأيقونة
      setBadgeCount(newInsights.filter(i => i.level === 'danger' || i.level === 'warning').length);
    } catch (err) {
      setInsights([{
        id: 'error',
        level: 'info',
        title: 'تعذّر تحليل البيانات',
        message: 'يرجى التحقق من الاتصال بقاعدة البيانات.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) setInsights([]); // إعادة التحليل في كل مرة
  };

  const handleAction = (insight: Insight) => {
    if (insight.action?.href) {
      setOpen(false);
      router.push(insight.action.href);
    } else if (insight.action?.fn) {
      insight.action.fn();
    }
  };

  return (
    <div className="relative" ref={ref} dir="rtl">
      {/* زر الأيقونة مع Badge */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-indigo-500 hover:text-indigo-700 transition-all rounded-full hover:bg-indigo-50 group"
        title="المساعد الذكي — تحليل مباشر للبيانات"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed top-0 left-0 h-screen w-80 sm:w-96 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-100 animate-in slide-in-from-left">
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex justify-between items-center shrink-0">
            <h2 className="font-black flex items-center gap-2 text-base">
              <span>✨</span>
              المساعد الذكي
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">بيانات حقيقية</span>
            </h2>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors text-lg">✕</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-500 animate-pulse">جاري تحليل البيانات التشغيلية...</p>
                <p className="text-[10px] text-gray-400 font-medium">يقرأ النظام قاعدة البيانات مباشرة</p>
              </div>
            ) : (
              insights.map((insight) => {
                const cfg = LEVEL_CONFIG[insight.level];
                return (
                  <div key={insight.id}
                    className={`bg-white border ${cfg.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-1 h-full ${cfg.bar}`} />
                    <h3 className="font-black text-gray-900 text-sm mb-1.5 flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black ${cfg.badge}`}>{cfg.label}</span>
                      <span>{insight.title}</span>
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium mb-3">{insight.message}</p>
                    {insight.action && (
                      <button
                        onClick={() => handleAction(insight)}
                        className={`w-full text-[11px] font-black py-2 rounded-lg transition-colors border ${cfg.border} ${cfg.badge} hover:opacity-80`}
                      >
                        {insight.action.label}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 shrink-0">
            <button
              onClick={() => { setInsights([]); analyzeData(); }}
              disabled={loading}
              className="w-full text-xs font-black text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              ) : '🔄'}
              تحديث التحليل
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
