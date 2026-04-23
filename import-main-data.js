const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// 1. Read Environment Variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    let [key, ...rest] = line.split('=');
    let val = rest.join('=');
    val = val.split('#')[0].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key.trim()] = val;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Mapping Helpers
function mapSchoolType(type, name) {
  if (!type) return 'رسمية';
  const t = String(type).trim();
  
  // Special Cultural Schools (Check by name first)
  if (name && (name.includes('البالية') || name.includes('الكونسرفاتوار'))) {
    return 'ثقافية';
  }

  if (t === 'خاص عربى') return 'خاصة';
  if (t === 'رسمى') return 'رسمية';
  if (t === 'رسمى لغات') return 'رسمية لغات';
  if (t === 'خاص لغات') return 'خاصة لغات';
  if (t === 'دولى' || t === 'دولية') return 'دولية';
  
  // Fallback heuristic
  const isPrivate = t.includes('خاص');
  const isLanguages = t.includes('لغات');
  if (isPrivate) return isLanguages ? 'خاصة لغات' : 'خاصة';
  if (isLanguages) return 'رسمية لغات';
  return 'رسمية';
}

function mapGradeLevel(grade) {
  if (!grade) return 'الأول';
  const g = String(grade).trim();
  const maps = {
    'الاول': 'الأول',
    'الثانى': 'الثاني',
    'الثالث': 'الثالث',
    'الرابع': 'الرابع',
    'الخامس': 'الخامس',
    'السادس': 'السادس'
  };
  return maps[g] || g;
}

function generateShortCode(name) {
  return crypto.createHash('md5').update(name).digest('hex').substring(0, 8).toUpperCase();
}

async function importMainData() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  
  const allRows = [];
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    allRows.push(...rows);
  });

  console.log(`Processing ${allRows.length} total rows.`);

  const administrations = new Map(); // name -> id
  const schools = new Map(); // school_code -> id
  const schoolBuildingClassrooms = new Map(); // school_code -> total_classrooms
  const statsToInsert = [];
  const leadersToInsert = [];

  // Pre-load administrations to avoid redundant checks
  const { data: existingAdmins } = await supabase.from('educational_administrations').select('id, name_ar');
  existingAdmins?.forEach(a => administrations.set(a.name_ar, a.id));

  let processedCount = 0;

  for (const row of allRows) {
    processedCount++;
    if (processedCount % 100 === 0) console.log(`Processed ${processedCount}/${allRows.length} rows...`);

    const adminName = row['الإدارة_التعليمية'];
    const governorate = row['المحافظة'];
    const schoolCode = String(row['كود_المدرسة']).trim();
    const schoolName = row['اسم_المدرسة'];
    const schoolType = mapSchoolType(row['النوعية'] || row['نظام_الدراسة'], schoolName);
    const principalName = row['مدير_المدرسة'];
    const principalPhone = row['الموبايل'];
    const gradeLevel = mapGradeLevel(row['الصف']);
    const classCount = parseInt(row['عدد_الفصول']) || 0;
    const boysCount = parseInt(row['بنون']) || 0;
    const girlsCount = parseInt(row['بنات']) || 0;
    const muslimCount = parseInt(row['مسلم']) || 0;
    const christianCount = parseInt(row['مسيحى']) || 0;
    const inclusionCount = parseInt(row['عددالدمج']) || 0;
    const expatriateCount = parseInt(row['عددالوافدين']) || 0;
    const dropoutCount = parseInt(row['عددالمتسربين']) || parseInt(row['عددالمنقطعين']) || 0;

    if (!schoolCode || schoolCode === 'undefined') continue;

    // A. Handle Administration
    if (!administrations.has(adminName)) {
      const { data: newAdmin, error: insertError } = await supabase
        .from('educational_administrations')
        .insert({ 
          name_ar: adminName, 
          governorate: governorate, 
          code: generateShortCode(adminName) 
        })
        .select()
        .single();
      
      if (insertError) {
        console.error(`Error inserting admin ${adminName}:`, insertError);
        continue;
      }
      administrations.set(adminName, newAdmin.id);
    }

    const adminId = administrations.get(adminName);

    // B. Handle School
    if (!schools.has(schoolCode)) {
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .upsert({
          school_code: schoolCode,
          school_name_ar: schoolName,
          school_type: schoolType,
          educational_stage: 'ابتدائي',
          administration_id: adminId,
          is_active: true
        }, { onConflict: 'school_code' })
        .select()
        .single();

      if (schoolError) {
        console.error(`Error upserting school ${schoolName}:`, schoolError);
        continue;
      }
      schools.set(schoolCode, schoolData.id);
      schoolBuildingClassrooms.set(schoolCode, 0);
    }

    const schoolId = schools.get(schoolCode);
    schoolBuildingClassrooms.set(schoolCode, schoolBuildingClassrooms.get(schoolCode) + classCount);

    // C. Collect Leaders
    if (principalName) {
      leadersToInsert.push({
        school_id: schoolId,
        full_name_ar: principalName,
        phone: principalPhone,
        job_title: 'مدير',
        national_id: 'ID_' + schoolCode,
        is_current: true
      });
    }

    // D. Collect Class Statistics
    statsToInsert.push({
      school_id: schoolId,
      academic_year: '2025-2026',
      grade_level: gradeLevel,
      number_of_classes: classCount,
      boys_count: boysCount,
      girls_count: girlsCount,
      muslim_count: muslimCount,
      christian_count: christianCount,
      inclusion_mental: inclusionCount,
      expatriate_count: expatriateCount,
      dropout_count: dropoutCount
    });
  }

  // Batch Inserts
  console.log('Inserting leaders...');
  for (let i = 0; i < leadersToInsert.length; i += 100) {
    const batch = leadersToInsert.slice(i, i + 100);
    await supabase.from('school_leaders').upsert(batch, { onConflict: 'national_id' });
  }

  console.log('Inserting class statistics...');
  for (let i = 0; i < statsToInsert.length; i += 100) {
    const batch = statsToInsert.slice(i, i + 100);
    const { error } = await supabase.from('class_statistics').upsert(batch, { onConflict: 'school_id, academic_year, grade_level' });
    if (error) console.error('Stats batch error:', error);
  }

  // E. Update School Buildings (Total Classrooms)
  console.log('Updating school buildings total classrooms...');
  const buildingsToUpsert = [];
  for (const [code, total] of schoolBuildingClassrooms.entries()) {
    buildingsToUpsert.push({
      school_id: schools.get(code),
      actual_classrooms: total,
      building_status: 'مستقل'
    });
  }
  for (let i = 0; i < buildingsToUpsert.length; i += 100) {
    await supabase.from('school_buildings').upsert(buildingsToUpsert.slice(i, i + 100), { onConflict: 'school_id' });
  }

  console.log('Import completed successfully!');
}

importMainData();
