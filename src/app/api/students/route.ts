// src/app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getStudentsPaginated, getSchoolStudents } from '@/services/studentService';

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get('page') ?? '1');
  const search = sp.get('search') ?? '';
  const grade = sp.get('grade') ?? '';
  const type = sp.get('type') ?? '';

  try {
    if (session.role === 'admin') {
      const schoolId = sp.get('schoolId') ?? '';
      const result = await getStudentsPaginated({ page, search, grade, type, schoolId: schoolId || undefined });
      return NextResponse.json(result);
    } else {
      // School sees only their own students
      const result = await getSchoolStudents(session.schoolId!, { page, search, grade });
      return NextResponse.json(result);
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
