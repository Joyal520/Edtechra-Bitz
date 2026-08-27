// ============================================================================
// EDTECHRA LIVE QUIZ: AUDIO FEEDBACK SERVICE
// Zero-latency Web Audio API synthesizers for correct/incorrect quiz sounds
// with localStorage user preference persistence and browser policy safety.
// ============================================================================

const STORAGE_KEY_SOUND_ENABLED = 'edtechra_quiz_sound_enabled';

class QuizAudioService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Unlock AudioContext on user's first click/touch interaction
   */
  public unlockAudio(): void {
    if (this.isUnlocked) return;
    const ctx = this.getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
      }
    }
  }

  /**
   * Check if sound is enabled (defaults to true)
   */
  public isSoundEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
      return stored !== 'false';
    } catch {
      return true;
    }
  }

  /**
   * Update sound preference
   */
  public setSoundEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, String(enabled));
    } catch {}
  }

  /**
   * Toggle sound preference
   */
  public toggleSound(): boolean {
    const next = !this.isSoundEnabled();
    this.setSoundEnabled(next);
    return next;
  }

  /**
   * Play Correct Answer Sound
   * Upbeat, high-fidelity celebratory chime (C5 -> E5 -> G5 -> C6)
   */
  public playCorrect(): void {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: now + 0.00, dur: 0.18, gain: 0.22 }, // C5
        { freq: 659.25, time: now + 0.08, dur: 0.20, gain: 0.25 }, // E5
        { freq: 783.99, time: now + 0.16, dur: 0.22, gain: 0.28 }, // G5
        { freq: 1046.50, time: now + 0.24, dur: 0.38, gain: 0.32 }  // C6
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, n.time);

        gainNode.gain.setValueAtTime(0.001, n.time);
        gainNode.gain.exponentialRampToValueAtTime(n.gain, n.time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, n.time + n.dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(n.time);
        osc.stop(n.time + n.dur);
      });
    } catch (err) {
      console.warn('[QuizAudioService] playCorrect notice:', err);
    }
  }

  /**
   * Play Incorrect Answer Sound
   * Soft, gentle descending reminder (Eb4 -> Bb3) with lowpass filter
   */
  public playIncorrect(): void {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 311.13, time: now + 0.00, dur: 0.16, gain: 0.18 }, // Eb4
        { freq: 233.08, time: now + 0.12, dur: 0.25, gain: 0.16 }  // Bb3
      ];

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, n.time);

        gainNode.gain.setValueAtTime(0.001, n.time);
        gainNode.gain.exponentialRampToValueAtTime(n.gain, n.time + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, n.time + n.dur);

        osc.connect(gainNode);
        gainNode.connect(filter);
        filter.connect(ctx.destination);

        osc.start(n.time);
        osc.stop(n.time + n.dur);
      });
    } catch (err) {
      console.warn('[QuizAudioService] playIncorrect notice:', err);
    }
  }
}

export const quizAudioService = new QuizAudioService();
