/**
 * CAMPUSBITE — INITIAL ADMIN SETUP SCRIPT
 * Run this script to create the initial Administrator account in Supabase.
 * Usage:
 *   node scripts/create-admin.mjs admin@college.edu MySecurePassword123 "Event Lead"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load .env.local or .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env.local before running this script.');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args[0] || 'admin@campusbite.com';
const password = args[1] || 'Admin123456';
const fullName = args[2] || 'Campus Event Director';

async function setupAdmin() {
  console.log(`\n\x1b[36mCreating CampusBite Administrator...\x1b[0m`);
  console.log(`Email: ${email}`);
  console.log(`Full Name: ${fullName}\n`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create or fetch user in auth.users
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'admin' },
  });

  let userId = authData?.user?.id;

  if (authErr) {
    if (authErr.message.includes('already registered')) {
      console.log('User already exists in Supabase Auth. Upgrading role in profiles table...');
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const matched = existingUsers?.users?.find((u) => u.email === email);
      if (matched) {
        userId = matched.id;
      }
    } else {
      console.error('\x1b[31mFailed to create auth user:\x1b[0m', authErr.message);
      process.exit(1);
    }
  }

  if (!userId) {
    console.error('\x1b[31mUnable to determine user ID.\x1b[0m');
    process.exit(1);
  }

  // 2. Upsert profile with role 'admin'
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      role: 'admin',
      full_name: fullName,
      email,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (profileErr) {
    console.error('\x1b[31mFailed to upsert profile record:\x1b[0m', profileErr.message);
    process.exit(1);
  }

  console.log('\x1b[32m%s\x1b[0m', ' SUCCESS! Administrator account is ready:');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     admin`);
  console.log('\nYou can now log in at http://localhost:3000/login\n');
}

setupAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
