// src/app/api/upload/route.ts
// API Route لرفع Excel v2.0

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processExcelFile } from '@/services/excelImporter';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file        = formData.get('file') as File | null;
    const schoolCode  = formData.get('school_code') as string | null;
    const sheetsJson  = formData.get('sheets') as string | null;

    if (!file)        return NextResponse.json({ error: 'ملف Excel مطلوب' }, { status: 400 });
    if (!schoolCode)  return NextResponse.json({ error: 'كود المدرسة مطلوب' }, { status: 400 });
    if (!sheetsJson)  return NextResponse.json({ error: 'يرجى تحديد الأوراق المطلوبة' }, { status: 400 });

    const requestedSheets: string[] = JSON.parse(sheetsJson);
    if (!requestedSheets.length) {
      return NextResponse.json({ error: 'يرجى اختيار ورقة واحدة على الأقل' }, { status: 400 });
    }

    // البحث عن المدرسة
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('school_code', schoolCode.trim())
      .single();

    if (schoolErr || !school) {
      return NextResponse.json({ error: `لم يتم العثور على مدرسة بالكود: ${schoolCode}` }, { status: 404 });
    }

    const schoolId     = school.id;
    const academicYear = '2025-2026';

    // قراءة الملف ومعالجته
    const buffer  = Buffer.from(await file.arrayBuffer());
    const session = processExcelFile(buffer, requestedSheets);

    // ─── وضع المعاينة: إرجاع البيانات بدون حفظ ──────────────────
    const previewOnly = formData.get('preview_only') === 'true';
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        school_id: schoolId,
        results: session.results.map(r => ({
          sheetId:  r.sheetId,
          label:    r.label,
          status:   r.status,
          message:  r.status === 'success' ? `${r.count} سجل مستخرج — جاهز للمراجعة` : r.message,
          count:    r.count,
          warnings: (r as any).warnings ?? [],
          preview:  r.status === 'success' ? r.data : null,
        })),
      });
    }

    // حفظ البيانات في قاعدة البيانات
    const finalResults = [];

    for (const result of session.results) {
      if (result.status !== 'success' || !result.data) {
        finalResults.push(result);
        continue;
      }

      try {
        switch (result.sheetId) {
          case 'stats': {
            // إزالة التكرارات — نحتفظ بآخر صف لكل grade_level
            const deduped = new Map<string, any>();
            for (const r of result.data) {
              const gl = r.grade_level as string | undefined;
              if (!gl || gl.trim() === '') continue; // تجاهل الصفوف بدون grade
              deduped.set(gl, {
                school_id: schoolId,
                academic_year: academicYear,
                ...r,
              });
            }
            const rows = Array.from(deduped.values());
            if (rows.length === 0) {
              finalResults.push({ ...result, status: 'skipped' as const, message: 'لم يتم العثور على صفوف صالحة' });
              break;
            }

            // حذف البيانات القديمة ثم إدراج الجديدة (أكثر أماناً من upsert)
            await supabaseAdmin
              .from('class_statistics')
              .delete()
              .eq('school_id', schoolId)
              .eq('academic_year', academicYear)
              .in('grade_level', rows.map(r => r.grade_level));

            const { error } = await supabaseAdmin
              .from('class_statistics')
              .insert(rows);
            if (error) throw error;
            finalResults.push({ ...result, message: `تم حفظ ${rows.length} صف دراسي` });
            break;
          }

          case 'low_performers': {
            await supabaseAdmin.from('low_performer_students').delete()
              .eq('school_id', schoolId).eq('academic_year', academicYear);
            const rows = result.data.map(r => ({ school_id: schoolId, academic_year: academicYear, ...r }));
            const { error } = await supabaseAdmin.from('low_performer_students').insert(rows);
            if (error) throw error;
            finalResults.push({ ...result, message: `تم حفظ ${rows.length} طالب ضعيف` });
            break;
          }

          case 'inclusion': {
            await supabaseAdmin.from('inclusion_students_list').delete()
              .eq('school_id', schoolId).eq('academic_year', academicYear);
            const rows = result.data.map(r => ({ school_id: schoolId, academic_year: academicYear, ...r }));
            const { error } = await supabaseAdmin.from('inclusion_students_list').insert(rows);
            if (error) throw error;
            finalResults.push({ ...result, message: `تم حفظ ${rows.length} طالب دمج` });
            break;
          }

          case 'expatriates': {
            await supabaseAdmin.from('expatriate_students_list').delete()
              .eq('school_id', schoolId).eq('academic_year', academicYear);
            const rows = result.data.map(r => ({ school_id: schoolId, academic_year: academicYear, ...r }));
            const { error } = await supabaseAdmin.from('expatriate_students_list').insert(rows);
            if (error) throw error;
            finalResults.push({ ...result, message: `تم حفظ ${rows.length} طالب وافد` });
            break;
          }

          case 'refugees': {
            await supabaseAdmin.from('refugee_students_list').delete()
              .eq('school_id', schoolId).eq('academic_year', academicYear);
            const rows = result.data.map(r => ({ school_id: schoolId, academic_year: academicYear, ...r }));
            const { error } = await supabaseAdmin.from('refugee_students_list').insert(rows);
            if (error) throw error;
            finalResults.push({ ...result, message: `تم حفظ ${rows.length} طالب لاجئ` });
            break;
          }

          case 'leaders': {
            const deduped = new Map<string, any>();
            for (const r of result.data) {
              const nid = String(r.national_id ?? '');
              const key = nid.length >= 14
                ? nid
                : `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              deduped.set(key, { school_id: schoolId, ...r, national_id: key });
            }
            const rows = Array.from(deduped.values());

            // حذف القيادات القديمة لهذه المدرسة ثم إدراج
            await supabaseAdmin.from('school_leaders').delete().eq('school_id', schoolId);
            const { error } = await supabaseAdmin.from('school_leaders').insert(rows);
            if (error) throw error;
            finalResults.push({ ...result, message: `تم حفظ ${rows.length} قيادي` });
            break;
          }

          case 'staff': {
            const deduped = new Map<string, any>();
            for (const r of result.data) {
              const nid = String(r.national_id ?? '');
              const key = nid.length >= 14
                ? nid
                : `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              deduped.set(key, { school_id: schoolId, ...r, national_id: key });
            }
            const rows = Array.from(deduped.values());

            await supabaseAdmin.from('school_staff').delete().eq('school_id', schoolId);
            const { error } = await supabaseAdmin.from('school_staff').insert(rows);
            if (error) throw error;
            finalResults.push({ ...result, message: `تم حفظ ${rows.length} موظف` });
            break;
          }

          case 'building': {
            const bld = { school_id: schoolId, ...result.data[0] };
            const { error } = await supabaseAdmin
              .from('school_buildings')
              .upsert(bld, { onConflict: 'school_id' });
            if (error) throw error;
            finalResults.push({ ...result, message: 'تم حفظ بيانات المبنى' });
            break;
          }

          default:
            finalResults.push({ ...result, status: 'skipped' as const, message: 'نوع غير مدعوم بعد' });
        }
      } catch (dbErr: any) {
        finalResults.push({
          ...result,
          status: 'error' as const,
          message: `خطأ في الحفظ: ${dbErr.message || dbErr.details || JSON.stringify(dbErr)}`,
        });
      }
    }

    // ─── تسجيل عملية الرفع في upload_sessions ──────────────────────
    const successSheets = finalResults.filter(r => r.status === 'success').map(r => r.sheetId);
    const failedSheets  = finalResults.filter(r => r.status === 'error').map(r => r.sheetId);
    const totalRows     = finalResults.reduce((sum, r) => sum + (r.count ?? 0), 0);

    // جلب هوية المستخدم من الـ token
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    await supabaseAdmin.from('upload_sessions').insert({
      school_id:       schoolId,
      uploaded_by:     user?.id ?? null,
      file_name:       file.name,
      file_size_bytes: file.size,
      sheets_requested: requestedSheets,
      sheets_success:   successSheets,
      sheets_failed:    failedSheets,
      total_rows_saved: totalRows,
      status: failedSheets.length === 0 ? 'success' : successSheets.length > 0 ? 'partial' : 'failed',
      details: finalResults.map(r => ({ sheetId: r.sheetId, label: r.label, status: r.status, message: r.message, warnings: (r as any).warnings ?? [] })),
    }).then(() => {}); // لا نوقف الاستجابة إذا فشل التسجيل

    return NextResponse.json({
      success: true,
      school_id: schoolId,
      results: finalResults.map(r => ({
        sheetId:  r.sheetId,
        label:    r.label,
        status:   r.status,
        message:  r.message,
        count:    r.count,
        warnings: (r as any).warnings ?? [],
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
    console.error('Upload error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
