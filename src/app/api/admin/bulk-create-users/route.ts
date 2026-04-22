// src/app/api/admin/bulk-create-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Fetch all schools
    const { data: schools, error: schoolsErr } = await supabaseAdmin
      .from('schools')
      .select('id, school_code, school_name_ar')
      .eq('is_active', true);

    if (schoolsErr) throw schoolsErr;

    // 2. Fetch all existing users from permissions to avoid duplicates
    const { data: existingPerms, error: permsErr } = await supabaseAdmin
      .from('user_school_permissions')
      .select('school_id');

    if (permsErr) throw permsErr;

    const schoolsWithAccounts = new Set(existingPerms.map(p => p.school_id));
    const schoolsWithoutAccounts = schools.filter(s => !schoolsWithAccounts.has(s.id) && s.school_code);

    if (schoolsWithoutAccounts.length === 0) {
      return NextResponse.json({ message: 'جميع المدارس لديها حسابات بالفعل.' });
    }

    const results = {
      total_found: schoolsWithoutAccounts.length,
      success_count: 0,
      errors: [] as string[],
    };

    // Process in batches or sequentially
    for (const school of schoolsWithoutAccounts) {
      const email = `${school.school_code}@school.edu.eg`.toLowerCase();
      // Ensure password is at least 6 chars
      const password = String(school.school_code).length >= 6 ? String(school.school_code) : String(school.school_code).padStart(6, '0');

      // 3. Create user in auth
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          school_id: school.id,
          school_name: school.school_name_ar,
          role: 'school', // 'school' role for frontend
        },
      });

      if (authErr) {
        // If user already exists (maybe from an old deleted school record), just log it
        results.errors.push(`فشل إنشاء حساب مدرسة (${school.school_code}): ${authErr.message}`);
        continue;
      }

      // 4. Link permission
      const { error: permErr } = await supabaseAdmin
        .from('user_school_permissions')
        .insert({
          user_id: authData.user.id,
          school_id: school.id,
          permission_level: 'edit',
        });

      if (permErr) {
        results.errors.push(`فشل ربط الصلاحية لمدرسة (${school.school_code}): ${permErr.message}`);
        // Optionally delete the auth user here to rollback, but let's keep it simple
      } else {
        results.success_count++;
      }
    }

    return NextResponse.json({
      message: 'تمت العملية',
      details: results,
    });

  } catch (err: any) {
    console.error('Bulk create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
