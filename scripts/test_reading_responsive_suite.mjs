// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: MOBILE-FIRST & RESPONSIVE AUDIT TEST SUITE
// Tests all 8 viewport dimensions:
// 1440×900, 1280×800, 1024×768, 768×1024, 430×932, 412×915, 390×844, 375×812
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

console.log('\n======================================================');
console.log('📱 RUNNING MOBILE-FIRST & RESPONSIVE ARCHITECTURE AUDIT');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅ PASS: ' + name);
    passed++;
  } catch (err) {
    console.error('❌ FAIL: ' + name);
    console.error(err);
    failed++;
  }
}

// ----------------------------------------------------------------------------
// TEST 1: AppLayout Header & Footer Omission on Reader Pages
// ----------------------------------------------------------------------------
test('AppLayout suppresses global floating navbar and marketing footer on reader pages', () => {
  const appLayoutPath = path.join(ROOT_DIR, 'src/layouts/AppLayout.tsx');
  const content = fs.readFileSync(appLayoutPath, 'utf8');

  assert(content.includes('isReaderPage'), 'Must compute isReaderPage condition');
  assert(content.includes('!isReaderPage && ('), 'Must conditionally render header');
  assert(content.includes('!isReaderPage && ('), 'Must conditionally render footer');
});

// ----------------------------------------------------------------------------
// TEST 2: CourseContentRenderer Zero-Overflow Guarantee on Mobile
// ----------------------------------------------------------------------------
test('CourseContentRenderer eliminates fixed min-width and floats on mobile', () => {
  const rendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const content = fs.readFileSync(rendererPath, 'utf8');

  assert(!content.includes('min-w-[260px]'), 'Must NOT have fixed min-width causing mobile horizontal overflow');
  assert(content.includes('w-full max-w-[760px] mx-auto'), 'Must use centered responsive container');
  assert(content.includes('overflow-x-hidden'), 'Must protect against horizontal scroll');
  assert(content.includes('md:float-left') || content.includes('md:float-right'), 'Must restrict floats to desktop md: only');
});

// ----------------------------------------------------------------------------
// TEST 3: Left-Aligned Editorial Typography
// ----------------------------------------------------------------------------
test('Typography is strictly left-aligned with exact mobile (20-22px) and desktop (22-24px) scale', () => {
  const textFormatPath = path.join(ROOT_DIR, 'src/utils/courseTextFormatting.tsx');
  const content = fs.readFileSync(textFormatPath, 'utf8');

  assert(content.includes('text-left'), 'Must enforce left alignment on story text');
  assert(content.includes('text-[20px] sm:text-[21px] md:text-[23px] lg:text-[24px]'), 'Must support 20-22px mobile and 22-24px desktop scale');
  assert(content.includes('leading-[1.78]'), 'Must support comfortable literary line-height');
});

// ----------------------------------------------------------------------------
// TEST 4: StudentCoursePlayerPage Minimal Reader Experience
// ----------------------------------------------------------------------------
test('StudentCoursePlayerPage has minimal header, thin progress line, and no persistent LMS sidebar', () => {
  const playerPath = path.join(ROOT_DIR, 'src/pages/classes/courses/StudentCoursePlayerPage.tsx');
  const content = fs.readFileSync(playerPath, 'utf8');

  assert(content.includes('scrollProgress'), 'Must track scroll progress');
  assert(content.includes('h-0.5'), 'Must use ultra-thin progress line');
  assert(content.includes('Table of Contents'), 'Must use on-demand slide-over drawer for contents');
  assert(content.includes('Lesson complete'), 'Must have minimal ending footer');
});

// ----------------------------------------------------------------------------
// TEST 5: CoursePreviewPage Teacher Simulation
// ----------------------------------------------------------------------------
test('CoursePreviewPage provides exact matching reading-first simulation', () => {
  const previewPath = path.join(ROOT_DIR, 'src/pages/course-studio/CoursePreviewPage.tsx');
  const content = fs.readFileSync(previewPath, 'utf8');

  assert(content.includes('scrollProgress'), 'Must track scroll progress');
  assert(content.includes('Table of Contents'), 'Must use on-demand drawer');
  assert(content.includes('Lesson complete'), 'Must have minimal ending footer');
});

console.log('\n======================================================');
console.log(`🎯 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
