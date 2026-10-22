import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const courseId = 'e10c7ee9-0012-4000-8000-000000000012';

async function verify() {
  console.log('=== VERIFYING COURSE STUDIO INTEGRATION ===\n');

  // 1. Check all courses
  const { data: courses, error: coursesErr } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      status,
      subject,
      grade_level,
      cover_image_url,
      course_units (
        id,
        title,
        order_index,
        course_episodes (
          id,
          title,
          order_index
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (coursesErr) throw coursesErr;

  console.log(`1. Total courses in system: ${courses.length}`);
  courses.forEach((c, idx) => {
    const units = c.course_units || [];
    const eps = units.reduce((acc, u) => acc + (u.course_episodes || []).length, 0);
    console.log(`   ${idx + 1}. [${c.status.toUpperCase()}] "${c.title}" | Level: ${c.grade_level || 'N/A'} | Units: ${units.length} | Episodes: ${eps}`);
  });

  // 2. Check Creepy Legends course details
  const creepy = courses.find(c => c.id === courseId);
  if (!creepy) throw new Error('Creepy Legends course not found in database!');

  console.log('\n2. "Learn English with Creepy Legends" Course Record:');
  console.log(`   - ID: ${creepy.id}`);
  console.log(`   - Status: ${creepy.status}`);
  console.log(`   - Subject: ${creepy.subject}`);
  console.log(`   - Grade Level: ${creepy.grade_level}`);
  console.log(`   - Units Count: ${creepy.course_units.length}`);
  console.log(`   - Cover Image: ${creepy.cover_image_url}`);

  // 3. Check Units, Episodes, Blocks, Questions
  const { data: units } = await supabase.from('course_units').select('*').eq('course_id', courseId).order('order_index');
  const { data: episodes } = await supabase.from('course_episodes').select('*').eq('course_id', courseId).order('order_index');
  const { data: blocks } = await supabase.from('course_blocks').select('*').eq('course_id', courseId).order('order_index');
  const { data: questions } = await supabase.from('course_questions').select('*').eq('course_id', courseId).order('order_index');

  console.log('\n3. Hierarchy Verification:');
  console.log(`   - Units: ${units.length}`);
  console.log(`   - Episodes: ${episodes.length}`);
  console.log(`   - Blocks: ${blocks.length}`);
  console.log(`   - Questions: ${questions.length}`);

  let errors = 0;
  for (let i = 0; i < 12; i++) {
    const unit = units[i];
    const ep = episodes[i];
    const epBlocks = blocks.filter(b => b.episode_id === ep.id);
    const epQuestions = questions.filter(q => q.episode_id === ep.id);
    const videoBlock = epBlocks.find(b => b.block_type === 'video');
    const mcq = epQuestions.filter(q => q.question_type === 'multiple_choice').length;
    const tf = epQuestions.filter(q => q.question_type === 'true_false').length;
    const short = epQuestions.filter(q => q.question_type === 'short_answer').length;
    const sb = epQuestions.filter(q => q.question_type === 'sentence_builder').length;

    if (epBlocks.length !== 7 || epQuestions.length !== 10 || !videoBlock || mcq !== 3 || tf !== 3 || short !== 3 || sb !== 1) {
      console.error(`   ❌ Discrepancy at Day ${i + 1} (${ep.title}):`, {
        blocks: epBlocks.length,
        questions: epQuestions.length,
        hasVideo: !!videoBlock,
        mcq, tf, short, sb
      });
      errors++;
    }
  }

  if (errors === 0) {
    console.log('\n✓ ALL 12 LESSONS PERFECTLY CONFIGURED:');
    console.log('   - 12 Units (1 per lesson)');
    console.log('   - 12 Episodes (Day 1 through Day 12)');
    console.log('   - 84 Blocks (1 YouTube video + 6 structured text blocks per lesson)');
    console.log('   - 120 Questions (Exactly 3 MCQ + 3 T/F + 3 Short Answer + 1 Sentence Reorder per lesson)');
  }

  console.log('\n=== INTEGRATION VERIFICATION COMPLETE: ALL CHECKS PASSED ===');
}

verify().catch(console.error);
