// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: HEADER VS CARD IMAGE SEPARATION TEST SUITE
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedChecks++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedChecks++;
  }
}

console.log('=================================================================');
console.log('  EDTECHRA CLASSROOM HEADER VS CARD IMAGE SEPARATION SUITE        ');
console.log('=================================================================\n');

// ----------------------------------------------------------------------------
// 1. DEFAULT CLASSROOM HEADER IMAGE ASSET
// ----------------------------------------------------------------------------
console.log('--- 1. Default Classroom Header Asset ---');
const defaultHeaderAsset = path.join(rootDir, 'public/images/classroom/edtechra-default-classroom-header.png');
assert(fs.existsSync(defaultHeaderAsset), 'Default classroom header image exists in public/images/classroom/');
const assetStat = fs.statSync(defaultHeaderAsset);
assert(assetStat.size > 10000, `Default header image has valid size (${Math.round(assetStat.size / 1024)} KB)`);

// ----------------------------------------------------------------------------
// 2. DATABASE MIGRATION SCRIPT
// ----------------------------------------------------------------------------
console.log('\n--- 2. Database Migration Script ---');
const migrationPath = path.join(rootDir, 'supabase/migrations/20261026000000_classroom_header_image.sql');
assert(fs.existsSync(migrationPath), 'Migration 20261026000000_classroom_header_image.sql exists');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');
assert(migrationSql.includes('classroom_header_image TEXT'), 'Migration adds dedicated classroom_header_image column');
assert(migrationSql.includes('ALTER TABLE public.classrooms'), 'Migration alters classrooms table safely');

// ----------------------------------------------------------------------------
// 3. TYPESCRIPT TYPE DEFINITIONS
// ----------------------------------------------------------------------------
console.log('\n--- 3. Classroom Type Definitions ---');
const typePath = path.join(rootDir, 'src/types/classroom.ts');
const typeContent = fs.readFileSync(typePath, 'utf8');
assert(typeContent.includes('classroom_header_image?: string | null;'), 'Classroom interface has dedicated classroom_header_image field');
assert(typeContent.includes('banner_url?: string | null;'), 'Classroom interface retains banner_url field for card thumbnail');

// ----------------------------------------------------------------------------
// 4. UTILITIES AND FALLBACK HELPER
// ----------------------------------------------------------------------------
console.log('\n--- 4. Classroom Cover Utilities ---');
const coversUtilPath = path.join(rootDir, 'src/utils/classroomCovers.ts');
const coversUtilContent = fs.readFileSync(coversUtilPath, 'utf8');
assert(coversUtilContent.includes('DEFAULT_CLASSROOM_HEADER_IMAGE'), 'Defines DEFAULT_CLASSROOM_HEADER_IMAGE constant');
assert(coversUtilContent.includes('getClassroomHeaderImage'), 'Defines getClassroomHeaderImage helper');
assert(coversUtilContent.includes('getClassroomCardCover'), 'Defines getClassroomCardCover helper');

// ----------------------------------------------------------------------------
// 5. CLASSROOM CARD ISOLATION (THUMBNAIL)
// ----------------------------------------------------------------------------
console.log('\n--- 5. Classroom Card Isolation ---');
const cardPath = path.join(rootDir, 'src/components/classes/ClassroomCard.tsx');
const cardContent = fs.readFileSync(cardPath, 'utf8');
assert(cardContent.includes('getClassroomCardCover'), 'ClassroomCard uses getClassroomCardCover');
assert(!cardContent.includes('classroom_header_image'), 'ClassroomCard does not touch classroom_header_image');

// ----------------------------------------------------------------------------
// 6. CLASSROOM HEADER FULL-BLEED COVER & OVERLAY
// ----------------------------------------------------------------------------
console.log('\n--- 6. Classroom Header Full-Bleed Cover & Overlay ---');
const detailPagePath = path.join(rootDir, 'src/pages/classes/ClassroomDetailPage.tsx');
const detailPageContent = fs.readFileSync(detailPagePath, 'utf8');
assert(detailPageContent.includes('getClassroomHeaderImage(classroom.classroom_header_image)'),
  'ClassroomDetailPage retrieves header cover via getClassroomHeaderImage');
assert(detailPageContent.includes('object-cover'),
  'ClassroomDetailPage header cover uses object-fit: cover');
assert(detailPageContent.includes('bg-gradient-to-r') && detailPageContent.includes('backdrop-blur'),
  'ClassroomDetailPage header provides a multi-stop overlay for readable classroom information');
assert(detailPageContent.includes('Customize Header'),
  'ClassroomDetailPage provides direct header customization entry for teachers');

const headerCompPath = path.join(rootDir, 'src/components/classes/ClassroomHeader.tsx');
const headerCompContent = fs.readFileSync(headerCompPath, 'utf8');
assert(headerCompContent.includes('getClassroomHeaderImage(classroom.classroom_header_image)'),
  'ClassroomHeader component retrieves header cover via getClassroomHeaderImage');
assert(headerCompContent.includes('object-cover'),
  'ClassroomHeader component uses object-fit: cover');

// ----------------------------------------------------------------------------
// 7. EDIT CLASSROOM MODAL INDEPENDENT UPLOAD & RESET
// ----------------------------------------------------------------------------
console.log('\n--- 7. Edit Classroom Modal Independent Upload & Reset ---');
const editModalPath = path.join(rootDir, 'src/components/classes/EditClassroomModal.tsx');
const editModalContent = fs.readFileSync(editModalPath, 'utf8');
assert(editModalContent.includes('cardFile') && editModalContent.includes('headerFile'),
  'EditClassroomModal manages separate cardFile and headerFile upload states');
assert(editModalContent.includes('cardPreviewUrl') && editModalContent.includes('headerPreviewUrl'),
  'EditClassroomModal manages separate preview URLs for card and header');
assert(editModalContent.includes('handleRemoveCard') && editModalContent.includes('handleRemoveHeader'),
  'EditClassroomModal supports independent reset for card thumbnail and header cover');
assert(editModalContent.includes('uploadClassroomCover') && editModalContent.includes('uploadClassroomHeaderImage'),
  'EditClassroomModal calls independent upload methods for card and header');
assert(editModalContent.includes('DEFAULT_CLASSROOM_HEADER_IMAGE'),
  'EditClassroomModal falls back to DEFAULT_CLASSROOM_HEADER_IMAGE for header reset');

// ----------------------------------------------------------------------------
// 8. SERVICE LAYER INDEPENDENT STORAGE & PERSISTENCE
// ----------------------------------------------------------------------------
console.log('\n--- 8. Service Layer Persistence ---');
const servicePath = path.join(rootDir, 'src/services/classroomService.ts');
const serviceContent = fs.readFileSync(servicePath, 'utf8');
assert(serviceContent.includes('classroom_header_image: string | null'),
  'updateClassroom supports updating classroom_header_image');
assert(serviceContent.includes('uploadClassroomHeaderImage'),
  'classroomService provides dedicated uploadClassroomHeaderImage method');
assert(serviceContent.includes('cleanupClassroomHeaderImage'),
  'classroomService provides dedicated cleanupClassroomHeaderImage method');

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n=================================================================');
console.log(`  VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
if (failedChecks > 0) {
  console.error(`  ${failedChecks} CHECKS FAILED!`);
  process.exit(1);
} else {
  console.log('  ALL CHECKS PASSED SUCCESSFULLY! ✓');
  console.log('=================================================================');
}
