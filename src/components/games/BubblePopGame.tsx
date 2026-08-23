// ============================================================================
// EDTECHRA BUBBLE POP — RELAXATION BREAK GAME (React & HTML5 Canvas Component)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles, Zap, RotateCcw, Play } from 'lucide-react';

export interface BubblePopProgress {
  highestUnlockedLevel: number;
  totalXP: number;
  selectedDuration: 30 | 45 | 60;
}

const STORAGE_KEY = 'edtechra_bubble_pop';
const SOUND_STORAGE_KEY = 'edtechra_bubble_pop_muted';

export function calculateTargetScore(level: number): number {
  return Math.round((500 + ((level - 1) * 197)) / 50) * 50;
}

export function loadBubblePopProgress(): BubblePopProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        highestUnlockedLevel: Math.max(1, Math.min(100, parseInt(parsed.highestUnlockedLevel, 10) || 1)),
        totalXP: Math.max(0, parseInt(parsed.totalXP, 10) || 0),
        selectedDuration: [30, 45, 60].includes(parseInt(parsed.selectedDuration, 10)) ? parseInt(parsed.selectedDuration, 10) as 30 | 45 | 60 : 30
      };
    }
  } catch (e) {
    console.warn('[BubblePop] Could not load saved progress:', e);
  }
  return { highestUnlockedLevel: 1, totalXP: 0, selectedDuration: 30 };
}

export function saveBubblePopProgress(state: BubblePopProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem('edtechra_bubble_pop_duration', state.selectedDuration.toString());
  } catch (e) {
    console.warn('[BubblePop] Could not persist progress:', e);
  }
}

interface BubblePopGameProps {
  onClose?: () => void;
  onAwardXP?: (xp: number) => void;
  initialLevel?: number;
}

type GameStatus = 'WELCOME' | 'READY' | 'PLAYING' | 'SUCCESS' | 'FAILURE';

export const BubblePopGame: React.FC<BubblePopGameProps> = ({
  onClose,
  onAwardXP,
  initialLevel
}) => {
  const [progress, setProgress] = useState<BubblePopProgress>(loadBubblePopProgress);
  const [currentLevel] = useState<number>(() => initialLevel || progress.highestUnlockedLevel);
  const [selectedDuration, setSelectedDuration] = useState<30 | 45 | 60>(progress.selectedDuration);
  const [status, setStatus] = useState<GameStatus>('WELCOME');
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30.0);
  const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem(SOUND_STORAGE_KEY) === 'true');
  const [countdownText, setCountdownText] = useState<string>('READY?');

  const targetScore = calculateTargetScore(currentLevel);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Entities stored in refs for 60fps rendering without React re-renders
  const bubblesRef = useRef<any[]>([]);
  const particlesRef = useRef<any[]>([]);
  const shockwavesRef = useRef<any[]>([]);
  const floatTextsRef = useRef<any[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const statusRef = useRef<GameStatus>(status);
  const scoreRef = useRef<number>(score);
  const timeLeftRef = useRef<number>(timeLeft);
  const targetScoreRef = useRef<number>(targetScore);
  const isMutedRef = useRef<boolean>(isMuted);
  const currentLevelRef = useRef<number>(currentLevel);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { targetScoreRef.current = targetScore; }, [targetScore]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { currentLevelRef.current = currentLevel; }, [currentLevel]);

  // Web Audio Context
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Synthesized Sound Effects
  const playSound = useCallback((type: 'standard' | 'golden' | 'bomb' | 'tick' | 'success' | 'failure') => {
    if (isMutedRef.current) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'standard') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'golden') {
        [523.25, 659.25, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.03);
          gain.gain.setValueAtTime(0.25, now + i * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.03);
          osc.stop(now + i * 0.03 + 0.2);
        });
      } else if (type === 'bomb') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.28, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.4);
        });
      } else if (type === 'failure') {
        [440, 370].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.2, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.3);
        });
      }
    } catch (e) {}
  }, [getAudioContext]);

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'standard' | 'golden' | 'bomb' | 'success') => {
    if (!('vibrate' in navigator)) return;
    try {
      if (type === 'standard') navigator.vibrate(18);
      else if (type === 'golden') navigator.vibrate([15, 30, 20]);
      else if (type === 'bomb') navigator.vibrate(50);
      else if (type === 'success') navigator.vibrate([30, 50, 40, 60, 60]);
    } catch (e) {}
  }, []);

  const awardXP = useCallback((amount: number) => {
    setProgress((prev) => {
      const updated = { ...prev, totalXP: prev.totalXP + amount };
      saveBubblePopProgress(updated);
      return updated;
    });
    if (onAwardXP) onAwardXP(amount);
  }, [onAwardXP]);

  // Game End Handlers
  const handleSuccess = useCallback(() => {
    setStatus('SUCCESS');
    playSound('success');
    triggerHaptic('success');
    awardXP(10);

    setProgress((prev) => {
      let nextHighest = prev.highestUnlockedLevel;
      if (currentLevelRef.current === prev.highestUnlockedLevel && currentLevelRef.current < 100) {
        nextHighest = currentLevelRef.current + 1;
      }
      const updated = { ...prev, highestUnlockedLevel: nextHighest };
      saveBubblePopProgress(updated);
      return updated;
    });
  }, [awardXP, playSound, triggerHaptic]);

  const handleFailure = useCallback(() => {
    setStatus('FAILURE');
    playSound('failure');
  }, [playSound]);

  // Pop Bubble Logic
  const popBubble = useCallback((bubble: any) => {
    bubble.popped = true;

    let deltaScore = 100;
    let particleColor = '#38bdf8';
    let textStr = '+100';
    let textColor = '#38bdf8';

    if (bubble.type === 'golden') {
      deltaScore = 300;
      particleColor = '#fbbf24';
      textStr = '+300';
      textColor = '#fbbf24';
      playSound('golden');
      triggerHaptic('golden');
    } else if (bubble.type === 'bomb') {
      deltaScore = -200;
      particleColor = '#f43f5e';
      textStr = '-200';
      textColor = '#f43f5e';
      playSound('bomb');
      triggerHaptic('bomb');
    } else {
      playSound('standard');
      triggerHaptic('standard');
    }

    const newScore = Math.max(0, scoreRef.current + deltaScore);
    scoreRef.current = newScore;
    setScore(newScore);

    // Particles & Shockwave
    const count = bubble.type === 'golden' ? 14 : 9;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particlesRef.current.push({
        x: bubble.x,
        y: bubble.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: particleColor,
        radius: 2 + Math.random() * 2.5,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.025
      });
    }

    shockwavesRef.current.push({
      x: bubble.x,
      y: bubble.y,
      color: particleColor,
      radius: 8,
      maxRadius: bubble.radius * 1.6,
      alpha: 0.9
    });

    floatTextsRef.current.push({
      x: bubble.x,
      y: bubble.y - 10,
      text: textStr,
      color: textColor,
      alpha: 1
    });

    // Check Immediate Success
    if (newScore >= targetScoreRef.current) {
      handleSuccess();
    }
  }, [handleSuccess, playSound, triggerHaptic]);

  // Pointer Input
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (statusRef.current !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const bubbles = bubblesRef.current;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (b.popped) continue;

      const dx = clickX - b.x;
      const dy = clickY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= b.radius + 8) {
        popBubble(b);
        break;
      }
    }
  }, [popBubble]);

  // Ready Countdown
  const startCountdown = useCallback(() => {
    setStatus('READY');
    setScore(0);
    setTimeLeft(selectedDuration);
    scoreRef.current = 0;
    timeLeftRef.current = selectedDuration;

    bubblesRef.current = [];
    particlesRef.current = [];
    shockwavesRef.current = [];
    floatTextsRef.current = [];

    const steps = ['READY?', '3', '2', '1', 'POP!'];
    let idx = 0;

    function nextStep() {
      if (idx < steps.length) {
        setCountdownText(steps[idx]);
        playSound('tick');
        idx++;
        setTimeout(nextStep, 500);
      } else {
        setStatus('PLAYING');
        lastSpawnTimeRef.current = performance.now();
      }
    }
    nextStep();
  }, [playSound, selectedDuration]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function loop(timestamp: number) {
      if (!canvas || !ctx) return;
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.1);
      lastFrameTimeRef.current = timestamp;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      if (statusRef.current === 'PLAYING') {
        // Countdown
        const newTime = Math.max(0, timeLeftRef.current - dt);
        timeLeftRef.current = newTime;
        setTimeLeft(newTime);

        if (newTime <= 0) {
          if (scoreRef.current >= targetScoreRef.current) {
            handleSuccess();
          } else {
            handleFailure();
          }
        }

        // Spawn
        const spawnInterval = Math.max(480, 700 - (currentLevelRef.current * 2));
        if (timestamp - lastSpawnTimeRef.current > spawnInterval && bubblesRef.current.length < 9) {
          const baseRadius = Math.max(30, Math.min(44, w * 0.095));
          const radius = baseRadius * (0.9 + Math.random() * 0.25);
          const x = radius + Math.random() * (w - radius * 2);
          const y = h + radius + 10;

          const rand = Math.random();
          let type = 'standard';
          if (rand > 0.90) type = 'bomb';
          else if (rand > 0.75) type = 'golden';

          const levelFactor = Math.min(1.6, 1 + (currentLevelRef.current - 1) * 0.007);
          const speedY = (1.1 + Math.random() * 0.6) * levelFactor;

          bubblesRef.current.push({
            x, y, radius, type, speedY,
            wobbleAngle: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.03 + Math.random() * 0.02,
            wobbleAmplitude: 0.6 + Math.random() * 0.6,
            opacity: 0,
            popped: false
          });
          lastSpawnTimeRef.current = timestamp;
        }

        // Update Bubbles
        const bubbles = bubblesRef.current;
        for (let i = bubbles.length - 1; i >= 0; i--) {
          const b = bubbles[i];
          if (b.opacity < 1) b.opacity = Math.min(1, b.opacity + dt * 4);
          b.wobbleAngle += b.wobbleSpeed;
          b.x += Math.sin(b.wobbleAngle) * b.wobbleAmplitude;
          b.y -= b.speedY * dt * 60;

          // Draw Bubble
          ctx.save();
          ctx.globalAlpha = b.opacity;
          ctx.translate(b.x, b.y);
          const r = b.radius;

          let glowColor = 'rgba(56, 189, 248, 0.4)';
          if (b.type === 'golden') glowColor = 'rgba(251, 191, 36, 0.5)';
          if (b.type === 'bomb') glowColor = 'rgba(244, 63, 94, 0.45)';
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;

          const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
          if (b.type === 'standard') {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.35)');
            grad.addColorStop(0.85, 'rgba(14, 165, 233, 0.55)');
            grad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');
          } else if (b.type === 'golden') {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            grad.addColorStop(0.35, 'rgba(253, 224, 71, 0.45)');
            grad.addColorStop(0.85, 'rgba(245, 158, 11, 0.65)');
            grad.addColorStop(1, 'rgba(251, 191, 36, 0.95)');
          } else {
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
            grad.addColorStop(0.35, 'rgba(251, 113, 133, 0.45)');
            grad.addColorStop(0.85, 'rgba(225, 29, 72, 0.65)');
            grad.addColorStop(1, 'rgba(244, 63, 94, 0.9)');
          }

          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = b.type === 'golden' ? 'rgba(254, 240, 138, 0.8)' : b.type === 'bomb' ? 'rgba(254, 205, 211, 0.8)' : 'rgba(186, 230, 253, 0.8)';
          ctx.stroke();

          // Highlight
          ctx.beginPath();
          ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.16, Math.PI / 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.fill();

          // Icon
          if (b.type === 'golden') {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(r * 0.6)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, 1);
          } else if (b.type === 'bomb') {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(r * 0.55)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', 0, 1);
          }
          ctx.restore();

          if (b.popped || b.y < -b.radius * 2) {
            bubbles.splice(i, 1);
          }
        }
      }

      // Draw Shockwaves
      const shockwaves = shockwavesRef.current;
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.radius += (s.maxRadius - s.radius) * 0.18 + 1.2;
        s.alpha -= 0.045;
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (s.alpha <= 0) shockwaves.splice(i, 1);
      }

      // Draw Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.alpha <= 0) particles.splice(i, 1);
      }

      // Draw Float Texts
      const floatTexts = floatTextsRef.current;
      for (let i = floatTexts.length - 1; i >= 0; i--) {
        const ft = floatTexts[i];
        ft.y -= 1.4;
        ft.alpha -= 0.025;
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = '800 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        if (ft.alpha <= 0) floatTexts.splice(i, 1);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [handleFailure, handleSuccess]);

  const toggleSound = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_STORAGE_KEY, next.toString());
      if (!next) playSound('tick');
      return next;
    });
  };

  const handleSelectDuration = (dur: 30 | 45 | 60) => {
    setSelectedDuration(dur);
    setProgress((prev) => {
      const updated = { ...prev, selectedDuration: dur };
      saveBubblePopProgress(updated);
      return updated;
    });
    playSound('tick');
  };

  const progressPct = Math.min(100, (score / targetScore) * 100);

  return (
    <div className="relative w-full h-[620px] max-w-md mx-auto rounded-3xl overflow-hidden bg-radial from-[#152238] via-[#0a1120] to-[#050912] shadow-2xl border border-white/10 select-none flex flex-col font-sans">
      
      {/* Ambient background glows */}
      <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-cyan-600/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-indigo-600/30 blur-3xl pointer-events-none" />

      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="absolute inset-0 w-full h-full z-10 touch-none cursor-pointer"
      />

      {/* Top HUD (during PLAYING) */}
      {status === 'PLAYING' && (
        <div className="absolute top-0 inset-x-0 z-20 p-3.5 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <div className="px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 text-cyan-400 font-extrabold text-xs shadow-sm">
              LEVEL {currentLevel}
            </div>

            <div className={`px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border font-mono font-extrabold text-sm min-w-[76px] text-center shadow-sm ${
              timeLeft <= 5.0 ? 'text-rose-400 border-rose-500/50 animate-pulse' : 'text-amber-400 border-amber-400/30'
            }`}>
              {timeLeft.toFixed(1)}s
            </div>

            <button
              onClick={toggleSound}
              className="pointer-events-auto w-8 h-8 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 text-slate-300 flex items-center justify-center cursor-pointer transition-transform active:scale-95 shadow-sm"
              title="Toggle Sound"
              aria-label="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Target: <span className="text-white font-extrabold">{targetScore.toLocaleString()}</span>
            </span>
          </div>

          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Score HUD (during PLAYING) */}
      {status === 'PLAYING' && (
        <div className="absolute bottom-0 inset-x-0 z-20 p-3.5 flex items-center justify-between pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/15 shadow-lg flex items-baseline gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Score</span>
            <span className="text-xl font-black text-white font-mono">{score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 1. WELCOME OVERLAY */}
      {status === 'WELCOME' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-xs bg-slate-900/90 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in-95">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Micro Relaxation</span>
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight leading-none bg-gradient-to-br from-white to-sky-300 bg-clip-text text-transparent">
              BUBBLE POP
            </h1>
            <p className="text-xs font-semibold text-slate-400 -mt-2">
              Take a quick break. Pop some bubbles.
            </p>

            <div className="w-full p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-around">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Challenge</div>
                <div className="text-base font-black text-cyan-400">LEVEL {currentLevel}</div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Target</div>
                <div className="text-base font-black text-amber-400">{targetScore.toLocaleString()}</div>
              </div>
            </div>

            <div className="w-full space-y-1.5 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</div>
              <div className="flex bg-slate-950/70 border border-white/10 rounded-2xl p-1 gap-1">
                {([30, 45, 60] as const).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => handleSelectDuration(dur)}
                    className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      selectedDuration === dur
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  getAudioContext();
                  startCountdown();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  BACK TO FEED
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. READY COUNTDOWN OVERLAY */}
      {status === 'READY' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
          <div className="text-6xl font-black text-cyan-400 font-mono drop-shadow-[0_0_30px_rgba(56,189,248,0.8)] animate-in zoom-in-75">
            {countdownText}
          </div>
        </div>
      )}

      {/* 3. SUCCESS OVERLAY */}
      {status === 'SUCCESS' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-xs bg-slate-900/95 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in-95">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-black uppercase">
              🎉 Great Job!
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              CONGRATULATIONS!
            </h2>
            <p className="text-xs font-bold text-slate-400 -mt-2">
              LEVEL {currentLevel} COMPLETE
            </p>

            <div className="w-full p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-around">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Your Score</div>
                <div className="text-base font-black text-cyan-400">{score.toLocaleString()}</div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Target</div>
                <div className="text-base font-black text-white">{targetScore.toLocaleString()}</div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black text-sm">
              <Zap className="w-4 h-4 fill-amber-400" />
              <span>+10 XP Awarded</span>
            </div>

            <div className="w-full pt-1">
              <button
                type="button"
                onClick={onClose || (() => setStatus('WELCOME'))}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>CONTINUE LEARNING (BACK TO FEED)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FAILURE OVERLAY */}
      {status === 'FAILURE' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-xs bg-slate-900/95 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in-95">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-black uppercase">
              ⏱️ Time's Up
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              BETTER LUCK NEXT TIME!
            </h2>
            <p className="text-xs font-semibold text-slate-400 -mt-2">
              You were close. Give it another try!
            </p>

            <div className="w-full p-3 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-around">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Final Score</div>
                <div className="text-base font-black text-slate-300">{score.toLocaleString()}</div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Target</div>
                <div className="text-base font-black text-amber-400">{targetScore.toLocaleString()}</div>
              </div>
            </div>

            <div className="w-full space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  getAudioContext();
                  startCountdown();
                }}
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>TRY AGAIN</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  BACK TO FEED
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
