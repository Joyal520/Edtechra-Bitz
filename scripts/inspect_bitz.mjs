import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to:', SUPABASE_URL);
console.log('Key available:', Boolean(SUPABASE_KEY));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, count, error } = await supabase
    .from('knowledge_bitz')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Supabase query error:', error);
    return;
  }

  console.log(`Total rows in Supabase: ${count}`);
  data.forEach((r, i) => {
    console.log(`[${i+1}] ID=${r.id} | Code=${r.bitz_code} | Status=${r.status} | VisualStatus=${r.visual_status} | Source=${r.image_source} | Title="${r.title}" | Img=${r.visual_url}`);
  });
}

main().catch(console.error);
