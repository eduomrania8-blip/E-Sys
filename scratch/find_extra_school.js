const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function findExtraSchool() {
  // Get schools from Excel
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  const excelCodes = new Set();
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach(row => {
      const code = String(row['كود_المدرسة']).trim();
      if (code && code !== 'undefined') excelCodes.add(code);
    });
  });

  // Get schools from DB
  const { data: dbSchools } = await supabase.from('schools').select('school_name_ar, school_code');
  
  console.log('Extra schools in DB:');
  dbSchools.forEach(s => {
    if (!excelCodes.has(s.school_code)) {
      console.log(`- ${s.school_name_ar} (${s.school_code})`);
    }
  });
}
findExtraSchool();
