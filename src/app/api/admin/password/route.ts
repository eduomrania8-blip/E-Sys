// src/app/api/admin/password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase';

const Schema = z.object({ newPassword: z.string().min(6) });

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });

  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  const db = createAdminClient();
  const { error } = await db
    .from('admin_settings')
    .update({ password_hash: hash, updated_at: new Date().toISOString() })
    .eq('username', 'admin');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
