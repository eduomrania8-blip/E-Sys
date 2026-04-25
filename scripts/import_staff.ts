import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local natively
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Could not read .env.local file');
}

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.includes('#')) value = value.split('#')[0];
    value = value.trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function excelDateToJSDate(serial: number) {
  if (!serial || isNaN(serial)) return null;
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

function determineJobCategory(magmaa: string, wazefa: string) {
  const m = String(magmaa || '').trim();
  const w = String(wazefa || '').trim();
  if (m.includes('التعليم') || w.includes('معلم') || w.includes('اخصائي')) return 'معلم';
  if (m.includes('كتابية') || m.includes('فنية') || m.includes('إدارية') || w.includes('إداري')) return 'إداري';
  return 'عامل';
}

function determineCadreStatus(d_kader: string) {
  const d = String(d_kader || '').trim();
  if (d.includes('غير مخاطب') || d.includes('ليس')) return 'ليس له كادر';
  return 'له كادر';
}

function sanitizeSubject(mada: string) {
  let s = String(mada || '').trim();
  if (s === 'لغه انجليزية') return 'اللغة الإنجليزية';
  if (s === 'لغة عربية') return 'اللغة العربية';
  if (s === 'رياضيات') return 'رياضيات';
  if (s === 'علوم') return 'علوم';
  if (s === 'تربية دينية اسلامية') return 'تربية دينية إسلامية';
  if (s === 'تربية دينية مسيحية') return 'تربية دينية مسيحية';
  if (s.includes('انجليزي')) return 'اللغة الإنجليزية';
  if (s.includes('عربي')) return 'اللغة العربية';
  return s;
}

async function main() {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('d:/E-system/TBL_EMPLAY.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json<any>(worksheet);

  console.log(`Found ${data.length} records in Excel.`);

  // 1. Fetch all schools to map names to IDs
  console.log('Fetching schools from database...');
  const { data: schools, error: schoolErr } = await supabase.from('schools').select('id, school_name_ar');
  if (schoolErr) {
    console.error('Error fetching schools:', schoolErr.message);
    return;
  }
  
  const schoolMap = new Map();
  schools.forEach(s => {
    // Normalize string for fuzzy matching (remove extra spaces, 'مدرسة', etc)
    const normalized = s.school_name_ar.replace(/مدرسة|الشهيد|ابتدائى|ابتدائية|الاعدادية/g, '').trim();
    schoolMap.set(normalized, s.id);
    schoolMap.set(s.school_name_ar.trim(), s.id);
  });

  const staffToInsert = [];
  let skipped = 0;

  console.log('Mapping data...');
  for (const row of data) {
    const rawSchoolName = String(row.EDA || '').trim();
    const cleanSchoolName = rawSchoolName.replace(/مدرسة|ابتدائى|ابتدائية/g, '').trim();
    
    // Attempt exact or normalized match
    let schoolId = schoolMap.get(rawSchoolName) || schoolMap.get(cleanSchoolName);
    
    if (!schoolId) {
      // Fallback to fuzzy match (first school that contains the clean name)
      for (const [key, id] of schoolMap.entries()) {
        if (key.includes(cleanSchoolName) || cleanSchoolName.includes(key)) {
          schoolId = id;
          break;
        }
      }
    }

    if (!schoolId) {
      console.warn(`[SKIP] Could not find school matching: ${rawSchoolName}`);
      skipped++;
      continue;
    }

    const job_category = determineJobCategory(row.MAGMAA, row.WAZEFA);
    
    let nat_id = String(row.M_S || '').trim();
    if (nat_id.length > 14) nat_id = nat_id.slice(0, 14);
    if (nat_id.length < 14) nat_id = nat_id.padStart(14, '0');
    
    staffToInsert.push({
      school_id: schoolId,
      job_category: job_category,
      teacher_code: row.COD_EMP ? String(row.COD_EMP) : null,
      national_id: nat_id,
      full_name_ar: String(row.NAME_EMP || '').trim(),
      phone: row.MOB ? String(row.MOB) : null,
      qualification: row.A_MOAHEL ? String(row.A_MOAHEL) : null,
      subject_taught: job_category === 'معلم' ? sanitizeSubject(row.MADA) : null,
      school_role: job_category === 'إداري' ? row.WAZEFA : null,
      worker_type: job_category === 'عامل' ? row.WAZEFA : null,
      cadre_position: row.WAZEFA ? String(row.WAZEFA).trim() : null,
      hire_date: excelDateToJSDate(row.TAREKH_TAYEEN),
      work_status: 'على رأس العمل' // Assume working
    });
  }

  console.log(`Mapped ${staffToInsert.length} records successfully. Skipped ${skipped} due to missing schools.`);

  if (staffToInsert.length === 0) {
    console.log('No data to insert.');
    return;
  }

  console.log('Starting bulk insertion in chunks of 500...');
  const CHUNK_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < staffToInsert.length; i += CHUNK_SIZE) {
    const chunk = staffToInsert.slice(i, i + CHUNK_SIZE);
    
    const { error } = await supabase
      .from('school_staff')
      .upsert(chunk, { onConflict: 'national_id', ignoreDuplicates: false }); // Update if national_id exists
      
    if (error) {
      console.error(`Error inserting chunk ${i} to ${i + CHUNK_SIZE}:`, error.message);
    } else {
      inserted += chunk.length;
      console.log(`Inserted ${inserted}/${staffToInsert.length} records...`);
    }
  }

  console.log('Data upload complete! 🎉');
}

main().catch(console.error);
