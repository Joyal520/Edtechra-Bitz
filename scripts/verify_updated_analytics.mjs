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

import { computeClassroomAnalytics } from '../server/classroomAnalyticsService.mjs';

const classroomId = '7c896a5c-6e95-46f0-98d1-3f0d5598d156';

async function main() {
  const analytics = await computeClassroomAnalytics(supabase, classroomId);
  console.log('--- PERFORMANCE OVER TIME ---');
  console.log('Points count:', analytics.performanceOverTime.length);
  analytics.performanceOverTime.forEach(p => {
    console.log(`  Date: ${p.date} (${p.isoDate}) -> ${p.value}% (Events: ${p.eventCount}, Sources: ${p.sources.join(', ')})`);
  });

  console.log('\n--- TOPICS (Meaningful) ---');
  analytics.topics.forEach(t => {
    console.log(`  Topic: "${t.displayName || t.topic}" -> ${t.averagePercentage}% (Events: ${t.eventCount}, Affected: ${t.affectedStudentsCount}, Sources: ${t.sourcesList?.join(', ')})`);
  });

  console.log('\n--- LEARNING GAP PRIORITY ---');
  analytics.learningGapPriority.forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.displayName || g.topic}`);
    console.log(`     Accuracy: ${g.averageAccuracy}%`);
    console.log(`     Affected: ${g.studentsAffected} of ${g.studentsTotal} students`);
    console.log(`     Confidence: ${g.confidence_label}`);
    console.log(`     Sources: ${g.sourcesList?.join(' • ')}`);
    console.log(`     Evidence details:`, JSON.stringify(g.evidence));
  });

  console.log('\n--- TOP STRENGTHS ---');
  analytics.topStrengths.forEach(s => {
    console.log(`  Strength: "${s.topic}" -> ${s.averageScore}%`);
  });

  console.log('\n--- RECOMMENDED TEACHING FOCUS ---');
  console.log(analytics.recommendedTeachingFocus);
}

main().catch(console.error);
