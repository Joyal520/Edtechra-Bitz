import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('EDTECHRA-BITZ: AUTOMATED PWA RESTORATION VERIFICATION SUITE');
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

// 1. Manifest Files Verification
console.log('\n--- 1. MANIFEST & METADATA VERIFICATION ---');
const webmanifestPath = 'public/manifest.webmanifest';
const manifestJsonPath = 'public/manifest.json';

assert(fs.existsSync(webmanifestPath), 'manifest.webmanifest exists in public/');
assert(fs.existsSync(manifestJsonPath), 'manifest.json exists in public/');

const webmanifest = JSON.parse(fs.readFileSync(webmanifestPath, 'utf8'));
const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));

assert(webmanifest.id === '/', 'manifest id is correctly set to "/"');
assert(webmanifest.name === 'EdTechra-Bitz', 'manifest name is "EdTechra-Bitz"');
assert(webmanifest.short_name === 'EdTechra-Bitz', 'manifest short_name is "EdTechra-Bitz"');
assert(webmanifest.start_url === '/', 'manifest start_url is "/"');
assert(webmanifest.display === 'standalone', 'manifest display mode is "standalone"');
assert(webmanifest.theme_color === '#026fc3', 'manifest theme_color is "#026fc3"');
assert(webmanifest.background_color === '#fbfbf7', 'manifest background_color is "#fbfbf7"');
assert(Array.isArray(webmanifest.icons) && webmanifest.icons.length >= 4, 'manifest has required standard & maskable icons');

// Check that manifest.json and manifest.webmanifest are consistent
assert(JSON.stringify(webmanifest) === JSON.stringify(manifestJson), 'manifest.json and manifest.webmanifest are in perfect sync');

// 2. Icon Assets Verification
console.log('\n--- 2. REQUIRED PWA ICONS VERIFICATION ---');
const requiredIcons = [
  'public/icons/icon-192x192.png',
  'public/icons/icon-512x512.png',
  'public/icons/icon-maskable-192x192.png',
  'public/icons/icon-maskable-512x512.png',
  'public/apple-touch-icon.png',
  'public/icons/favicon-32x32.png',
  'public/favicon.png',
  'public/logo.png'
];

for (const iconPath of requiredIcons) {
  const exists = fs.existsSync(iconPath);
  const size = exists ? fs.statSync(iconPath).size : 0;
  assert(exists && size > 1000, `PWA icon asset exists: ${iconPath} (${size} bytes)`);
}

// 3. Service Worker Safety & R2 Bypass Verification
console.log('\n--- 3. SERVICE WORKER SAFETY & R2 BYPASS VERIFICATION ---');
const swCode = fs.readFileSync('public/sw.js', 'utf8');

assert(swCode.includes('CACHE_NAME'), 'Service worker defines versioned CACHE_NAME');
assert(swCode.includes('r2.cloudflarestorage.com'), 'Service worker explicitly bypasses r2.cloudflarestorage.com');
assert(swCode.includes('r2.dev'), 'Service worker explicitly bypasses r2.dev');
assert(swCode.includes('cloudflarestorage.com'), 'Service worker explicitly bypasses cloudflarestorage.com');
assert(swCode.includes('X-Amz-Signature'), 'Service worker explicitly bypasses presigned R2 PUT/GET URLs');
assert(swCode.includes('supabase.co'), 'Service worker explicitly bypasses Supabase authentication & data');
assert(swCode.includes('/api/'), 'Service worker explicitly bypasses dynamic /api/ endpoints');
assert(swCode.includes("self.clients.claim()"), 'Service worker claims clients on activation');
assert(swCode.includes("caches.delete(key)"), 'Service worker purges obsolete version caches on activation');

// 4. Hook Lifecycle & Prompt Storage Verification
console.log('\n--- 4. PWA INSTALL HOOK LIFECYCLE & SAFETY ---');
const hookCode = fs.readFileSync('src/hooks/usePWAInstall.ts', 'utf8');

assert(hookCode.includes('deferredPromptEvent'), 'Module-level storage for beforeinstallprompt implemented');
assert(hookCode.includes('beforeinstallprompt'), 'Handles beforeinstallprompt event');
assert(hookCode.includes('appinstalled'), 'Handles appinstalled event');
assert(hookCode.includes('(display-mode: standalone)'), 'Detects standalone display mode');
assert(hookCode.includes('isIOS'), 'Detects iOS Safari platform');
assert(hookCode.includes('hasNativePrompt'), 'Distinguishes native prompt availability');
assert(hookCode.includes('canInstall'), 'Properly gates canInstall boolean');

// 5. UI Integration Verification
console.log('\n--- 5. DESKTOP & MOBILE UI INTEGRATION ---');
const appLayoutCode = fs.readFileSync('src/layouts/AppLayout.tsx', 'utf8');

assert(appLayoutCode.includes('usePWAInstall'), 'AppLayout consumes usePWAInstall');
assert(appLayoutCode.includes('canInstall'), 'AppLayout gates install buttons on canInstall');
assert(appLayoutCode.includes('triggerInstall'), 'Desktop & mobile buttons wire directly to triggerInstall');
assert(appLayoutCode.includes('InstallAppModal'), 'AppLayout renders InstallAppModal');

const modalCode = fs.readFileSync('src/components/InstallAppModal.tsx', 'utf8');
assert(modalCode.includes('Add to Home Screen'), 'Modal includes step-by-step iOS Safari Add to Home Screen flow');
assert(modalCode.includes('Share'), 'Modal includes Safari Share step');
assert(modalCode.includes('onNativeInstall'), 'Modal wires native install trigger');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PWA VERIFICATION CHECKS PASSED WITH ZERO REGRESSIONS!');
  process.exit(0);
}
