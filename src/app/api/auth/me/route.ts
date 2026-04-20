// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  return NextResponse.json(session);
}
