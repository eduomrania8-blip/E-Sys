// src/app/api/template/route.ts
// API لتوليد ملف Excel Template متعدد الأوراق
// يحتوي على قائمة المدارس من قاعدة البيانات + نماذج كل الأوراق

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
    
    // جلب بيانات المدرسة إذا تم تحديد schoolId
    let targetSchool: any = null;
    let schoolsQuery = supabaseAdmin
      .from('schools')
      .select('id, school_code, school_name_ar, school_type, educational_stage, educational_administrations(name_ar, governorate)')
      .eq('is_active', true)
      .order('school_name_ar');
      
    if (schoolId) {
      schoolsQuery = schoolsQuery.eq('id', schoolId);
    }
    
    const { data: schools } = await schoolsQuery;
    
    if (schoolId && schools && schools.length > 0) {
      targetSchool = schools[0];
    }

    const schoolList = (schools ?? []).map((s: any, i: number) => ({
      'م': i + 1,
      'كود المدرسة': s.school_code,
      'اسم المدرسة': s.school_name_ar,
      'نوع التعليم': s.school_type ?? '',
      'المرحلة': s.educational_stage ?? '',
      'الإدارة': s.educational_administrations?.name_ar ?? '',
    }));

    const wb = XLSX.utils.book_new();

    // ─── Sheet 1: قائمة المدارس ───────────────────────────
    const wsSchools = XLSX.utils.json_to_sheet(schoolList);
    wsSchools['!cols'] = [
      { wch: 5 },  { wch: 14 }, { wch: 45 }, { wch: 14 }, { wch: 12 }, { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSchools, 'قائمة المدارس');

    // Headers Text
    const govText = targetSchool?.educational_administrations?.governorate ? `محافظة ${targetSchool.educational_administrations.governorate}` : 'محافظة الجيزة';
    const admText = targetSchool?.educational_administrations?.name_ar ? `إدارة ${targetSchool.educational_administrations.name_ar}` : 'إدارة ........... التعليمية';
    const schText = targetSchool?.school_name_ar ? `مدرسة : ${targetSchool.school_name_ar}` : 'مدرسة : ............';
    const codText = targetSchool?.school_code ? `كود المدرسة : ${targetSchool.school_code}` : 'كود المدرسة : ............';

    // ─── Sheet 2: إحصاءات الصفوف ──────────────────────────
    const statsHeader = [
      [govText, '', 'إحصاءات الصفوف الدراسية', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [schText, '', codText, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [],
      ['الصف', 'عدد الفصول', 'بنين', 'بنات', 'المجموع', 'مسلم', 'مسيحي',
       'ذهني', 'سمعي', 'بصري', 'حركي', 'متعدد', 'إجمالي الدمج',
       'الوافدين', 'محول/جديد', 'راسب/معيد', 'تسرب/منقطع'],
      ['الصف الأول', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['الصف الثاني', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['الصف الثالث', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['الصف الرابع', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['الصف الخامس', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['الصف السادس', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['الإجمالي', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsHeader);
    wsStats['!cols'] = Array(17).fill({ wch: 10 });
    wsStats['!cols'][0] = { wch: 16 };
    XLSX.utils.book_append_sheet(wb, wsStats, 'إحصاءات الصفوف');

    // ─── Sheet 3: كشف الضعاف ──────────────────────────────
    const lowHeader = [
      [govText, '', 'سجل الطلاب الضعاف', '', '', '', ''],
      [admText, '', 'الفصل الدراسي الثاني 2025 / 2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الصف', 'الفصل', 'ملاحظات'],
      [1, '', '', '', ''], [2, '', '', '', ''], [3, '', '', '', ''], [4, '', '', '', ''], [5, '', '', '', ''],
    ];
    const wsLow = XLSX.utils.aoa_to_sheet(lowHeader);
    wsLow['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsLow, 'كشف الضعاف');

    // ─── Sheet 4: كشف الدمج ───────────────────────────────
    const incHeader = [
      [govText, '', 'كشف طلاب الدمج', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الرقم القومي', 'الصف', 'الفصل', 'نوع الإعاقة'],
      [],
      ['', '', '', '', '', '← (ذهني / سمعي / بصري / حركي / متعدد)'],
    ];
    const wsInc = XLSX.utils.aoa_to_sheet(incHeader);
    wsInc['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsInc, 'كشف الدمج');

    // ─── Sheet 5: كشف الوافدين ────────────────────────────
    const expHeader = [
      [govText, '', 'كشف الطلاب الوافدين', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الصف', 'الفصل', 'الجنسية', 'رقم الجواز'],
    ];
    const wsExp = XLSX.utils.aoa_to_sheet(expHeader);
    wsExp['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsExp, 'كشف الوافدين');

    // ─── Sheet 6: كشف اللاجئين ────────────────────────────
    const refHeader = [
      [govText, '', 'كشف الطلاب اللاجئين', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'اسم التلميذ', 'الصف', 'الفصل', 'الدولة', 'التصنيف'],
      [],
      ['', '', '', '', '', '← (سوري / فلسطيني / سوداني / يمني / أخرى)'],
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refHeader);
    wsRef['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'كشف اللاجئين');

    // ─── Sheet 7: القيادات المدرسية ────────────────────────
    const leadersHeader = [
      [govText, '', 'القيادات المدرسية', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'الاسم بالكامل', 'الرقم القومي', 'الوظيفة / المسمى', 'رقم التليفون', 'الكادر', 'نوع التعيين'],
      [1, '', '', 'مدير', '', '', ''],
      [2, '', '', 'وكيل شئون العاملين', '', '', ''],
      [3, '', '', 'وكيل شئون الطلاب', '', '', ''],
      [4, '', '', 'مسئول الإحصاء', '', '', ''],
      [5, '', '', 'مسئول الدمج', '', '', ''],
      [6, '', '', 'مسئول القرائية', '', '', ''],
      [7, '', '', 'مسئول وحدة التدريب', '', '', ''],
      [8, '', '', 'رئيس الكنترول', '', '', ''],
    ];
    const wsLeaders = XLSX.utils.aoa_to_sheet(leadersHeader);
    wsLeaders['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsLeaders, 'القيادات');

    // ─── Sheet 8: بيانات المبنى ────────────────────────────
    const buildingRows = [
      [govText, '', 'بيانات المبنى المدرسي'],
      [admText, '', 'العام الدراسي 2025/2026'],
      [schText, '', codText],
      [],
      ['البيان', 'القيمة', 'ملاحظات'],
      ['حالة المبنى', '', '← (جيد / متوسط / ضعيف / آيل للسقوط)'],
      ['عدد الفصول الدراسية', '', ''],
      ['عدد الغرف الإدارية', '', ''],
      ['عدد المعامل', '', ''],
      ['عدد غرف الأنشطة', '', ''],
      ['عدد الملاعب', '', ''],
      ['دورات مياه بنين', '', ''],
      ['دورات مياه بنات', '', ''],
      ['دورات مياه هيئة التدريس', '', ''],
      ['عدد كاميرات المراقبة', '', ''],
      ['حالة السور', '', '← (جيد / متوسط / ضعيف / لا يوجد)'],
      ['تليفون أرضي', '', '← (يوجد / لا يوجد)'],
      ['إنترنت', '', '← (يوجد / لا يوجد)'],
    ];
    const wsBld = XLSX.utils.aoa_to_sheet(buildingRows);
    wsBld['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsBld, 'بيانات المبنى');

    // ─── Sheet 9: العاملون ─────────────────────────────────
    const staffHeader = [
      [govText, '', 'كشف العاملين بالمدرسة', '', '', '', ''],
      [admText, '', 'العام الدراسي 2025/2026', '', '', '', ''],
      [schText, '', codText, '', '', '', ''],
      [],
      ['م', 'الاسم بالكامل', 'الرقم القومي', 'الفئة', 'المؤهل', 'الحالة', 'رقم التليفون'],
      [],
      ['', '', '', '← (معلم / إداري / عامل)', '', '← (على رأس العمل / بالمعاش / بالأجر / منتدب / إجازة / نصف الوقت)', ''],
    ];
    const wsStaff = XLSX.utils.aoa_to_sheet(staffHeader);
    wsStaff['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsStaff, 'العاملون');

    // ─── تصدير الملف ──────────────────────────────────────
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = targetSchool ? `نموذج_طباعة_${targetSchool.school_name_ar.replace(/\s+/g, '_')}.xlsx` : 'template_school_data.xlsx';

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buf.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('Template error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
