export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get('schoolId');
    if (!schoolId) return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });

    const [schoolRes, buildingRes, statsRes, leadersRes, staffRes, lowRes, incRes, expRes, refRes] = await Promise.all([
      supabaseAdmin.from('schools').select('*, educational_administrations(name_ar, governorate)').eq('id', schoolId).single(),
      supabaseAdmin.from('school_buildings').select('*').eq('school_id', schoolId).single(),
      supabaseAdmin.from('class_statistics').select('*').eq('school_id', schoolId).eq('academic_year', '2025-2026').order('grade_level'),
      supabaseAdmin.from('school_leaders').select('*').eq('school_id', schoolId).order('job_title'),
      supabaseAdmin.from('school_staff').select('*').eq('school_id', schoolId).order('job_category'),
      supabaseAdmin.from('low_performer_students').select('*').eq('school_id', schoolId).eq('academic_year', '2025-2026'),
      supabaseAdmin.from('inclusion_students_list').select('*').eq('school_id', schoolId).eq('academic_year', '2025-2026'),
      supabaseAdmin.from('expatriate_students_list').select('*').eq('school_id', schoolId).eq('academic_year', '2025-2026'),
      supabaseAdmin.from('refugee_students_list').select('*').eq('school_id', schoolId).eq('academic_year', '2025-2026'),
    ]);

    const targetSchool = schoolRes.data;
    if (!targetSchool) return NextResponse.json({ error: 'School not found' }, { status: 404 });

    // Headers Text
    const govText = targetSchool?.educational_administrations?.governorate ? `محافظة ${targetSchool.educational_administrations.governorate}` : 'محافظة الجيزة';
    const admText = targetSchool?.educational_administrations?.name_ar ? `إدارة ${targetSchool.educational_administrations.name_ar}` : 'إدارة ........... التعليمية';
    const schText = targetSchool?.school_name_ar ? `مدرسة : ${targetSchool.school_name_ar}` : 'مدرسة : ............';
    const codText = targetSchool?.school_code ? `كود المدرسة : ${targetSchool.school_code}` : 'كود المدرسة : ............';

    const wb = XLSX.utils.book_new();

    // ─── Sheet 1: إحصاءات الصفوف ──────────────────────────
    const statsData = (statsRes.data ?? []).map(s => ([
      s.grade_level,
      s.number_of_classes,
      s.boys_count,
      s.girls_count,
      (s.boys_count || 0) + (s.girls_count || 0),
      s.muslim_count,
      s.christian_count,
      s.inclusion_mental,
      s.inclusion_hearing,
      s.inclusion_visual,
      s.inclusion_physical,
      s.inclusion_multiple,
      s.inclusion_total,
      s.expatriate_count,
      s.transferred_or_new,
      s.retained_for_repeat,
      s.dropout_count
    ]));

    const statsHeader = [
      [govText, '', 'إحصاءات الصفوف الدراسية (ممتلئة)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [schText, '', codText, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [],
      ['الصف', 'عدد الفصول', 'بنين', 'بنات', 'المجموع', 'مسلم', 'مسيحي',
       'ذهني', 'سمعي', 'بصري', 'حركي', 'متعدد', 'إجمالي الدمج',
       'الوافدين', 'محول/جديد', 'راسب/معيد', 'تسرب/منقطع'],
      ...statsData
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsHeader);
    wsStats['!cols'] = Array(17).fill({ wch: 10 });
    wsStats['!cols'][0] = { wch: 16 };
    XLSX.utils.book_append_sheet(wb, wsStats, 'إحصاءات الصفوف');

    // ─── Sheet 2: كشف الضعاف ──────────────────────────────
    const lowData = (lowRes.data ?? []).map((s, i) => ([
      i + 1, s.student_full_name, s.grade_level, s.class_name, s.notes
    ]));
    const lowHeader = [
      [govText, '', 'سجل الطلاب الضعاف (ممتلئ)', '', '', '', ''],
      [admText, '', 'الفصل الدراسي الثاني 2025 / 2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الصف', 'الفصل', 'ملاحظات'],
      ...(lowData.length ? lowData : [['لا توجد بيانات', '', '', '', '']])
    ];
    const wsLow = XLSX.utils.aoa_to_sheet(lowHeader);
    wsLow['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsLow, 'كشف الضعاف');

    // ─── Sheet 3: كشف الدمج ───────────────────────────────
    const incData = (incRes.data ?? []).map((s, i) => ([
      i + 1, s.student_full_name, s.national_id, s.grade_level, s.class_name, s.disability_type
    ]));
    const incHeader = [
      [govText, '', 'كشف طلاب الدمج (ممتلئ)', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الرقم القومي', 'الصف', 'الفصل', 'نوع الإعاقة'],
      ...(incData.length ? incData : [['لا توجد بيانات', '', '', '', '', '']])
    ];
    const wsInc = XLSX.utils.aoa_to_sheet(incHeader);
    wsInc['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsInc, 'كشف الدمج');

    // ─── Sheet 4: كشف الوافدين ────────────────────────────
    const expData = (expRes.data ?? []).map((s, i) => ([
      i + 1, s.student_full_name, s.grade_level, s.class_name, s.country, s.passport_number
    ]));
    const expHeader = [
      [govText, '', 'كشف الطلاب الوافدين (ممتلئ)', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الصف', 'الفصل', 'الجنسية', 'رقم الجواز'],
      ...(expData.length ? expData : [['لا توجد بيانات', '', '', '', '', '']])
    ];
    const wsExp = XLSX.utils.aoa_to_sheet(expHeader);
    wsExp['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsExp, 'كشف الوافدين');

    // ─── Sheet 5: كشف اللاجئين ────────────────────────────
    const refData = (refRes.data ?? []).map((s, i) => ([
      i + 1, s.student_full_name, s.grade_level, s.class_name, s.country, s.refugee_classification
    ]));
    const refHeader = [
      [govText, '', 'كشف الطلاب اللاجئين (ممتلئ)', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الصف', 'الفصل', 'الدولة', 'التصنيف'],
      ...(refData.length ? refData : [['لا توجد بيانات', '', '', '', '', '']])
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refHeader);
    wsRef['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'كشف اللاجئين');

    // ─── Sheet 6: القيادات المدرسية ────────────────────────
    const lData = (leadersRes.data ?? []).map((s, i) => ([
      i + 1, s.full_name_ar, s.national_id, s.job_title, s.phone, s.cadre, s.appointment_type
    ]));
    const leadersHeader = [
      [govText, '', 'القيادات المدرسية (ممتلئ)', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'الاسم بالكامل', 'الرقم القومي', 'الوظيفة / المسمى', 'رقم التليفون', 'الكادر', 'نوع التعيين'],
      ...(lData.length ? lData : [['لا توجد بيانات', '', '', '', '', '', '']])
    ];
    const wsLeaders = XLSX.utils.aoa_to_sheet(leadersHeader);
    wsLeaders['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsLeaders, 'القيادات');

    // ─── Sheet 7: العاملون ─────────────────────────────────
    const stData = (staffRes.data ?? []).map((s, i) => ([
      i + 1, s.full_name_ar, s.national_id, s.job_category, s.qualification, s.work_status, s.phone
    ]));
    const staffHeader = [
      [govText, '', 'كشف العاملين بالمدرسة (ممتلئ)', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'الاسم بالكامل', 'الرقم القومي', 'الفئة', 'المؤهل', 'الحالة', 'رقم التليفون'],
      ...(stData.length ? stData : [['لا توجد بيانات', '', '', '', '', '', '']])
    ];
    const wsStaff = XLSX.utils.aoa_to_sheet(staffHeader);
    wsStaff['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsStaff, 'العاملون');

    // ─── Sheet 8: بيانات المبنى ────────────────────────────
    const bld = buildingRes.data;
    const buildingRows = [
      [govText, '', 'بيانات المبنى المدرسي (ممتلئ)'],
      [admText, '', 'العام الدراسي 2025/2026'],
      [schText, '', codText],
      [],
      ['البيان', 'القيمة', 'ملاحظات'],
      ['حالة المبنى', bld?.building_status ?? '', ''],
      ['عدد الفصول الدراسية', bld?.actual_classrooms ?? '', ''],
      ['عدد الغرف الإدارية', bld?.admin_rooms ?? '', ''],
      ['عدد المعامل', bld?.total_labs ?? '', ''],
      ['عدد غرف الأنشطة', bld?.activity_rooms ?? '', ''],
      ['عدد الملاعب', bld?.playgrounds ?? '', ''],
      ['دورات مياه بنين', bld?.boys_toilets ?? '', ''],
      ['دورات مياه بنات', bld?.girls_toilets ?? '', ''],
      ['دورات مياه هيئة التدريس', bld?.staff_toilets ?? '', ''],
      ['عدد كاميرات المراقبة', bld?.surveillance_cameras ?? '', ''],
      ['حالة السور', bld?.fence_condition ?? '', ''],
      ['تليفون أرضي', bld?.has_landline ? 'يوجد' : 'لا يوجد', ''],
      ['إنترنت', bld?.has_internet ? 'يوجد' : 'لا يوجد', ''],
    ];
    const wsBld = XLSX.utils.aoa_to_sheet(buildingRows);
    wsBld['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsBld, 'بيانات المبنى');

    // ─── تصدير الملف ──────────────────────────────────────
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `بيانات_المدرسة_${targetSchool.school_name_ar.replace(/\s+/g, '_')}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buf.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('Export Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
