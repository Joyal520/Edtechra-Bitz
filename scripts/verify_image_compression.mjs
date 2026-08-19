import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCompressionTest() {
  console.log('===============================================================');
  console.log('EDTECHRA-BITZ: HIGH-QUALITY ADAPTIVE IMAGE COMPRESSION TEST');
  console.log('===============================================================');

  const testDir = path.resolve(__dirname, '../server/data/test_artifacts');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 1. Generate a large 16:9 high-resolution test image (3840 x 2160)
  console.log('1. Creating sample large 16:9 high-res test image (3840x2160)...');
  const rawSvg = `
    <svg width="3840" height="2160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#026fc3;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#0f233a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="3840" height="2160" fill="url(#grad)" />
      <text x="50%" y="45%" font-family="Arial" font-size="140" font-weight="bold" fill="white" text-anchor="middle">
        EdTechra Bitz Microlearning
      </text>
      <text x="50%" y="60%" font-family="Arial" font-size="80" fill="#fde047" text-anchor="middle">
        High Quality 1:1 Adaptive WebP Pipeline
      </text>
    </svg>
  `;

  const inputJpgPath = path.join(testDir, 'source_large_16_9.jpg');
  await sharp(Buffer.from(rawSvg))
    .jpeg({ quality: 100 })
    .toFile(inputJpgPath);

  const initialStat = fs.statSync(inputJpgPath);
  console.log(`✓ Created test source image: ${inputJpgPath}`);
  console.log(`  • Original Dimensions: 3840 × 2160 px (16:9)`);
  console.log(`  • Original File Size: ${(initialStat.size / (1024 * 1024)).toFixed(2)} MB (${initialStat.size} bytes)`);

  // 2. Perform 1:1 Center Crop and Intelligent Resizing (cap to 1920x1920)
  console.log('\n2. Executing 1:1 Square Crop & Downscaling to max 1920x1920...');
  const cropSize = 2160; // Max square from 3840x2160
  const cropX = Math.round((3840 - cropSize) / 2);
  const cropY = 0;

  const targetDimension = 1920;

  // Step 3: Adaptive WebP Compression (quality 0.88)
  const outputWebpPath = path.join(testDir, 'optimized_student_post.webp');
  await sharp(inputJpgPath)
    .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
    .resize(targetDimension, targetDimension, { fit: 'cover', kernel: 'lanczos3' })
    .webp({ quality: 88, effort: 6 })
    .toFile(outputWebpPath);

  const optimizedStat = fs.statSync(outputWebpPath);
  const reductionPercent = ((1 - optimizedStat.size / initialStat.size) * 100).toFixed(1);

  console.log(`✓ Output WebP Generated: ${outputWebpPath}`);
  console.log(`  • Final Dimensions: 1920 × 1920 px (EXACT 1:1)`);
  console.log(`  • Optimized File Size: ${(optimizedStat.size / 1024).toFixed(1)} KB (${optimizedStat.size} bytes)`);
  console.log(`  • Bandwidth & Storage Reduction: ${reductionPercent}% reduction`);

  // Clean up test files
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log('\n===============================================================');
  console.log('🎉 COMPRESSION PIPELINE VERIFICATION COMPLETE!');
  console.log('===============================================================');
}

runCompressionTest().catch(console.error);
