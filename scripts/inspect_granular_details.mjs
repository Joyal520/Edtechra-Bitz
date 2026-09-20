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

  const exams = events.filter(e => e.activity_type === 'exam');
  console.log('--- EXAMS ---');
  for (const e of exams) {
    console.log(e.activity_title, e.topic, e.score, e.percentage, e.completed_at);
  }

  // Check OCR evaluations table details
  const { data: ocrs } = await supabase
    .from('ocr_evaluations')
    .select('id, title, category, score, percentage, breakdown_json, feedback')
    .eq('class_id', classroomId);
  console.log('\n--- OCR EVALUATIONS ---');
  for (const o of ocrs || []) {
    console.log(`Title: "${o.title}", Category: "${o.category}", Score: ${o.score}, %: ${o.percentage}, Breakdown:`, JSON.stringify(o.breakdown_json));
  }

  // Check Live Quizzes
  const { data: quizzes } = await supabase
    .from('live_quizzes')
    .select('id, title, category, questions')
    .eq('classroom_id', classroomId);
  console.log('\n--- LIVE QUIZZES ---');
  for (const q of quizzes || []) {
    console.log(`Title: "${q.title}", Category: "${q.category}", Questions:`, JSON.stringify(q.questions)?.slice(0, 300));
  }

  // Check classroom_exams
  const { data: cExams } = await supabase
    .from('classroom_exams')
    .select('id, title, questions')
    .eq('classroom_id', classroomId);
  console.log('\n--- CLASSROOM EXAMS ---');
  for (const ce of cExams || []) {
    console.log(`Title: "${ce.title}", Questions:`, JSON.stringify(ce.questions)?.slice(0, 300));
  }
}

main().catch(console.error);
