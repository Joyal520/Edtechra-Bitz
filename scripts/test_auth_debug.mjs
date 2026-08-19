import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  console.log('--- Testing Supabase Server Auth ---');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key exists:', !!anonKey, anonKey?.slice(0, 15) + '...');
  console.log('Service Key exists:', !!serviceKey, serviceKey?.slice(0, 15) + '...');

  const clientAnon = createClient(supabaseUrl, anonKey);
  const clientService = createClient(supabaseUrl, serviceKey);

  // 1. Create / login a test user
  const email = `test_upload_student_${Date.now()}@edtechra.com`;
  const password = 'Password123!@#';

  console.log('\nCreating test user:', email);
  const { data: newUser, error: createErr } = await clientService.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test Student' }
  });

  if (createErr) {
    console.error('Failed to create user:', createErr);
    process.exit(1);
  }
  console.log('User created. ID:', newUser.user.id);

  // 2. Sign in as the user using anon client (as the browser does)
  console.log('\nSigning in as user with anon client...');
  const { data: signinData, error: signinErr } = await clientAnon.auth.signInWithPassword({
    email,
    password
  });

  if (signinErr) {
    console.error('Sign in failed:', signinErr);
    process.exit(1);
  }

  const token = signinData.session.access_token;
  console.log('Token acquired (len:', token.length, ')');

  // 3. Test verifying token with clientService.auth.getUser(token)
  console.log('\nTesting server validation: clientService.auth.getUser(token)...');
  const { data: userData, error: userErr } = await clientService.auth.getUser(token);
  if (userErr) {
    console.error('clientService.auth.getUser FAILED:', userErr);
  } else {
    console.log('clientService.auth.getUser SUCCESS! User ID:', userData.user.id, userData.user.email);
  }

  // 4. Test verifying token with clientAnon.auth.getUser(token)
  console.log('\nTesting server validation: clientAnon.auth.getUser(token)...');
  const { data: anonUserData, error: anonUserErr } = await clientAnon.auth.getUser(token);
  if (anonUserErr) {
    console.error('clientAnon.auth.getUser FAILED:', anonUserErr);
  } else {
    console.log('clientAnon.auth.getUser SUCCESS! User ID:', anonUserData.user.id, anonUserData.user.email);
  }

  // Cleanup test user
  await clientService.auth.admin.deleteUser(newUser.user.id);
  console.log('\nCleaned up test user.');
  console.log('--- Auth Test Complete ---');
}

run().catch(console.error);
