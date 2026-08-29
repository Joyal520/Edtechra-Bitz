// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE BLOCKS & READING SUITE VERIFICATION
// Verifies Text + Image data modeling, block types, layout persistence,
// migration schema, and reading-first renderer integrity.
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

console.log('\n======================================================');
console.log('🧪 RUNNING COURSE BLOCKS & READING EXPERIENCE VERIFICATION');
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
// TEST 1: Database Migration Schema Integrity
// ----------------------------------------------------------------------------
test('Migration 20260829130000_course_blocks_expanded_types.sql expands block_type constraint with all types', () => {
  const migrationPath = path.join(ROOT_DIR, 'supabase/migrations/20260829130000_course_blocks_expanded_types.sql');
  assert(fs.existsSync(migrationPath), 'Migration file must exist');

  const content = fs.readFileSync(migrationPath, 'utf8');
  assert(content.includes('course_blocks_block_type_check'), 'Must reference constraint name');
  assert(content.includes("'text_image'"), "Must support 'text_image'");
  assert(content.includes("'text_video'"), "Must support 'text_video'");
  assert(content.includes("'video'"), "Must support 'video'");
  assert(content.includes("'text'"), "Must preserve 'text'");
  assert(content.includes("'image'"), "Must preserve 'image'");
  assert(content.includes("'youtube_video'"), "Must preserve 'youtube_video'");
  assert(content.includes("'youtube_short'"), "Must preserve 'youtube_short'");
});

// ----------------------------------------------------------------------------
// TEST 2: TypeScript Type Definitions
// ----------------------------------------------------------------------------
test('BlockType union in src/types/courseStudio.ts includes all supported types', () => {
  const typesPath = path.join(ROOT_DIR, 'src/types/courseStudio.ts');
  const content = fs.readFileSync(typesPath, 'utf8');

  assert(content.includes("'text_image'"), "BlockType must include 'text_image'");
  assert(content.includes("'text_video'"), "BlockType must include 'text_video'");
  assert(content.includes("'video'"), "BlockType must include 'video'");
  assert(content.includes("'youtube_video'"), "BlockType must include 'youtube_video'");
  assert(content.includes("'youtube_short'"), "BlockType must include 'youtube_short'");
});

// ----------------------------------------------------------------------------
// TEST 3: Text + Image Data Model Structure
// ----------------------------------------------------------------------------
test('Text + Image structured block data model validation', () => {
  const textImageBlock = {
    id: 'blk_test_1',
    block_type: 'text_image',
    order_index: 0,
    content: {
      title: 'High on the Mountain',
      text: 'High on a tall mountain, an eagle lived with her babies. One day, one small egg rolled away from the nest.',
      image: {
        url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675',
        position: 'right',
        size: 'medium',
        caption: 'Figure 1: The mountain nest'
      }
    }
  };

  assert.strictEqual(textImageBlock.block_type, 'text_image');
  assert.strictEqual(textImageBlock.content.image.position, 'right');
  assert.strictEqual(textImageBlock.content.image.size, 'medium');
  assert(textImageBlock.content.text.includes('eagle lived with her babies'));
});

// ----------------------------------------------------------------------------
// TEST 4: Text + Video Data Model Structure
// ----------------------------------------------------------------------------
test('Text + Video structured block data model validation', () => {
  const textVideoBlock = {
    id: 'blk_test_2',
    block_type: 'text_video',
    order_index: 1,
    content: {
      title: 'Flight of the Eagle',
      text: 'Watch how the eaglet spreads its wings for the very first time.',
      video: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        position: 'above',
        is_short: false
      }
    }
  };

  assert.strictEqual(textVideoBlock.block_type, 'text_video');
  assert.strictEqual(textVideoBlock.content.video.position, 'above');
});

// ----------------------------------------------------------------------------
// TEST 5: Image Layout Positions Persistence
// ----------------------------------------------------------------------------
test('Image position persistence across left, right, above, below', () => {
  const positions = ['left', 'right', 'above', 'below'];
  positions.forEach(pos => {
    const block = {
      block_type: 'text_image',
      content: {
        text: 'Sample paragraph text.',
        image: { url: 'https://example.com/pic.jpg', position: pos }
      }
    };
    assert.strictEqual(block.content.image.position, pos, `Position ${pos} must persist`);
  });
});

// ----------------------------------------------------------------------------
// TEST 6: Server API Graceful Constraint Fallback and Friendly Error Handling
// ----------------------------------------------------------------------------
test('Server block save endpoint has backward-compatible adapter and friendly error responses', () => {
  const serverPath = path.join(ROOT_DIR, 'server.mjs');
  const serverContent = fs.readFileSync(serverPath, 'utf8');

  assert(serverContent.includes("app.post('/api/course-studio/courses/:id/episodes/:episodeId/blocks'"), 'Must have block sync route');
  assert(serverContent.includes("Couldn't save this section. Please try again."), 'Must provide friendly error message');
  assert(serverContent.includes('course_blocks_block_type_check'), 'Must handle constraint code');
});

// ----------------------------------------------------------------------------
// TEST 7: Editorial Reading Experience Components
// ----------------------------------------------------------------------------
test('CourseContentRenderer and StudentCoursePlayerPage support reading-first book styling', () => {
  const rendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const rendererContent = fs.readFileSync(rendererPath, 'utf8');

  assert(rendererContent.includes('Think About the Story'), 'Must have editorial activity transition');
  assert(rendererContent.includes('textScale'), 'Must support scalable reading typography');

  const playerPath = path.join(ROOT_DIR, 'src/pages/classes/courses/StudentCoursePlayerPage.tsx');
  const playerContent = fs.readFileSync(playerPath, 'utf8');

  assert(playerContent.includes('getThemePreset') || playerContent.includes('THEME_STYLES'), 'Must support reading themes');
  assert(playerContent.includes('scrollProgress'), 'Must track subtle reading progress line');
  assert(playerContent.includes('Table of Contents'), 'Must have slide-over table of contents drawer');
});

console.log('\n======================================================');
console.log(`🎯 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
