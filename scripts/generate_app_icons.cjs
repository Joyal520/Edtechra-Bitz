const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const srcPath = path.resolve('public/icons/app icon.png');
  console.log('Loading source image from:', srcPath);

  const img = sharp(srcPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  // 1. Flood-fill from outer boundary to identify all outer white background pixels
  const isBgPixel = (x, y) => {
    const idx = (y * w + x) * c;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    // Background is near-white (> 235 on all channels)
    return r > 235 && g > 235 && b > 235;
  };

  const isStrictBg = (r, g, b) => r > 248 && g > 248 && b > 248;

  const visited = new Uint8Array(w * h); // 1 = background, 0 = foreground
  const queue = [];

  // Seed boundary points
  for (let x = 0; x < w; x++) {
    if (isBgPixel(x, 0)) { queue.push(x, 0); visited[0 * w + x] = 1; }
    if (isBgPixel(x, h - 1)) { queue.push(x, h - 1); visited[(h - 1) * w + x] = 1; }
  }
  for (let y = 0; y < h; y++) {
    if (isBgPixel(0, y) && !visited[y * w + 0]) { queue.push(0, y); visited[y * w + 0] = 1; }
    if (isBgPixel(w - 1, y) && !visited[y * w + (w - 1)]) { queue.push(w - 1, y); visited[y * w + (w - 1)] = 1; }
  }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nidx = ny * w + nx;
        if (!visited[nidx] && isBgPixel(nx, ny)) {
          visited[nidx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  console.log(`Flood fill identified ${queue.length / 2} background pixels out of ${w * h}`);

  // 2. Build RGBA buffer with edge de-fringing
  const rgba = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pidx = y * w + x;
      const srcIdx = pidx * c;
      const destIdx = pidx * 4;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      if (visited[pidx] === 1) {
        // Outside the icon -> fully transparent
        rgba[destIdx] = 0;
        rgba[destIdx + 1] = 0;
        rgba[destIdx + 2] = 0;
        rgba[destIdx + 3] = 0;
      } else {
        // Check if this is an edge pixel bordering visited background
        let hasBgNeighbor = false;
        let bgNeighborCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              if (visited[ny * w + nx] === 1) {
                hasBgNeighbor = true;
                bgNeighborCount++;
              }
            }
          }
        }

        if (hasBgNeighbor) {
          // If color is very close to white, attenuate alpha and remove white blend
          const brightness = (r + g + b) / 3;
          if (brightness > 220) {
            const alphaFactor = Math.max(0.1, (255 - brightness) / 35);
            const a = Math.min(255, Math.max(0, Math.round(255 * alphaFactor)));
            // De-fringe: blend toward the dominant edge blue color
            const edgeR = Math.min(255, Math.max(0, Math.round((r - (1 - alphaFactor) * 254) / alphaFactor)));
            const edgeG = Math.min(255, Math.max(0, Math.round((g - (1 - alphaFactor) * 254) / alphaFactor)));
            const edgeB = Math.min(255, Math.max(0, Math.round((b - (1 - alphaFactor) * 254) / alphaFactor)));
            rgba[destIdx] = edgeR;
            rgba[destIdx + 1] = edgeG;
            rgba[destIdx + 2] = edgeB;
            rgba[destIdx + 3] = a;
          } else {
            rgba[destIdx] = r;
            rgba[destIdx + 1] = g;
            rgba[destIdx + 2] = b;
            rgba[destIdx + 3] = 255;
          }
        } else {
          rgba[destIdx] = r;
          rgba[destIdx + 1] = g;
          rgba[destIdx + 2] = b;
          rgba[destIdx + 3] = 255;
        }
      }
    }
  }

  // 3. Find exact bounding box of non-zero alpha pixels
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = rgba[(y * w + x) * 4 + 3];
      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const iconW = maxX - minX + 1;
  const iconH = maxY - minY + 1;
  console.log('Icon bounding box:', { minX, maxX, minY, maxY, iconW, iconH });

  // Extract the raw cropped icon buffer
  const cropped = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: iconW, height: iconH })
    .png()
    .toBuffer();

  // 4. Generate Standard "Any" Icon (Centered on transparent canvas with 4% breathing room)
  // Target: master 1024x1024 transparent icon
  const masterAnySize = 1024;
  const anyTargetInnerSize = Math.round(masterAnySize * 0.94); // 94% of canvas (6% total padding)
  const resizedAnyInner = await sharp(cropped)
    .resize(anyTargetInnerSize, anyTargetInnerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const masterAnyBuffer = await sharp({
    create: {
      width: masterAnySize,
      height: masterAnySize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: resizedAnyInner, gravity: 'center' }])
    .png()
    .toBuffer();

  console.log('Generated master "any" icon buffer.');

  // 5. Generate Maskable Icon (Centered on theme navy canvas with 80% safe zone)
  // Target: master 1024x1024 maskable icon
  const masterMaskableSize = 1024;
  const maskableTargetInnerSize = Math.round(masterMaskableSize * 0.80); // 80% diameter safe zone
  const resizedMaskableInner = await sharp(cropped)
    .resize(maskableTargetInnerSize, maskableTargetInnerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const masterMaskableBuffer = await sharp({
    create: {
      width: masterMaskableSize,
      height: masterMaskableSize,
      channels: 4,
      background: { r: 2, g: 8, b: 19, alpha: 1 } // #020813 Theme Color
    }
  })
    .composite([{ input: resizedMaskableInner, gravity: 'center' }])
    .png()
    .toBuffer();

  console.log('Generated master "maskable" icon buffer.');

  // 6. Write all required icon sizes and formats
  const tasks = [
    // Standard Any icons (with transparent background outside the rounded icon)
    { dest: 'public/icons/icon-512x512.png', size: 512, source: masterAnyBuffer },
    { dest: 'public/icons/icon-512.png', size: 512, source: masterAnyBuffer },
    { dest: 'public/icons/icon-192x192.png', size: 192, source: masterAnyBuffer },
    { dest: 'public/icons/icon-192.png', size: 192, source: masterAnyBuffer },
    { dest: 'public/icons/apple-touch-icon.png', size: 180, source: masterAnyBuffer },
    { dest: 'public/apple-touch-icon.png', size: 180, source: masterAnyBuffer },
    { dest: 'public/favicon.png', size: 64, source: masterAnyBuffer },
    { dest: 'public/icons/favicon-32x32.png', size: 32, source: masterAnyBuffer },
    { dest: 'public/logo.png', size: 512, source: masterAnyBuffer },
    { dest: 'public/logo-emblem.png', size: 512, source: masterAnyBuffer },
    { dest: 'public/logo-emblem-clean.png', size: 512, source: masterAnyBuffer },

    // Maskable icons (for Android / Chrome Adaptive icon masking)
    { dest: 'public/icons/icon-maskable-512x512.png', size: 512, source: masterMaskableBuffer },
    { dest: 'public/icons/icon-maskable-192x192.png', size: 192, source: masterMaskableBuffer }
  ];

  for (const t of tasks) {
    await sharp(t.source)
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(t.dest);
    const stat = fs.statSync(t.dest);
    console.log(`✓ Generated ${t.dest} (${t.size}x${t.size}, ${stat.size} bytes)`);
  }

  console.log('\nAll application icon assets successfully generated!');
}

generateIcons().catch(console.error);
