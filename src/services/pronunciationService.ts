// ============================================================================
// EDTECHRA-BITZ: Pronunciation Service Architecture
// Clean, extensible speech synthesis system with Browser Speech API as default
// ============================================================================

export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface SpeechProvider {
  name: string;
  speak(word: string, options?: SpeechOptions): Promise<void>;
  stop(): void;
  isSpeaking(): boolean;
  isAvailable(): boolean;
}

/**
 * Browser-native Web Speech API Provider (Zero API Keys required)
 */
export class BrowserSpeechProvider implements SpeechProvider {
  public name = 'BrowserSpeech';
  private currentlySpeakingWord: string | null = null;
  private stateListeners: Set<(speakingWord: string | null) => void> = new Set();

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isSpeaking(): boolean {
    return Boolean(this.currentlySpeakingWord);
  }

  public getSpeakingWord(): string | null {
    return this.currentlySpeakingWord;
  }

  public subscribeState(listener: (speakingWord: string | null) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.currentlySpeakingWord);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState(word: string | null) {
    this.currentlySpeakingWord = word;
    for (const listener of this.stateListeners) {
      try {
        listener(word);
      } catch (err) {
        console.warn('[BrowserSpeechProvider] Listener error:', err);
      }
    }
  }

  /**
   * Pronounces the given plain English word.
   * Strips out any accidental phonetic slashes/IPA symbols to guarantee
   * natural English pronunciation.
   */
  public async speak(word: string, options: SpeechOptions = {}): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('[BrowserSpeechProvider] SpeechSynthesis not supported in this browser environment.');
      return;
    }

    const cleanWord = String(word || '').trim();
    if (!cleanWord) return;

    // 1. Immediately cancel any currently active speech to prevent audio overlap
    this.stop();

    return new Promise((resolve) => {
      try {
        const synth = window.speechSynthesis;

        // Create fresh utterance
        const utterance = new SpeechSynthesisUtterance(cleanWord);
        utterance.lang = options.lang || 'en-US';
        utterance.rate = options.rate || 0.9; // Slightly slower for crisp educational articulation
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume !== undefined ? options.volume : 1.0;

        // Try to pick a natural English voice if available
        const voices = synth.getVoices ? synth.getVoices() : [];
        if (voices.length > 0) {
          const preferredVoice = voices.find(
            (v) => (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en')) &&
                   (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Premium'))
          ) || voices.find((v) => v.lang.startsWith('en'));

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }

        utterance.onstart = () => {
          this.notifyState(cleanWord);
        };

        const cleanup = () => {
          if (this.currentlySpeakingWord === cleanWord) {
            this.notifyState(null);
          }
          resolve();
        };

        utterance.onend = cleanup;
        utterance.onerror = (e) => {
          // 'interrupted' is expected when stopping speech prematurely
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn('[BrowserSpeechProvider] Speech error:', e);
          }
          cleanup();
        };

        synth.speak(utterance);
      } catch (err) {
        console.warn('[BrowserSpeechProvider] Failed to speak:', err);
        this.notifyState(null);
        resolve();
      }
    });
  }

  public stop(): void {
    if (this.isAvailable()) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        // Ignore cancel errors
      }
    }
    this.notifyState(null);
  }
}

/**
 * Universal Pronunciation Service
 * Allows hot-swapping or registering alternative TTS providers (e.g. Google Cloud TTS, ElevenLabs)
 */
class PronunciationService {
  private activeProvider: SpeechProvider;

  constructor() {
    this.activeProvider = new BrowserSpeechProvider();
  }

  public setProvider(provider: SpeechProvider) {
    this.activeProvider = provider;
  }

  public getProvider(): SpeechProvider {
    return this.activeProvider;
  }

  public speak(word: string, options?: SpeechOptions): Promise<void> {
    return this.activeProvider.speak(word, options);
  }

  public stop(): void {
    this.activeProvider.stop();
  }

  public isSpeaking(): boolean {
    return this.activeProvider.isSpeaking();
  }

  public isAvailable(): boolean {
    return this.activeProvider.isAvailable();
  }

  public subscribeState(listener: (speakingWord: string | null) => void): () => void {
    if (this.activeProvider instanceof BrowserSpeechProvider) {
      return this.activeProvider.subscribeState(listener);
    }
    return () => {};
  }
}

export const pronunciationService = new PronunciationService();
