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

const classroomId = '7c896a5c-6e95-46f0-98d1-3f0d5598d156';

async function main() {
  const { data: events } = await supabase
    .from('v_classroom_learning_events')
    .select('*')
    .eq('classroom_id', classroomId);

  console.log('Total events:', events?.length);
  const byType = {};
  for (const ev of events || []) {
    byType[ev.activity_type] = (byType[ev.activity_type] || 0) + 1;
    console.log(`Type: ${ev.activity_type} | Activity: "${ev.activity_title}" | Topic: "${ev.topic}" | Score: ${ev.score}/${ev.max_score} (${ev.percentage}%) | Date: ${ev.completed_at} | Meta:`, JSON.stringify(ev.metadata));
  }
  console.log('Breakdown by type:', byType);
}

main().catch(console.error);
