'use client';
// src/app/dashboard/settings/page.tsx
// إعدادات النظام — إدارة الإدارات التعليمية وإنشاء حسابات المدارس

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SkeletonPage } from '@/components/shared/SkeletonLoader';

export default function SettingsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [administrations, setAdministrations] = useState<any[]>([]);
  const [schoolUsers, setSchoolUsers]         = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New admin form
  const [newAdmin, setNewAdmin] = useState({ code: '', name_ar: '', governorate: '' });
  const [adminMsg, setAdminMsg] = useState('');

  // New school user form
  const [newSchoolUser, setNewSchoolUser] = useState({ email: '', password: '', school_id: '', permission: 'edit' });
  const [userMsg, setUserMsg] = useState('');
  const [schools, setSchools] = useState<any[]>([]);

  // My Account (Password Reset)
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Super Admins Management
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [newSuperAdmin, setNewSuperAdmin] = useState({ email: '', password: '' });
  const [superAdminMsg, setSuperAdminMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const userRes = await supabase.auth.getUser();
    if (userRes.data.user) setCurrentUserEmail(userRes.data.user.email || '');

    const [admRes, schoolsRes, permsRes, superAdminsRes] = await Promise.all([
      supabase.from('educational_administrations').select('*').order('name_ar'),
      supabase.from('schools').select('id, school_name_ar, school_code').order('school_name_ar'),
      supabase.from('user_school_permissions').select('*, schools(school_name_ar, school_code)').not('school_id', 'is', null),
      fetch('/api/admin/list-super-admins').then(r => r.json()).catch(() => []),
    ]);
    setAdministrations(admRes.data ?? []);
    setSchools(schoolsRes.data ?? []);
    setSchoolUsers(permsRes.data ?? []);
    setSuperAdmins(Array.isArray(superAdminsRes) ? superAdminsRes : []);
    setLoading(false);
  }

  async function addAdministration(e: React.FormEvent) {
    e.preventDefault();
    setAdminMsg('');
    if (!newAdmin.code || !newAdmin.name_ar || !newAdmin.governorate) return setAdminMsg('⚠️ جميع الحقول مطلوبة');

    const { error } = await supabase.from('educational_administrations').insert(newAdmin);
    if (error) return setAdminMsg(`❌ ${error.message}`);
    setAdminMsg('✅ تمت الإضافة بنجاح');
    setNewAdmin({ code: '', name_ar: '', governorate: '' });
    loadData();
  }

  async function createSchoolUser(e: React.FormEvent) {
    e.preventDefault();
    setUserMsg('');
    if (!newSchoolUser.email || !newSchoolUser.password || !newSchoolUser.school_id) return setUserMsg('⚠️ جميع الحقول مطلوبة');

    try {
      const res = await fetch('/api/create-school-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchoolUser),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setUserMsg(`✅ تم إنشاء حساب المدرسة — ${newSchoolUser.email}`);
      setNewSchoolUser({ email: '', password: '', school_id: '', permission: 'edit' });
      loadData();
    } catch (err: any) {
      setUserMsg(`❌ ${err.message}`);
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return setPasswordMsg('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    setIsUpdatingPassword(true);
    setPasswordMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg('✅ تم تحديث كلمة المرور بنجاح');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg(`❌ ${err.message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  async function createSuperAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSuperAdminMsg('');
    if (!newSuperAdmin.email || !newSuperAdmin.password) return setSuperAdminMsg('⚠️ جميع الحقول مطلوبة');

    try {
      const res = await fetch('/api/admin/create-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSuperAdmin),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSuperAdminMsg(`✅ تم إنشاء حساب المدير بنجاح — ${newSuperAdmin.email}`);
      setNewSuperAdmin({ email: '', password: '' });
      loadData();
    } catch (err: any) {
      setSuperAdminMsg(`❌ ${err.message}`);
    }
  }

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-10 animate-in max-w-4xl" dir="rtl">
      <header>
        <h1 className="text-3xl font-black text-gray-900">الإعدادات</h1>
        <p className="text-gray-500 mt-1 font-medium">إدارة النظام والإدارات وحسابات المدارس</p>
      </header>

      {/* Section 0: My Account */}
      <section className="card p-6 bg-gradient-to-r from-blue-50 to-white">
        <h2 className="text-base font-black text-blue-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">👤</span>
          حسابي (تغيير كلمة المرور)
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">البريد الإلكتروني الحالي</p>
            <p className="text-lg font-black text-blue-600" dir="ltr">{currentUserEmail || 'جاري التحميل...'}</p>
          </div>
          <form onSubmit={updatePassword} className="flex-1 w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-xs font-bold text-gray-500 mb-2">تعيين كلمة مرور جديدة</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="••••••••" 
                className="input flex-1" 
                required 
              />
              <button type="submit" disabled={isUpdatingPassword} className="btn-primary text-sm whitespace-nowrap">
                {isUpdatingPassword ? 'جاري التحديث...' : 'تحديث الباسوورد'}
              </button>
            </div>
            {passwordMsg && <p className="text-xs font-bold mt-2 text-center w-full">{passwordMsg}</p>}
          </form>
        </div>
      </section>

      {/* Section 1: Super Admins */}
      <section className="card p-6 border-2 border-indigo-50">
        <h2 className="text-base font-black text-indigo-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black">👑</span>
          مديرو النظام (Super Admins)
        </h2>
        
        {superAdmins.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {superAdmins.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-xl shadow-sm">
                <div>
                  <p className="text-sm font-bold text-gray-900" dir="ltr">{a.email}</p>
                  <p className="text-[10px] text-gray-400 font-bold">صلاحيات مطلقة (Super Admin)</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={createSuperAdmin} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
          <p className="text-xs text-indigo-600 font-bold mb-3">إضافة مدير عام جديد (له صلاحيات رؤية كل المدارس وإدارتها)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-indigo-900 mb-1">البريد الإلكتروني</label>
              <input type="email" value={newSuperAdmin.email} onChange={e => setNewSuperAdmin(p => ({ ...p, email: e.target.value }))} placeholder="admin2@system.com" className="input" required />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-bold text-indigo-900 mb-1">كلمة المرور</label>
              <input type="text" value={newSuperAdmin.password} onChange={e => setNewSuperAdmin(p => ({ ...p, password: e.target.value }))} placeholder="********" className="input" required />
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-200">
              + إنشاء حساب مدير
            </button>
          </div>
          {superAdminMsg && <p className="text-sm font-bold mt-3 text-indigo-800">{superAdminMsg}</p>}
        </form>
      </section>

      {/* Section 2: الإدارات */}
      <section className="card p-6">
        <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-xs font-black">1</span>
          الإدارات التعليمية ({administrations.length})
        </h2>

        {administrations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {administrations.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-gray-900">{a.name_ar}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{a.code} — {a.governorate}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addAdministration} className="flex flex-wrap gap-3 items-end border-t pt-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الكود</label>
            <input value={newAdmin.code} onChange={e => setNewAdmin(p => ({ ...p, code: e.target.value }))} placeholder="ADM004" className="input w-28" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-gray-500 mb-1">الاسم</label>
            <input value={newAdmin.name_ar} onChange={e => setNewAdmin(p => ({ ...p, name_ar: e.target.value }))} placeholder="إدارة شرق التعليمية" className="input" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">المحافظة</label>
            <input value={newAdmin.governorate} onChange={e => setNewAdmin(p => ({ ...p, governorate: e.target.value }))} placeholder="الجيزة" className="input w-32" />
          </div>
          <button type="submit" className="btn-primary">+ إضافة</button>
          {adminMsg && <p className="text-sm font-bold w-full">{adminMsg}</p>}
        </form>
      </section>

      {/* Section 2: حسابات المدارس */}
      <section className="card p-6">
        <h2 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs font-black">2</span>
          إنشاء حساب مدرسة جديد
        </h2>
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-gray-400">سينشئ مستخدم في Supabase Auth ويربطه بالمدرسة المختارة</p>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={async () => {
              if(!confirm('هل أنت متأكد من توليد حسابات مجمعة لجميع المدارس التي لا تمتلك حساباً؟\nسيتم استخدام (الكود) كبريد إلكتروني وكلمة مرور.')) return;
              setUserMsg('جاري التوليد... يرجى الانتظار');
              try {
                const res = await fetch('/api/admin/bulk-create-users', { method: 'POST' });
                const json = await res.json();
                setUserMsg(res.ok ? `✅ ${json.message} - تم إضافة ${json.details?.success_count} حساب` : `❌ ${json.error}`);
                loadData();
              } catch (err: any) {
                setUserMsg(`❌ ${err.message}`);
              }
            }}
          >
            ⚡ توليد حسابات لجميع المدارس
          </button>
        </div>

        <form onSubmit={createSchoolUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">البريد الإلكتروني</label>
            <input type="email" value={newSchoolUser.email} onChange={e => setNewSchoolUser(p => ({ ...p, email: e.target.value }))} placeholder="school@edu.eg" className="input" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">كلمة المرور</label>
            <input type="text" value={newSchoolUser.password} onChange={e => setNewSchoolUser(p => ({ ...p, password: e.target.value }))} placeholder="********" className="input" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">المدرسة</label>
            <select value={newSchoolUser.school_id} onChange={e => setNewSchoolUser(p => ({ ...p, school_id: e.target.value }))} className="input" required>
              <option value="">-- اختر المدرسة --</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.school_name_ar} ({s.school_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الصلاحية</label>
            <select value={newSchoolUser.permission} onChange={e => setNewSchoolUser(p => ({ ...p, permission: e.target.value }))} className="input">
              <option value="view">قراءة فقط — مدير المدرسة</option>
              <option value="edit">قراءة وتعديل — مسؤول الإحصاء</option>
              <option value="admin">تحكم كامل بالمدرسة</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">+ إنشاء حساب</button>
            {userMsg && <p className="text-sm font-bold mt-2">{userMsg}</p>}
          </div>
        </form>
      </section>

      {/* Current school users */}
      {schoolUsers.length > 0 && (
        <section className="card p-6">
          <h2 className="text-base font-black text-gray-900 mb-4">👥 حسابات المدارس المسجلة ({schoolUsers.length})</h2>
          <div className="space-y-2">
            {schoolUsers.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-gray-900">{u.schools?.school_name_ar ?? '—'}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{u.schools?.school_code} | User: {u.user_id.substring(0, 8)}...</p>
                </div>
                <span className={u.permission_level === 'admin' ? 'badge-danger' : u.permission_level === 'edit' ? 'badge-info' : 'badge-neutral'}>
                  {u.permission_level === 'admin' ? 'تحكم كامل' : u.permission_level === 'edit' ? 'قراءة + تعديل' : 'قراءة فقط'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
