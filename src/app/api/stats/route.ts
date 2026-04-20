// src/app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAdminStats } from '@/services/studentService';
import { getSchoolUpload, getSchoolStudents } from '@/services/studentService';

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    if (session.role === 'admin') {
      const stats = await getAdminStats();
      return NextResponse.json(stats);
    } else {
      const upload = await getSchoolUpload(session.schoolId!);
      const students = await getSchoolStudents(session.schoolId!, { page: 1 });
      return NextResponse.json({
        upload,
        totalStudents: students.total,
      });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
