// ============================================================================
// EDTECHRA-BITZ: Lightweight Confetti / Party Popper Animation
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle' | 'ribbon';
}

const COLORS = [
  '#026fc3', // Brand Blue
  '#38a9f6', // Light Blue
  '#10b981', // Emerald
  '#22c55e', // Brand Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
  '#06b6d4'  // Cyan
];

/**
 * Triggers a confetti burst anchored on a DOM element or viewport center.
 * Respects `prefers-reduced-motion`.
 */
export function triggerConfetti(targetElement?: HTMLElement | null): () => void {
  // Check reduced motion preference
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const updateDimensions = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  updateDimensions();

  // Determine origin point
  let originX = window.innerWidth / 2;
  let originY = window.innerHeight / 2;

  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height * 0.4;
  }

  const particleCount = 48;
  const particles: Particle[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const speed = 7 + Math.random() * 9;
    const shapes: ('rect' | 'circle' | 'ribbon')[] = ['rect', 'circle', 'ribbon'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    particles.push({
      x: originX + (Math.random() - 0.5) * 20,
      y: originY + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 3,
      vy: Math.sin(angle) * speed - (4 + Math.random() * 5), // Upward burst
      w: shape === 'ribbon' ? 4 + Math.random() * 4 : 6 + Math.random() * 6,
      h: shape === 'ribbon' ? 12 + Math.random() * 10 : 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      opacity: 1,
      shape
    });
  }

  let animationFrameId: number;
  const startTime = performance.now();
  const durationMs = 2200;

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = elapsed / durationMs;

    if (progress >= 1) {
      if (canvas.parentNode) canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      // Physics
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32; // Gravity
      p.vx *= 0.98; // Air resistance
      p.vy *= 0.98;
      p.rotation += p.rotationSpeed;

      // Fade out in last 30% of animation
      if (progress > 0.7) {
        p.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ribbon') {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animationFrameId = requestAnimationFrame(animate);

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationFrameId);
    if (canvas.parentNode) canvas.remove();
  };
}
