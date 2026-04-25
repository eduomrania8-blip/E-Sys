'use client';
// UserGreeting — تحية ترحيبية شخصية بالاسم أو البريد

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function UserGreeting() {
  const [name, setName] = useState('');
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email ?? '';
      const displayName = email.split('@')[0].replace(/[._-]/g, ' ');
      setName(displayName);
    });
    setHour(new Date().getHours());
  }, []);

  const greeting =
    hour >= 5 && hour < 12 ? 'صباح الخير' :
    hour >= 12 && hour < 17 ? 'مساء الخير' :
    hour >= 17 && hour < 21 ? 'مساء النور' :
    'مرحباً بك';

  if (!name) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
      <span className="text-base">{hour >= 5 && hour < 17 ? '☀️' : '🌙'}</span>
      <span>{greeting}, <span className="text-gray-800 font-black capitalize">{name}</span></span>
    </div>
  );
}
