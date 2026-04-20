// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { buildLogoutCookie } from '@/lib/session';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.headers.set('Set-Cookie', buildLogoutCookie());
  return res;
}
