import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('./public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Standard icon SVG (Full bleed rounded gradient with golden Bitz spark)
const standardSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#026fc3" />
      <stop offset="60%" stop-color="#03589e" />
      <stop offset="100%" stop-color="#0b2847" />
    </linearGradient>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />

  <!-- Inner border ring -->
  <rect x="16" y="16" width="480" height="480" rx="100" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="8" />

  <!-- Golden Lightning Bolt (Bitz Learning Emblem) -->
  <g filter="url(#shadow)" transform="translate(136, 100) scale(10)">
    <path
      d="M13 2 L3 14 L12 14 L11 22 L21 10 L12 10 Z"
      fill="url(#boltGrad)"
      stroke="#ffffff"
      stroke-width="0.8"
      stroke-linejoin="round"
    />
  </g>

  <!-- Small learning sparkle at top right of bolt -->
  <circle cx="340" cy="140" r="14" fill="#ffffff" opacity="0.9" />
  <circle cx="380" cy="180" r="8" fill="#fef08a" opacity="0.8" />
</svg>
`;

// 2. Maskable icon SVG (Extra padding to fit within 80% circle safe-zone)
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#026fc3" />
      <stop offset="60%" stop-color="#03589e" />
      <stop offset="100%" stop-color="#0b2847" />
    </linearGradient>
    <linearGradient id="boltGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="shadowMask" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Full square background for maskable -->
  <rect width="512" height="512" fill="url(#bgGradMask)" />

  <!-- Centered safe-zone bolt -->
  <g filter="url(#shadowMask)" transform="translate(166, 140) scale(7.5)">
    <path
      d="M13 2 L3 14 L12 14 L11 22 L21 10 L12 10 Z"
      fill="url(#boltGradMask)"
      stroke="#ffffff"
      stroke-width="0.8"
      stroke-linejoin="round"
    />
  </g>

  <!-- Sparkles inside safe-zone -->
  <circle cx="320" cy="170" r="10" fill="#ffffff" opacity="0.9" />
  <circle cx="350" cy="200" r="6" fill="#fef08a" opacity="0.8" />
</svg>
`;

async function generate() {
  console.log('Generating PWA icons...');

  // 1. icon-192x192.png
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192x192.png'));

  // 2. icon-512x512.png
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512x512.png'));

  // 3. icon-maskable-192x192.png
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-maskable-192x192.png'));

  // 4. icon-maskable-512x512.png
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512x512.png'));

  // 5. apple-touch-icon.png (180x180)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));

  // Also put one in root public/
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.resolve('./public/apple-touch-icon.png'));

  // 6. Favicon 32x32
  await sharp(Buffer.from(standardSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, 'favicon-32x32.png'));

  console.log('All PWA icons generated successfully in public/icons!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
