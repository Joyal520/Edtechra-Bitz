import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceLogo = 'C:/Users/hecsb/.gemini/antigravity/brain/5da474a2-6053-4060-a88e-afb467942a17/.user_uploaded/media_1786968706920.jpg';

const publicDir = path.resolve('./public');
const iconsDir = path.resolve('./public/icons');
const assetsDir = path.resolve('./public/assets');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

async function processLogo() {
  console.log('Processing official EdTechra-Bitz logo from source...');

  // 1. High-res base logo
  await sharp(sourceLogo)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  await sharp(sourceLogo)
    .png()
    .toFile(path.join(assetsDir, 'edtechra-bitz-logo.png'));

  // 2. Standard 192x192 icon
  await sharp(sourceLogo)
    .resize(192, 192, { fit: 'contain', background: { r: 15, g: 35, b: 58, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));

  await sharp(sourceLogo)
    .resize(192, 192, { fit: 'contain', background: { r: 15, g: 35, b: 58, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));

  // 3. Standard 512x512 icon
  await sharp(sourceLogo)
    .resize(512, 512, { fit: 'contain', background: { r: 15, g: 35, b: 58, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));

  await sharp(sourceLogo)
    .resize(512, 512, { fit: 'contain', background: { r: 15, g: 35, b: 58, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));

  // 4. Maskable 192x192 (contain with 15% safe padding on deep dark background #0b1d33)
  const padded192 = await sharp(sourceLogo)
    .resize(154, 154, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 11, g: 29, b: 51, alpha: 1 }
    }
  })
    .composite([{ input: padded192, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));

  // 5. Maskable 512x512 (contain with 15% safe padding on deep dark background #0b1d33)
  const padded512 = await sharp(sourceLogo)
    .resize(410, 410, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 29, b: 51, alpha: 1 }
    }
  })
    .composite([{ input: padded512, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  // 6. Apple touch icon 180x180
  await sharp(sourceLogo)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  await sharp(sourceLogo)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 7. Favicon 32x32 & 64x64
  await sharp(sourceLogo)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(iconsDir, 'favicon-32x32.png'));

  await sharp(sourceLogo)
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('Official EdTechra-Bitz branding and PWA icons generated successfully!');
}

processLogo().catch(err => {
  console.error('Error processing logo:', err);
  process.exit(1);
});
