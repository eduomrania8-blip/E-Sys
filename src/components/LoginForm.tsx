'use client';
// src/components/LoginForm.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'school' | 'admin';

export default function LoginForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('school');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'حدث خطأ'); return; }
      router.push(data.role === 'admin' ? '/dashboard/admin' : '/dashboard/school');
      router.refresh();
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-content bg-gradient-to-br from-navy to-brand p-4" style={{ justifyContent: 'center' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏫</div>
          <h1 className="text-xl font-bold text-navy">منظومة الطلاب الضعاف</h1>
          <p className="text-sm text-gray-500 mt-1">المرحلة الابتدائية — الإدارة التعليمية</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
          {(['school', 'admin'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === t ? 'bg-navy text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t === 'school' ? '🏫 دخول المدرسة' : '🔐 دخول الأدمن'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {tab === 'school' ? 'كود المدرسة' : 'اسم المستخدم'}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(tab === 'school' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={tab === 'school' ? 'أدخل كود المدرسة' : 'admin'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-lg text-sm transition-colors"
          >
            {loading ? '⏳ جارٍ التحقق...' : tab === 'school' ? '🔑 دخول' : '🔐 دخول الأدمن'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          للمساعدة تواصل مع مسؤول النظام
        </p>
      </div>
    </div>
  );
}
