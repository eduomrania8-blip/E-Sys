import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

console.log('Starting script...');
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
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching data from school_staff...');
  // Only select where job_category is معلم
  const { data, error } = await supabase.from('school_staff').select('id, subject_taught').eq('job_category', 'معلم').neq('subject_taught', null);
  
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(`Fetched ${data.length} records. Processing...`);

  const updates: any[] = [];

  for (const row of data) {
    const original = row.subject_taught;
    if (!original) continue;
    let normalized = original.trim();
    
    let searchStr = normalized.replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').replace(/ي/g, 'ى').replace(/^ال/, '').replace(/\sال/g, ' ');
    
    let newSubject = original;

    if (searchStr.includes('عربى')) newSubject = 'اللغة العربية';
    else if (searchStr.includes('انجليزى') || searchStr.includes('لغه اجنبيه')) newSubject = 'اللغة الإنجليزية';
    else if (searchStr.includes('رياضيات') || searchStr.includes('حساب')) newSubject = 'رياضيات';
    else if (searchStr.includes('علوم')) newSubject = 'علوم';
    else if (searchStr.includes('دراسات')) newSubject = 'دراسات اجتماعية';
    else if (searchStr.includes('حاسب') || searchStr.includes('تكنولوجيا')) newSubject = 'حاسب آلي';
    else if (searchStr.includes('فنيه')) newSubject = 'تربية فنية';
    else if (searchStr.includes('رياضيه') || searchStr.includes('بدنيه') || searchStr.includes('العاب')) newSubject = 'تربية رياضية';
    else if (searchStr.includes('موسيقيه')) newSubject = 'تربية موسيقية';
    else if (searchStr.includes('دينيه اسلاميه') || searchStr.includes('دين اسلامى') || searchStr === 'دينيه') newSubject = 'تربية دينية إسلامية';
    else if (searchStr.includes('دينيه مسيحيه') || searchStr.includes('دين مسيحى')) newSubject = 'تربية دينية مسيحية';
    else if (searchStr.includes('دينيه') || searchStr.includes('دين')) newSubject = 'تربية دينية';
    else if (searchStr.includes('اكتشف') || searchStr.includes('متعدد')) newSubject = 'متعدد التخصصات (اكتشف)';
    else if (searchStr.includes('مهارات') || searchStr.includes('مهنيه') || searchStr.includes('اقتصاد منزلى')) newSubject = 'مهارات مهنية';

    if (newSubject !== original) {
      updates.push({ id: row.id, newSubject });
    }
  }

  console.log(`Found ${updates.length} records that need standardization.`);
  
  let i = 0;
  for (const update of updates) {
    const { error } = await supabase.from('school_staff').update({ subject_taught: update.newSubject }).eq('id', update.id);
    if (error) console.error(`Error updating id ${update.id}:`, error);
    i++;
    if (i % 10 === 0) console.log(`Updated ${i}/${updates.length}`);
  }

  console.log('Database standardization complete!');
}

main().catch(console.error);
