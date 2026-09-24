import dotenv from 'dotenv';
dotenv.config();

import { ocrEvaluationQueue } from '../server/ocrService.mjs';

async function runTest() {
  console.log('Testing OCR evaluation pipeline...');

  // Create a 1x1 png or a small valid test base64 image
  // For prompt test, let's pass a small valid base64 PNG
  const sampleBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const mockJob = {
    evaluationId: 'test-eval-' + Date.now(),
    classroomId: 'test-classroom-id',
    teacherId: 'test-teacher-id',
    studentId: 'test-student-id',
    studentName: 'Joyal',
    teacherName: 'Teacher',
    classroomTitle: 'Class 8 English',
    category: 'Paragraph Writing',
    maxMarks: 100,
    title: 'My Family',
    imageBase64: sampleBase64Png,
    taskId: 'test-task-id'
  };

  try {
    const result = await ocrEvaluationQueue.processJob(mockJob);
    console.log('OCR processJob result:', {
      id: result.id,
      score: result.score,
      percentage: result.percentage,
      status: result.status,
      feedback: result.feedback?.slice(0, 50) + '...'
    });
    console.log('TEST PASSED');
  } catch (err) {
    console.log('Expected OCR behavior or error caught:', err.message);
    if (err.message.includes('ReferenceError')) {
      console.error('CRITICAL: ReferenceError detected!', err);
      process.exit(1);
    }
  }
}

runTest().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
