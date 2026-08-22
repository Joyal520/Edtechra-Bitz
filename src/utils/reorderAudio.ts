// ============================================================================
// EDTECHRA-BITZ: Web Audio API Synthesizer for Interactive Activities
// Zero external audio files required. Instant, tactile, ASMR micro-sounds.
// ============================================================================

class ReorderAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch (e) {
        // Web Audio not supported
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * 1. Word Tile Tap: Short tactile ASMR click
   */
  public playTileClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.035);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  /**
   * 2. Undo / Return Tile: Subtle reverse woodblock pop
   */
  public playUndoPop() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.045);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  /**
   * 3. Correct Sentence: Sweet harmonious chord sparkle (C5 - E5 - G5 - C6)
   */
  public playCorrectChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteTime = now + idx * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0, noteTime);
        gain.gain.linearRampToValueAtTime(0.14, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.5);
      });
    } catch (e) {}
  }

  /**
   * 4. Incorrect Order: Gentle low feedback (not an aggressive buzzer)
   */
  public playWrongThud() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.16);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  /**
   * 5. Hint Used: Magical ascending shimmer
   */
  public playHintShimmer() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const freqs = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
      const now = ctx.currentTime;

      freqs.forEach((freq, idx) => {
        const noteTime = now + idx * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.08, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.3);
      });
    } catch (e) {}
  }

  /**
   * 6. ASMR Pop: Crisp, juicy bubble / wooden tactile pop with sharp snap
   */
  public playAsmrPop(pitch: number = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. High transient click / snap (giving the pop its tactile presence)
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(2600 * pitch, now);
      snapOsc.frequency.exponentialRampToValueAtTime(750 * pitch, now + 0.008);

      snapGain.gain.setValueAtTime(0.22, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.01);

      // 2. Resonant air-bubble pop body (rapid upward sweep & settling)
      const bubbleOsc = ctx.createOscillator();
      const bubbleGain = ctx.createGain();
      bubbleOsc.type = 'sine';
      bubbleOsc.frequency.setValueAtTime(320 * pitch, now);
      bubbleOsc.frequency.exponentialRampToValueAtTime(960 * pitch, now + 0.025);
      bubbleOsc.frequency.exponentialRampToValueAtTime(580 * pitch, now + 0.05);

      bubbleGain.gain.setValueAtTime(0.38, now);
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      bubbleOsc.connect(bubbleGain);
      bubbleGain.connect(ctx.destination);
      bubbleOsc.start(now);
      bubbleOsc.stop(now + 0.06);
    } catch (e) {}
  }

  /**
   * 7. Correct Answer Celebration: Delightful ASMR double-pop + sweet harmonic sparkle
   */
  public playCorrectAnswerPop() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // First juicy tactile pop
      this.playAsmrPop(1.0);

      // Second higher pop for signature "pop-pop!" ASMR feel
      setTimeout(() => {
        this.playAsmrPop(1.28);
      }, 50);

      // Sweet melodious harmonic sparkle in the background
      const notes = [659.25, 783.99, 1046.50]; // E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteTime = now + 0.07 + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0, noteTime);
        gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.38);
      });
    } catch (e) {}
  }
}

export const reorderAudio = new ReorderAudioSynthesizer();
export const asmrAudio = reorderAudio;
