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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function importSchools() {
  const wb = XLSX.readFile('d:/E-system/كشف الضعاف مدرسة.xlsx');
  const ws = wb.Sheets['قائمة المدارس'];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const records = [];
  
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row[0] || !row[1]) continue;
    
    let st = String(row[2]).trim();
    if (st.includes('رسمي') && !st.includes('لغات')) st = 'رسمية';
    if (st.includes('رسمي') && st.includes('لغات')) st = 'رسمية لغات';
    if (st.includes('خاص') && !st.includes('لغات')) st = 'خاصة';
    if (st.includes('خاص') && st.includes('لغات')) st = 'خاصة لغات';
    if (st.includes('دولي')) st = 'دولية';
    if (st.includes('تربية')) st = 'تربية خاصة';
    if (!st || st === 'رسمي') st = 'رسمية';

    records.push({
      school_code: String(row[0]).trim(),
      school_name_ar: String(row[1]).trim(),
      school_type: st,
      is_active: true
    });
  }
  
  console.log('Found ' + records.length + ' schools to insert.');
  
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase.from('schools').upsert(batch, { onConflict: 'school_code' });
    if (error) {
      console.error('Error inserting batch: ', error);
    } else {
      console.log('Inserted batch ' + Math.ceil((i+1)/50) + '/' + Math.ceil(records.length/50));
    }
  }
}
importSchools();
