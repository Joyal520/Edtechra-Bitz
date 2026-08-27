// ============================================================================
// EDTECHRA-BITZ: Feed Endpoints Diagnostic Script
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env.local') });
dotenv.config({ path: path.resolve(rootDir, '.env') });

function cleanEnv(val) {
  return (val || '').replace(/^\uFEFF/, '').trim();
}

const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.VITE_SUPABASE_ANON_KEY);

console.log('Testing Supabase Client connection...');
console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', serviceKey ? 'Found' : 'Missing');

const supabase = createClient(supabaseUrl, serviceKey);

async function diagnose() {
  const tests = [
    {
      name: '1. student_posts (for /api/posts)',
      fn: async () => {
        // Test primary query in /api/posts
        const { data, error } = await supabase
          .from('student_posts')
          .select('*, profiles(id, full_name, email, avatar_url, role)')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return `Success: ${data?.length} posts found. First author: ${JSON.stringify(data?.[0]?.profiles)}`;
      }
    },
    {
      name: '2. polls (for /api/polls/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('polls')
          .select('*')
          .neq('is_published', false);
        if (error) throw error;
        return `Success: ${data?.length} polls found.`;
      }
    },
    {
      name: '3. spelling_scrambles (for /api/spelling-scrambles/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('spelling_scrambles')
          .select('*')
          .neq('is_published', false);
        if (error) throw error;
        return `Success: ${data?.length} scrambles found.`;
      }
    },
    {
      name: '4. quiz_bits (for /api/quiz/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('quiz_bits')
          .select('*')
          .eq('is_published', true);
        if (error) throw error;
        return `Success: ${data?.length} quizzes found.`;
      }
    },
    {
      name: '5. spelling_flip_cards (for /api/spelling-flip-cards/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('spelling_flip_cards')
          .select('*')
          .neq('is_published', false);
        if (error) throw error;
        return `Success: ${data?.length} flip cards found.`;
      }
    },
    {
      name: '6. reorder_activities (for /api/reorders/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('reorder_activities')
          .select('*')
          .neq('is_published', false);
        if (error) throw error;
        return `Success: ${data?.length} reorders found.`;
      }
    },
    {
      name: '7. readings (for /api/readings/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('readings')
          .select('*')
          .neq('is_published', false);
        if (error) throw error;
        return `Success: ${data?.length} readings found.`;
      }
    },
    {
      name: '8. youtube_videos (for /api/youtube/shorts/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('youtube_videos')
          .select('*')
          .not('status', 'in', '("draft","archived")');
        if (error) throw error;
        return `Success: ${data?.length} shorts found.`;
      }
    },
    {
      name: '9. words_of_the_day (for /api/words-of-the-day/feed)',
      fn: async () => {
        const { data, error } = await supabase
          .from('words_of_the_day')
          .select('*')
          .not('status', 'eq', 'draft');
        if (error) throw error;
        return `Success: ${data?.length} words found.`;
      }
    },
    {
      name: '10. user_activity_interactions',
      fn: async () => {
        const { data, error } = await supabase
          .from('user_activity_interactions')
          .select('activity_id, activity_type')
          .limit(10);
        if (error) throw error;
        return `Success: ${data?.length} interactions found.`;
      }
    },
    {
      name: '11. post_likes / reactions',
      fn: async () => {
        // Check post_likes or reactions table
        const { data: pl, error: plErr } = await supabase
          .from('post_likes')
          .select('*')
          .limit(5);
        if (plErr) {
          const { data: pr, error: prErr } = await supabase
            .from('post_reactions')
            .select('*')
            .limit(5);
          if (prErr) throw new Error(`post_likes err: ${plErr.message}, post_reactions err: ${prErr.message}`);
          return `Success with post_reactions: ${pr?.length} found.`;
        }
        return `Success with post_likes: ${pl?.length} found.`;
      }
    }
  ];

  console.log('\n--- Running Diagnostics ---');
  for (const t of tests) {
    try {
      const res = await t.fn();
      console.log(`✅ [${t.name}]: ${res}`);
    } catch (e) {
      console.error(`❌ [${t.name}] ERROR:`, e.message || e);
    }
  }
}

diagnose();
