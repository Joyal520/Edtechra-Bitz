import React, { useEffect, useRef } from 'react';

interface ConfettiCelebrationProps {
  onComplete?: () => void;
  durationMs?: number;
  variant?: 'answer_correct' | 'podium_champion';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  vRot: number;
  shape: 'rect' | 'circle' | 'star' | 'ribbon';
  opacity: number;
  gravity: number;
  drag: number;
}

const CONFETTI_COLORS = [
  '#F59E0B', // Gold
  '#FCD34D', // Bright Gold
  '#10B981', // Emerald
  '#38BDF8', // Sky Cyan
  '#087CF5', // Primary Blue
  '#EC4899', // Pink
  '#A855F7', // Purple
  '#FFFFFF'  // Sparkle White
];

const CHAMPION_COLORS = [
  '#F59E0B',
  '#FCD34D',
  '#FFF3B0',
  '#10B981',
  '#08AEEF',
  '#087CF5',
  '#F43F7A',
  '#FFFFFF'
];

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  onComplete,
  durationMs,
  variant = 'podium_champion'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectiveDuration = durationMs ?? (variant === 'answer_correct' ? 1500 : 4200);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        if (onComplete) onComplete();
        return;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const palette = variant === 'podium_champion' ? CHAMPION_COLORS : CONFETTI_COLORS;

    if (variant === 'answer_correct') {
      // Short, attractive party-popper burst from lower-left and lower-right framing the quiz card
      for (let i = 0; i < 26; i++) {
        const angle = -Math.PI / 3 + (Math.random() - 0.5) * 0.5;
        const speed = 11 + Math.random() * 10;
        particles.push({
          x: width * 0.12,
          y: height * 0.78,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 6 + Math.random() * 6,
          h: 4 + Math.random() * 6,
          color: palette[i % palette.length],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.32,
          shape: i % 4 === 0 ? 'star' : i % 3 === 0 ? 'circle' : 'rect',
          opacity: 1,
          gravity: 0.30,
          drag: 0.985
        });
      }
      for (let i = 0; i < 26; i++) {
        const angle = (-2 * Math.PI) / 3 + (Math.random() - 0.5) * 0.5;
        const speed = 11 + Math.random() * 10;
        particles.push({
          x: width * 0.88,
          y: height * 0.78,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 6 + Math.random() * 6,
          h: 4 + Math.random() * 6,
          color: palette[i % palette.length],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.32,
          shape: i % 4 === 0 ? 'star' : i % 3 === 0 ? 'circle' : 'rect',
          opacity: 1,
          gravity: 0.30,
          drag: 0.985
        });
      }
    } else {
      // Spectacular Champion Podium Finale: Dual-side cannons + shimmering golden shower around Champion
      for (let i = 0; i < 65; i++) {
        const angle = -Math.PI / 3.6 + (Math.random() - 0.5) * 0.65;
        const speed = 13 + Math.random() * 16;
        particles.push({
          x: 0,
          y: height * 0.82,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 7 + Math.random() * 8,
          h: 4 + Math.random() * 10,
          color: palette[i % palette.length],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.32,
          shape: i % 5 === 0 ? 'star' : i % 4 === 0 ? 'ribbon' : i % 3 === 0 ? 'circle' : 'rect',
          opacity: 1,
          gravity: 0.25,
          drag: 0.988
        });
      }

      for (let i = 0; i < 65; i++) {
        const angle = (-2.6 * Math.PI) / 3.6 + (Math.random() - 0.5) * 0.65;
        const speed = 13 + Math.random() * 16;
        particles.push({
          x: width,
          y: height * 0.82,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 7 + Math.random() * 8,
          h: 4 + Math.random() * 10,
          color: palette[i % palette.length],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.32,
          shape: i % 5 === 0 ? 'star' : i % 4 === 0 ? 'ribbon' : i % 3 === 0 ? 'circle' : 'rect',
          opacity: 1,
          gravity: 0.25,
          drag: 0.988
        });
      }

      // Overhead golden cascade focusing spotlight over center champion
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: width * 0.15 + Math.random() * (width * 0.7),
          y: -20 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 3.5,
          vy: 2.2 + Math.random() * 4.5,
          w: 5 + Math.random() * 7,
          h: 5 + Math.random() * 8,
          color: i % 3 === 0 ? '#FFF3B0' : i % 2 === 0 ? '#F59E0B' : '#FCD34D',
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.22,
          shape: i % 3 === 0 ? 'star' : 'rect',
          opacity: 0.98,
          gravity: 0.14,
          drag: 0.992
        });
      }
    }

    let animId = 0;
    const startTime = performance.now();

    const drawStar = (c: CanvasRenderingContext2D, r: number) => {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        c.lineTo(Math.cos(((18 + i * 72) * Math.PI) / 180) * r, -Math.sin(((18 + i * 72) * Math.PI) / 180) * r);
        c.lineTo(Math.cos(((54 + i * 72) * Math.PI) / 180) * (r * 0.5), -Math.sin(((54 + i * 72) * Math.PI) / 180) * (r * 0.5));
      }
      c.closePath();
      c.fill();
    };

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / effectiveDuration);

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.rotation += p.vRot;

        if (progress > 0.65) {
          p.opacity = Math.max(0, 1 - (progress - 0.65) / 0.35);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'star') {
          drawStar(ctx, p.w * 0.72);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'ribbon') {
          ctx.fillRect(-p.w * 0.8, -2, p.w * 1.6, 4);
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      });

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        if (onComplete) onComplete();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [effectiveDuration, onComplete, variant]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
