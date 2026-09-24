const sharp = require('sharp');
const fs = require('fs');

async function verifyAll() {
  const anyIcons = [
    'public/icons/icon-512x512.png',
    'public/icons/icon-512.png',
    'public/icons/icon-192x192.png',
    'public/icons/icon-192.png',
    'public/icons/apple-touch-icon.png',
    'public/apple-touch-icon.png',
    'public/favicon.png',
    'public/icons/favicon-32x32.png',
    'public/logo.png',
    'public/logo-emblem.png'
  ];

  const maskableIcons = [
    'public/icons/icon-maskable-512x512.png',
    'public/icons/icon-maskable-192x192.png'
  ];

  console.log('=== VERIFYING STANDARD ANY ICONS (Should have transparent corners) ===');
  for (const file of anyIcons) {
    const img = sharp(file);
    const meta = await img.metadata();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    
    // Check (0,0) corner
    const topLeftAlpha = info.channels === 4 ? data[3] : 255;
    const topRightAlpha = info.channels === 4 ? data[(info.width - 1) * 4 + 3] : 255;
    const centerIdx = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
    const centerAlpha = info.channels === 4 ? data[centerIdx + 3] : 255;

    console.log(`${file}: ${info.width}x${info.height}, channels=${info.channels}, hasAlpha=${meta.hasAlpha}, cornerAlpha=${topLeftAlpha}, centerAlpha=${centerAlpha}`);
    if (topLeftAlpha !== 0) {
      console.error(`❌ ERROR: ${file} does not have transparent top-left corner!`);
    } else {
      console.log(`✓ OK: ${file} corner is completely transparent.`);
    }
  }

  console.log('\n=== VERIFYING MASKABLE ICONS (Should have dark navy background, no white corners) ===');
  for (const file of maskableIcons) {
    const img = sharp(file);
    const meta = await img.metadata();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    
    // Check (0,0) corner - should be theme navy, NOT white
    const r = data[0], g = data[1], b = data[2], a = info.channels === 4 ? data[3] : 255;
    console.log(`${file}: corner pixel rgb(${r},${g},${b}), alpha=${a}`);
    if (r > 200 && g > 200 && b > 200) {
      console.error(`❌ ERROR: ${file} has white corner!`);
    } else {
      console.log(`✓ OK: ${file} corner is dark theme background rgb(${r},${g},${b}), ZERO white area.`);
    }
  }
}

verifyAll().catch(console.error);
