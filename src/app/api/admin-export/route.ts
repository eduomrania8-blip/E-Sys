export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
    );

    // Verify Admin rights (or just checking session for simplicity here, RLS is handled at DB level but since we use anon key we rely on RLS)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // We can fetch from school_summary view which has everything aggregated
    const { data: summary, error } = await supabase.from('school_summary').select('*').order('school_name_ar');
    
    if (error) throw error;

    const exportData = (summary ?? []).map((s: any, i: number) => ({
      'م': i + 1,
      'الإدارة': s.administration_name ?? '—',
      'كود المدرسة': s.school_code,
      'اسم المدرسة': s.school_name_ar,
      'نوع التعليم': s.school_type ?? '',
      'حالة المبنى': s.building_status ?? '',
      'عدد الفصول': s.total_classes,
      'إجمالي الطلاب': s.total_students,
      'متوسط الكثافة': s.avg_density,
      'الطلاب الدمج': s.total_inclusion,
      'الطلاب الوافدين': s.total_expatriate,
      'معلمون': s.teacher_count,
      'إداريون': s.admin_count,
      'عمال': s.worker_count,
      'إنترنت': s.has_internet ? 'يوجد' : 'لا يوجد',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Some basic styling/column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'الكشوف التجميعية');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="الكشوف_التجميعية_للمدارس.xlsx"`,
        'Content-Length': buf.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('Export Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
