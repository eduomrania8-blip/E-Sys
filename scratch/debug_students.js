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

async function debugStudents() {
  // 1. Get total sum of students
  const { data: stats, error } = await supabase
    .from('class_statistics')
    .select('boys_count, girls_count, school_id, grade_level');
  
  let total = 0;
  stats.forEach(s => {
    total += (s.boys_count || 0) + (s.girls_count || 0);
  });
  console.log('Calculated Total Students in class_statistics:', total);

  // 2. Find schools with suspicious counts
  const { data: schoolSummary } = await supabase
    .from('school_summary')
    .select('school_name_ar, total_students, school_code')
    .order('total_students', { ascending: false })
    .limit(10);
  
  console.log('\nTop 10 schools by student count:');
  schoolSummary.forEach(s => {
    console.log(`${s.school_name_ar} (${s.school_code}): ${s.total_students}`);
  });

  // 3. Check for the 111th school
  const { data: allSchools } = await supabase.from('schools').select('school_name_ar, school_code');
  console.log('\nTotal schools count:', allSchools.length);
}
debugStudents();
