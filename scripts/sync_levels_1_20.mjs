import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && serviceRoleKey) {
  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const markdownPath = 'C:/Users/hecsb/Downloads/Elektra_Bitz_First_20_Shuffled_Content.md';
const cachePath = 'server/data/youtube_cache.json';

const videoIds = [
  'Xj3gbHlFQEo', // Level 1
  'QoiXpyzzPPA', // Level 2
  '9I0-lpeaAiE', // Level 3
  'QbOLGiuxNNE', // Level 4
  'XB4FUo9cJE8', // Level 5
  '-Q2rpPKzzJM', // Level 6
  'NZUXlmkRh5k', // Level 7
  'I4B--ku52Tg', // Level 8
  'oyb774hyKc0', // Level 9
  '2o2PQXGbsmc', // Level 10
  'lJt_vzBNQbI', // Level 11
  'S-McV5dA2fQ', // Level 12
  'j1ZGNps9XCg', // Level 13
  'UZPTJJNIhOk', // Level 14
  'VUhM5v3_rEw', // Level 15
  'W5LSKB5TEVA', // Level 16
  'ZXIEoI55NRs', // Level 17
  'ZyHGCEEpiHI', // Level 18
  'EizNwDGRwsA', // Level 19
  'TTS18cuzHJ4'  // Level 20
];

async function syncLevels() {
  console.log('================================================================');
  console.log('ELEKTRA BITZ: SYNCING LEVELS 1-20 TO LOCAL CACHE & SUPABASE');
  console.log('================================================================');

  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  const levelBlocks = markdownContent.split(/### Level\s+(\d+)\s+[—–-]\s+/).filter(Boolean);

  const levels = [];
  for (let i = 0; i < levelBlocks.length; i += 2) {
    const levelNum = parseInt(levelBlocks[i], 10);
    const block = levelBlocks[i+1];
    const videoId = videoIds[levelNum - 1];
    
    const titleLine = block.split('\n')[0].trim();
    const explMatch = block.match(/\*\*50-word explanation:\*\*\s*\n+([\s\S]*?)(?=\n+\*\*Quiz:\*\*)/);
    const explanation = explMatch ? explMatch[1].trim() : '';
    
    // Parse quiz
    const qRegex = /\*\*(\d+)\.\s+([^\n]+)\*\*\s*\n+-\s+A\.\s+([^\n]+)\n+-\s+B\.\s+([^\n]+)\n+-\s+C\.\s+([^\n]+)\n+-\s+D\.\s+([^\n]+)\n+-\s+\*\*Answer:\s+([A-D])\*\*/g;
    let qMatch;
    const questions = [];
    while ((qMatch = qRegex.exec(block)) !== null) {
      const qNum = parseInt(qMatch[1], 10);
      const correctLetter = qMatch[7].trim();
      const options = [
        { id: 'opt_a', text: qMatch[3].trim(), isCorrect: correctLetter === 'A' },
        { id: 'opt_b', text: qMatch[4].trim(), isCorrect: correctLetter === 'B' },
        { id: 'opt_c', text: qMatch[5].trim(), isCorrect: correctLetter === 'C' },
        { id: 'opt_d', text: qMatch[6].trim(), isCorrect: correctLetter === 'D' }
      ];
      const correctOption = options.find(o => o.isCorrect);

      questions.push({
        id: `l${levelNum}_q${qNum}`,
        question: qMatch[2].trim(),
        options,
        correctIndex: ['A', 'B', 'C', 'D'].indexOf(correctLetter),
        explanation: `Correct answer: ${correctLetter}. ${correctOption?.text}`
      });
    }

    levels.push({
      levelNumber: levelNum,
      title: titleLine,
      youtubeVideoId: videoId,
      explanation,
      questions
    });
  }

  console.log(`✓ Parsed ${levels.length} levels from markdown.`);

  // 1. Update youtube_cache.json
  const rawCache = fs.readFileSync(cachePath, 'utf8');
  const cache = JSON.parse(rawCache);
  console.log(`✓ Total videos in cache before update: ${cache.length}`);

  let updatedCount = 0;
  levels.forEach(lvl => {
    const videoIndex = cache.findIndex(v => v.youtube_video_id === lvl.youtubeVideoId);
    if (videoIndex !== -1) {
      const existing = cache[videoIndex];
      existing.title = lvl.title;
      if (!existing.learning_content) {
        existing.learning_content = {};
      }
      existing.learning_content.summary = lvl.explanation;
      existing.learning_content.quiz = lvl.questions;
      existing.learning_content.status = 'published';
      existing.learning_content.key_takeaway = existing.learning_content.key_takeaway || lvl.explanation;
      existing.status = 'published';
      updatedCount++;
    } else {
      console.warn(`[Warning] Video ID ${lvl.youtubeVideoId} for Level ${lvl.levelNumber} not found in cache!`);
    }
  });

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`✓ Updated ${updatedCount}/20 levels in ${cachePath}. Total cache length: ${cache.length}`);

  // 2. Update Supabase public.youtube_learning_content
  if (supabase) {
    console.log('\n--- Syncing to Supabase public.youtube_learning_content ---');
    const contentRows = levels.map(lvl => {
      const cachedVideo = cache.find(v => v.youtube_video_id === lvl.youtubeVideoId);
      return {
        youtube_video_id: lvl.youtubeVideoId,
        summary: lvl.explanation,
        key_takeaway: cachedVideo?.learning_content?.key_takeaway || lvl.explanation,
        vocabulary: cachedVideo?.learning_content?.vocabulary || [],
        quiz: lvl.questions,
        learning_objectives: cachedVideo?.learning_content?.learning_objectives || [],
        status: 'published',
        updated_at: new Date().toISOString()
      };
    });

    const { error: upsertErr } = await supabase
      .from('youtube_learning_content')
      .upsert(contentRows, { onConflict: 'youtube_video_id' });

    if (upsertErr) {
      console.error('❌ Supabase upsert error:', upsertErr);
    } else {
      console.log(`✓ Successfully upserted ${contentRows.length} levels into Supabase youtube_learning_content!`);
    }
  } else {
    console.log('ℹ️ Supabase credentials not found or service key absent, updated local cache only.');
  }

  console.log('\n================================================================');
  console.log('🎉 SYNC COMPLETE: Levels 1-20 updated with exact Markdown content.');
  console.log('================================================================');
}

syncLevels().catch(console.error);
