// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { parseExcelBuffer } from '@/services/excelParser';
import { createUpload } from '@/services/studentService';
import { createAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'school')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400 });

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 });

  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i))
    return NextResponse.json({ error: 'نوع الملف غير مدعوم. يُقبل فقط xlsx أو xls.' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parseResult = parseExcelBuffer(buffer);

  if (!parseResult.success)
    return NextResponse.json({ error: parseResult.error }, { status: 422 });

  // Optionally store original file in Supabase Storage
  let storagePath: string | undefined;
  try {
    const db = createAdminClient();
    const path = `${session.schoolId}/${Date.now()}_${file.name}`;
    const { data } = await db.storage.from('excel-uploads').upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });
    storagePath = data?.path;
  } catch {
    // Non-fatal – continue without storage
  }

  const { uploadId, count } = await createUpload(
    session.schoolId!,
    parseResult.data,
    file.name,
    storagePath
  );

  return NextResponse.json({
    success: true,
    uploadId,
    count,
    header: parseResult.data.header,
  });
}

/** Preview only – parse without saving */
export async function PUT(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'school')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseExcelBuffer(buffer);

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 422 });

  return NextResponse.json({
    success: true,
    header: result.data.header,
    students: result.data.students.slice(0, 50), // preview first 50
    totalCount: result.data.students.length,
  });
}
