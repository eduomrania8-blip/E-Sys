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

async function fixAdmins() {
  const emptyAdminId = '33b4699f-0eea-4e2e-b89b-909900850f48'; // ADM001
  const { error } = await supabase
    .from('educational_administrations')
    .delete()
    .eq('id', emptyAdminId);
  
  if (error) {
    console.error('Error deleting admin:', error);
  } else {
    console.log('Deleted empty administration ADM001.');
  }
}
fixAdmins();
