// ============================================================================
// EDTECHRA LIVE QUIZ: AUDIO SERVICE
// Centralized audio controller managing:
// 1. Background soundtrack: "EdTechra Biz - Quiz Loop (Take 1).wav"
//    - Strictly active during live gameplay (not in lobby, podium, or builder)
//    - Seamless looping, volume-controlled (~20%), single controlled HTMLAudioElement
//    - Graceful browser autoplay handling without console errors
// 2. Interactive UI clicks: "universfield-click-button-140881.mp3"
//    - Subtle, rate-limited, pooled audio playback for snappy responsiveness
// 3. Web Audio API synthesized correct / incorrect chimes
// ============================================================================

const STORAGE_KEY_SOUND_ENABLED = 'edtechra_quiz_sound_enabled';
const STORAGE_KEY_MUSIC_MUTED = 'edtechra_quiz_music_muted';

const BGM_PATH = encodeURI('/EdTechra Biz - Quiz Loop (Take 1).wav');
const CLICK_PATH = encodeURI('/universfield-click-button-140881.mp3');

class QuizAudioService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  // Background Music singleton instance
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmPlaying = false;

  // Click Sound Audio Pool (prevents rapid overlapping distortion or garbage collection lag)
  private clickPool: HTMLAudioElement[] = [];
  private clickPoolIndex = 0;
  private lastClickTimestamp = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initClickPool();

      // Proactively unlock Web Audio & media playback on first user gesture
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  private initClickPool(): void {
    try {
      this.clickPool = [
        new Audio(CLICK_PATH),
        new Audio(CLICK_PATH),
        new Audio(CLICK_PATH)
      ];
      this.clickPool.forEach((a) => {
        a.volume = 0.40;
        a.preload = 'auto';
      });
    } catch {}
  }

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

  // ==========================================================================
  // BACKGROUND MUSIC (BGM) CONTROLS
  // ==========================================================================

  private getBgmInstance(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.bgmAudio) {
      try {
        const audio = new Audio(BGM_PATH);
        audio.loop = true;
        audio.volume = this.isMusicMuted() ? 0 : 0.20; // Low 20% background level
        audio.preload = 'auto';
        this.bgmAudio = audio;
      } catch (err) {
        console.warn('[QuizAudioService] BGM initialization notice:', err);
      }
    }
    return this.bgmAudio;
  }

  /**
   * Checks whether background music is currently muted
   */
  public isMusicMuted(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MUSIC_MUTED);
      return stored === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Sets music mute state without restarting or interrupting track playback
   */
  public setMusicMuted(muted: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY_MUSIC_MUTED, String(muted));
      if (this.bgmAudio) {
        this.bgmAudio.volume = muted ? 0 : 0.20;
      }
    } catch {}
  }

  /**
   * Toggles music mute state and returns the new muted status
   */
  public toggleMusicMute(): boolean {
    const nextMuted = !this.isMusicMuted();
    this.setMusicMuted(nextMuted);
    return nextMuted;
  }

  /**
   * Starts background music during active quiz session.
   * Idempotent: If already playing, keeps track running smoothly across questions without restart.
   */
  public startBackgroundMusic(): void {
    if (typeof window === 'undefined') return;
    const bgm = this.getBgmInstance();
    if (!bgm) return;

    bgm.volume = this.isMusicMuted() ? 0 : 0.20;

    if (!this.bgmPlaying) {
      const playPromise = bgm.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.bgmPlaying = true;
          })
          .catch(() => {
            // Autoplay blocked: wait for first user tap to begin playing
            const handleAutoplayPermission = () => {
              if (bgm && !this.bgmPlaying) {
                bgm.play().then(() => {
                  this.bgmPlaying = true;
                }).catch(() => {});
              }
              window.removeEventListener('pointerdown', handleAutoplayPermission);
            };
            window.addEventListener('pointerdown', handleAutoplayPermission, { once: true });
          });
      }
    }
  }

  /**
   * Stops background music immediately and resets playhead.
   * Call when quiz ends, unmounts, or navigates to podium.
   */
  public stopBackgroundMusic(): void {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch {}
      this.bgmPlaying = false;
    }
  }

  /**
   * Pauses background music (e.g. when teacher pauses the quiz)
   */
  public pauseBackgroundMusic(): void {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
      } catch {}
      this.bgmPlaying = false;
    }
  }

  /**
   * Resumes background music from current position
   */
  public resumeBackgroundMusic(): void {
    if (this.bgmAudio && !this.bgmPlaying) {
      this.bgmAudio.volume = this.isMusicMuted() ? 0 : 0.20;
      this.bgmAudio.play().then(() => {
        this.bgmPlaying = true;
      }).catch(() => {});
    }
  }

  // ==========================================================================
  // BUTTON / UI CLICK SOUND
  // ==========================================================================

  /**
   * Plays the UI click sound ("universfield-click-button-140881.mp3").
   * Rate limited to 60ms debounce to prevent noisy overlapping on rapid clicks.
   */
  public playClick(): void {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    if (now - this.lastClickTimestamp < 60) {
      return; // Debounce rapid multi-clicks
    }
    this.lastClickTimestamp = now;

    try {
      if (this.clickPool.length === 0) {
        this.initClickPool();
      }
      const audio = this.clickPool[this.clickPoolIndex % this.clickPool.length];
      this.clickPoolIndex = (this.clickPoolIndex + 1) % this.clickPool.length;

      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch {}
  }

  // ==========================================================================
  // GENERAL SOUND EFFECTS PREFERENCES & CHIMES
  // ==========================================================================

  public isSoundEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
      return stored !== 'false';
    } catch {
      return true;
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, String(enabled));
    } catch {}
  }

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

  /**
   * Play Quiz Start Fanfare
   * 3-note ascending fanfare (G4 -> C5 -> G5) announcing the start of Question 1
   */
  public playQuizStart(): void {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 392.00, time: now + 0.00, dur: 0.14, gain: 0.24 }, // G4
        { freq: 523.25, time: now + 0.12, dur: 0.14, gain: 0.28 }, // C5
        { freq: 783.99, time: now + 0.24, dur: 0.38, gain: 0.34 }  // G5
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
      console.warn('[QuizAudioService] playQuizStart notice:', err);
    }
  }

  /**
   * Play Question Transition Sound
   * Ascending chime/whoosh (D5 -> F#5 -> A5 -> D6) when transitioning between questions
   */
  public playQuestionTransition(): void {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 587.33, time: now + 0.00, dur: 0.08, gain: 0.18 }, // D5
        { freq: 739.99, time: now + 0.07, dur: 0.08, gain: 0.20 }, // F#5
        { freq: 880.00, time: now + 0.14, dur: 0.09, gain: 0.22 }, // A5
        { freq: 1174.66, time: now + 0.21, dur: 0.28, gain: 0.26 } // D6
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, n.time);

        gainNode.gain.setValueAtTime(0.001, n.time);
        gainNode.gain.exponentialRampToValueAtTime(n.gain, n.time + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, n.time + n.dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(n.time);
        osc.stop(n.time + n.dur);
      });
    } catch (err) {
      console.warn('[QuizAudioService] playQuestionTransition notice:', err);
    }
  }

  /**
   * Play Quiz Complete Victory Fanfare
   * Celebratory melody (C5 -> E5 -> G5 -> C6 -> A5 -> B5 -> C6) for podium / leaderboard
   */
  public playQuizComplete(): void {
    if (!this.isSoundEnabled()) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: now + 0.00, dur: 0.14, gain: 0.22 }, // C5
        { freq: 659.25, time: now + 0.12, dur: 0.14, gain: 0.24 }, // E5
        { freq: 783.99, time: now + 0.24, dur: 0.16, gain: 0.26 }, // G5
        { freq: 1046.50, time: now + 0.38, dur: 0.30, gain: 0.30 }, // C6
        { freq: 880.00, time: now + 0.62, dur: 0.12, gain: 0.24 }, // A5
        { freq: 987.77, time: now + 0.72, dur: 0.14, gain: 0.26 }, // B5
        { freq: 1046.50, time: now + 0.84, dur: 0.50, gain: 0.32 }  // C6 (Triumphant hold)
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
      console.warn('[QuizAudioService] playQuizComplete notice:', err);
    }
  }
}

export const quizAudioService = new QuizAudioService();
