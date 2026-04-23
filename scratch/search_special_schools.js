const XLSX = require('xlsx');
const fs = require('fs');
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

async function searchSpecificSchools() {
  const filePath = 'd:/E-system/البيانات_الرئيسية.xlsx';
  const wb = XLSX.readFile(filePath);
  const targets = ['بالية', 'كونسير', 'باليه'];
  
  console.log('--- Searching in Excel ---');
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);
    rows.forEach((row, i) => {
      const name = String(row['اسم_المدرسة'] || '');
      if (targets.some(t => name.includes(t))) {
        console.log(`Excel: Found "${name}" in ${sheetName} row ${i}`);
      }
    });
  });

  console.log('\n--- Searching in DB ---');
  const { data: dbSchools } = await supabase.from('schools').select('school_name_ar, school_code, school_type');
  dbSchools.forEach(s => {
    if (targets.some(t => s.school_name_ar.includes(t))) {
      console.log(`DB: Found "${s.school_name_ar}" (${s.school_code}) - Type: ${s.school_type}`);
    }
  });
}

searchSpecificSchools();
