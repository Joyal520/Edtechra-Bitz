// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: LIGHTWEIGHT REFINED CONFETTI BURST
// Zero-dependency canvas confetti engine for celebrating correct answers.
// Automatically respects prefers-reduced-motion and cleans up immediately.
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const FESTIVE_COLORS = [
  '#026fc3', // EdTechra Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#06b6d4'  // Cyan
];

export function triggerConfettiBurst(originElement?: HTMLElement | null, count = 36) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let originX = window.innerWidth / 2;
  let originY = window.innerHeight / 2;

  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
  }

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 4 + Math.random() * 6;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5, // gentle upward impulse
      color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
      size: 4 + Math.random() * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();
  const duration = 1200; // 1.2 seconds

  const render = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity
      p.vx *= 0.98; // Air resistance
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - progress * 1.1);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    });

    animationFrameId = requestAnimationFrame(render);
  };

  animationFrameId = requestAnimationFrame(render);
}
