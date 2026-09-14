import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import http from 'http';
import app from '../server.mjs';

const server = http.createServer(app);
server.listen(0, async () => {
  const port = server.address().port;
  console.log('Server listening on port', port);
  const classroomId = '7c896a5c-6e95-46f0-98d1-3f0d5598d156';

  // 1. Test /courses with mock admin
  const res1 = await fetch('http://localhost:' + port + '/api/classes/' + classroomId + '/courses', {
    headers: { 'x-mock-admin': 'true' }
  });
  console.log('Mock admin /courses status:', res1.status, await res1.json());

  // 2. Test /courses with invalid/undefined classroomId
  const res2 = await fetch('http://localhost:' + port + '/api/classes/undefined/courses', {
    headers: { 'x-mock-admin': 'true' }
  });
  console.log('Undefined classroomId /courses status:', res2.status, await res2.json());

  // 3. Test active session
  const res3 = await fetch('http://localhost:' + port + '/api/classes/' + classroomId + '/live-quiz/active-session');
  console.log('Active session status:', res3.status, await res3.json());

  // 4. Test active session with undefined classroomId
  const res4 = await fetch('http://localhost:' + port + '/api/classes/undefined/live-quiz/active-session');
  console.log('Undefined active session status:', res4.status, await res4.json());

  // 5. Test Course Studio courses
  const res5 = await fetch('http://localhost:' + port + '/api/course-studio/courses', {
    headers: { 'x-mock-admin': 'true' }
  });
  console.log('Course studio courses status:', res5.status, await res5.json());

  // 6. Test Teaching Intelligence
  console.log('Testing /api/classes/' + classroomId + '/teaching-intelligence ...');
  const res6 = await fetch('http://localhost:' + port + '/api/classes/' + classroomId + '/teaching-intelligence', {
    headers: { 'x-mock-admin': 'true' }
  });
  console.log('Teaching intelligence status:', res6.status, res6.headers.get('content-type'));
  const text6 = await res6.text();
  console.log('Teaching intelligence body:', text6.slice(0, 300));

  server.close();
  process.exit(0);
});
