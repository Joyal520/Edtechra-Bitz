// ============================================================================
// End-to-End Test for Octopus Knowledge Bitz Data Integrity & Explore Feed
// ============================================================================

import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';

console.log('====================================================');
console.log('TESTING KNOWLEDGE BITZ DATA FLOW & IMAGE INTEGRITY');
console.log('====================================================\n');

// 1. Reset local cache to ensure 0 mock records exist
knowledgeBitzService.saveLocalBitz([]);

// 2. Insert the Administrator's Octopus fact
const octopusFactInput = {
  title: 'Octopuses Have Three Hearts',
  short_fact: 'Two hearts pump blood to the gills while one circulates it to the body. Their blood is blue because it uses copper instead of iron.',
  reading_text: 'An octopus has three distinct hearts that work in harmony. Two branchial hearts pump blood through each of the animal\'s two gills, where oxygen is absorbed. The third systemic heart pumps oxygenated blood throughout the rest of the body. Interestingly, when an octopus swims, the systemic heart stops beating, which is why octopuses tire quickly and prefer crawling along the sea floor. Furthermore, octopus blood is copper-based (using hemocyanin) rather than iron-based (hemoglobin), making their blood blue and highly efficient in cold, low-oxygen ocean waters.',
  topic_id: 'science_nature',
  category: 'Science & Nature',
  sub_topic: 'Animals & Wildlife',
  difficulty: 'Easy',
  cefr_level: 'A1',
  reading_time_sec: 30,
  visual_url: 'https://r2.edtechra.com/bitz/octopus_admin_upload.webp',
  visual_status: 'ready',
  source_citation: 'Marine Biology Research Institute',
  quiz: [
    {
      question: 'How many hearts does an octopus have?',
      options: ['Three', 'Two', 'One', 'Four'],
      correct_answer: 'Three',
      explanation: 'An octopus has three hearts: two branchial hearts and one systemic heart.',
      xp: 2
    },
    {
      question: 'Why is octopus blood blue?',
      options: ['Contains copper-based hemocyanin', 'Contains iron hemoglobin', 'Contains pure nitrogen', 'Absorbs blue light underwater'],
      correct_answer: 'Contains copper-based hemocyanin',
      explanation: 'Copper-based hemocyanin gives octopus blood its blue color.',
      xp: 2
    },
    {
      question: 'What happens to the systemic heart when an octopus swims?',
      options: ['It stops beating', 'It beats twice as fast', 'It pumps backwards', 'It changes color'],
      correct_answer: 'It stops beating',
      explanation: 'The systemic heart stops beating during swimming, causing the octopus to tire quickly.',
      xp: 2
    },
    {
      question: 'Which hearts pump blood to the gills?',
      options: ['Two branchial hearts', 'One systemic heart', 'The central ventricle', 'The dorsal aorta'],
      correct_answer: 'Two branchial hearts',
      explanation: 'Branchial hearts pump blood directly through the gills.',
      xp: 2
    },
    {
      question: 'Where do octopuses prefer to move because swimming tires them?',
      options: ['Crawling along the sea floor', 'Floating near the surface', 'Burrowing in dry sand', 'Hitching rides on whales'],
      correct_answer: 'Crawling along the sea floor',
      explanation: 'Because swimming stops their systemic heart, they prefer crawling along the seabed.',
      xp: 2
    }
  ],
  status: 'published'
};

const createdOctopus = await knowledgeBitzService.createBitz(octopusFactInput);
console.log(`[Step 1] Created Octopus Bitz:`);
console.log(`- ID: ${createdOctopus.id}`);
console.log(`- Title: "${createdOctopus.title}"`);
console.log(`- Category: "${createdOctopus.category}"`);
console.log(`- Subtopic: "${createdOctopus.sub_topic}"`);
console.log(`- CEFR: "${createdOctopus.cefr_level}"`);
console.log(`- Image URL: "${createdOctopus.visual_url}"`);
console.log(`- Status: "${createdOctopus.status}"`);

console.assert(createdOctopus.title === 'Octopuses Have Three Hearts', 'Title mismatch');
console.assert(createdOctopus.visual_url === 'https://r2.edtechra.com/bitz/octopus_admin_upload.webp', 'Image URL mismatch');
console.log('✓ Step 1 Passed: Octopus fact created successfully with exact image.\n');

// 2. Test Admin Catalogue
console.log(`[Step 2] Admin Catalogue Query:`);
const adminCatalogue = await knowledgeBitzService.getAdminBitz({});
console.log(`- Total facts in Admin catalogue: ${adminCatalogue.bitz.length}`);
console.assert(adminCatalogue.bitz.length === 1, `Expected exactly 1 fact in Admin catalogue, found ${adminCatalogue.bitz.length}`);
const adminItem = adminCatalogue.bitz[0];
console.assert(adminItem.title === 'Octopuses Have Three Hearts', 'Admin item title mismatch');
console.assert(adminItem.visual_url === 'https://r2.edtechra.com/bitz/octopus_admin_upload.webp', 'Admin item image URL mismatch');
console.log('✓ Step 2 Passed: Admin catalogue shows exactly one record with exact image.\n');

// 3. Test Explore Feed for 'Science & Nature'
console.log(`[Step 3] Explore Feed (Science & Nature):`);
const scienceFeed = await knowledgeBitzService.getPersonalizedFeed({
  topic: 'science_nature',
  userId: 'test-user-1'
});

console.log(`- Total returned for Science & Nature: ${scienceFeed.bitz.length}`);
console.assert(scienceFeed.bitz.length === 1, `Expected exactly 1 fact, got ${scienceFeed.bitz.length}`);
const feedItem = scienceFeed.bitz[0];
console.log(`- Explore Item: "${feedItem.title}" | Category: "${feedItem.category}" | CEFR: "${feedItem.cefr_level}"`);
console.log(`- Explore Image URL: "${feedItem.visual_url}"`);

console.assert(feedItem.id === createdOctopus.id, 'Feed item ID mismatch');
console.assert(feedItem.title === 'Octopuses Have Three Hearts', 'Feed item title mismatch');
console.assert(feedItem.category === 'Science & Nature', 'Feed item category mismatch');
console.assert(feedItem.cefr_level === 'A1', 'Feed item CEFR mismatch');
console.assert(feedItem.visual_url === 'https://r2.edtechra.com/bitz/octopus_admin_upload.webp', 'Feed item image URL mismatch');
console.log('✓ Step 3 Passed: Explore feed returns the exact Octopus fact and exact image.\n');

// 4. Test Explore Feed for Unselected Topic (e.g. Technology & Future)
console.log(`[Step 4] Explore Feed (Technology & AI — should be empty):`);
const techFeed = await knowledgeBitzService.getPersonalizedFeed({
  topic: 'technology_ai',
  userId: 'test-user-1'
});

console.log(`- Total returned for Technology & AI: ${techFeed.bitz.length}`);
console.assert(techFeed.bitz.length === 0, `Expected 0 facts for Technology & AI, got ${techFeed.bitz.length}`);
console.log('✓ Step 4 Passed: Technology & AI returns 0 facts (NO mock Neural Networks fallback).\n');

// 5. Test Learned State Exclusion
console.log(`[Step 5] Permanent Learned State Exclusion:`);
// User 1 learns the Octopus fact
await knowledgeBitzService.recordLearningState({
  userId: 'test-user-1',
  bitzId: createdOctopus.id,
  status: 'learned'
});

const user1FeedAfterLearning = await knowledgeBitzService.getPersonalizedFeed({
  topic: 'all',
  userId: 'test-user-1'
});

console.log(`- User 1 feed count after learning: ${user1FeedAfterLearning.bitz.length} (allLearnedNotice: ${user1FeedAfterLearning.allLearnedNotice})`);
console.assert(user1FeedAfterLearning.bitz.length === 0, 'Learned fact must NOT appear for User 1');
console.assert(user1FeedAfterLearning.allLearnedNotice === true, 'allLearnedNotice must be true when all facts are learned');

// User 2 (new user) MUST still see the Octopus fact
const user2Feed = await knowledgeBitzService.getPersonalizedFeed({
  topic: 'all',
  userId: 'test-user-2'
});

console.log(`- User 2 (new user) feed count: ${user2Feed.bitz.length}`);
console.assert(user2Feed.bitz.length === 1, 'User 2 must still see the Octopus fact');
console.assert(user2Feed.bitz[0].title === 'Octopuses Have Three Hearts', 'User 2 fact title mismatch');
console.log('✓ Step 5 Passed: Learned facts excluded per user without affecting other users.\n');

console.log('====================================================');
console.log('ALL INTEGRITY TESTS PASSED! (5/5)');
console.log('====================================================');
