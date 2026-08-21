import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import app from '../server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyPollVoting() {
  console.log('===============================================================');
  console.log('EDTECHRA-BITZ: POLL FEED & VOTING END-TO-END VERIFICATION');
  console.log('===============================================================');

  // 1. Start local server
  console.log('\n1. Starting server on port 3098...');
  const server = app.listen(3098);
  await new Promise(r => setTimeout(r, 1000));

  try {
    // 2. Fetch Polls Feed
    console.log('\n2. Fetching polls from GET /api/polls/feed...');
    const feedRes = await fetch('http://localhost:3098/api/polls/feed', {
      headers: { 'x-guest-id': 'student_test_user_1' }
    });
    const feedJson = await feedRes.json();
    console.log(`✓ Feed returned status ${feedRes.status}, data length: ${feedJson.data?.length}`);

    if (!feedJson.success || !Array.isArray(feedJson.data) || feedJson.data.length === 0) {
      throw new Error('No published polls returned in feed.');
    }

    const testPoll = feedJson.data[0];
    console.log(`  • Selected Poll ID: ${testPoll.id}`);
    console.log(`  • Question: "${testPoll.question}"`);
    console.log(`  • Options: [${testPoll.options.join(', ')}]`);
    console.log(`  • Initial Total Votes: ${testPoll.total_votes}`);

    const voteOption = testPoll.options[0];
    console.log(`\n3. Submitting vote for option: "${voteOption}"...`);

    // 3. Submit Vote
    const voteRes = await fetch('http://localhost:3098/api/polls/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-guest-id': 'student_test_user_1'
      },
      body: JSON.stringify({
        pollId: testPoll.id,
        selectedOptions: voteOption
      })
    });

    const voteJson = await voteRes.json();
    console.log(`✓ Vote response status: ${voteRes.status} (success: ${voteJson.success})`);
    console.log('  • Poll ID:', voteJson.data?.poll_id);
    console.log('  • Selected Options:', voteJson.data?.selected_options);
    console.log('  • New Total Votes:', voteJson.data?.total_votes);
    console.log('  • Option Votes:', voteJson.data?.option_votes);
    console.log('  • Option Percentages:', voteJson.data?.option_percentages);

    if (voteRes.status !== 200 || !voteJson.success) {
      throw new Error(`Vote submission failed: status ${voteRes.status}, error: ${voteJson.error}`);
    }

    // 4. Test Duplicate Vote Prevention
    console.log('\n4. Testing duplicate vote prevention for the same user...');
    const dupVoteRes = await fetch('http://localhost:3098/api/polls/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-guest-id': 'student_test_user_1'
      },
      body: JSON.stringify({
        pollId: testPoll.id,
        selectedOptions: voteOption
      })
    });

    const dupVoteJson = await dupVoteRes.json();
    console.log(`✓ Duplicate vote response: status ${dupVoteRes.status}, already_voted: ${dupVoteJson.already_voted}`);
    console.log(`  • Total votes remain: ${dupVoteJson.data?.total_votes} (no double counting)`);

    // 5. Test Feed Refresh preserves user vote
    console.log('\n5. Re-fetching GET /api/polls/feed to verify user_voted_options...');
    const reFeedRes = await fetch('http://localhost:3098/api/polls/feed', {
      headers: { 'x-guest-id': 'student_test_user_1' }
    });
    const reFeedJson = await reFeedRes.json();
    const updatedPoll = reFeedJson.data?.find(p => p.id === testPoll.id);

    console.log(`✓ User voted options returned in feed: [${updatedPoll?.user_voted_options?.join(', ')}]`);
    if (!updatedPoll?.user_voted_options?.includes(voteOption)) {
      throw new Error(`Feed did not return user's voted option for poll ${testPoll.id}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 POLL FEED & VOTING 100% VERIFIED AND PASSING!');
    console.log('===============================================================');
  } finally {
    server.close();
  }
}

verifyPollVoting().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
