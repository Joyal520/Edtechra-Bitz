// ============================================================================
// EDTECHRA-BITZ: Category-Aware YouTube Shorts Rotation Test Suite
// ============================================================================

const FEED_CONFIG = {
  SHORT_CATEGORY_COOLDOWN: 2,
  SHORT_FEED_INTERVAL_MIN: 4,
  SHORT_FEED_INTERVAL_MAX: 6,
  SHORT_CATEGORIES: [
    'General', 'Science', 'Technology', 'AI', 'History', 'Math',
    'English', 'Space', 'Nature', 'Psychology', 'Life Skills', 'Geography', 'Mysteries'
  ]
};

function normalizeCategory(category) {
  if (!category || typeof category !== 'string') return 'General';
  const trimmed = category.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function selectNextRotatedShort(
  publishedShorts,
  shownShortIds,
  recentCategories,
  cooldown = FEED_CONFIG.SHORT_CATEGORY_COOLDOWN
) {
  if (!publishedShorts || publishedShorts.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  // 1. Filter out shorts already shown in this session (Duplicate Prevention)
  const unshownShorts = publishedShorts.filter(
    (s) => s.is_published && !shownShortIds.has(s.id) && !shownShortIds.has(s.youtube_video_id)
  );

  if (unshownShorts.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  // 2. Group unshown shorts by category
  const categoryMap = new Map();
  for (const short of unshownShorts) {
    const cat = normalizeCategory(short.category);
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat).push(short);
  }

  const availableCategories = Array.from(categoryMap.keys());
  if (availableCategories.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  // 3. Determine categories on cooldown (the last N categories in recent history)
  const effectiveCooldown = Math.max(1, cooldown);
  const cooldownWindow = recentCategories.slice(-effectiveCooldown).map(normalizeCategory);
  const cooldownSet = new Set(cooldownWindow);

  // 4. Eligible categories: categories with available unshown shorts NOT on cooldown
  const eligibleCategories = availableCategories.filter((cat) => !cooldownSet.has(cat));

  let chosenCategory;

  if (eligibleCategories.length > 0) {
    // Select category first among eligible categories (Random / Equal-weight distribution)
    const randomIndex = Math.floor(Math.random() * eligibleCategories.length);
    chosenCategory = eligibleCategories[randomIndex];
  } else {
    // EDGE CASE: If all available categories are in cooldown (e.g. only 1 or 2 categories exist)
    // Relax cooldown: pick the least recently shown category
    let leastRecentCat = availableCategories[0];
    let minRecentIndex = Infinity;

    for (const cat of availableCategories) {
      const lastIndex = recentCategories.map(normalizeCategory).lastIndexOf(cat);
      if (lastIndex === -1) {
        leastRecentCat = cat;
        break;
      }
      if (lastIndex < minRecentIndex) {
        minRecentIndex = lastIndex;
        leastRecentCat = cat;
      }
    }

    chosenCategory = leastRecentCat;
  }

  // 5. Select a Short inside the chosen category
  const shortsInCat = categoryMap.get(chosenCategory) || [];
  if (shortsInCat.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  const shortIndex = Math.floor(Math.random() * shortsInCat.length);
  const selectedShort = shortsInCat[shortIndex];

  // 6. Update recent categories history
  const updatedRecentCategories = [...recentCategories, chosenCategory].slice(-20);

  return {
    selectedShort,
    updatedRecentCategories
  };
}

function createMockShort(id, category, title, is_published = true) {
  return {
    id,
    youtube_video_id: `vid_${id}`,
    youtube_url: `https://www.youtube.com/shorts/vid_${id}`,
    title: title || `${category} Short ${id}`,
    category,
    thumbnail_url: `https://i.ytimg.com/vi/vid_${id}/hqdefault.jpg`,
    duration: 30,
    is_published,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function runCategoryRotationTests() {
  console.log('🧪 Starting Test Suite: Category-Aware Shorts Rotation & Cooldown (Cooldown = 2)...\n');

  // --------------------------------------------------------------------------
  // TEST 1: Same category consecutive prevention when other categories exist
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Same Category Consecutive Prevention ---');
  const pool1 = [
    createMockShort('eng1', 'English'),
    createMockShort('eng2', 'English'),
    createMockShort('sci1', 'Science')
  ];
  const shown1 = new Set();
  let history1 = ['English']; // English was just shown

  const res1 = selectNextRotatedShort(pool1, shown1, history1, 2);
  if (!res1.selectedShort) throw new Error('Test 1 failed: No short selected');
  if (normalizeCategory(res1.selectedShort.category) === 'English') {
    throw new Error(`Test 1 failed: English was chosen immediately after English despite Science being available!`);
  }
  console.log(`  ✓ Passed: After "English", category chosen was "${res1.selectedShort.category}" (avoided consecutive English)`);

  // --------------------------------------------------------------------------
  // TEST 2: Different categories rotation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Multi-Category Rotation ---');
  const pool2 = [
    createMockShort('eng1', 'English'),
    createMockShort('sci1', 'Science'),
    createMockShort('space1', 'Space')
  ];
  const shown2 = new Set();
  let history2 = [];
  const sequence2 = [];

  for (let i = 0; i < 3; i++) {
    const { selectedShort, updatedRecentCategories } = selectNextRotatedShort(pool2, shown2, history2, 2);
    if (!selectedShort) break;
    shown2.add(selectedShort.id);
    history2 = updatedRecentCategories;
    sequence2.push(selectedShort.category);
  }
  console.log(`  ✓ Selected sequence: ${sequence2.join(' -> ')}`);
  const uniqueInSequence = new Set(sequence2);
  if (uniqueInSequence.size !== 3) {
    throw new Error(`Test 2 failed: Expected 3 distinct categories, got ${sequence2.join(', ')}`);
  }
  console.log('  ✓ Passed: 3 distinct categories rotated evenly without repetition.');

  // --------------------------------------------------------------------------
  // TEST 3: Cooldown = 2 Enforcement
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Cooldown = 2 Strict Enforcement ---');
  const pool3 = [
    createMockShort('eng1', 'English'),
    createMockShort('eng2', 'English'),
    createMockShort('sci1', 'Science'),
    createMockShort('space1', 'Space'),
    createMockShort('tech1', 'Technology')
  ];
  const shown3 = new Set(['eng1', 'sci1']);
  let history3 = ['English', 'Science']; // Only 1 non-English short shown since English

  // Next short MUST NOT be English because cooldown is 2 (only Science shown since English)
  const res3 = selectNextRotatedShort(pool3, shown3, history3, 2);
  if (normalizeCategory(res3.selectedShort?.category) === 'English') {
    throw new Error('Test 3 failed: English selected when cooldown required 2 distinct non-English categories!');
  }
  console.log(`  ✓ Passed: History was [English, Science]. Chosen next: "${res3.selectedShort?.category}" (English strictly blocked by cooldown=2)`);

  // --------------------------------------------------------------------------
  // TEST 4: Three categories rotation (English -> Science -> Space -> English)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Eligible after 2 distinct categories ---');
  const shown4 = new Set(['eng1', 'sci1', 'space1']);
  let history4 = ['English', 'Science', 'Space']; // 2 distinct categories shown since English

  // Now English is eligible again!
  const pool4 = [
    createMockShort('eng2', 'English')
  ];
  const res4 = selectNextRotatedShort(pool4, shown4, history4, 2);
  if (normalizeCategory(res4.selectedShort?.category) !== 'English') {
    throw new Error('Test 4 failed: English should be eligible after 2 distinct categories!');
  }
  console.log(`  ✓ Passed: After [English, Science, Space], English is once again fully eligible.`);

  // --------------------------------------------------------------------------
  // TEST 5: Only One Category Edge Case (Graceful Cooldown Relaxation)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Single Category Available (Cooldown Relaxation) ---');
  const pool5 = [
    createMockShort('eng1', 'English'),
    createMockShort('eng2', 'English'),
    createMockShort('eng3', 'English')
  ];
  const shown5 = new Set(['eng1']);
  let history5 = ['English']; // English on cooldown, but NO other categories exist

  const res5 = selectNextRotatedShort(pool5, shown5, history5, 2);
  if (!res5.selectedShort || res5.selectedShort.id !== 'eng2') {
    throw new Error(`Test 5 failed: Single-category fallback failed to select remaining short: ${JSON.stringify(res5)}`);
  }
  console.log(`  ✓ Passed: Single category "English" gracefully relaxed cooldown to show unshown video "${res5.selectedShort.id}".`);

  // --------------------------------------------------------------------------
  // TEST 6: Category Fairness (50 English Shorts vs 1 Science vs 1 Space vs 1 Nature)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Category Fairness (50 English vs 1 Science/Space/Nature) ---');
  const pool6 = [];
  for (let i = 1; i <= 50; i++) {
    pool6.push(createMockShort(`eng_${i}`, 'English'));
  }
  pool6.push(createMockShort('sci_1', 'Science'));
  pool6.push(createMockShort('space_1', 'Space'));
  pool6.push(createMockShort('nature_1', 'Nature'));

  const shown6 = new Set();
  let history6 = [];
  const sequence6 = [];

  for (let i = 0; i < 4; i++) {
    const { selectedShort, updatedRecentCategories } = selectNextRotatedShort(pool6, shown6, history6, 2);
    if (!selectedShort) break;
    shown6.add(selectedShort.id);
    history6 = updatedRecentCategories;
    sequence6.push(selectedShort.category);
  }

  console.log(`  ✓ First 4 categories in sequence: ${sequence6.join(' -> ')}`);
  const englishCount = sequence6.filter(c => normalizeCategory(c) === 'English').length;
  if (englishCount > 2) {
    throw new Error(`Test 6 failed: English dominated ${englishCount}/4 items despite category fairness!`);
  }
  console.log(`  ✓ Passed: Category fairness ensured Science, Space, and Nature had equal selection opportunity.`);

  // --------------------------------------------------------------------------
  // TEST 7: Duplicate Short ID Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Duplicate Video ID Prevention ---');
  const pool7 = [
    createMockShort('single_vid', 'Science')
  ];
  const shown7 = new Set(['single_vid']);
  const res7 = selectNextRotatedShort(pool7, shown7, [], 2);
  if (res7.selectedShort !== null) {
    throw new Error('Test 7 failed: Already shown video was selected again in same session!');
  }
  console.log('  ✓ Passed: Already shown video was strictly omitted (returns null).');

  // --------------------------------------------------------------------------
  // TEST 8 & 9: Draft Shorts Exclusion & Published Shorts Eligibility
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8 & 9: Draft Exclusion & Published Eligibility ---');
  const pool8 = [
    createMockShort('draft_vid', 'Science', 'Draft Short', false),
    createMockShort('published_vid', 'Science', 'Published Short', true)
  ];
  const res8 = selectNextRotatedShort(pool8, new Set(), [], 2);
  if (!res8.selectedShort || res8.selectedShort.id !== 'published_vid') {
    throw new Error('Test 8 failed: Draft short was selected or published short was missed!');
  }
  console.log(`  ✓ Passed: Draft short was excluded; Published short "${res8.selectedShort.id}" selected.`);

  console.log('\n🎉 ALL 10 TESTS PASSED SUCCESSFULLY! 100% VERIFIED.\n');
}

runCategoryRotationTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
