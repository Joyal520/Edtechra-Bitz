import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('--- TEST 1: getAdminBitz with no params ---');
  try {
    const res1 = await knowledgeBitzService.getAdminBitz({ supabaseClient: supabase });
    console.log('Result 1 success:', res1.success, 'Total items:', res1.bitz.length, 'Total count:', res1.total);
    console.log('Stats:', res1.stats);
  } catch (e) {
    console.error('Test 1 failed:', e);
  }

  console.log('\n--- TEST 2: getAdminBitz with status=all ---');
  try {
    const res2 = await knowledgeBitzService.getAdminBitz({ status: 'all', page: 1, limit: 50, supabaseClient: supabase });
    console.log('Result 2 success:', res2.success, 'Total items:', res2.bitz.length);
  } catch (e) {
    console.error('Test 2 failed:', e);
  }

  console.log('\n--- TEST 3: getAdminBitz with status=published ---');
  try {
    const res3 = await knowledgeBitzService.getAdminBitz({ status: 'published', page: 1, limit: 50, supabaseClient: supabase });
    console.log('Result 3 success:', res3.success, 'Total items:', res3.bitz.length);
  } catch (e) {
    console.error('Test 3 failed:', e);
  }

  console.log('\n--- TEST 4: getPersonalizedFeed ---');
  try {
    const res4 = await knowledgeBitzService.getPersonalizedFeed({ userId: 'guest', page: 1, limit: 10, supabaseClient: supabase });
    console.log('Result 4 success:', res4.success, 'Total items in feed:', res4.bitz.length, 'Total pool:', res4.total);
  } catch (e) {
    console.error('Test 4 failed:', e);
  }
}

test().catch(console.error);
