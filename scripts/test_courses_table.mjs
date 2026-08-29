import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Service Client...');
const supabase = createClient(url, serviceKey);

async function check() {
  const { data, error } = await supabase.from('courses').select('id').limit(1);
  console.log('Courses table test:', data, error);
}
check();
