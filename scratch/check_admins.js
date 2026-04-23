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

async function checkAdmins() {
  const { data, error } = await supabase.from('educational_administrations').select('*');
  console.log('Admins count:', data ? data.length : 0);
  console.log('Admins:', data);
  
  const { data: summary, error: sError } = await supabase.from('administration_summary').select('*');
  console.log('Admin Summary count:', summary ? summary.length : 0);
  console.log('Admin Summary:', summary);
}
checkAdmins();
