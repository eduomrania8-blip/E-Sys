// src/app/api/create-school-user/route.ts
// إنشاء حساب مستخدم لمدرسة — يستخدم Service Role لإنشاء المستخدم
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password, school_id, permission } = await req.json();

    if (!email || !password || !school_id) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    // التحقق من وجود المدرسة
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from('schools')
      .select('id, school_name_ar')
      .eq('id', school_id)
      .single();

    if (schoolErr || !school) {
      return NextResponse.json({ error: 'المدرسة غير موجودة' }, { status: 404 });
    }

    // إنشاء المستخدم في Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // تأكيد تلقائي
      user_metadata: {
        school_id,
        school_name: school.school_name_ar,
        role: 'school_admin',
      },
    });

    if (authErr) {
      return NextResponse.json({ error: `فشل إنشاء المستخدم: ${authErr.message}` }, { status: 400 });
    }

    // ربط المستخدم بالمدرسة في جدول الصلاحيات
    const { error: permErr } = await supabaseAdmin
      .from('user_school_permissions')
      .insert({
        user_id: authData.user.id,
        school_id,
        permission_level: permission || 'edit',
      });

    if (permErr) {
      return NextResponse.json({
        error: `تم إنشاء المستخدم لكن فشل ربط الصلاحية: ${permErr.message}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      email: authData.user.email,
      school_name: school.school_name_ar,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'خطأ غير متوقع' }, { status: 500 });
  }
}
