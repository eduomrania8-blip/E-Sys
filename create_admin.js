const fs = require('fs');
const envConfig = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
     const cleanValue = value.split('#')[0].trim();
     acc[key.trim()] = cleanValue;
  }
  return acc;
}, {});
process.env = { ...process.env, ...envConfig };
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
  const email = 'admin@system.com';
  const password = 'password123';

  console.log(`Creating Admin User: ${email}...`);

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin' }
  });

  if (authErr) {
    if (authErr.message.includes('already registered')) {
        console.log('User already exists. Attempting to set permissions...');
        // Let's try to find the user first to set permissions
        const { data: listData } = await supabase.auth.admin.listUsers();
        const user = listData.users.find(u => u.email === email);
        if(user) {
            await setPermission(user.id);
        }
        return;
    }
    console.error('Error creating user:', authErr.message);
    return;
  }

  console.log('User created successfully. ID:', authData.user.id);
  await setPermission(authData.user.id);
}

async function setPermission(userId) {
  console.log('Setting Super Admin permissions...');
  // Check if permission already exists
  const { data: existing } = await supabase
    .from('user_school_permissions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
     if (existing.permission_level === 'admin' && existing.school_id === null) {
         console.log('Permission already correct.');
         return;
     } else {
         console.log('Updating existing permission to Super Admin...');
         await supabase.from('user_school_permissions').update({ school_id: null, permission_level: 'admin' }).eq('id', existing.id);
         console.log('Updated successfully!');
         return;
     }
  }

  const { error: permErr } = await supabase
    .from('user_school_permissions')
    .insert({
      user_id: userId,
      permission_level: 'admin',
      school_id: null // school_id IS NULL means Super Admin
    });

  if (permErr) {
    console.error('Error setting permissions:', permErr.message);
    return;
  }

  console.log('Super Admin permissions set successfully!');
  console.log('--- DONE ---');
  console.log('Email:', 'admin@system.com');
  console.log('Password:', 'password123');
}

createAdmin();
