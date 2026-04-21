// src/middleware.ts
// Middleware للتحقق من الجلسة وتوجيه كل مستخدم حسب صلاحيته:
// • Super Admin   → /dashboard (يرى كل المدارس)
// • School Admin  → /school    (يرى مدرسته فقط)
// • غير مسجّل    → /login

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)         { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // ── غير مسجّل → تسجيل دخول ──────────────────────────────────
  if (!session) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/school')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // ── مسجّل → تحديد الدور ──────────────────────────────────────
  if (pathname.startsWith('/login')) {
    // تحقق سريع من الدور لتوجيهه للمكان الصحيح
    const { data: perm } = await supabase
      .from('user_school_permissions')
      .select('school_id, permission_level')
      .eq('user_id', session.user.id)
      .limit(1)
      .single();

    if (!perm) return NextResponse.redirect(new URL('/login?error=no_permission', request.url));

    // super admin: school_id IS NULL + permission = admin
    if (perm.school_id === null && perm.permission_level === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // school admin: له school_id محدد
    return NextResponse.redirect(new URL('/school', request.url));
  }

  // ── حماية /dashboard: Super Admin فقط ───────────────────────
  if (pathname.startsWith('/dashboard')) {
    const { data: perm } = await supabase
      .from('user_school_permissions')
      .select('school_id, permission_level')
      .eq('user_id', session.user.id)
      .is('school_id', null)
      .eq('permission_level', 'admin')
      .single();

    if (!perm) {
      // ليس super admin → ربما school admin → وجّهه لـ /school
      return NextResponse.redirect(new URL('/school', request.url));
    }
    return response;
  }

  // ── حماية /school: أي مستخدم مسجّل له صلاحية مدرسة ─────────
  if (pathname.startsWith('/school')) {
    const { data: perm } = await supabase
      .from('user_school_permissions')
      .select('school_id, permission_level')
      .eq('user_id', session.user.id)
      .not('school_id', 'is', null)
      .single();

    if (!perm) {
      // ليس school admin → ربما super admin
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/school/:path*', '/login'],
};
