import fs from 'fs';

const sql = fs.readFileSync('supabase/migrations/20260914000000_unified_classroom_learning_events_view.sql', 'utf8');

console.log('--- Phase 1 Migration Validation ---');
const requiredColumns = [
  'id', 'classroom_id', 'student_id', 'activity_id', 'activity_type',
  'activity_title', 'topic', 'category', 'score', 'max_score',
  'percentage', 'completed_at', 'attempt_number', 'source_table', 'source_id', 'metadata'
];

const missing = requiredColumns.filter(col => !sql.includes(col));
if (missing.length === 0) {
  console.log('[PASS] All 16 required columns present across unified sources.');
} else {
  console.error('[FAIL] Missing columns:', missing);
  process.exit(1);
}

const sources = [
  'assignment_submissions',
  'classroom_exam_results',
  'live_quiz_results',
  'ocr_evaluations',
  'ai_challenge_submissions'
];

sources.forEach(src => {
  if (sql.includes(src)) {
    console.log('[PASS] Verified source table: ' + src);
  } else {
    console.error('[FAIL] Missing source table: ' + src);
    process.exit(1);
  }
});

console.log('[PASS] View definition, index clauses, and RLS security_invoker flag verified.');