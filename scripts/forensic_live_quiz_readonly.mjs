// ============================================================================
// READ-ONLY FORENSIC AUDIT of the live Live Quiz data (no writes, no secrets printed)
// Usage: node scripts/forensic_live_quiz_readonly.mjs
// ============================================================================
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...process.env };
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase URL / service role key'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

async function all(table, select = '*', build = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(db.from(table).select(select)).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const sessions = await all('live_quiz_sessions', '*', (q) => q.order('created_at', { ascending: false }));
const participants = await all('live_quiz_participants');
const answers = await all('live_quiz_answers');
const questions = await all('live_quiz_questions');

console.log('=== TABLE SIZES ===');
console.log({ sessions: sessions.length, participants: participants.length, answers: answers.length, questions: questions.length });
console.log('session columns:', Object.keys(sessions[0] || {}).join(', '));
console.log('answer columns :', Object.keys(answers[0] || {}).join(', '));

console.log('\n=== SESSION STATUS DISTRIBUTION ===');
const byStatus = {};
sessions.forEach((s) => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
console.log(byStatus);

console.log('\n=== MULTIPLE ACTIVE SESSIONS PER CLASSROOM ===');
const active = sessions.filter((s) => ['scheduled', 'lobby', 'in_progress', 'reveal'].includes(s.status));
const perClass = {};
active.forEach((s) => { (perClass[s.classroom_id] ||= []).push(s.id); });
console.log(Object.entries(perClass).filter(([, v]) => v.length > 1).map(([c, v]) => ({ classroom: c, activeSessions: v.length })));

// ---- GRADING FORENSICS ------------------------------------------------------
const qByKey = new Map(questions.map((q) => [`${q.quiz_id}:${q.question_index}`, q]));
const sessById = new Map(sessions.map((s) => [s.id, s]));
let graded = 0, misgraded = [], ungradedFallback = [], missingQuestion = 0;
for (const a of answers) {
  const s = sessById.get(a.session_id);
  const q = s && qByKey.get(`${s.quiz_id}:${a.question_index}`);
  if (!q) { missingQuestion++; continue; }
  graded++;
  const shouldBeCorrect = Number(q.correct_index) === Number(a.selected_option_index);
  if (shouldBeCorrect !== Boolean(a.is_correct)) {
    misgraded.push({
      session: a.session_id.slice(0, 8), q: a.question_index, selected: a.selected_option_index,
      correct_index: q.correct_index, stored_is_correct: a.is_correct, points: a.points_awarded,
      submitted_at: a.submitted_at
    });
  }
}
console.log('\n=== GRADING CONSISTENCY (stored is_correct vs selected==correct_index) ===');
console.log({ answersChecked: graded, answersWithoutQuestionRow: missingQuestion, MISGRADED: misgraded.length });
console.log('sample misgraded:', misgraded.slice(0, 15));

// ---- POINT DISTRIBUTION (tells which RPC version actually produced the rows) --
const ptsHist = {};
answers.filter((a) => a.is_correct).forEach((a) => { ptsHist[a.points_awarded] = (ptsHist[a.points_awarded] || 0) + 1; });
console.log('\n=== points_awarded histogram for correct answers ===');
console.log(ptsHist);

// ---- ALL-ANSWERED vs PARTICIPANTS per question -------------------------------
console.log('\n=== LAST 8 SESSIONS: participants vs answers per question + index/time state ===');
for (const s of sessions.slice(0, 8)) {
  const parts = participants.filter((p) => p.session_id === s.id && p.student_id !== s.teacher_id);
  const ans = answers.filter((a) => a.session_id === s.id);
  const perQ = {};
  ans.forEach((a) => { perQ[a.question_index] = (perQ[a.question_index] || 0) + 1; });
  console.log({
    id: s.id.slice(0, 8), status: s.status, idx: s.current_question_index, created: s.created_at,
    started_at: s.started_at, ended_at: s.ended_at, expires_at: s.expires_at,
    question_start_ms: s.question_start_ms, dur: s.question_duration_sec,
    participants: parts.length, hostIsParticipant: participants.some((p) => p.session_id === s.id && p.student_id === s.teacher_id),
    answersPerQuestion: perQ
  });
}

// ---- DUPLICATE PARTICIPANTS ---------------------------------------------------
const seen = new Map(); let dupParts = 0;
participants.forEach((p) => { const k = `${p.session_id}:${p.student_id}`; if (seen.has(k)) dupParts++; seen.set(k, 1); });
console.log('\n=== duplicate participant rows ===', dupParts);

// ---- answers submitted AFTER session moved past that question ----------------
const lateOrStale = answers.filter((a) => {
  const s = sessById.get(a.session_id);
  return s && ['finished', 'cancelled'].includes(s.status) === false && a.question_index > s.current_question_index;
});
console.log('answers for a question index AHEAD of the session index (index was rolled back):', lateOrStale.length);
console.log(lateOrStale.slice(0, 10).map((a) => ({ session: a.session_id.slice(0, 8), q: a.question_index, sessionIdx: sessById.get(a.session_id).current_question_index })));
