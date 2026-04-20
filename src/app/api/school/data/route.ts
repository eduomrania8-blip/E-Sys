// src/app/api/school/data/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { deleteSchoolData } from '@/services/studentService';

export async function DELETE() {
  const session = getSession();
  if (!session || session.role !== 'school')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  try {
    await deleteSchoolData(session.schoolId!);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
