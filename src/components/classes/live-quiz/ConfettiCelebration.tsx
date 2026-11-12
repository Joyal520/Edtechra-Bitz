import React, { useEffect, useRef } from 'react';

interface ConfettiCelebrationProps {
  onComplete?: () => void;
  durationMs?: number;
  stage?: 'entrance' | 'bronze' | 'silver' | 'gold' | 'celebration';
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
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
}

const CONFETTI_COLORS = [
  '#F59E0B', // Gold
  '#FCD34D', // Bright Gold
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#FFFFFF'  // White sparkle
];

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  onComplete,
  durationMs = 3800,
  stage = 'celebration'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // 1. Check for prefers-reduced-motion
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

    // Resize canvas to window
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Part 13.C: Particle effects — side cannons, golden confetti shower, and firework bursts
    const particles: Particle[] = [];

    // Left cannon
    for (let i = 0; i < 40; i++) {
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.55;
      const speed = 12 + Math.random() * 14;
      particles.push({
        x: 0,
        y: height * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        shape: i % 5 === 0 ? 'star' : i % 3 === 0 ? 'circle' : 'rect',
        opacity: 1
      });
    }

    // Right cannon
    for (let i = 0; i < 40; i++) {
      const angle = (-3 * Math.PI) / 4 + (Math.random() - 0.5) * 0.55;
      const speed = 12 + Math.random() * 14;
      particles.push({
        x: width,
        y: height * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 9,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        shape: i % 5 === 0 ? 'star' : i % 3 === 0 ? 'circle' : 'rect',
        opacity: 1
      });
    }

    // Center Gold Shower
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: width * 0.2 + Math.random() * (width * 0.6),
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 3,
        vy: 2.5 + Math.random() * 4,
        w: 5 + Math.random() * 6,
        h: 5 + Math.random() * 7,
        color: i % 2 === 0 ? '#F59E0B' : '#FCD34D',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        shape: i % 4 === 0 ? 'star' : 'rect',
        opacity: 0.95
      });
    }

    let animId: number;
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
      const progress = Math.min(1, elapsed / durationMs);

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.26; // Gravity
        p.vx *= 0.988; // Air drag
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
          drawStar(ctx, p.w * 0.7);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
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
  }, [durationMs, onComplete, stage]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
