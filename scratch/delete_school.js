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

async function deleteExtraSchool() {
  const targetCode = '21018398';
  const { data, error } = await supabase
    .from('schools')
    .delete()
    .eq('school_code', targetCode)
    .select();
  
  if (error) {
    console.error('Error deleting school:', error);
  } else if (data.length === 0) {
    console.log('School not found.');
  } else {
    console.log('Deleted school:', data[0].school_name_ar);
  }
}
deleteExtraSchool();
