import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftAmp: number;
  driftFreq: number;
  phase: number;
  baseOpacity: number;
  isSparkle: boolean;
}

export interface GoldenDustCanvasProps {
  active?: boolean;
}

export const GoldenDustCanvas: React.FC<GoldenDustCanvasProps> = ({ active = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active || typeof window === 'undefined') return;

    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motionQuery?.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const particleCount = width < 640 ? 26 : 42;
    const particles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1.8 + Math.random() * 2.8,
      speedY: 0.25 + Math.random() * 0.42,
      driftAmp: 0.22 + Math.random() * 0.4,
      driftFreq: 0.004 + Math.random() * 0.006,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: 0.35 + Math.random() * 0.45,
      isSparkle: i % 8 === 0,
    }));

    let tick = 0;

    const render = () => {
      tick += 1;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y += p.speedY;
        p.x += Math.sin(tick * p.driftFreq + p.phase) * p.driftAmp;

        if (p.y > height + 12) {
          p.y = -12;
          p.x = Math.random() * width;
        }
        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;

        const twinkle = 0.65 + 0.35 * Math.sin(tick * 0.03 + p.phase);
        const alpha = Math.max(0.15, Math.min(0.85, p.baseOpacity * twinkle));

        if (p.isSparkle) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = `rgba(217, 119, 6, ${alpha})`;
          const r = p.size * 1.45;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(r * 0.28, -r * 0.28);
          ctx.lineTo(r, 0);
          ctx.lineTo(r * 0.28, r * 0.28);
          ctx.lineTo(0, r);
          ctx.lineTo(-r * 0.28, r * 0.28);
          ctx.lineTo(-r, 0);
          ctx.lineTo(-r * 0.28, -r * 0.28);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.8);
          grad.addColorStop(0, `rgba(253, 224, 71, ${alpha})`);
          grad.addColorStop(0.45, `rgba(245, 158, 11, ${alpha * 0.85})`);
          grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-20"
    />
  );
};
