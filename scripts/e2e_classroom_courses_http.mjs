// End-to-end HTTP test of GET /api/classes/:classroomId/courses using REAL user sessions
// (magic-link token minted via admin API; no email is sent). Read-only against course data.
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
const c = v => (v || '').replace(/^\uFEFF/, '').trim();
const URL_ = c(process.env.VITE_SUPABASE_URL);
const admin = createClient(URL_, c(process.env.SUPABASE_SERVICE_ROLE_KEY));
const anonKey = c(process.env.VITE_SUPABASE_ANON_KEY);
const BASE = process.env.API_BASE || 'http://localhost:3005';

async function tokenFor(profileId) {
  const { data: u } = await admin.auth.admin.getUserById(profileId);
  const email = u?.user?.email;
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const anon = createClient(URL_, anonKey, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (e2) throw e2;
  return { token: s.session.access_token, email };
}

async function studentOf(classroomId) {
  const { data } = await admin.from('classroom_members').select('profile_id')
    .eq('classroom_id', classroomId).eq('role', 'student').eq('status', 'active').limit(1);
  return data?.[0]?.profile_id;
}

const { data: assigns } = await admin.from('course_classroom_assignments').select('classroom_id, status, course_id');
const { data: classes } = await admin.from('classrooms').select('id, title, teacher_id');
const titles = Object.fromEntries(classes.map(x => [x.id, x.title]));
const classIds = [...new Set(assigns.map(a => a.classroom_id))];
let fail = 0;
for (const cid of classIds) {
  const expectActive = assigns.filter(a => a.classroom_id === cid && a.status === 'active').length;
  const sid = await studentOf(cid);
  if (!sid) { console.log(`- ${titles[cid]}: no active student, skipped`); continue; }
  const { token, email } = await tokenFor(sid);
  const r = await fetch(`${BASE}/api/classes/${cid}/courses`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  const got = (j.courses || []).length;
  const ok = r.status === 200 && j.success && got === expectActive;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${titles[cid]} as student ${email}: HTTP ${r.status}, courses=${got}, expected=${expectActive}${j.error ? ' err=' + j.error : ''}`);
  for (const x of j.courses || []) console.log(`     -> ${x.course?.title} [${x.course?.status}] lessons=${x.course?.episodes_count}`);
}
// Teacher view
const t = classes.find(x => x.id === 'd93dca67-a1f3-495a-8373-525a68874581');
const { token: tt } = await tokenFor(t.teacher_id);
const tr = await fetch(`${BASE}/api/classes/${t.id}/courses`, { headers: { Authorization: `Bearer ${tt}` } });
const tj = await tr.json();
console.log(`${tr.status === 200 ? 'PASS' : 'FAIL'} Teacher view of ${t.title}: HTTP ${tr.status}, courses=${(tj.courses || []).length}`);
if (tr.status !== 200) fail++;
process.exit(fail ? 1 : 0);
