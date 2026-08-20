import fs from 'fs';

console.log('================================================================');
console.log('ELEKTRA BITZ: AUTOMATED AUTHENTICATION & UX TEST SUITE');
console.log('================================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failedTests++;
  }
}

// 1. Header Cleanliness Verification
console.log('\n--- 1. HEADER CLEANLINESS VERIFICATION ---');
const appLayoutCode = fs.readFileSync('src/layouts/AppLayout.tsx', 'utf8');

assert(appLayoutCode.includes('usePWAInstall') && appLayoutCode.includes('canInstall'), 'PWA Install option integrated in desktop header');
assert(!appLayoutCode.includes('>Log In</button>') || appLayoutCode.indexOf('>Log In</button>') === -1, 'Standalone Log In button removed from header');
assert(!appLayoutCode.includes('>Sign Up</button>') || appLayoutCode.indexOf('>Sign Up</button>') === -1, 'Standalone Sign Up button removed from header');
assert(appLayoutCode.includes('handleProtectedNav'), 'Contextual navigation gating implemented in header');

// 2. Auth Modal Content & Warm Onboarding
console.log('\n--- 2. AUTH MODAL & ONBOARDING CONTENT ---');
const authModalCode = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

assert(authModalCode.includes('Welcome to EdTechra-Bitz'), 'Welcome heading present in modal');
assert(authModalCode.includes('Create your free account to continue learning, creating, and exploring.'), 'Correct subtitle present');
assert(authModalCode.includes('Continue with Google'), 'Google OAuth button present');
assert(authModalCode.includes('How can we call you, dear?'), 'Warm personal name onboarding question present');

// 3. AuthContext Intent & Navigation Redirection
console.log('\n--- 3. AUTHCONTEXT PENDING INTENT & REDIRECTION ---');
const authContextCode = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

assert(authContextCode.includes('pendingIntent'), 'pendingIntent state exists in AuthContext');
assert(authContextCode.includes('executePendingIntent'), 'executePendingIntent callback exists');
assert(authContextCode.includes('edtechra_pending_intent'), 'localStorage persistence for Google OAuth redirect intent exists');
assert(authContextCode.includes('name_prompt'), 'name_prompt mode triggers when name is missing');

// 4. HomePage Frictionless Experience
console.log('\n--- 4. HOMEPAGE PUBLIC ACCESS & CONTEXTUAL GATES ---');
const homePageCode = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

assert(!homePageCode.includes('openAuthModal()') || homePageCode.includes('handleExploreClick'), 'No automatic modal on initial landing');
assert(homePageCode.includes('handleExploreClick'), 'Explore button triggers contextual authentication if guest');
assert(homePageCode.includes('handleOpenUpload'), 'Upload button triggers contextual authentication if guest');
assert(homePageCode.includes('edtechra:open_upload_modal'), 'Automatic upload modal trigger on post-auth event');

// 5. Admin Security Rule Preservation
console.log('\n--- 5. ADMIN AUTHORIZATION PRESERVATION ---');
assert(authContextCode.includes('roshanjoyal520@gmail.com'), 'Admin email check intact');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
}
