// supabase/functions/upload-excel/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACADEMIC_YEAR = "2025-2026";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) throw new Error('Unauthorized');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file uploaded');

    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sessionId = crypto.randomUUID();

    // 1. Process Schools / Staging
    if (workbook.SheetNames.includes('بيانات أساسية')) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['بيانات أساسية']) as any[];
      for (const row of data) {
        const schoolCode = row['كود المدرسة']?.toString().trim();
        const { data: school } = await supabaseClient.from('schools').select('id').eq('school_code', schoolCode).single();
        
        await supabaseClient.from('staging_school_data').insert({
          uploaded_by: user.id,
          upload_session_id: sessionId,
          raw_school_code: schoolCode,
          raw_school_name: row['اسم المدرسة'],
          raw_total_students: row['إجمالي الطلاب'],
          raw_classroom_count: row['عدد الفصول'],
          raw_academic_year: ACADEMIC_YEAR,
          validation_status: school ? 'valid' : 'invalid',
          validation_errors: school ? [] : [`مدرسة غير موجودة بكود: ${schoolCode}`],
          matched_school_id: school?.id,
          full_row_data: row
        });
      }
    }

    // 2. Process Statistics (Directly into class_statistics if school exists)
    if (workbook.SheetNames.includes('إحصاءات الصفوف')) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['إحصاءات الصفوف']) as any[];
      for (const row of data) {
        const schoolCode = row['كود المدرسة']?.toString().trim();
        const { data: school } = await supabaseClient.from('schools').select('id').eq('school_code', schoolCode).single();
        
        if (school) {
          await supabaseClient.from('class_statistics').upsert({
            school_id: school.id,
            academic_year: ACADEMIC_YEAR,
            grade_level: row['الصف'],
            number_of_classes: row['عدد الفصول'],
            boys_count: row['بنين'],
            girls_count: row['بنات'],
            muslim_count: row['مسلم'],
            christian_count: row['مسيحي'],
            inclusion_mental: row['دمج ذهني'] || 0,
            expatriate_count: row['وافدين'] || 0
          }, { onConflict: 'school_id,academic_year,grade_level' });
        }
      }
    }

    // 3. Process Inclusion Students
    if (workbook.SheetNames.includes('طلاب الدمج')) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['طلاب الدمج']) as any[];
      for (const row of data) {
        const schoolCode = row['كود المدرسة']?.toString().trim();
        const { data: school } = await supabaseClient.from('schools').select('id').eq('school_code', schoolCode).single();
        if (school) {
          await supabaseClient.from('inclusion_students_list').insert({
            school_id: school.id,
            academic_year: ACADEMIC_YEAR,
            student_full_name: row['الاسم'],
            national_id: row['الرقم القومي'],
            grade_level: row['الصف'],
            disability_type: row['نوع الإعاقة']
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, session_id: sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
