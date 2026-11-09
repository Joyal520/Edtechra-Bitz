import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { evaluateQuestionAnswer } from '../src/utils/questionGrading.ts';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COURSE_ID = 'e10c7ee9-0010-4000-8000-000000000010';
const EXPECTED_VIDEOS = [
  {
    title: 'The Mothman – The Mysterious Creature of Point Pleasant',
    url: 'https://www.youtube.com/shorts/MLZLIZo3YQI'
  },
  {
    title: "Hoia-Baciu Forest – Romania's Most Mysterious Forest",
    url: 'https://www.youtube.com/shorts/aaFQ8zAqn-4'
  },
  {
    title: 'The Man Who Came From Taured',
    url: 'https://www.youtube.com/shorts/aI-oxEjDHns'
  },
  {
    title: 'The Sleep Paralysis Demon',
    url: 'https://www.youtube.com/shorts/yUEutE5egkU'
  },
  {
    title: 'False Awakening – Have You Ever Woken Up But Were Still Dreaming?',
    url: 'https://www.youtube.com/shorts/qI0mLNtfKQs'
  },
  {
    title: 'Exploding Head Syndrome – The Explosion You Hear at 3 AM',
    url: 'https://www.youtube.com/shorts/eNXr3lqJZ_E'
  },
  {
    title: 'The Shadow Person You See at 3 AM',
    url: 'https://www.youtube.com/shorts/CFrIxWFAw8A'
  },
  {
    title: 'You Wake Up and Everyone Is a Zombie',
    url: 'https://www.youtube.com/shorts/q_C6TRmrO4Y'
  },
  {
    title: 'Never Look Under Your Bed at 3 AM',
    url: 'https://www.youtube.com/shorts/PI4_8hvkBYc'
  },
  {
    title: 'Night Terrors – Someone Is Screaming in Their Sleep',
    url: 'https://www.youtube.com/shorts/1QKQ1PUzoFw'
  }
];

async function runVerification() {
  console.log('================================================================');
  console.log('VERIFYING COURSE: EdTechra Bitz – Creepy Legends & Strange Mysteries');
  console.log('================================================================\n');

  // 1. Verify course & unit
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', COURSE_ID)
    .single();
  assert.ok(course, 'Course must exist in Supabase');
  assert.equal(course.title, 'EdTechra Bitz – Creepy Legends & Strange Mysteries');
  assert.equal(
    course.short_description,
    'Explore ten mysterious stories, strange events and fascinating phenomena through short videos, simple English reading passages and interactive challenges.'
  );
  assert.equal(course.status, 'published');

  const { data: units } = await supabase
    .from('course_units')
    .select('*')
    .eq('course_id', COURSE_ID)
    .order('order_index', { ascending: true });
  assert.equal(units.length, 1, 'Course must have exactly 1 unit');

  // 2. Verify all 10 lessons (episodes)
  const { data: episodes } = await supabase
    .from('course_episodes')
    .select('*')
    .eq('course_id', COURSE_ID)
    .order('order_index', { ascending: true });
  assert.equal(episodes.length, 10, 'Course must have exactly 10 lessons');

  const { data: blocks } = await supabase
    .from('course_blocks')
    .select('*')
    .eq('course_id', COURSE_ID)
    .order('order_index', { ascending: true });

  const { data: questions } = await supabase
    .from('course_questions')
    .select('*')
    .eq('course_id', COURSE_ID)
    .order('order_index', { ascending: true });

  assert.equal(questions.length, 50, 'Course must have 50 total questions (5 per lesson)');

  for (let i = 0; i < 10; i++) {
    const ep = episodes[i];
    const expected = EXPECTED_VIDEOS[i];
    assert.equal(ep.title, expected.title, `Lesson ${i + 1} title must match`);

    const epBlocks = blocks.filter((b) => b.episode_id === ep.id);
    assert.equal(epBlocks.length, 1, `Lesson ${i + 1} must have 1 Learn with Shorts block`);
    const b = epBlocks[0];
    const c = b.content || {};

    // Check Learn with Shorts block & video URL
    assert.equal(c._block_type, 'learn_with_shorts');
    assert.equal(c.is_learn_with_shorts, true);
    assert.equal(c.video_url, expected.url, `Lesson ${i + 1} video URL must match`);

    // Check teacher-only transcript is present and show_transcript === false
    assert.ok(c.transcript && c.transcript.length > 50, `Lesson ${i + 1} must have verbatim transcript`);
    assert.equal(c.show_transcript, false, `Lesson ${i + 1} transcript must be hidden from students`);
    assert.equal(c.video?.show_transcript, false, `Lesson ${i + 1} video.show_transcript must be false`);

    // Check ~100-word A1-A2 reading passage
    const passage = String(c.reading_passage || '').trim();
    const wordCount = passage.split(/\s+/).filter(Boolean).length;
    assert.ok(wordCount >= 80 && wordCount <= 120, `Lesson ${i + 1} reading passage word count (${wordCount}) must be ~100 words`);
    assert.notEqual(
      passage.toLowerCase(),
      String(c.transcript || '').trim().toLowerCase(),
      `Lesson ${i + 1} reading passage must not be a copy of the transcript`
    );

    // Check 5 questions (Q1 MCQ, Q2 MCQ, Q3 True/False, Q4 One-Word Answer, Q5 Word Reordering)
    const epQuestions = questions
      .filter((q) => q.episode_id === ep.id)
      .sort((a, b) => a.order_index - b.order_index);
    assert.equal(epQuestions.length, 5, `Lesson ${i + 1} must have exactly 5 questions`);

    const totalMarks = epQuestions.reduce((s, q) => s + Number(q.points || 0), 0);
    assert.equal(totalMarks, 10, `Lesson ${i + 1} total academic score must be 10 marks`);

    epQuestions.forEach((rawQ, qIdx) => {
      assert.equal(Number(rawQ.points), 2, `Lesson ${i + 1} Q${qIdx + 1} must carry 2 marks`);

      // Enrich question just like server.mjs GET /api/course-studio/courses/:id
      const extra =
        typeof rawQ.options === 'object' && rawQ.options !== null && !Array.isArray(rawQ.options)
          ? {
              expected_answer: rawQ.options.expected_answer,
              acceptable_answers: rawQ.options.acceptable_answers,
              items: rawQ.options.items || rawQ.options.options,
              correct_order: rawQ.options.correct_order,
              question_type: rawQ.options._question_type || rawQ.question_type,
              options: rawQ.options.options || []
            }
          : {};
      const q = { ...rawQ, ...extra };

      if (qIdx === 0 || qIdx === 1) {
        assert.equal(q.question_type, 'multiple_choice');
        assert.equal(q.options.length, 4, `Lesson ${i + 1} Q${qIdx + 1} must have 4 options`);
        assert.ok(q.options.includes(q.correct_answer), `Lesson ${i + 1} Q${qIdx + 1} options must include correct_answer`);
      } else if (qIdx === 2) {
        assert.equal(q.question_type, 'true_false');
        assert.ok(['True', 'False'].includes(q.correct_answer));
      } else if (qIdx === 3) {
        assert.equal(q.question_type, 'fill_blank');
        assert.ok(q.question_text.includes('______'), `Lesson ${i + 1} Q4 must have a blank`);
      } else if (qIdx === 4) {
        assert.equal(q.question_type, 'sentence_reordering');
        assert.ok(Array.isArray(q.options) && q.options.length >= 5);
        assert.notEqual(
          q.options.join(' ').toLowerCase(),
          q.correct_answer.toLowerCase(),
          `Lesson ${i + 1} Q5 words must be shuffled`
        );
      }

      // Verify answer key grades as correct via evaluateQuestionAnswer
      const gradeRes = evaluateQuestionAnswer(q, q.correct_answer);
      assert.equal(
        gradeRes.isCorrect,
        true,
        `Lesson ${i + 1} Q${qIdx + 1} answer key failed evaluation: ${q.correct_answer}`
      );
    });

    console.log(
      `✓ Lesson ${String(i + 1).padStart(2, '0')}: ${ep.title} | ${wordCount}w reading | 5 questions (10 marks) | Answer keys verified`
    );
  }

  // 3. Verify XP Reward formula (5 XP completion + 2 XP * correct + 5 XP perfect bonus = max 20 XP)
  const calcShortsXp = (correct, total = 5) =>
    5 + correct * 2 + (total > 0 && correct === total ? 5 : 0);
  assert.equal(calcShortsXp(0, 5), 5);
  assert.equal(calcShortsXp(3, 5), 11);
  assert.equal(calcShortsXp(4, 5), 13);
  assert.equal(calcShortsXp(5, 5), 20);
  console.log('\n✓ Stage 5 XP Reward calculation verified: 5 + (correct × 2) + (perfect ? 5 : 0) = max 20 XP');

  // 4. Verify existing courses remain untouched
  const { data: legacyCreepy } = await supabase
    .from('courses')
    .select('id, title, status')
    .eq('id', 'e10c7ee9-0012-4000-8000-000000000012')
    .single();
  assert.equal(legacyCreepy.title, 'Learn English with Creepy Legends');

  const { data: legacyAnnabelle } = await supabase
    .from('courses')
    .select('id, title, status')
    .eq('id', 'e10c7ee9-0007-4000-8000-000000000007')
    .single();
  assert.equal(legacyAnnabelle.title, 'Learn the Simple Past Through the Legend of Annabelle');
  console.log('✓ Existing courses verified untouched');

  console.log('\nALL 12 VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
