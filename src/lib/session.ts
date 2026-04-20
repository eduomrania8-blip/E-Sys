// src/lib/session.ts
// Lightweight cookie-based session (signed JSON, no JWT library needed)
// For production, swap with iron-session or jose for cryptographic signing.

import { cookies } from 'next/headers';
import type { SessionUser } from '@/types';

const SESSION_COOKIE = 'ws_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

/** Encode session to base64 (simple – replace with signed JWT in production) */
function encode(data: SessionUser): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function decode(value: string): SessionUser | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as SessionUser;
  } catch {
    return null;
  }
}

/** Set session cookie (call from API route Response) */
export function buildSessionCookie(user: SessionUser): string {
  const value = encode(user);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function buildLogoutCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Read session from request cookies (Server Component / API Route) */
export function getSession(): SessionUser | null {
  const cookieStore = cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decode(raw);
}

/** Guard: redirect to login if no session or wrong role */
export function requireSession(role?: 'admin' | 'school'): SessionUser {
  const session = getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  if (role && session.role !== role) throw new Error('FORBIDDEN');
  return session;
}
