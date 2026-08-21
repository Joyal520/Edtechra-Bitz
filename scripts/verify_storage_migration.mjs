import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  putJsonContent,
  getJsonContent,
  getStorageStats,
  testR2Connection,
  buildReadingContentKey,
  buildQuizContentKey,
  buildPollContentKey,
  deleteObjects
} from '../server/r2Service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runTestSuite() {
  console.log('===============================================================');
  console.log('EDTECHRA-BITZ: CLOUDFLARE R2 CONTENT & MEDIA LIFECYCLE TEST');
  console.log('===============================================================');

  // 1. Diagnostics
  console.log('\n1. Testing R2 Diagnostics & Connectivity...');
  const diag = await testR2Connection();
  console.log('✓ Diagnostic result:', diag);
  if (!diag.success) throw new Error('R2 diagnostics failed.');

  // 2. Reading Storage
  console.log('\n2. Testing One-Minute Reading Content Storage in R2...');
  const readingKey = buildReadingContentKey('test-reading-999');
  const readingContent = {
    id: 'test-reading-999',
    title: 'The Wonders of Quantum Computing',
    paragraphs: [{ id: 1, text: 'Quantum computers use qubits instead of classic bits.' }],
    vocabulary: [{ word: 'qubit', definition: 'A basic unit of quantum information.' }]
  };
  await putJsonContent(readingKey, readingContent);
  const readBackReading = await getJsonContent(readingKey);
  console.log(`✓ Stored and read back Reading: "${readBackReading?.title}"`);
  if (readBackReading?.title !== readingContent.title) throw new Error('Reading content mismatch');

  // 3. Quiz Storage
  console.log('\n3. Testing Quiz Content Storage in R2...');
  const quizKey = buildQuizContentKey('test-quiz-999');
  const quizContent = {
    id: 'test-quiz-999',
    question: 'What is the speed of light in vacuum?',
    options: ['300,000 km/s', '150,000 km/s', '1,000 km/s', '3,000 km/s'],
    correct_answer: '300,000 km/s',
    explanation: 'Light travels at approximately 299,792 km/s in vacuum.'
  };
  await putJsonContent(quizKey, quizContent);
  const readBackQuiz = await getJsonContent(quizKey);
  console.log(`✓ Stored and read back Quiz: "${readBackQuiz?.question}"`);
  if (readBackQuiz?.question !== quizContent.question) throw new Error('Quiz content mismatch');

  // 4. Poll Storage
  console.log('\n4. Testing Poll Content Storage in R2...');
  const pollKey = buildPollContentKey('test-poll-999');
  const pollContent = {
    id: 'test-poll-999',
    question: 'Which programming language is your favorite?',
    options: ['TypeScript', 'Python', 'Rust', 'Go'],
    allow_multiple: false
  };
  await putJsonContent(pollKey, pollContent);
  const readBackPoll = await getJsonContent(pollKey);
  console.log(`✓ Stored and read back Poll: "${readBackPoll?.question}"`);
  if (readBackPoll?.question !== pollContent.question) throw new Error('Poll content mismatch');

  // 5. Storage Metrics
  console.log('\n5. Testing Live Storage Statistics...');
  const stats = await getStorageStats();
  console.log('✓ Storage Statistics:');
  console.log(`  • Bucket: ${stats.bucket}`);
  console.log(`  • Status: ${stats.status}`);
  console.log(`  • Masked Account: ${stats.maskedAccountId}`);
  console.log(`  • Total Objects: ${stats.totalObjects}`);
  console.log(`  • Estimated Storage: ${stats.estimatedStorageMB} MB (${stats.estimatedStorageGB} GB)`);
  console.log(`  • Readings: ${stats.readingsCount} | Quizzes: ${stats.quizzesCount} | Polls: ${stats.pollsCount} | Images: ${stats.imagesCount}`);

  // 6. Cleanup
  console.log('\n6. Cleaning up test objects from R2...');
  await deleteObjects([readingKey, quizKey, pollKey]);
  console.log('✓ Cleaned up all test keys.');

  console.log('\n===============================================================');
  console.log('🎉 ALL CLOUDFLARE R2 CONTENT STORAGE TESTS PASSED 100%!');
  console.log('===============================================================');
}

runTestSuite().catch(e => {
  console.error('\n❌ Test Suite Failed:', e);
  process.exit(1);
});
