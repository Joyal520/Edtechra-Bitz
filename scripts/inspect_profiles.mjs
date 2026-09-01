import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .limit(20);

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Found profiles in Supabase:');
  console.table(data);
}

main().catch(console.error);
