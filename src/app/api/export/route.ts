// src/app/api/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAllStudentsForExport, getSchoolUpload } from '@/services/studentService';
import { buildExcelExport } from '@/services/excelExport';
import { createAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const grade = sp.get('grade') ?? '';
  const search = sp.get('search') ?? '';
  const type = sp.get('type') ?? '';

  try {
    let district = '';
    let schoolName = '';
    let address = '';

    if (session.role === 'school') {
      const upload = await getSchoolUpload(session.schoolId!);
      district = upload?.district ?? '';
      schoolName = upload?.school_name_snapshot ?? session.schoolName ?? '';
      address = upload?.address_snapshot ?? '';

      const raw = await getAllStudentsForExport({ schoolId: session.schoolId!, grade, search });
      const rows = (raw as Record<string, unknown>[]).map((r, i) => ({
        rowNum: i + 1,
        name: String(r.name),
        grade: String(r.grade ?? ''),
        classRoom: String(r.class_room ?? ''),
      }));

      const buf = buildExcelExport({ district, schoolName, address, rows });
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="كشف_${schoolName}.xlsx"`,
        },
      });
    }

    // Admin export
    const schoolId = sp.get('schoolId') ?? '';
    let headerDistrict = 'جميع الإدارات';
    let headerSchool = 'جميع المدارس';

    if (schoolId) {
      const db = createAdminClient();
      const { data: sch } = await db.from('schools').select('name,district').eq('id', schoolId).single();
      if (sch) { headerDistrict = sch.district ?? ''; headerSchool = sch.name; }
    }

    const raw = await getAllStudentsForExport({ schoolId: schoolId || undefined, grade, search, type: type || undefined });
    const rows = (raw as Record<string, unknown>[]).map((r, i) => ({
      rowNum: i + 1,
      name: String(r.name),
      grade: String(r.grade ?? ''),
      classRoom: String(r.class_room ?? ''),
    }));

    const buf = buildExcelExport({ district: headerDistrict, schoolName: headerSchool, address: '', rows });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="كشف_كل_المدارس.xlsx"',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
