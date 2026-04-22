// src/app/api/schools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getAllSchools, createSchool, deleteSchool } from '@/services/schoolService';

const CreateSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(2),
  type: z.enum(['رسمي', 'رسمي لغات', 'خاص', 'خاص لغات', 'دولي', 'ثقافي']),
  stage: z.string().default('الابتدائية'),
  district: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(4),
});

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  try {
    const schools = await getAllSchools();
    return NextResponse.json(schools);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    const d = parsed.data;
    const school = await createSchool({
      school_code: d.code,
      school_name_ar: d.name,
      school_type: d.type,
      educational_stage: d.stage,
      administration_id: d.district ?? '',
      address: d.address,
    });
    return NextResponse.json({ success: true, school });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { schoolId } = await req.json().catch(() => ({}));
  if (!schoolId) return NextResponse.json({ error: 'schoolId مطلوب' }, { status: 400 });

  try {
    await deleteSchool(schoolId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
