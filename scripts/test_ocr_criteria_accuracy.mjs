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

  // Check OCR breakdown_json in the raw ocr_evaluations table
  const { data: ocrRecords } = await supabase
    .from('ocr_evaluations')
    .select('id, student_id, title, category, breakdown_json, score, max_marks, percentage')
    .eq('class_id', classroomId);

  console.log('OCR records count:', ocrRecords?.length);
  const criterionScores = new Map();
  for (const r of ocrRecords || []) {
    const list = Array.isArray(r.breakdown_json) ? r.breakdown_json : [];
    for (const c of list) {
      if (!c.criterion || !c.max) continue;
      const key = c.criterion.trim();
      if (!criterionScores.has(key)) {
        criterionScores.set(key, { totalScore: 0, totalMax: 0, studentMap: new Map() });
      }
      const item = criterionScores.get(key);
      item.totalScore += Number(c.score);
      item.totalMax += Number(c.max);
      item.studentMap.set(r.student_id, (item.studentMap.get(r.student_id) || 0) + (c.score / c.max));
    }
  }

  console.log('\n--- OCR CRITERIA ACCURACY ---');
  for (const [crit, data] of criterionScores.entries()) {
    const acc = Math.round((data.totalScore / data.totalMax) * 100);
    console.log(`Criterion: "${crit}" -> Accuracy: ${acc}% (Attempts: ${data.totalMax > 0 ? 'yes' : 'no'}, Unique Students: ${data.studentMap.size})`);
  }
}

main().catch(console.error);
