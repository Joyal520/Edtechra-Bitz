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

async function inspect() {
  console.log('--- Classrooms ---');
  const { data: classrooms, error: cErr } = await supabase.from('classrooms').select('*');
  console.log(classrooms, cErr);

  console.log('--- Classroom Members ---');
  const { data: members, error: mErr } = await supabase.from('classroom_members').select('*');
  console.log(members, mErr);

  console.log('--- Profiles ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, email, role');
  console.log(profiles, pErr);

  console.log('--- Unified Learning Events ---');
  const { data: events, error: eErr } = await supabase.from('v_classroom_learning_events').select('*');
  console.log('Total events:', events?.length, eErr);
  if (events) {
    events.forEach(e => {
      console.log(`[EVENT] id=${e.id} class=${e.classroom_id} student=${e.student_id} type=${e.activity_type} title="${e.activity_title}" topic="${e.topic}" category="${e.category}" score=${e.score}/${e.max_score} (${e.percentage}%) date=${e.completed_at}`);
    });
  }
}
inspect();
