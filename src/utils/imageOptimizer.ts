/**
 * High-Quality Client-Side Image Processing & Adaptive Compression Engine
 * Enforces 1:1 square output, smart resizing, WebP conversion, and quality-first adaptive compression.
 */

export interface CropArea {
  x: number; // Crop box offset X (in original image coordinates)
  y: number; // Crop box offset Y (in original image coordinates)
  size: number; // Square width/height (in original image coordinates)
}

export interface OptimizationResult {
  blob: Blob;
  width: number;
  height: number;
  format: 'webp' | 'png' | 'jpeg';
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  objectUrl: string;
  compressionRatio: number; // e.g. 0.85 means 85% reduction
}

export interface ImageOptimizationOptions {
  maxDimension?: number; // Default: 1920
  preferredDimension?: number; // Default: 1600
  initialQuality?: number; // Default: 0.88
  minQuality?: number; // Default: 0.78
  preserveTransparency?: boolean;
}

const MAX_TARGET_DIMENSION = 1920;
const MIN_ALLOWED_QUALITY = 0.78;

/**
 * Validates selected file format and size
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Unsupported image format. Please select a JPG, PNG, or WebP file.'
    };
  }

  const maxSizeBytes = 15 * 1024 * 1024; // 15 MB
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 15 MB.`
    };
  }

  return { valid: true };
}

/**
 * Loads an image file into an HTMLImageElement with cross-origin safety and EXIF orientation respect
 */
export function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;

    img.onload = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      resolve(img);
    };

    img.onerror = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      reject(new Error('Failed to load image. File may be corrupted or unreadable.'));
    };

    if (source instanceof File) {
      objectUrlToRevoke = URL.createObjectURL(source);
      img.src = objectUrlToRevoke;
    } else {
      img.src = source;
    }
  });
}

/**
 * Determines whether an image canvas contains transparent pixels
 */
function hasTransparentPixels(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 40));
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const alphaIndex = (y * width + x) * 4 + 3;
        if (data[alphaIndex] < 250) {
          return true;
        }
      }
    }
  } catch (e) {
    // Context might be tainted in edge cases; default to false
    return false;
  }
  return false;
}

/**
 * Converts canvas to Blob using a Promise
 */
function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob conversion failed.'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Main crop and optimization pipeline
 */
export async function optimizeAndCropImage(
  imageSource: HTMLImageElement | File,
  cropArea: CropArea,
  originalFileSize: number,
  options: ImageOptimizationOptions = {}
): Promise<OptimizationResult> {
  const {
    maxDimension = MAX_TARGET_DIMENSION,
    initialQuality = 0.88,
    minQuality = MIN_ALLOWED_QUALITY,
    preserveTransparency = true
  } = options;

  const img = imageSource instanceof HTMLImageElement ? imageSource : await loadImageElement(imageSource);

  // 1. Calculate Target Dimensions (Exact 1:1, never upscale, cap at maxDimension)
  const sourceCropSize = Math.max(1, Math.round(cropArea.size));
  let outputDimension = sourceCropSize;

  if (outputDimension > maxDimension) {
    outputDimension = maxDimension;
  }
  // If smaller than maxDimension, preserve natural resolution (no upscaling)

  // 2. Render 1:1 Crop to Offscreen Canvas with High Quality Interpolation
  const canvas = document.createElement('canvas');
  canvas.width = outputDimension;
  canvas.height = outputDimension;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context for image processing.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the exact cropped square region
  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.size,
    cropArea.size,
    0,
    0,
    outputDimension,
    outputDimension
  );

  // 3. Determine Format (WebP preferred, preserve PNG if transparent)
  const isTransparent = preserveTransparency && hasTransparentPixels(ctx, outputDimension, outputDimension);
  const targetMime = isTransparent ? 'image/png' : 'image/webp';
  const format: 'webp' | 'png' | 'jpeg' = isTransparent ? 'png' : 'webp';

  // 4. Adaptive Compression
  let currentQuality = initialQuality;
  let blob: Blob;

  if (targetMime === 'image/png') {
    blob = await canvasToBlob(canvas, 'image/png');
  } else {
    // Step 1: Initial compression at quality 0.88
    blob = await canvasToBlob(canvas, 'image/webp', currentQuality);

    // Step 2: Quality-first adaptive step-down if file is unusually heavy
    const TWO_MB = 2 * 1024 * 1024;
    const ONE_POINT_FIVE_MB = 1.5 * 1024 * 1024;
    const ONE_MB = 1024 * 1024;

    if (blob.size > TWO_MB && currentQuality > 0.84) {
      currentQuality = 0.84;
      blob = await canvasToBlob(canvas, 'image/webp', currentQuality);
    }

    if (blob.size > ONE_POINT_FIVE_MB && currentQuality > 0.82) {
      currentQuality = 0.82;
      blob = await canvasToBlob(canvas, 'image/webp', currentQuality);
    }

    if (blob.size > ONE_MB && currentQuality > minQuality) {
      currentQuality = Math.max(minQuality, 0.80);
      blob = await canvasToBlob(canvas, 'image/webp', currentQuality);
    }
  }

  // 5. Generate safe preview URL
  const objectUrl = URL.createObjectURL(blob);
  const optimizedSize = blob.size;
  const reduction = originalFileSize > 0 ? Math.max(0, 1 - optimizedSize / originalFileSize) : 0;

  return {
    blob,
    width: outputDimension,
    height: outputDimension,
    format,
    originalSizeBytes: originalFileSize,
    optimizedSizeBytes: optimizedSize,
    objectUrl,
    compressionRatio: Number(reduction.toFixed(2))
  };
}

/**
 * Format bytes into human-friendly string (e.g., "780 KB", "1.4 MB")
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 || val >= 10 ? 0 : 1)} ${units[i]}`;
}
