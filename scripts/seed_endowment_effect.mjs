// ============================================================================
// EDTECHRA-BITZ: Seed / Upsert "The Endowment Effect"
// Adds the reference UI item to Supabase and knowledge_bitz_cache.json
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ENDOWMENT_BITZ = {
  id: 'a1b2c3d4-e5f6-47a8-b9c0-112233445566',
  bitz_code: 'B000165',
  title: 'The Endowment Effect',
  subtitle: 'Why we value our own things more',
  short_fact: 'We tend to value things more when we own them, and this can influence our choices every day.',
  reading_sections: [
    {
      number: 1,
      question: 'What is the endowment effect?',
      answer: 'People often value something more when they own it. This is called the endowment effect.'
    },
    {
      number: 2,
      question: 'Why does ownership change how we feel?',
      answer: 'Imagine you own a simple cup. You may want more money to sell it than you would pay to buy it. Ownership can make the cup feel more special.'
    },
    {
      number: 3,
      question: 'Why is the endowment effect important?',
      answer: 'The effect helps scientists understand how people make choices about buying, selling, and the things they own.'
    }
  ],
  reading_text: 'People often value something more when they own it. This is called the endowment effect. Imagine you own a simple cup. You may want more money to sell it than you would pay to buy it. Ownership can make the cup feel more special. The effect helps scientists understand how people make choices about buying, selling, and the things they own.',
  key_takeaway: 'We tend to value things more when we own them, and this can influence our choices every day.',
  topic_id: 'people_psychology',
  category: 'People & Psychology',
  sub_topic: 'Mindset & Habits',
  difficulty: 'Easy',
  cefr_level: 'A2',
  reading_time_sec: 30,
  visual_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
  visual_status: 'ready',
  image_source: 'admin',
  source_citation: 'American Psychological Association, Endowment Effect',
  quiz: [
    {
      question: 'What is the endowment effect?',
      options: [
        'Valuing something more when we own it',
        'Buying things we do not really need',
        'Giving away items for free',
        'Forgetting the price of objects'
      ],
      correct_answer: 'Valuing something more when we own it',
      explanation: 'The endowment effect describes our tendency to value items higher simply because we own them.',
      xp: 2
    },
    {
      question: 'In the cup example, what happens after you own the cup?',
      options: [
        'You want more money to sell it than you would pay to buy it',
        'You immediately want to trade it for a new cup',
        'You realize the cup has lost all value',
        'You decide never to drink from it again'
      ],
      correct_answer: 'You want more money to sell it than you would pay to buy it',
      explanation: 'Ownership makes the cup feel more special, raising the selling price you demand.',
      xp: 2
    },
    {
      question: 'How does ownership change how people feel about an object?',
      options: [
        'It makes the object feel more special',
        'It makes people dislike the object',
        'It makes the object break faster',
        'It changes the color of the object'
      ],
      correct_answer: 'It makes the object feel more special',
      explanation: 'Ownership creates an emotional connection that increases perceived value.',
      xp: 2
    },
    {
      question: 'Who uses the endowment effect to understand human choices?',
      options: [
        'Scientists and researchers',
        'Weather forecasters',
        'Marine biologists only',
        'Astronauts on space missions'
      ],
      correct_answer: 'Scientists and researchers',
      explanation: 'Behavioral scientists use it to study economic choices and human decision-making.',
      xp: 2
    },
    {
      question: 'How can the endowment effect influence us in daily life?',
      options: [
        'It influences our choices about buying and selling',
        'It forces us to walk faster',
        'It changes our sleep schedule completely',
        'It makes us forget our favorite songs'
      ],
      correct_answer: 'It influences our choices about buying and selling',
      explanation: 'It shapes how we negotiate, trade, and price things we own every day.',
      xp: 2
    }
  ],
  vocabulary: [],
  xp_value: 10,
  likes_count: 5,
  saves_count: 3,
  shares_count: 1,
  views_count: 24,
  completions_count: 8,
  status: 'published',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function seed() {
  console.log('Seeding "The Endowment Effect" into local cache and Supabase...');

  // 1. Update local cache
  const cachePath = path.join(process.cwd(), 'server/data/knowledge_bitz_cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const filtered = data.filter(b => b.title !== 'The Endowment Effect' && b.id !== ENDOWMENT_BITZ.id);
      filtered.unshift(ENDOWMENT_BITZ);
      fs.writeFileSync(cachePath, JSON.stringify(filtered, null, 2), 'utf8');
      console.log('✅ Updated server/data/knowledge_bitz_cache.json with The Endowment Effect');
    } catch (e) {
      console.warn('Could not update cache:', e.message);
    }
  }

  // 2. Insert/Upsert into Supabase if configured
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Try inserting with all fields
      let { data, error } = await supabase
        .from('knowledge_bitz')
        .upsert(ENDOWMENT_BITZ, { onConflict: 'id' })
        .select();

      if (error && error.code === 'PGRST204') {
        // Fallback without reading_sections/subtitle/key_takeaway if columns not yet migrated
        const fallback = { ...ENDOWMENT_BITZ };
        delete fallback.reading_sections;
        delete fallback.subtitle;
        delete fallback.key_takeaway;
        const retry = await supabase.from('knowledge_bitz').upsert(fallback, { onConflict: 'id' }).select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.warn('Supabase upsert notice:', error.message);
      } else {
        console.log('✅ Upserted "The Endowment Effect" into Supabase successfully!');
      }
    } catch (e) {
      console.warn('Supabase connection notice:', e.message);
    }
  }
}

seed().catch(console.error);
