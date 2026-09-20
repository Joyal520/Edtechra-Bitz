import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function main() {
  const { data: quizzes } = await supabase
    .from('live_quizzes')
    .select('*');
  for (const q of quizzes || []) {
    console.log(`Quiz: "${q.title}" | Category: "${q.category}" | Questions count: ${q.questions?.length}`);
    if (q.questions && q.questions.length > 0) {
      console.log(' Sample Q:', q.questions[0]);
    }
  }
}

main().catch(console.error);
