import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = 'C:/Users/hecsb/.gemini/antigravity/brain/c987cb2f-cc02-493a-84ca-092d5b5595ce/.user_uploaded/media_1787302777146.jpg';
const publicDir = path.resolve('./public');
const iconsDir = path.resolve('./public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function run() {
  console.log('Generating premium EdTechra Bitz assets...');

  // 1. Extract the squircle app icon (left: 17, top: 90, width: 285, height: 305)
  // Let's make a square 1:1 cut of the squircle (width 285, height 285 or proportional)
  const iconRaw = await sharp(input)
    .extract({ left: 17, top: 90, width: 285, height: 308 })
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toBuffer();

  // Save full 512x512 app icon
  await sharp(iconRaw)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(iconsDir, 'icon-512x512.png'));

  await sharp(iconRaw)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(iconsDir, 'icon-512.png'));

  // 2. icon-192x192.png
  await sharp(iconRaw)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(iconsDir, 'icon-192x192.png'));

  await sharp(iconRaw)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(iconsDir, 'icon-192.png'));

  // 3. Apple Touch Icon (180x180)
  await sharp(iconRaw)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(iconRaw)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  // 4. Favicons (32x32 & 64x64)
  await sharp(iconRaw)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon-32x32.png'));

  await sharp(iconRaw)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // 5. Maskable Icons:
  // For maskable icon, Android requires safe-zone padding (80% diameter circle).
  // We place the squircle icon with padding over dark navy background #030b18.
  const maskableBg = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 3, g: 11, b: 24, alpha: 1 }
    }
  }).png().toBuffer();

  const iconForMaskable = await sharp(iconRaw)
    .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const maskable512 = await sharp(maskableBg)
    .composite([{ input: iconForMaskable, top: 51, left: 51 }])
    .png()
    .toBuffer();

  await sharp(maskable512)
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  await sharp(maskable512)
    .resize(192, 192)
    .toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));

  // 6. Extract high-res logo emblem & full branding for Splash / Navigation
  // The phone mockup has the standalone 3D emblem at approx: left: 405, top: 220, width: 230, height: 240
  // And full logo + text at left: 395, top: 220, width: 250, height: 340
  const splashLogoFull = await sharp(input)
    .extract({ left: 395, top: 220, width: 250, height: 335 })
    .resize(500, 670, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp(splashLogoFull)
    .toFile(path.join(publicDir, 'logo-full.png'));

  // Standalone 3D Emblem
  const splashEmblem = await sharp(input)
    .extract({ left: 405, top: 220, width: 230, height: 240 })
    .resize(256, 256, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp(splashEmblem)
    .toFile(path.join(publicDir, 'logo-emblem.png'));

  // Also replace /public/logo.png with the new premium logo squircle / emblem
  await sharp(iconRaw)
    .resize(256, 256)
    .toFile(path.join(publicDir, 'logo.png'));

  // 7. Extract the phone splash background wave mesh
  const splashWave = await sharp(input)
    .extract({ left: 335, top: 680, width: 355, height: 280 })
    .resize(720, 560, { fit: 'cover' })
    .png()
    .toBuffer();

  await sharp(splashWave)
    .toFile(path.join(publicDir, 'splash-wave.png'));

  console.log('All premium icon and splash assets generated successfully!');
}

run().catch(console.error);
