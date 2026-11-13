// ============================================================================
// EDTECHRA LIVE QUIZ: AUDIO EXPERIENCE SERVICE
// Uses real static MP3 sound effects from /sounds/:
//   - /sounds/correct-answer.mp3  (Student correct answer ding)
//   - /sounds/party-popper.mp3    (Short celebration burst on correct answer & full finale burst on Champion Reveal)
//   - /sounds/wrong.mp3           (Gentle wrong-answer feedback)
// Plus existing music & UI click tracks:
//   - /EdTechra Biz - Quiz Loop (Take 1).mp3 (Quiz gameplay/lobby loop & Victory podium intro)
//   - /universfield-click-button-140881.mp3  (UI button click)
// ============================================================================

const STORAGE_KEY_SOUND_ENABLED = 'edtechra_quiz_sound_enabled';
const STORAGE_KEY_MUSIC_MUTED = 'edtechra_quiz_music_muted';
const SESSION_FEEDBACK_PREFIX = 'edtechra_lq_sfx_';
const SESSION_PODIUM_INTRO_PREFIX = 'edtechra_lq_podium_intro_';
const SESSION_PODIUM_POPPER_PREFIX = 'edtechra_lq_podium_popper_';

export const LIVE_QUIZ_SOUND_ASSETS = {
  correct: '/sounds/correct-answer.mp3',
  wrong: '/sounds/wrong.mp3',
  partyPopper: '/sounds/party-popper.mp3',
  bgm: encodeURI('/EdTechra Biz - Quiz Loop (Take 1).mp3'),
  click: encodeURI('/universfield-click-button-140881.mp3')
} as const;

type SfxKey = 'correct' | 'wrong' | 'partyPopper';

class QuizAudioService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private isPreloading = false;
  private preloadPromise: Promise<void> | null = null;

  // Decoded Web Audio buffers + raw ArrayBuffers for deferred decoding after user gesture
  private rawBuffers = new Map<SfxKey, ArrayBuffer>();
  private decodedBuffers = new Map<SfxKey, AudioBuffer>();

  // HTMLAudioElement backups (single reusable channel per SFX key to prevent overlaps)
  private sfxAudioElements = new Map<SfxKey, HTMLAudioElement>();
  private sfxTimers: number[] = [];

  // Active Web Audio BufferSource nodes for crisp envelope playback & clean cancellation
  private activeSfxNodes = new Set<AudioBufferSourceNode>();
  private activeOscillators: OscillatorNode[] = [];

  // Background Music singleton instance
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmPlaying = false;
  private bgmPlayGeneration = 0;
  private autoplayPermissionHandler: (() => void) | null = null;

  // Victory / Podium Intro music instance (plays opening snippet during stage buildup)
  private victoryIntroAudio: HTMLAudioElement | null = null;
  private victoryIntroTimer: number | null = null;

  // Strict Lifecycle & Anti-Duplicate Guards
  private isQuizFinished = false;
  private playedVictoryIntroSessions = new Set<string>();
  private playedChampionPopperSessions = new Set<string>();
  private playedAnswerKeys = new Set<string>();

  // Click Sound Audio Pool
  private clickPool: HTMLAudioElement[] = [];
  private clickPoolIndex = 0;
  private lastClickTimestamp = 0;

  // React subscription listeners for unified mute state across Lobby / Host / Student / Podium
  private listeners = new Set<(muted: boolean) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initClickPool();
      this.initSfxElements();

      // Unlock audio after first user gesture cleanly (respecting autoplay policies)
      const unlockOnGesture = () => {
        this.unlockAudio();
      };
      window.addEventListener('pointerdown', unlockOnGesture, { once: true, passive: true });
      window.addEventListener('keydown', unlockOnGesture, { once: true, passive: true });
      window.addEventListener('touchstart', unlockOnGesture, { once: true, passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          if (this.bgmAudio && this.bgmPlaying) {
            try { this.bgmAudio.pause(); } catch {}
            this.bgmPlaying = false;
          }
          this.stopVictoryIntro();
        }
      });

      window.addEventListener('pagehide', () => {
        this.stopBackgroundMusic();
        this.stopActiveEffects();
      });
    }
  }

  // ==========================================================================
  // UNIFIED SOUND SETTINGS & SUBSCRIPTION (PART 3)
  // ==========================================================================

  private readStoredMuted(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const soundStored = localStorage.getItem(STORAGE_KEY_SOUND_ENABLED);
      const musicStored = localStorage.getItem(STORAGE_KEY_MUSIC_MUTED);
      if (soundStored === 'false' || musicStored === 'true') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public isMuted(): boolean {
    return this.readStoredMuted();
  }

  public isMusicMuted(): boolean {
    return this.readStoredMuted();
  }

  public isSoundEnabled(): boolean {
    return !this.readStoredMuted();
  }

  public subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitMuteChange(): void {
    const muted = this.readStoredMuted();
    this.listeners.forEach((cb) => {
      try {
        cb(muted);
      } catch {}
    });
  }

  public setMuted(muted: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY_MUSIC_MUTED, String(muted));
      localStorage.setItem(STORAGE_KEY_SOUND_ENABLED, String(!muted));
    } catch {}

    if (muted) {
      if (this.bgmAudio) {
        this.bgmAudio.volume = 0;
        try { this.bgmAudio.pause(); } catch {}
        this.bgmPlaying = false;
      }
      this.stopActiveEffects();
    } else {
      this.unlockAudio();
      if (this.bgmAudio) {
        this.bgmAudio.volume = 0.20;
      }
      if (!this.isQuizFinished && this.bgmAudio) {
        this.resumeBackgroundMusic();
      }
    }

    this.emitMuteChange();
  }

  public setMusicMuted(muted: boolean): void {
    this.setMuted(muted);
  }

  public setSoundEnabled(enabled: boolean): void {
    this.setMuted(!enabled);
  }

  public toggleMute(): boolean {
    const nextMuted = !this.isMuted();
    this.setMuted(nextMuted);
    return nextMuted;
  }

  public toggleMusicMute(): boolean {
    return this.toggleMute();
  }

  public toggleSound(): boolean {
    const nextMuted = this.toggleMute();
    return !nextMuted;
  }

  // ==========================================================================
  // ASSET INITIALIZATION, PRELOADING & BROWSER AUTOPLAY UNLOCK
  // ==========================================================================

  private initClickPool(): void {
    try {
      this.clickPool = [
        new Audio(LIVE_QUIZ_SOUND_ASSETS.click),
        new Audio(LIVE_QUIZ_SOUND_ASSETS.click)
      ];
      this.clickPool.forEach((a) => {
        a.volume = 0.35;
        a.preload = 'auto';
      });
    } catch {}
  }

  private initSfxElements(): void {
    const pairs: Array<[SfxKey, string, number]> = [
      ['correct', LIVE_QUIZ_SOUND_ASSETS.correct, 0.85],
      ['wrong', LIVE_QUIZ_SOUND_ASSETS.wrong, 0.70],
      ['partyPopper', LIVE_QUIZ_SOUND_ASSETS.partyPopper, 0.80]
    ];
    for (const [key, src, vol] of pairs) {
      try {
        const el = new Audio(src);
        el.preload = 'auto';
        el.volume = vol;
        this.sfxAudioElements.set(key, el);
      } catch {}
    }
  }

  private getAudioContext(createIfMissing = false): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx && createIfMissing) {
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
   * Returns whether Web Audio playback has been unlocked by a user gesture.
   */
  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Unlocks Web Audio & preloads sound assets safely after user gesture.
   */
  public unlockAudio(): void {
    const ctx = this.getAudioContext(true);
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
          void this.decodePendingRawBuffers(ctx);
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
        void this.decodePendingRawBuffers(ctx);
      }
    }
    void this.preloadQuizAudio();
  }

  private async decodePendingRawBuffers(ctx: AudioContext): Promise<void> {
    for (const [key, raw] of this.rawBuffers.entries()) {
      if (this.decodedBuffers.has(key)) continue;
      try {
        const copy = raw.slice(0);
        const decoded = await ctx.decodeAudioData(copy);
        this.decodedBuffers.set(key, decoded);
      } catch {}
    }
  }

  /**
   * Preloads the real MP3 sound files before quiz questions start.
   * Safe to call multiple times (returns shared promise).
   */
  public preloadQuizAudio(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (this.preloadPromise) return this.preloadPromise;

    this.isPreloading = true;
    const assets: Array<[SfxKey, string]> = [
      ['correct', LIVE_QUIZ_SOUND_ASSETS.correct],
      ['wrong', LIVE_QUIZ_SOUND_ASSETS.wrong],
      ['partyPopper', LIVE_QUIZ_SOUND_ASSETS.partyPopper]
    ];

    this.preloadPromise = (async () => {
      try {
        // Warm up HTMLAudio elements
        this.sfxAudioElements.forEach((el) => {
          try { el.load(); } catch {}
        });
        this.getBgmInstance();

        // Fetch MP3 bytes in parallel for zero-latency AudioBuffer playback
        await Promise.all(
          assets.map(async ([key, url]) => {
            if (this.decodedBuffers.has(key) || this.rawBuffers.has(key)) return;
            try {
              const res = await fetch(url, { cache: 'force-cache' });
              if (!res.ok) return;
              const arrBuf = await res.arrayBuffer();
              this.rawBuffers.set(key, arrBuf);
              const ctx = this.getAudioContext(false);
              if (ctx && ctx.state === 'running') {
                const decoded = await ctx.decodeAudioData(arrBuf.slice(0));
                this.decodedBuffers.set(key, decoded);
              }
            } catch {}
          })
        );
      } finally {
        this.isPreloading = false;
      }
    })();

    return this.preloadPromise;
  }

  // ==========================================================================
  // LIFECYCLE & STOP CONTROLS
  // ==========================================================================

  public setQuizFinished(finished: boolean): void {
    this.isQuizFinished = finished;
    if (finished) {
      this.stopBackgroundMusic();
      this.stopAnswerEffects();
    }
  }

  public isFinished(): boolean {
    return this.isQuizFinished;
  }

  private recordAudioEvent(event: {
    event: string;
    key?: string;
    asset?: string;
    mode?: string;
    detail?: string;
  }): void {
    if (typeof window === 'undefined') return;
    try {
      const w = window as any;
      if (!Array.isArray(w.__edtechraQuizAudioLog)) {
        w.__edtechraQuizAudioLog = [];
      }
      w.__edtechraQuizAudioLog.push({
        ...event,
        muted: this.isMuted(),
        ts: Date.now()
      });
      if (w.__edtechraQuizAudioLog.length > 100) {
        w.__edtechraQuizAudioLog.splice(0, w.__edtechraQuizAudioLog.length - 100);
      }
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute(
          'data-lq-audio-events',
          JSON.stringify(
            w.__edtechraQuizAudioLog.slice(-25).map((item: any) => ({
              e: item.event,
              k: item.key || null,
              a: item.asset || null,
              m: item.mode || null,
              d: item.detail || null,
              muted: Boolean(item.muted),
              ts: item.ts
            }))
          )
        );
      }
    } catch {}
  }

  public resetSessionAudio(sessionKey?: string): void {
    this.isQuizFinished = false;
    if (sessionKey) {
      this.playedVictoryIntroSessions.delete(sessionKey);
      this.playedChampionPopperSessions.delete(sessionKey);
      try {
        sessionStorage.removeItem(`${SESSION_PODIUM_INTRO_PREFIX}${sessionKey}`);
        sessionStorage.removeItem(`${SESSION_PODIUM_POPPER_PREFIX}${sessionKey}`);
      } catch {}
    } else {
      this.playedVictoryIntroSessions.clear();
      this.playedChampionPopperSessions.clear();
    }
  }

  /**
   * Stops answer-level MP3 playback (prevents overlapping sound effects between questions).
   */
  public stopAnswerEffects(): void {
    this.sfxTimers.forEach((tid) => window.clearTimeout(tid));
    this.sfxTimers = [];

    this.activeSfxNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {}
    });
    this.activeSfxNodes.clear();

    (['correct', 'wrong', 'partyPopper'] as SfxKey[]).forEach((key) => {
      const el = this.sfxAudioElements.get(key);
      if (el) {
        try {
          el.pause();
          el.currentTime = 0;
        } catch {}
      }
    });
  }

  public stopVictoryIntro(): void {
    if (this.victoryIntroTimer !== null) {
      window.clearTimeout(this.victoryIntroTimer);
      this.victoryIntroTimer = null;
    }
    if (this.victoryIntroAudio) {
      try {
        this.victoryIntroAudio.pause();
        this.victoryIntroAudio.currentTime = 0;
      } catch {}
    }
  }

  public stopActiveEffects(): void {
    this.stopAnswerEffects();
    this.stopVictoryIntro();
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators = [];
  }

  private trackOscillator(osc: OscillatorNode): void {
    this.activeOscillators.push(osc);
    osc.onended = () => {
      this.activeOscillators = this.activeOscillators.filter((o) => o !== osc);
    };
  }

  // ==========================================================================
  // DEDUPLICATION ACROSS REFRESHES & REALTIME EVENTS
  // ==========================================================================

  private buildFeedbackKey(sessionId: string, qIndex: number): string {
    return `${sessionId}::${qIndex}`;
  }

  public hasPlayedAnswerFeedback(sessionId?: string, qIndex?: number): boolean {
    if (!sessionId || typeof qIndex !== 'number') return false;
    const key = this.buildFeedbackKey(sessionId, qIndex);
    if (this.playedAnswerKeys.has(key)) return true;
    try {
      return sessionStorage.getItem(`${SESSION_FEEDBACK_PREFIX}${key}`) === '1';
    } catch {
      return false;
    }
  }

  public markAnswerFeedbackPlayed(sessionId?: string, qIndex?: number): void {
    if (!sessionId || typeof qIndex !== 'number') return;
    const key = this.buildFeedbackKey(sessionId, qIndex);
    this.playedAnswerKeys.add(key);
    try {
      sessionStorage.setItem(`${SESSION_FEEDBACK_PREFIX}${key}`, '1');
    } catch {}
  }

  // ==========================================================================
  // LOW-LEVEL REAL MP3 PLAYBACK ENGINE (Web Audio Buffer + HTMLAudio Backup)
  // ==========================================================================

  private playRealMp3(
    key: SfxKey,
    opts: {
      delaySec?: number;
      volume?: number;
      maxDurationSec?: number;
      fadeOutSec?: number;
    } = {}
  ): boolean {
    if (this.isMuted()) return false;

    const { delaySec = 0, volume = 0.85, maxDurationSec, fadeOutSec = 0.25 } = opts;

    // 1. Prefer Web Audio AudioBufferSourceNode for sample-accurate timing & smooth fade-out
    const ctx = this.getAudioContext(true);
    const buffer = this.decodedBuffers.get(key);
    if (ctx && ctx.state === 'running' && buffer) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const gainNode = ctx.createGain();
        const startAt = ctx.currentTime + Math.max(0, delaySec);
        gainNode.gain.setValueAtTime(Math.max(0.01, volume), startAt);

        const duration = maxDurationSec ? Math.min(buffer.duration, maxDurationSec) : buffer.duration;
        if (maxDurationSec && duration > fadeOutSec) {
          const fadeStart = startAt + Math.max(0.05, duration - fadeOutSec);
          gainNode.gain.setValueAtTime(Math.max(0.01, volume), fadeStart);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
        }

        src.connect(gainNode);
        gainNode.connect(ctx.destination);

        this.activeSfxNodes.add(src);
        src.onended = () => {
          this.activeSfxNodes.delete(src);
        };

        src.start(startAt, 0, duration);
        this.recordAudioEvent({
          event: 'play_sfx',
          key,
          asset: LIVE_QUIZ_SOUND_ASSETS[key],
          mode: 'webaudio',
          detail: maxDurationSec ? `burst_${maxDurationSec}s` : 'full'
        });
        return true;
      } catch (err) {
        console.warn(`[QuizAudioService] WebAudio buffer play failed for ${key}:`, err);
      }
    }

    // 2. Fallback to preloaded HTMLAudioElement playing the real MP3 file directly
    const triggerHtmlAudio = () => {
      if (this.isMuted()) return;
      try {
        let el = this.sfxAudioElements.get(key);
        if (!el) {
          el = new Audio(LIVE_QUIZ_SOUND_ASSETS[key]);
          this.sfxAudioElements.set(key, el);
        }
        el.pause();
        el.currentTime = 0;
        el.volume = Math.max(0, Math.min(1, volume));
        const p = el.play();
        this.recordAudioEvent({
          event: 'play_sfx',
          key,
          asset: LIVE_QUIZ_SOUND_ASSETS[key],
          mode: 'htmlaudio',
          detail: maxDurationSec ? `burst_${maxDurationSec}s` : 'full'
        });
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Gracefully absorb browser autoplay restriction errors without failing UI
          });
        }

        if (maxDurationSec && maxDurationSec > 0) {
          const stopTimer = window.setTimeout(() => {
            try {
              el?.pause();
              if (el) el.currentTime = 0;
            } catch {}
          }, Math.round(maxDurationSec * 1000));
          this.sfxTimers.push(stopTimer);
        }
      } catch {}
    };

    if (delaySec > 0) {
      const delayTimer = window.setTimeout(triggerHtmlAudio, Math.round(delaySec * 1000));
      this.sfxTimers.push(delayTimer);
    } else {
      triggerHtmlAudio();
    }

    // Attempt deferred decoding for future questions
    if (ctx && !buffer && this.rawBuffers.has(key)) {
      void this.decodePendingRawBuffers(ctx);
    } else if (!this.rawBuffers.has(key) && !this.isPreloading) {
      void this.preloadQuizAudio();
    }

    return true;
  }

  // ==========================================================================
  // STUDENT ANSWER SOUND EFFECTS (PART 1 — REAL MP3 FILES)
  // ==========================================================================

  /**
   * Correct Answer:
   * 1. Plays /sounds/correct-answer.mp3 cleanly.
   * 2. Plays a short, crisp faded burst of /sounds/party-popper.mp3 so it feels
   *    rewarding without interrupting the quiz or overlapping into the next question.
   */
  public playCorrect(options?: {
    withPartyPopperBurst?: boolean;
    sessionId?: string;
    questionIndex?: number;
  }): boolean {
    if (this.isMuted() || this.isQuizFinished) return false;

    const sessionId = options?.sessionId;
    const questionIndex = options?.questionIndex;
    if (sessionId && typeof questionIndex === 'number') {
      if (this.hasPlayedAnswerFeedback(sessionId, questionIndex)) {
        return false;
      }
      this.markAnswerFeedbackPlayed(sessionId, questionIndex);
    }

    this.stopAnswerEffects();

    this.playRealMp3('correct', { volume: 0.9 });

    if (options?.withPartyPopperBurst !== false) {
      this.playRealMp3('partyPopper', {
        delaySec: 0.16,
        volume: 0.45,
        maxDurationSec: 1.55,
        fadeOutSec: 0.45
      });
    }

    return true;
  }

  /**
   * Incorrect Answer:
   * Plays gentle /sounds/wrong.mp3 ONCE. Never plays party popper.
   */
  public playIncorrect(options?: {
    sessionId?: string;
    questionIndex?: number;
  }): boolean {
    if (this.isMuted() || this.isQuizFinished) return false;

    const sessionId = options?.sessionId;
    const questionIndex = options?.questionIndex;
    if (sessionId && typeof questionIndex === 'number') {
      if (this.hasPlayedAnswerFeedback(sessionId, questionIndex)) {
        return false;
      }
      this.markAnswerFeedbackPlayed(sessionId, questionIndex);
    }

    this.stopAnswerEffects();
    this.playRealMp3('wrong', { volume: 0.72 });
    return true;
  }

  // ==========================================================================
  // FINAL PODIUM CELEBRATION AUDIO (PART 2 — CINEMATIC ENTRANCE & CHAMPION)
  // ==========================================================================

  /**
   * Plays the opening notes of existing victory background music
   * during the initial podium entrance (smoothly fading out right before Champion Reveal).
   */
  public playVictoryIntro(sessionKey: string = 'global'): void {
    if (this.isMuted() || typeof window === 'undefined') return;
    const key = (sessionKey || 'global').trim();
    if (this.playedVictoryIntroSessions.has(key)) return;
    try {
      if (sessionStorage.getItem(`${SESSION_PODIUM_INTRO_PREFIX}${key}`) === '1') {
        this.playedVictoryIntroSessions.add(key);
        return;
      }
      sessionStorage.setItem(`${SESSION_PODIUM_INTRO_PREFIX}${key}`, '1');
    } catch {}
    this.playedVictoryIntroSessions.add(key);

    this.stopVictoryIntro();
    try {
      const intro = this.victoryIntroAudio || new Audio(LIVE_QUIZ_SOUND_ASSETS.bgm);
      intro.loop = false;
      intro.currentTime = 0;
      intro.volume = 0.22;
      this.victoryIntroAudio = intro;

      intro.play().catch(() => {});
      this.recordAudioEvent({
        event: 'play_victory_intro',
        key: 'victoryIntro',
        asset: LIVE_QUIZ_SOUND_ASSETS.bgm,
        mode: 'htmlaudio'
      });

      // Stop gently right before Champion Reveal's party-popper explosion (~1.55s)
      this.victoryIntroTimer = window.setTimeout(() => {
        try {
          intro.volume = 0.08;
        } catch {}
        window.setTimeout(() => this.stopVictoryIntro(), 220);
      }, 1350);
    } catch {}
  }

  /**
   * Champion Reveal (1st Place):
   * Synchronized full playback of the supplied /sounds/party-popper.mp3 ONCE per podium reveal.
   */
  public playChampionPartyPopper(sessionKey: string = 'global'): boolean {
    if (this.isMuted()) return false;

    const key = (sessionKey || 'global').trim();
    if (this.playedChampionPopperSessions.has(key)) {
      return false;
    }
    try {
      if (sessionStorage.getItem(`${SESSION_PODIUM_POPPER_PREFIX}${key}`) === '1') {
        this.playedChampionPopperSessions.add(key);
        return false;
      }
      sessionStorage.setItem(`${SESSION_PODIUM_POPPER_PREFIX}${key}`, '1');
    } catch {}
    this.playedChampionPopperSessions.add(key);

    this.stopVictoryIntro();
    this.stopAnswerEffects();
    this.playRealMp3('partyPopper', { volume: 0.9 });
    this.recordAudioEvent({
      event: 'play_champion_popper',
      key: 'partyPopper',
      asset: LIVE_QUIZ_SOUND_ASSETS.partyPopper,
      mode: 'finale'
    });
    return true;
  }

  /**
   * Backwards-compatible alias triggered if called externally; delegates safely.
   */
  public playQuizComplete(sessionKey: string = 'global'): void {
    this.playChampionPartyPopper(sessionKey);
  }

  // ==========================================================================
  // BACKGROUND MUSIC (BGM) CONTROLS
  // ==========================================================================

  private getBgmInstance(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.bgmAudio) {
      try {
        const audio = new Audio(LIVE_QUIZ_SOUND_ASSETS.bgm);
        audio.loop = true;
        audio.volume = this.isMuted() ? 0 : 0.20;
        audio.preload = 'auto';
        this.bgmAudio = audio;
      } catch (err) {
        console.warn('[QuizAudioService] BGM initialization notice:', err);
      }
    }
    return this.bgmAudio;
  }

  public startBackgroundMusic(): void {
    if (typeof window === 'undefined' || this.isQuizFinished || this.isMuted()) return;
    const bgm = this.getBgmInstance();
    if (!bgm) return;

    bgm.volume = this.isMuted() ? 0 : 0.20;

    if (!this.bgmPlaying) {
      const currentGen = ++this.bgmPlayGeneration;
      const playPromise = bgm.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (this.isQuizFinished || this.isMuted() || this.bgmPlayGeneration !== currentGen) {
              try {
                bgm.pause();
                bgm.currentTime = 0;
              } catch {}
              this.bgmPlaying = false;
            } else {
              this.bgmPlaying = true;
            }
          })
          .catch(() => {
            if (this.autoplayPermissionHandler && typeof window !== 'undefined') {
              window.removeEventListener('pointerdown', this.autoplayPermissionHandler);
            }

            this.autoplayPermissionHandler = () => {
              if (bgm && !this.bgmPlaying && !this.isQuizFinished && !this.isMuted() && this.bgmPlayGeneration === currentGen) {
                bgm.play().then(() => {
                  if (this.isQuizFinished || this.isMuted() || this.bgmPlayGeneration !== currentGen) {
                    try {
                      bgm.pause();
                      bgm.currentTime = 0;
                    } catch {}
                    this.bgmPlaying = false;
                  } else {
                    this.bgmPlaying = true;
                  }
                }).catch(() => {});
              }
              if (this.autoplayPermissionHandler && typeof window !== 'undefined') {
                window.removeEventListener('pointerdown', this.autoplayPermissionHandler);
                this.autoplayPermissionHandler = null;
              }
            };
            window.addEventListener('pointerdown', this.autoplayPermissionHandler, { once: true });
          });
      }
    }
  }

  public stopBackgroundMusic(): void {
    this.bgmPlayGeneration++;
    if (this.autoplayPermissionHandler && typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.autoplayPermissionHandler);
      this.autoplayPermissionHandler = null;
    }

    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } catch {}
    }
    this.bgmPlaying = false;
  }

  public pauseBackgroundMusic(): void {
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
      } catch {}
      this.bgmPlaying = false;
    }
  }

  public resumeBackgroundMusic(): void {
    if (this.isQuizFinished || this.isMuted()) return;
    if (this.bgmAudio && !this.bgmPlaying) {
      this.bgmAudio.volume = 0.20;
      this.bgmAudio.play().then(() => {
        if (this.isQuizFinished || this.isMuted()) {
          this.stopBackgroundMusic();
        } else {
          this.bgmPlaying = true;
        }
      }).catch(() => {});
    }
  }

  // ==========================================================================
  // BUTTON / UI CLICK SOUND & LIGHT TRANSITION CHIMES
  // ==========================================================================

  public playClick(): void {
    if (typeof window === 'undefined' || this.isMuted()) return;

    const now = Date.now();
    if (now - this.lastClickTimestamp < 60) {
      return;
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
        audio.volume = 0.35;
        audio.play().catch(() => {});
      }
    } catch {}
  }

  public playQuizStart(): void {
    if (this.isMuted() || this.isQuizFinished) return;
    try {
      const ctx = this.getAudioContext(true);
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [
        { freq: 392.00, time: now + 0.00, dur: 0.14, gain: 0.22 },
        { freq: 523.25, time: now + 0.12, dur: 0.14, gain: 0.25 },
        { freq: 783.99, time: now + 0.24, dur: 0.34, gain: 0.30 }
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
        this.trackOscillator(osc);
        osc.start(n.time);
        osc.stop(n.time + n.dur);
      });
    } catch {}
  }

  public playQuestionTransition(): void {
    if (this.isMuted() || this.isQuizFinished) return;
    try {
      const ctx = this.getAudioContext(true);
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [
        { freq: 587.33, time: now + 0.00, dur: 0.08, gain: 0.16 },
        { freq: 739.99, time: now + 0.07, dur: 0.08, gain: 0.18 },
        { freq: 880.00, time: now + 0.14, dur: 0.22, gain: 0.22 }
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
        this.trackOscillator(osc);
        osc.start(n.time);
        osc.stop(n.time + n.dur);
      });
    } catch {}
  }
}

export const quizAudioService = new QuizAudioService();
