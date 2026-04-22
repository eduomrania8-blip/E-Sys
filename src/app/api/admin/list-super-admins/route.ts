import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Fetch all super admin permissions
    const { data: perms, error: permErr } = await supabaseAdmin
      .from('user_school_permissions')
      .select('user_id, permission_level, created_at')
      .is('school_id', null)
      .eq('permission_level', 'admin');

    if (permErr) throw permErr;

    // Fetch all users to map emails
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) throw authErr;

    const admins = perms.map(p => {
      const authUser = authData.users.find(u => u.id === p.user_id);
      return {
        id: p.user_id,
        email: authUser?.email || 'Unknown',
        created_at: p.created_at,
      };
    });

    return NextResponse.json(admins);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'خطأ غير متوقع' }, { status: 500 });
  }
}
