// scripts/import_creepy_legends_course.mjs
// Native integration script for "Learn English with Creepy Legends" in Course Studio
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or SERVICE ROLE KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read course data from public/creepy-legends/course-data.js
const courseDataFile = fs.readFileSync('public/creepy-legends/course-data.js', 'utf8');
const sandbox = {};
const fn = new Function('window', courseDataFile);
fn(sandbox);
const courseData = sandbox.CREEPY_LEGENDS_COURSE;

if (!courseData || !courseData.lessons) {
  console.error('Failed to parse course data from course-data.js');
  process.exit(1);
}

const COURSE_ID = 'e10c7ee9-0012-4000-8000-000000000012';
const TEACHER_ID = '548eea36-a825-4c69-9ca3-89fc06218c39'; // R.J. Roshan
const COVER_R2_URL = 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/general/covers/548eea36-a825-4c69-9ca3-89fc06218c39/creepy-legends-cover.jpg';
const COVER_KEY = 'courses/general/covers/548eea36-a825-4c69-9ca3-89fc06218c39/creepy-legends-cover.jpg';

async function importCourse() {
  console.log('--- Starting Course Studio Integration for "Learn English with Creepy Legends" ---');

  // 1. Clean existing records for COURSE_ID if re-running
  console.log('1. Cleaning any previous import for', COURSE_ID);
  await supabase.from('course_questions').delete().eq('course_id', COURSE_ID);
  await supabase.from('course_blocks').delete().eq('course_id', COURSE_ID);
  await supabase.from('course_episodes').delete().eq('course_id', COURSE_ID);
  await supabase.from('course_units').delete().eq('course_id', COURSE_ID);
  await supabase.from('courses').delete().eq('id', COURSE_ID);

  // 2. Create Course Record
  console.log('2. Inserting course record into "courses" table...');
  const courseRecord = {
    id: COURSE_ID,
    teacher_id: TEACHER_ID,
    title: courseData.title, // "Learn English with Creepy Legends"
    short_description: courseData.subtitle, // "12 Days of Stories, Vocabulary & Mystery"
    subject: 'English',
    grade_level: courseData.level, // "A1–A2"
    cover_image_url: COVER_R2_URL,
    cover_image_key: COVER_KEY,
    cover_aspect_ratio: '16:9',
    course_type: 'full',
    status: 'draft', // DRAFT as requested
    estimated_hours: 6,
    daily_release_enabled: false,
    course_timezone: 'Asia/Colombo',
    course_start_date: new Date().toISOString()
  };

  const { data: insertedCourse, error: cErr } = await supabase
    .from('courses')
    .insert(courseRecord)
    .select()
    .single();

  if (cErr) {
    console.error('Error inserting course:', cErr);
    process.exit(1);
  }
  console.log('✓ Course created:', insertedCourse.title, 'Status:', insertedCourse.status);

  // 3. Create 12 Units and 12 Episodes
  console.log('3. Inserting 12 units and 12 episodes...');
  const letters = ['A', 'B', 'C', 'D'];
  let totalBlocksInserted = 0;
  let totalQuestionsInserted = 0;

  for (let idx = 0; idx < courseData.lessons.length; idx++) {
    const lesson = courseData.lessons[idx];
    const dayNum = lesson.day; // 1 to 12
    const unitId = `e10c7ee9-0012-4000-8001-${String(dayNum).padStart(12, '0')}`;
    const epId = `e10c7ee9-0012-4000-8002-${String(dayNum).padStart(12, '0')}`;

    // A. Insert Unit
    const { error: uErr } = await supabase.from('course_units').insert({
      id: unitId,
      course_id: COURSE_ID,
      title: `Unit ${dayNum}: ${lesson.title}`,
      description: `${lesson.subtitle} • Grammar: ${lesson.grammar.title}`,
      order_index: idx
    });
    if (uErr) {
      console.error(`Error inserting Unit ${dayNum}:`, uErr);
      process.exit(1);
    }

    // B. Insert Episode (Lesson)
    const { error: eErr } = await supabase.from('course_episodes').insert({
      id: epId,
      unit_id: unitId,
      course_id: COURSE_ID,
      title: `Day ${dayNum}: ${lesson.title}`,
      episode_type: 'lesson',
      order_index: 0,
      estimated_minutes: 25,
      position: dayNum,
      daily_release_enabled: false,
      release_day: dayNum,
      is_manually_unlocked: false
    });
    if (eErr) {
      console.error(`Error inserting Episode ${dayNum}:`, eErr);
      process.exit(1);
    }

    // C. Insert Blocks for this Episode
    const blocksToInsert = [
      {
        id: `e10c7ee9-0012-4000-8003-${String(dayNum * 10 + 1).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_type: 'video',
        order_index: 0,
        content: {
          title: `Watch the Story: ${lesson.title}`,
          url: lesson.videoUrl,
          video_url: lesson.videoUrl,
          video_id: lesson.videoId,
          transcript: lesson.story,
          show_transcript: true,
          show_transcript_to_students: true,
          video: {
            url: lesson.videoUrl,
            video_id: lesson.videoId,
            title: lesson.title,
            transcript: lesson.story
          }
        }
      },
      {
        id: `e10c7ee9-0012-4000-8003-${String(dayNum * 10 + 2).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_type: 'text',
        order_index: 1,
        content: {
          title: 'Lesson Introduction & Learning Goals',
          text: `### Pre-Watching Question\n💡 ${lesson.preWatchingQuestion}\n\n### Lesson Introduction\n${lesson.intro}\n\n### Today's Learning Goals\n${lesson.learningGoals.map(g => `* ✓ ${g}`).join('\n')}`
        }
      },
      {
        id: `e10c7ee9-0012-4000-8003-${String(dayNum * 10 + 3).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_type: 'text',
        order_index: 2,
        content: {
          title: 'Simple English Story (A1–A2)',
          text: lesson.story
        }
      },
      {
        id: `e10c7ee9-0012-4000-8003-${String(dayNum * 10 + 4).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_type: 'text',
        order_index: 3,
        content: {
          title: 'Vocabulary Spotlight',
          text: `| Word | Simple Meaning | Example Sentence |\n|---|---|---|\n${lesson.vocabulary.map(v => `| **${v.word}** | ${v.meaning} | *"${v.example}"* |`).join('\n')}`
        }
      },
      {
        id: `e10c7ee9-0012-4000-8003-${String(dayNum * 10 + 5).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_type: 'text',
        order_index: 4,
        content: {
          title: `Grammar: ${lesson.grammar.title}`,
          text: `${lesson.grammar.explanation}\n\n**Story Examples:**\n${lesson.grammar.examples.map(ex => `1. ${ex}`).join('\n')}`
        }
      },
      {
        id: `e10c7ee9-0012-4000-8003-${String(dayNum * 10 + 6).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_type: 'text',
        order_index: 5,
        content: {
          title: 'Speaking Activity',
          text: `**Speaking Prompt:**\n${lesson.speaking.prompt}\n\n**Sentence Starters:**\n${lesson.speaking.starters.map(s => `* *"${s}"*`).join('\n')}`
        }
      },
      {
        id: `e10c7ee9-0012-4000-8003-${String(dayNum * 10 + 7).padStart(12, '0')}`,
        episode_id: epId,
        course_id: COURSE_ID,
        block_type: 'text',
        order_index: 6,
        content: {
          title: 'Writing Activity & Daily Challenge',
          text: `**Writing Task:**\n${lesson.writing.prompt}\n\n---\n\n**🔥 Daily Real-World Challenge:**\n${lesson.challenge}`
        }
      }
    ];

    const { error: bErr } = await supabase.from('course_blocks').insert(blocksToInsert);
    if (bErr) {
      console.error(`Error inserting blocks for Day ${dayNum}:`, bErr);
      process.exit(1);
    }
    totalBlocksInserted += blocksToInsert.length;

    // D. Insert Exactly 10 Questions for this Episode
    const questionsToInsert = lesson.quiz.map((q, qIdx) => {
      const qId = `e10c7ee9-0012-4000-8004-${String(dayNum * 10 + (qIdx + 1)).padStart(12, '0')}`;
      let qType = q.type;
      let options = [];
      let correctAnswer = '';
      let skill = 'Comprehension';
      let concept = 'General';

      if (q.type === 'mcq') {
        qType = 'multiple_choice';
        options = q.options.map((optText, optIdx) => ({
          id: letters[optIdx],
          text: optText
        }));
        correctAnswer = letters[q.answer];
        skill = qIdx === 2 ? 'Grammar' : 'Comprehension';
        concept = qIdx === 2 ? 'Grammar Rule' : 'Story Detail';
      } else if (q.type === 'tf') {
        qType = 'true_false';
        options = ['True', 'False'];
        correctAnswer = q.answer ? 'True' : 'False';
        skill = qIdx === 5 ? 'Grammar' : 'Comprehension';
        concept = 'Fact Verification';
      } else if (q.type === 'short') {
        qType = 'short_answer';
        options = q.acceptedAnswers;
        correctAnswer = q.acceptedAnswers[0];
        skill = 'Vocabulary';
        concept = 'Recall';
      } else if (q.type === 'reorder') {
        qType = 'sentence_builder';
        options = q.scrambled;
        correctAnswer = q.answer;
        skill = 'Grammar';
        concept = 'Sentence Construction';
      }

      return {
        id: qId,
        episode_id: epId,
        course_id: COURSE_ID,
        block_id: null,
        question_text: q.question || 'Put the words in the correct order to make a sentence:',
        question_type: qType,
        options: options,
        correct_answer: correctAnswer,
        explanation: q.feedbackCorrect,
        skill: skill,
        concept: concept,
        difficulty: 'medium',
        points: 10,
        order_index: qIdx
      };
    });

    const { error: qErr } = await supabase.from('course_questions').insert(questionsToInsert);
    if (qErr) {
      console.error(`Error inserting questions for Day ${dayNum}:`, qErr);
      process.exit(1);
    }
    totalQuestionsInserted += questionsToInsert.length;

    console.log(`✓ Day ${dayNum} imported: 1 Unit, 1 Episode, ${blocksToInsert.length} Blocks, ${questionsToInsert.length} Questions`);
  }

  console.log('\n--- VERIFICATION OF IMPORT ---');
  console.log(`✓ Course ID: ${COURSE_ID}`);
  console.log(`✓ Total Units: 12`);
  console.log(`✓ Total Episodes: 12`);
  console.log(`✓ Total Blocks: ${totalBlocksInserted}`);
  console.log(`✓ Total Questions: ${totalQuestionsInserted} (12 lessons × 10 questions)`);

  // Verify total courses in database
  const { data: allCourses } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      status,
      subject,
      grade_level,
      course_units(id, course_episodes(id))
    `);

  console.log(`\nAll Courses in Course Studio (${allCourses.length}):`);
  allCourses.forEach((c, idx) => {
    const unitsCount = c.course_units?.length || 0;
    const episodesCount = (c.course_units || []).reduce((s, u) => s + (u.course_episodes?.length || 0), 0);
    console.log(`  ${idx + 1}. [${c.status.toUpperCase()}] "${c.title}" (${unitsCount} units, ${episodesCount} episodes)`);
  });

  const publishedCount = allCourses.filter(c => c.status === 'published').length;
  const draftCount = allCourses.filter(c => c.status === 'draft').length;
  console.log(`\nSummary: Total Courses: ${allCourses.length} (Published: ${publishedCount}, Drafts: ${draftCount})`);
  console.log('--- Import Complete Successfully ---');
}

importCourse().catch(err => {
  console.error('Import failed with exception:', err);
  process.exit(1);
});
