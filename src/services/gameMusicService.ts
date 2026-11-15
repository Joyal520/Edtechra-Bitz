export type MusicPlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error';

export interface GameMusicSnapshot {
  enabled: boolean;
  volume: number; // 0..1
  status: MusicPlaybackStatus;
  active: boolean; // Whether a game player session has requested music
}

const BGM_TRACK_URL = '/sounds/Wooden_Keys_and_Morning_Light.mp3';
const STORAGE_ENABLED_KEY = 'edtechra_game_bgm_enabled';
const STORAGE_VOLUME_KEY = 'edtechra_game_bgm_volume';
const DEFAULT_VOLUME = 0.26;

function readStoredEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_ENABLED_KEY);
    if (raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

function readStoredVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUME_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
    }
  } catch {
    // ignore storage failures
  }
  return DEFAULT_VOLUME;
}

class SharedGameMusicService {
  private enabled: boolean = readStoredEnabled();
  private volume: number = readStoredVolume();
  private status: MusicPlaybackStatus = 'idle';
  private activeSessionRequested = false;
  private sessionSeq = 0;
  private inFlightToken: number | null = null;

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  private cachedBuffer: AudioBuffer | null = null;
  private rawBytesPromise: Promise<ArrayBuffer | null> | null = null;
  private loadPromise: Promise<AudioBuffer | null> | null = null;

  private fallbackAudio: HTMLAudioElement | null = null;
  private fallbackBlobUrl: string | null = null;
  private usingFallback = false;

  private stopTimerId: number | null = null;
  private duckTimerId: number | null = null;
  private unlockBound = false;

  private listeners = new Set<(snap: GameMusicSnapshot) => void>();

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch {
        // ignore listener errors
      }
    });
  }

  public getSnapshot(): GameMusicSnapshot {
    return {
      enabled: this.enabled,
      volume: this.volume,
      status: this.status,
      active: this.activeSessionRequested
    };
  }

  public subscribe(listener: (snap: GameMusicSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
      this.audioCtx.addEventListener('statechange', () => {
        if (
          this.audioCtx?.state === 'running' &&
          this.activeSessionRequested &&
          this.enabled &&
          this.status === 'blocked' &&
          !this.sourceNode &&
          !this.usingFallback
        ) {
          void this.beginPlayback(this.sessionSeq);
        }
      });
    }
    if (this.audioCtx && !this.masterGain) {
      // Explicit stereo pipeline preserves original 8D left/right channels cleanly
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.channelCount = 2;
      this.masterGain.channelCountMode = 'explicit';
      this.masterGain.channelInterpretation = 'speakers';
      this.masterGain.gain.value = 0.0001;

      this.duckGain = this.audioCtx.createGain();
      this.duckGain.channelCount = 2;
      this.duckGain.channelCountMode = 'explicit';
      this.duckGain.channelInterpretation = 'speakers';
      this.duckGain.gain.value = 1.0;

      this.masterGain.connect(this.duckGain);
      this.duckGain.connect(this.audioCtx.destination);
    }
    return this.audioCtx;
  }

  private fetchRawBytes(): Promise<ArrayBuffer | null> {
    if (this.rawBytesPromise) return this.rawBytesPromise;
    this.rawBytesPromise = (async () => {
      try {
        const response = await fetch(BGM_TRACK_URL, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.arrayBuffer();
      } catch {
        this.rawBytesPromise = null;
        return null;
      }
    })();
    return this.rawBytesPromise;
  }

  private async loadAndDecodeTrack(): Promise<AudioBuffer | null> {
    if (this.cachedBuffer) return this.cachedBuffer;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const ctx = this.ensureAudioContext();
        if (!ctx) return null;
        const arrayBuf = await this.fetchRawBytes();
        if (!arrayBuf) {
          this.loadPromise = null;
          return null;
        }
        const decodeTimeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3500));
        const decoded = await Promise.race([
          ctx.decodeAudioData(arrayBuf.slice(0)),
          decodeTimeout
        ]);
        if (!decoded) {
          this.loadPromise = null;
          return null;
        }
        this.cachedBuffer = decoded;
        return decoded;
      } catch {
        this.loadPromise = null;
        return null;
      }
    })();

    return this.loadPromise;
  }

  private clearStopTimer() {
    if (this.stopTimerId !== null) {
      window.clearTimeout(this.stopTimerId);
      this.stopTimerId = null;
    }
  }

  private teardownCurrentSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.sourceNode = null;
    }
    if (this.fallbackAudio && this.usingFallback) {
      try {
        this.fallbackAudio.pause();
      } catch {
        // ignore
      }
    }
    this.usingFallback = false;
  }

  private bindUnlockHandlers() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const onInteract = () => {
      this.unlockFromUserGesture();
    };
    window.addEventListener('pointerdown', onInteract, { capture: true, passive: true, once: true });
    window.addEventListener('pointerup', onInteract, { capture: true, passive: true, once: true });
    window.addEventListener('click', onInteract, { capture: true, passive: true, once: true });
    window.addEventListener('keydown', onInteract, { capture: true, passive: true, once: true });
    window.addEventListener('touchstart', onInteract, { capture: true, passive: true, once: true });
  }

  private unbindUnlockState() {
    this.unlockBound = false;
  }

  public async unlockFromUserGesture(): Promise<void> {
    this.unbindUnlockState();
    if (!this.activeSessionRequested || !this.enabled) return;

    const ctx = this.ensureAudioContext();
    if (
      (this.status === 'playing' || this.status === 'loading') &&
      (this.sourceNode || this.usingFallback || this.status === 'loading') &&
      (!ctx || ctx.state === 'running')
    ) {
      return;
    }

    if (ctx && ctx.state === 'suspended') {
      try {
        await Promise.race([
          ctx.resume(),
          new Promise<void>((resolve) => window.setTimeout(resolve, 250))
        ]);
      } catch {
        // ignore
      }
    }

    if (this.usingFallback && this.fallbackAudio) {
      try {
        this.fallbackAudio.volume = this.volume;
        await this.fallbackAudio.play();
        this.status = 'playing';
        this.emit();
        return;
      } catch {
        // stay blocked if still not allowed
      }
    }

    if (this.sourceNode && ctx && ctx.state === 'running') {
      this.fadeMasterTo(this.volume, 0.45);
      this.status = 'playing';
      this.emit();
      return;
    }

    await this.beginPlayback(this.sessionSeq);
  }

  private fadeMasterTo(targetVol: number, durationSec: number) {
    const safeTarget = Math.max(0.0001, Math.min(1, targetVol));
    if (this.usingFallback && this.fallbackAudio) {
      this.fallbackAudio.volume = Math.max(0, Math.min(1, targetVol));
      return;
    }
    const ctx = this.audioCtx;
    const gain = this.masterGain;
    if (!ctx || !gain) return;
    const now = ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.linearRampToValueAtTime(safeTarget, now + Math.max(0.03, durationSec));
    } catch {
      gain.gain.value = safeTarget;
    }
  }

  private async beginPlayback(token: number): Promise<void> {
    if (!this.activeSessionRequested || !this.enabled || token !== this.sessionSeq) return;
    if (this.inFlightToken === token) return;
    this.inFlightToken = token;

    try {
      this.clearStopTimer();
      const ctx = this.ensureAudioContext();
      void this.fetchRawBytes();

      if (ctx && ctx.state === 'suspended') {
        try {
          await Promise.race([
            ctx.resume(),
            new Promise<void>((resolve) => window.setTimeout(resolve, 100))
          ]);
        } catch {
          // suspended until user interaction
        }
        if (!this.activeSessionRequested || !this.enabled || token !== this.sessionSeq) return;
        if ((ctx.state as AudioContextState) !== 'running') {
          this.status = 'blocked';
          this.bindUnlockHandlers();
          this.emit();
          return;
        }
      }

      this.status = this.cachedBuffer ? 'playing' : 'loading';
      this.emit();

      const buffer = await this.loadAndDecodeTrack();
      if (!this.activeSessionRequested || !this.enabled || token !== this.sessionSeq) return;

      if (buffer && this.audioCtx && this.masterGain) {
        this.teardownCurrentSource();

        const src = this.audioCtx.createBufferSource();
        src.buffer = buffer;
        src.loop = true; // Gapless PCM loop preserving 8D stereo imaging
        src.connect(this.masterGain);

        const now = this.audioCtx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(0.0001, now);
        src.start(0);
        this.sourceNode = src;
        this.usingFallback = false;

        if (this.audioCtx.state === 'running') {
          this.fadeMasterTo(this.volume, 0.65);
          this.status = 'playing';
          this.emit();
        } else {
          this.status = 'blocked';
          this.bindUnlockHandlers();
          this.emit();
        }
        return;
      }

      // Fallback single HTMLAudioElement if Web Audio decode fails
      try {
        this.teardownCurrentSource();
        if (!this.fallbackAudio) {
          let fallbackSrc = BGM_TRACK_URL;
          const rawBytes = await this.fetchRawBytes();
          if (rawBytes && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            if (!this.fallbackBlobUrl) {
              this.fallbackBlobUrl = URL.createObjectURL(new Blob([rawBytes], { type: 'audio/mpeg' }));
            }
            fallbackSrc = this.fallbackBlobUrl;
          }
          this.fallbackAudio = new Audio(fallbackSrc);
          this.fallbackAudio.loop = true;
          this.fallbackAudio.preload = 'auto';
        }
        this.fallbackAudio.volume = this.volume;
        this.usingFallback = true;
        await this.fallbackAudio.play();
        if (!this.activeSessionRequested || !this.enabled || token !== this.sessionSeq) {
          this.fallbackAudio.pause();
          return;
        }
        this.status = 'playing';
        this.emit();
      } catch {
        if (!this.activeSessionRequested || token !== this.sessionSeq) return;
        this.status = 'blocked';
        this.bindUnlockHandlers();
        this.emit();
      }
    } finally {
      if (this.inFlightToken === token) {
        this.inFlightToken = null;
      }
    }
  }

  /** Called when entering any Educational Game view */
  public start(): void {
    this.activeSessionRequested = true;
    this.sessionSeq += 1;
    const token = this.sessionSeq;
    this.clearStopTimer();

    if (!this.enabled) {
      this.teardownCurrentSource();
      this.status = 'paused';
      this.emit();
      return;
    }

    // Start decoding/playing immediately (single active instance guaranteed)
    void this.beginPlayback(token);
  }

  /** Called when exiting or unmounting the Educational Game modal */
  public stop(fadeOutMs = 350): void {
    this.activeSessionRequested = false;
    this.sessionSeq += 1;
    this.inFlightToken = null;
    this.clearStopTimer();
    this.unbindUnlockState();

    if (this.duckTimerId !== null) {
      window.clearTimeout(this.duckTimerId);
      this.duckTimerId = null;
    }

    if (!this.sourceNode && !this.usingFallback) {
      this.status = 'idle';
      this.emit();
      return;
    }

    if (fadeOutMs > 0 && this.audioCtx && this.masterGain && !this.usingFallback) {
      this.fadeMasterTo(0.0001, fadeOutMs / 1000);
      this.stopTimerId = window.setTimeout(() => {
        if (!this.activeSessionRequested) {
          this.teardownCurrentSource();
          this.status = 'idle';
          this.emit();
        }
      }, fadeOutMs + 40);
    } else {
      this.teardownCurrentSource();
      this.status = 'idle';
      this.emit();
    }
  }

  public setEnabled(nextEnabled: boolean): void {
    this.enabled = Boolean(nextEnabled);
    try {
      localStorage.setItem(STORAGE_ENABLED_KEY, String(this.enabled));
    } catch {
      // ignore
    }

    if (!this.activeSessionRequested) {
      this.status = this.enabled ? 'idle' : 'paused';
      this.emit();
      return;
    }

    if (this.enabled) {
      this.sessionSeq += 1;
      void this.beginPlayback(this.sessionSeq);
    } else {
      this.sessionSeq += 1;
      this.fadeMasterTo(0.0001, 0.25);
      this.clearStopTimer();
      this.stopTimerId = window.setTimeout(() => {
        if (!this.enabled) {
          this.teardownCurrentSource();
        }
      }, 280);
      this.status = 'paused';
      this.emit();
    }
  }

  public toggleEnabled(): void {
    this.setEnabled(!this.enabled);
  }

  public setVolume(nextVol: number): void {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(nextVol) ? nextVol : DEFAULT_VOLUME));
    this.volume = clamped;
    try {
      localStorage.setItem(STORAGE_VOLUME_KEY, String(clamped));
    } catch {
      // ignore
    }

    if (this.activeSessionRequested && this.enabled && this.status === 'playing') {
      this.fadeMasterTo(clamped, 0.08);
    }
    this.emit();
  }

  /** Temporarily ducks background music gently while game speech/fanfare SFX plays */
  public duck(durationMs = 950): void {
    if (!this.activeSessionRequested || !this.enabled || this.status !== 'playing') return;
    if (this.usingFallback && this.fallbackAudio) {
      const targetDuck = Math.max(0.05, this.volume * 0.42);
      this.fallbackAudio.volume = targetDuck;
      if (this.duckTimerId !== null) window.clearTimeout(this.duckTimerId);
      this.duckTimerId = window.setTimeout(() => {
        if (this.fallbackAudio && this.enabled && this.activeSessionRequested) {
          this.fallbackAudio.volume = this.volume;
        }
      }, durationMs);
      return;
    }

    const ctx = this.audioCtx;
    const dg = this.duckGain;
    if (!ctx || !dg) return;

    const now = ctx.currentTime;
    try {
      dg.gain.cancelScheduledValues(now);
      dg.gain.setValueAtTime(dg.gain.value, now);
      dg.gain.linearRampToValueAtTime(0.42, now + 0.12);
    } catch {
      dg.gain.value = 0.42;
    }

    if (this.duckTimerId !== null) window.clearTimeout(this.duckTimerId);
    this.duckTimerId = window.setTimeout(() => {
      const c = this.audioCtx;
      const g = this.duckGain;
      if (!c || !g) return;
      const t = c.currentTime;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(1.0, t + 0.4);
      } catch {
        g.gain.value = 1.0;
      }
    }, Math.max(250, durationMs));
  }
}

export const gameMusicService = new SharedGameMusicService();
