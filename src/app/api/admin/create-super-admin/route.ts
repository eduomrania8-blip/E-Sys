import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    // 1. Create the user in Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    });

    if (authErr) {
      return NextResponse.json({ error: `فشل إنشاء حساب المدير: ${authErr.message}` }, { status: 400 });
    }

    // 2. Link the user to user_school_permissions as a Super Admin (school_id: null, permission_level: 'admin')
    const { error: permErr } = await supabaseAdmin
      .from('user_school_permissions')
      .insert({
        user_id: authData.user.id,
        school_id: null,
        permission_level: 'admin',
      });

    if (permErr) {
      return NextResponse.json({
        error: `تم إنشاء الحساب لكن فشل منحه صلاحيات الإدارة: ${permErr.message}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      email: authData.user.email,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'خطأ غير متوقع' }, { status: 500 });
  }
}
