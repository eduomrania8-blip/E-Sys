import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';
try { envContent = fs.readFileSync(envPath, 'utf8'); } catch (e) { console.error('No .env.local'); }
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.includes('#')) value = value.split('#')[0];
    value = value.trim();
    if (value.startsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  // 1. الكادرات الموجودة في القاعدة
  const { data: staffData } = await supabase.from('school_staff').select('cadre_position, job_category, work_status').limit(2000);
  const cadreCounts: Record<string, number> = {};
  const workStatusSet = new Set<string>();
  staffData?.forEach(s => {
    const c = s.cadre_position || 'NULL';
    cadreCounts[c] = (cadreCounts[c] || 0) + 1;
    if (s.work_status) workStatusSet.add(s.work_status);
  });
  
  console.log('=== CADRE POSITIONS IN DB ===');
  Object.entries(cadreCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  "${k}": ${v}`));
  
  console.log('\n=== WORK STATUS VALUES IN DB ===');
  console.log([...workStatusSet].join(', '));

  // 2. grade_levels في إحصائيات الفصول
  const { data: statsData } = await supabase.from('class_statistics').select('grade_level, number_of_classes').limit(500);
  const gradeCounts: Record<string, number> = {};
  statsData?.forEach(s => {
    const g = s.grade_level || 'NULL';
    gradeCounts[g] = (gradeCounts[g] || 0) + 1;
  });
  
  console.log('\n=== GRADE LEVELS IN class_statistics ===');
  Object.entries(gradeCounts).sort().forEach(([k,v]) => console.log(`  "${k}": ${v} records`));

  // 3. subject_taught المتبقية
  const { data: subjects } = await supabase.from('school_staff').select('subject_taught').eq('job_category', 'معلم').neq('subject_taught', null).limit(2000);
  const subjectCounts: Record<string, number> = {};
  subjects?.forEach(s => {
    const sub = s.subject_taught || 'NULL';
    subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;
  });
  
  console.log('\n=== SUBJECT VALUES IN DB (for teachers only) ===');
  Object.entries(subjectCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  "${k}": ${v}`));
}

main().catch(console.error);
