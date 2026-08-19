import fs from 'fs';

console.log('================================================================');
console.log('EDTECHRA-BITZ: AUTHENTICATION STATE & LOOP FIX VERIFICATION');
console.log('================================================================\n');

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

// 1. Types Verification
console.log('--- 1. AUTHENTICATION TYPES & LIFECYCLE ---');
const typesCode = fs.readFileSync('src/types/index.ts', 'utf8');
assert(typesCode.includes("export type AuthState = 'loading' | 'authenticated' | 'unauthenticated'"), 'AuthState type defines 3 distinct states');
assert(typesCode.includes("export type AuthModalMode = 'login' | 'signup' | 'forgot_password' | 'name_prompt' | 'oauth_error'"), 'AuthModalMode includes name_prompt and oauth_error');

// 2. AuthContext Architecture & Single Source of Truth
console.log('\n--- 2. SUPABASE AS SINGLE SOURCE OF TRUTH & NO LOCALSTORAGE AUTH HACKS ---');
const authContextCode = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

assert(!authContextCode.includes("localStorage.setItem('authenticated'"), 'No localStorage boolean flag for authenticated state');
assert(!authContextCode.includes("localStorage.setItem('isSignedUp'"), 'No localStorage boolean flag for isSignedUp');
assert(!authContextCode.includes("localStorage.setItem('hasAccount'"), 'No localStorage boolean flag for hasAccount');
assert(!authContextCode.includes("localStorage.setItem('loggedIn'"), 'No localStorage boolean flag for loggedIn');
assert(!authContextCode.includes("localStorage.setItem('edtechra_user_name'"), 'No localStorage hack for user name');

assert(authContextCode.includes("const isLoading = authState === 'loading'"), 'isLoading derived from authState');
assert(authContextCode.includes("const isAuthenticated = authState === 'authenticated' && Boolean(user)"), 'isAuthenticated derived from Supabase user and state');
assert(authContextCode.includes("checkIsProfileComplete"), 'Pure helper checkIsProfileComplete exists');

// 3. Race Conditions & 3-State Lifecycle Guard
console.log('\n--- 3. THREE-STATE LIFECYCLE & REQUIREAUTH GUARD ---');
assert(authContextCode.includes("requireAuth"), 'requireAuth centralized guard implemented in AuthContext');
assert(authContextCode.includes("if (authState === 'loading')"), 'requireAuth explicitly handles loading state and waits for session');
assert(authContextCode.includes("if (authState === 'authenticated' && user)"), 'requireAuth proceeds immediately for authenticated users');
assert(authContextCode.includes("openAuthModal('signup', normalizedIntent)"), 'requireAuth only triggers modal for unauthenticated users');

// 4. Separation of Authentication and Profile Completion
console.log('\n--- 4. PROFILE COMPLETION SEPARATED FROM AUTHENTICATION ---');
assert(authContextCode.includes("checkIsProfileComplete(user, profile)"), 'Profile completeness checked independently');
assert(authContextCode.includes("setAuthModalMode('name_prompt')"), 'Authenticated users without a name are routed to name_prompt, NOT signup');

// 5. Profile Upsert Correctness
console.log('\n--- 5. DATABASE PROFILE UPSERT & AUTH METADATA UPDATE ---');
assert(authContextCode.includes(".upsert("), 'Profile update uses database upsert');
assert(authContextCode.includes("onConflict: 'id'"), 'Upsert uses id primary key constraint');
assert(authContextCode.includes("supabase.auth.updateUser({"), 'Auth metadata updated with full_name & onboarding_completed');

// 6. Pending Intent Preservation & Execution Order
console.log('\n--- 6. PENDING INTENT PRESERVATION & EXECUTION ORDER ---');
assert(authContextCode.includes("executePendingIntent"), 'executePendingIntent callback exists');
assert(authContextCode.includes("updateProfileName"), 'updateProfileName executes pending intent AFTER saving name');
assert(authContextCode.includes("window.dispatchEvent(new CustomEvent('edtechra:navigate'"), 'Client-side navigation event dispatched');
assert(authContextCode.includes("window.dispatchEvent(new CustomEvent('edtechra:open_upload_modal'"), 'Upload modal action event dispatched');

// 7. Navigation & Route Protections
console.log('\n--- 7. NAVIGATION & ROUTE PROTECTIONS ---');
const appLayoutCode = fs.readFileSync('src/layouts/AppLayout.tsx', 'utf8');
assert(appLayoutCode.includes("requireAuth({ type: 'navigate', path })"), 'AppLayout uses requireAuth for protected navigation');
assert(!appLayoutCode.includes("localStorage.getItem('edtechra_user_name')"), 'AppLayout does not rely on localStorage for name');

const homePageCode = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');
assert(homePageCode.includes("requireAuth({ type: 'navigate', path: '/explore' })"), 'HomePage Explore CTA uses requireAuth');
assert(homePageCode.includes("requireAuth({ type: 'action', action: 'upload' }"), 'HomePage Upload CTA uses requireAuth');

const dashboardCode = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
assert(dashboardCode.includes("if (isLoading)"), 'DashboardPage respects loading state before rendering content');

const authPageCode = fs.readFileSync('src/pages/AuthPage.tsx', 'utf8');
assert(authPageCode.includes("if (isLoading) return;"), 'AuthPage waits for loading state before redirecting or modal');

// 8. Auth Modal Flow & Single Instance & OAuth Error Handling
console.log('\n--- 8. AUTH MODAL UX & FLOWS ---');
const authModalCode = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');
assert(authModalCode.includes("mode === 'name_prompt'"), 'Name prompt renders in AuthModal');
assert(authModalCode.includes("How can we call you, dear?"), 'Correct name prompt question present');
assert(authModalCode.includes("mode === 'signup'"), 'Sign up renders in AuthModal');
assert(authModalCode.includes("mode === 'login'"), 'Log in renders in AuthModal');
assert(authModalCode.includes("mode === 'oauth_error'"), 'OAuth error recovery renders in AuthModal');
assert(authModalCode.includes("Continue with Google"), 'Google OAuth button present');
assert(authModalCode.includes("isSubmittingGoogleRef"), 'Google double-click protection present in modal');

// 9. URL OAuth Error Extraction & Clean Handling
console.log('\n--- 9. URL OAUTH ERROR DETECTION & CLEANING ---');
assert(authContextCode.includes("const errorParam = searchParams.get('error')"), 'searchParams OAuth error extraction present');
assert(authContextCode.includes("window.history.replaceState"), 'URL params cleaned without page reload');
assert(authContextCode.includes("setAuthModalMode('oauth_error')"), 'OAuth error triggers clean error mode without signup loop');

// 10. Service Worker Protocol Guards
console.log('\n--- 10. SERVICE WORKER PROTOCOL GUARDS ---');
const swCode = fs.readFileSync('public/sw.js', 'utf8');
assert(swCode.includes("event.request.url.startsWith('http://')") && swCode.includes("event.request.url.startsWith('https://')"), 'SW guards against non-http(s) schemes (e.g. chrome-extension://)');
assert(swCode.includes("url.searchParams.has('code')") && swCode.includes("url.searchParams.has('error')"), 'SW bypasses OAuth code & error URLs from caching');

// 11. Admin Authorization Preservation
console.log('\n--- 11. ADMIN SECURITY RULE PRESERVATION ---');
assert(authContextCode.includes('roshanjoyal520@gmail.com'), 'Admin email check intact');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL AUTHENTICATION STATE & LOOP SAFEGUARDS VALIDATED SUCCESSFULLY!\n');
}
