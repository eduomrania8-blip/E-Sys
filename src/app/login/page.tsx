'use client';
// src/app/login/page.tsx

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

interface RealStats {
  schools: number;
  students: number;
  administrations: number;
}

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [stats, setStats]       = useState<RealStats | null>(null);

  // جلب إحصائيات حقيقية عبر API آمن (يستخدم Service Role من الخادم)
  useEffect(() => {
    fetch('/api/public-stats')
      .then(r => r.json())
      .then(data => setStats({
        schools: data.schools ?? 0,
        students: data.students ?? 0,
        administrations: data.administrations ?? 0,
      }))
      .catch(() => setStats({ schools: 0, students: 0, administrations: 0 }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(
        err.message?.includes('Invalid')
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : err.message || 'فشل تسجيل الدخول'
      );
    } finally {
      setLoading(false);
    }
  }

  const formatNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)} ألف` : n.toString();

  return (
    <div className="min-h-screen flex flex-col md:flex-row" dir="rtl">

      {/* ─── اللوحة اليسرى: الهوية البصرية ─── */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-[55%] bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex-col justify-between p-12 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-700/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-0 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/15 border border-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-xl">E</div>
          <div>
            <p className="text-white font-black text-lg leading-tight">منظومة الإحصاء</p>
            <p className="text-blue-300 text-xs font-bold">الإدارة التعليمية</p>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <p className="text-blue-300 text-xs font-black uppercase tracking-widest">منصة إدارة البيانات</p>
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">
              منظومة<br />
              <span className="text-blue-300">التعليم الابتدائى</span>
            </h1>
          </div>
          <p className="text-blue-200/80 text-sm leading-relaxed max-w-md font-medium">
            نظام متكامل لإدارة بيانات المدارس والطلاب والعاملين، مع تحليلات بصرية متقدمة لدعم اتخاذ القرار الإداري.
          </p>

          {/* الإحصائيات الحقيقية */}
          {stats ? (
            <div className="flex gap-8 pt-4">
              {[
                { label: 'مدرسة مرتبطة',     value: stats.schools.toString() },
                { label: 'طالب في الإحصاء',  value: formatNum(stats.students) },
                { label: 'إدارة تعليمية',    value: stats.administrations.toString() },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] text-blue-300/80 font-bold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            /* Skeleton loading أثناء الجلب */
            <div className="flex gap-8 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="h-8 w-16 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-2.5 w-20 bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* التذييل */}
        <div className="relative z-10">
          <p className="text-blue-400/60 text-[11px] font-bold">© 2025-2026 وزارة التربية والتعليم — جمهورية مصر العربية</p>
        </div>
      </div>

      {/* ─── اللوحة اليمنى: نموذج الدخول ─── */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-gray-50 min-h-screen md:min-h-0">
        <div className="w-full max-w-md">

          {/* شعار الموبايل */}
          <div className="flex justify-center mb-8 md:hidden">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-200">E</div>
              <div>
                <p className="font-black text-gray-900 text-lg">منظومة الإحصاء</p>
                <p className="text-gray-500 text-xs font-bold">الإدارة التعليمية</p>
              </div>
            </div>
          </div>

          {/* بطاقة النموذج */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900">تسجيل الدخول</h2>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">أدخل بيانات حسابك للمتابعة</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* البريد الإلكتروني */}
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <span className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 text-sm">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="name@edu.eg"
                    className="w-full pr-10 pl-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white transition-all outline-none"
                    required
                    dir="ltr"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">كلمة المرور</label>
                <div className="relative">
                  <span className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 text-sm">🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-16 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-white transition-all outline-none"
                    required
                    dir="ltr"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-gray-700 transition-colors text-xs font-bold px-2 py-1 rounded-md hover:bg-gray-100"
                  >
                    {showPass ? 'إخفاء' : 'إظهار'}
                  </button>
                </div>
              </div>

              {/* رسالة الخطأ */}
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm font-bold flex items-center gap-2 animate-in">
                  <span className="text-lg shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* زر الدخول */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-300 text-white font-black py-4 rounded-xl text-base transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جارٍ التحقق...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <span className="text-blue-200 text-lg">←</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 font-bold leading-relaxed">
                لا تمتلك حساباً؟ تواصل مع مسؤول الإدارة التعليمية<br />لتفعيل حساب مدرستك.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
