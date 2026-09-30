// ============================================================================
// EDTECHRA EXAM SOUND UTILITIES
// Minimal, professional click/tap sound via Web Audio API.
// No external sound files required. Mobile-safe. Triggered only by user action.
// ============================================================================

let audioCtx: AudioContext | null = null;

/**
 * Lazily initializes and returns a shared AudioContext.
 * Must be called from a user-gesture handler (click/tap) to work on mobile.
 */
function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume suspended context (required on mobile after first user gesture)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a subtle, professional click/tap sound.
 * Uses a very short sine wave burst — sounds like a soft "tick".
 * Duration: ~30ms. Volume: subtle.
 * Safe to call on every answer tap. No-op if AudioContext unavailable.
 */
export function playAnswerClickSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Create a short sine oscillator for the "tick" body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.025);

    // Gain envelope: quick attack, fast decay → subtle click
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.003); // fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.035); // fast decay

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);

    // Cleanup
    osc.onended = () => {
      osc.disconnect();
      gainNode.disconnect();
    };
  } catch {
    // Silent fail — sound is a UX enhancement, not critical
  }
}
