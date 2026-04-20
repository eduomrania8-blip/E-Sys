'use client';
// src/components/admin/AdminAddSchool.tsx

import { useState } from 'react';
import { Alert } from '@/components/ui';

const TYPES = ['رسمي', 'رسمي لغات', 'خاص', 'خاص لغات', 'دولي', 'ثقافي'];

export default function AdminAddSchool() {
  const [form, setForm] = useState({
    code: '', name: '', type: '', stage: 'الابتدائية',
    district: '', address: '', password: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [passLoading, setPassLoading] = useState(false);
  const [newPass, setNewPass] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name || !form.type || !form.password) {
      setMsg({ text: 'الكود، الاسم، النوعية، وكلمة المرور مطلوبة', type: 'error' });
      return;
    }
    setLoading(true); setMsg(null);
    const res = await fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, code: form.code.toUpperCase() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg({ text: data.error, type: 'error' }); return; }
    setMsg({ text: `✅ تمت إضافة "${form.name}" بكود: ${form.code.toUpperCase()}`, type: 'success' });
    setForm({ code: '', name: '', type: '', stage: 'الابتدائية', district: '', address: '', password: '' });
  }

  async function changeAdminPass(e: React.FormEvent) {
    e.preventDefault();
    if (!newPass || newPass.length < 6) { alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setPassLoading(true);
    const res = await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: newPass }) });
    setPassLoading(false);
    if (res.ok) { alert('✅ تم تغيير كلمة المرور'); setNewPass(''); }
    else { const d = await res.json(); alert(d.error); }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-50';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Add school form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b border-gray-100">➕ إضافة مدرسة جديدة</h2>
        {msg && <div className="mb-4"><Alert message={msg.text} type={msg.type} onClose={() => setMsg(null)} /></div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>كود المدرسة *</label>
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="مثال: SCH001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>اسم المدرسة *</label>
              <input value={form.name} onChange={set('name')} placeholder="الاسم الكامل للمدرسة" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>النوعية *</label>
              <select value={form.type} onChange={set('type')} className={inputCls}>
                <option value="">-- اختر النوعية --</option>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>المرحلة</label>
              <input value={form.stage} readOnly className={`${inputCls} bg-gray-50 cursor-not-allowed`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>الإدارة التعليمية</label>
              <input value={form.district} onChange={set('district')} placeholder="مثال: إدارة شرق" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>العنوان</label>
              <input value={form.address} onChange={set('address')} placeholder="عنوان المدرسة" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>كلمة مرور المدرسة * <span className="text-gray-400 font-normal">(ستُستخدم عند دخول المدرسة)</span></label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="6 أحرف على الأقل" className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="bg-brand hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              {loading ? '⏳ جاري الحفظ...' : '✅ حفظ المدرسة'}
            </button>
            <button type="button" onClick={() => setForm({ code:'',name:'',type:'',stage:'الابتدائية',district:'',address:'',password:'' })} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              مسح
            </button>
          </div>
        </form>
      </div>

      {/* Change admin password */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-navy mb-4 pb-3 border-b border-gray-100">⚙️ تغيير كلمة مرور الأدمن</h2>
        <form onSubmit={changeAdminPass} className="flex gap-3">
          <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="كلمة المرور الجديدة (6 أحرف+)" className={`${inputCls} flex-1`} />
          <button type="submit" disabled={passLoading} className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors">
            {passLoading ? '...' : 'حفظ'}
          </button>
        </form>
      </div>
    </div>
  );
}
