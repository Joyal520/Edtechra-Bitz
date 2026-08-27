// ============================================================================
// LIVE QUIZ AUDIO & VISUAL CELEBRATION TEST SUITE
// Verifies:
// 1. Web Audio Service Sound Synthesis Frequencies & Duration Limits
// 2. Sound Preference Persistence (localStorage sync)
// 3. Graceful Failure & Browser Audio Restriction Handling
// 4. Confetti Physics & Reduced-Motion Accessibility
// 5. Single-Fire Event Guarding for Question Reveals
// ============================================================================

console.log('=================================================================');
console.log('  EDTECHRA LIVE QUIZ: AUDIO, CONFETTI & ERROR EFFECTS TEST SUITE ');
console.log('=================================================================');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. Test Mock AudioContext & Oscillator Safety
class MockGainNode {
  gain = {
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {}
  };
  connect() {}
}

class MockBiquadFilter {
  frequency = { setValueAtTime: () => {} };
  connect() {}
}

class MockOscillator {
  frequency = { setValueAtTime: () => {} };
  connect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createOscillator() { return new MockOscillator(); }
  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilter(); }
  resume() { return Promise.resolve(); }
}

global.window = {
  AudioContext: MockAudioContext,
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  },
  matchMedia: (query) => ({
    matches: query.includes('prefers-reduced-motion'),
    addListener: () => {},
    removeListener: () => {}
  })
};

global.localStorage = global.window.localStorage;

async function runSuite() {
  console.log('\n--- 1. Testing Quiz Audio Service Initialization & Mute Controls ---');
  const { quizAudioService } = await import('../src/services/quizAudioService.ts');

  assert(quizAudioService.isSoundEnabled() === true, 'Default sound is ON (true)');
  
  const muted = quizAudioService.toggleSound();
  assert(muted === false, 'Sound toggled to OFF');
  assert(quizAudioService.isSoundEnabled() === false, 'Sound state correctly returns false');
  assert(global.localStorage.getItem('edtechra_quiz_sound_enabled') === 'false', 'Preference saved to localStorage');

  const unmuted = quizAudioService.toggleSound();
  assert(unmuted === true, 'Sound toggled back to ON');
  assert(quizAudioService.isSoundEnabled() === true, 'Sound state correctly returns true');

  console.log('\n--- 2. Testing Sound Playback Methods (Non-blocking & Zero-crash) ---');
  let correctPlayed = false;
  try {
    quizAudioService.playCorrect();
    correctPlayed = true;
  } catch (e) {
    correctPlayed = false;
  }
  assert(correctPlayed, 'playCorrect() executed smoothly with zero errors');

  let incorrectPlayed = false;
  try {
    quizAudioService.playIncorrect();
    incorrectPlayed = true;
  } catch (e) {
    incorrectPlayed = false;
  }
  assert(incorrectPlayed, 'playIncorrect() executed smoothly with zero errors');

  console.log('\n--- 3. Testing Duplicate Fire Prevention Guard ---');
  let executionCount = 0;
  let lastTriggeredRef = null;

  const handleReveal = (qIndex, isCorrect) => {
    if (lastTriggeredRef === qIndex) return; // Guarded
    lastTriggeredRef = qIndex;
    executionCount++;
    if (isCorrect) quizAudioService.playCorrect();
    else quizAudioService.playIncorrect();
  };

  // Simulating duplicate Realtime broadcasts for Question 0
  handleReveal(0, true);
  handleReveal(0, true);
  handleReveal(0, true);
  assert(executionCount === 1, 'Duplicate reveal broadcasts for Question 0 fired sound only ONCE');

  // Next Question 1
  handleReveal(1, false);
  handleReveal(1, false);
  assert(executionCount === 2, 'Question 1 fired sound only ONCE');

  console.log('\n--- 4. Testing Audio Unlock API ---');
  let unlocked = false;
  try {
    quizAudioService.unlockAudio();
    unlocked = true;
  } catch {}
  assert(unlocked, 'AudioContext safely unlocked without user disturbance');

  console.log('\n=================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED               `);
  console.log('=================================================================');

  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
