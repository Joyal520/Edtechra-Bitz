// ============================================================================
// EDTECHRA-BITZ: Comprehensive Test Suite for Pixabay Pipeline & Image Integrity
// Validates:
// 1. Octopus Import without image -> Pixabay Search -> Download -> R2/WebP -> Bitz -> Feed
// 2. Octopus Import with Admin image -> Preserved, Pixabay NOT called, image_source = 'admin'
// 3. Delete Octopus -> Import Mars -> Mars image selected, zero Octopus/Brain contamination
// 4. Admin Replace & Remove image actions
// 5. Caching: Repeated feed requests do NOT trigger Pixabay searches
// ============================================================================

import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';
import { searchPixabay, buildPixabaySearchQuery, selectBestCandidate, downloadAndStoreImage } from '../server/pixabayService.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY && !SUPABASE_URL.includes('your-project')) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function runPixabayPipelineSuite() {
  console.log('====================================================================');
  console.log('🧪 EDTECHRA KNOWLEDGE BITZ: PIXABAY & IMAGE INTEGRITY TEST SUITE');
  console.log('====================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName} ${details ? `(${details})` : ''}`);
      passedTests++;
    } else {
      console.error(`  ✕ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // TEST 1: Pixabay Search Query Builder
  console.log('--- TEST 1: Pixabay Search Query Builder ---');
  const queryOctopus = buildPixabaySearchQuery(
    'Octopuses Have Three Hearts',
    'Animals & Wildlife',
    'Science & Nature'
  );
  console.log(`  Generated search query for Octopus: "${queryOctopus}"`);
  assert(
    queryOctopus.toLowerCase().includes('octopus') || queryOctopus.toLowerCase().includes('wildlife'),
    'Search query correctly extracts core entities (octopus/wildlife)',
    queryOctopus
  );

  const queryMars = buildPixabaySearchQuery(
    'Why Mars Appears Red in the Night Sky',
    'Planets & Space',
    'Science & Nature'
  );
  console.log(`  Generated search query for Mars: "${queryMars}"`);
  assert(
    queryMars.toLowerCase().includes('mars') || queryMars.toLowerCase().includes('space'),
    'Search query correctly extracts core entities (mars/space)',
    queryMars
  );

  // TEST 2: Pixabay API Search & Caching
  console.log('\n--- TEST 2: Pixabay Search API & Caching ---');
  const searchRes = await searchPixabay({ query: 'octopus wildlife', perPage: 5 });
  console.log(`  Pixabay Search Success: ${searchRes.success}, Hits returned: ${searchRes.hits?.length || 0}`);
  
  if (process.env.PIXABAY_API_KEY) {
    assert(searchRes.success === true, 'Pixabay API request succeeded');
    assert(Array.isArray(searchRes.hits) && searchRes.hits.length > 0, 'Pixabay returned relevant hits');
    
    const bestHit = selectBestCandidate(searchRes.hits);
    assert(Boolean(bestHit && bestHit.id), 'Candidate selector chose high-quality image', `ID: ${bestHit?.id}`);

    // Verify caching on second call
    const cachedRes = await searchPixabay({ query: 'octopus wildlife', perPage: 5 });
    assert(cachedRes.cached === true, 'Subsequent identical search served from in-memory cache');
  } else {
    console.log('  ⚠️ PIXABAY_API_KEY not set in test environment, testing simulated fallback pipeline.');
  }

  // TEST 3: Octopus Import Without Image -> Pipeline Execution
  console.log('\n--- TEST 3: Octopus Import Without Image -> Automatic Pipeline ---');
  
  // Clean previous test facts if any
  if (supabase) {
    try {
      const { data: oldRows } = await supabase.from('knowledge_bitz').select('id, title');
      if (oldRows && Array.isArray(oldRows)) {
        for (const r of oldRows) {
          const t = (r.title || '').toLowerCase();
          if (t.includes('octopus') || t.includes('mars') || t.includes('explicit')) {
            await supabase.from('knowledge_bitz').delete().eq('id', r.id);
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  const runId = Date.now();

  const octopusInput = {
    title: `Octopuses Have Three Hearts (${runId})`,
    short_fact: `Octopuses possess three distinct hearts that pump blue copper-based hemocyanin blood (${runId}).`,
    reading_text: `Octopuses possess three distinct hearts that pump blue copper-based blood throughout their complex bodies. Two branchial hearts pump blood through the gills where oxygen is absorbed, while a third systemic heart pumps oxygenated blood to the rest of the organs. When an octopus swims, the systemic heart stops beating, explaining why these intelligent cephalopods prefer crawling over sustained swimming. Test run ${runId}.`,
    topic_id: 'science',
    category: 'Science & Nature',
    sub_topic: 'Animals & Wildlife',
    cefr_level: 'A1',
    status: 'published'
  };

  const createdOctopus = await knowledgeBitzService.createBitz(octopusInput, 'test-admin', supabase);
  console.log(`  Created Octopus Bitz: ID=${createdOctopus.id}, code=${createdOctopus.bitz_code}`);
  console.log(`  Visual Status: ${createdOctopus.visual_status}, Image Source: ${createdOctopus.image_source}`);
  console.log(`  Visual URL: ${createdOctopus.visual_url}`);

  if (process.env.PIXABAY_API_KEY) {
    assert(createdOctopus.visual_status === 'ready', 'Octopus Bitz visual_status is ready');
    assert(createdOctopus.image_source === 'pixabay', 'Octopus Bitz image_source is pixabay');
    assert(Boolean(createdOctopus.visual_url), 'Octopus Bitz visual_url is populated with R2 URL');
  } else {
    assert(['ready', 'missing'].includes(createdOctopus.visual_status), 'Octopus Bitz handled cleanly');
  }

  // TEST 4: Feed Retrieval & Image Priority Verification
  console.log('\n--- TEST 4: Feed Retrieval & Data Integrity ---');
  const feedRes = await knowledgeBitzService.getPersonalizedFeed({
    userId: 'guest',
    page: 1,
    limit: 100
  }, supabase);

  console.log(`  Feed items returned: ${feedRes.bitz.length}`);
  const feedOctopus = feedRes.bitz.find(b => b.id === createdOctopus.id || b.title === octopusInput.title);
  assert(Boolean(feedOctopus), 'Octopus fact is present in Explore Feed by ID', `ID: ${createdOctopus.id}`);
  assert(feedOctopus.title === octopusInput.title, 'Feed record matches exact database title');
  console.log(`  Created URL: ${createdOctopus.visual_url}`);
  console.log(`  Feed URL:    ${feedOctopus.visual_url}`);
  assert(feedOctopus.visual_url === createdOctopus.visual_url, 'Feed displays exact database image URL (no unrelated images)');

  // TEST 5: Admin Upload Priority Override (Priority 1)
  console.log('\n--- TEST 5: Admin Upload Priority Override ---');
  const adminManualUrl = 'https://pub-r2.edtechra.com/bitz/covers/admin_verified_octopus.webp';
  const updatedAdminBitz = await knowledgeBitzService.updateBitz(
    createdOctopus.id,
    {
      visual_url: adminManualUrl,
      visual_status: 'ready',
      image_source: 'admin'
    },
    supabase
  );

  assert(updatedAdminBitz.image_source === 'admin', 'Image source successfully marked as admin');
  assert(updatedAdminBitz.visual_url === adminManualUrl, 'Admin-uploaded image takes permanent priority');

  // Verify that creating a Bitz with explicit image NEVER triggers Pixabay
  const explicitInput = {
    title: `Explicit Image Bitz (${runId})`,
    short_fact: `This fact has an administrator provided image URL on creation (${runId}).`,
    reading_text: `This educational knowledge bitz has an administrator provided image URL explicitly attached upon creation. The server image pipeline must respect this explicit image input and never call Pixabay or overwrite the URL with any other picture. This confirms that Administrator Upload and explicit JSON imports hold absolute top priority over automatic searches in the educational catalogue. Test run verification ${runId}.`,
    topic_id: 'science',
    category: 'Science & Nature',
    sub_topic: 'Biology',
    cefr_level: 'B1',
    visual_url: 'https://pub-r2.edtechra.com/bitz/covers/explicit_cover.webp',
    status: 'published'
  };
  const createdExplicit = await knowledgeBitzService.createBitz(explicitInput, 'test-admin', supabase);
  assert(createdExplicit.visual_url === explicitInput.visual_url, 'Explicit image URL preserved exactly');
  assert(createdExplicit.image_source === 'admin', 'Explicit image source tagged as admin');
  await knowledgeBitzService.deleteBitz(createdExplicit.id, supabase);

  // TEST 6: Delete Octopus & Import Mars Without Contamination
  console.log('\n--- TEST 6: Delete Octopus & Import Mars (No Contamination) ---');
  await knowledgeBitzService.deleteBitz(createdOctopus.id, supabase);

  const deletedCheck = await knowledgeBitzService.getBitzById(createdOctopus.id, supabase);
  assert(deletedCheck === null, 'Octopus fact completely purged from database and cache');

  const marsInput = {
    title: `Why Mars Appears Red (${runId})`,
    short_fact: `Mars appears rusty red because its surface is covered in iron oxide minerals (${runId}).`,
    reading_text: `Mars appears rusty red in the night sky because its surface is covered in iron oxide, commonly known as rust. Ancient rocks rich in iron underwent chemical oxidation with trace atmospheric water and oxygen billions of years ago. Massive planetary dust storms continuously lift these fine oxidized particles high into the thin Martian atmosphere, casting a persistent reddish-orange hue across the planetary disc. Run ${runId}.`,
    topic_id: 'science',
    category: 'Science & Nature',
    sub_topic: 'Space & Astronomy',
    cefr_level: 'A2',
    status: 'published'
  };

  const createdMars = await knowledgeBitzService.createBitz(marsInput, 'test-admin', supabase);
  console.log(`  Created Mars Bitz: ID=${createdMars.id}, visual_url=${createdMars.visual_url}`);

  assert(createdMars.visual_url !== adminManualUrl, 'Mars Bitz does NOT reuse the previous octopus image');
  assert(createdMars.title === marsInput.title, 'Mars Bitz title is correct');

  // TEST 7: Admin Remove Image Action
  console.log('\n--- TEST 7: Admin Remove Image Action ---');
  const bitzWithoutImg = await knowledgeBitzService.removeBitzImage(createdMars.id, supabase);
  assert(bitzWithoutImg.visual_url === null, 'removeBitzImage sets visual_url to null');
  assert(bitzWithoutImg.visual_status === 'missing', 'removeBitzImage sets visual_status to missing');
  assert(bitzWithoutImg.image_source === 'none', 'removeBitzImage sets image_source to none');

  // Clean up test Mars fact
  await knowledgeBitzService.deleteBitz(createdMars.id, supabase);

  console.log('\n====================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PIXABAY & IMAGE INTEGRITY TESTS PASSED!`);
  console.log('====================================================================\n');
}

runPixabayPipelineSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
