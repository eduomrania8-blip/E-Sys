// src/middleware.ts
// Protects /dashboard/* routes at the edge layer

import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ws_session';

function decodeSession(value: string) {
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const raw = req.cookies.get(SESSION_COOKIE)?.value;
    const session = raw ? decodeSession(raw) : null;

    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Role-based routing
    if (pathname.startsWith('/dashboard/admin') && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/school', req.url));
    }
    if (pathname.startsWith('/dashboard/school') && session.role !== 'school') {
      return NextResponse.redirect(new URL('/dashboard/admin', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
