// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CLIENT-SIDE IMAGE OPTIMIZATION UTILITY
// High-performance canvas-based image resizing and WebP compression.
// Ensures visually high quality with drastically reduced file sizes for Cloudflare R2.
// ============================================================================

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/webp' | 'image/jpeg';
}

export interface OptimizedImageResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number; // e.g. 0.25 (75% smaller)
  mimeType: string;
}

/**
 * Optimizes an image file in-browser using HTML5 Canvas before uploading.
 * @param file - Original user-selected File
 * @param options - Resizing & quality parameters
 * @returns Promise<OptimizedImageResult>
 */
export async function optimizeImageForUpload(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const maxWidth = options.maxWidth || 1920;
  const maxHeight = options.maxHeight || 1080;
  const quality = options.quality ?? 0.85;
  const targetFormat = options.format || 'image/webp';

  // If already SVG or GIF (animated), don't alter
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      blob: file,
      previewUrl,
      width: 0,
      height: 0,
      originalSize: file.size,
      optimizedSize: file.size,
      compressionRatio: 1,
      mimeType: file.type
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Calculate constrained dimensions while strictly preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw onto canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: targetFormat === 'image/webp' });
      if (!ctx) {
        return reject(new Error('Failed to obtain 2D canvas rendering context for image optimization.'));
      }

      // Smoothing configuration for crisp text and illustrations
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export to target format
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Failed to convert canvas to optimized image blob.'));
          }

          // Build clean filename
          const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const ext = targetFormat === 'image/webp' ? 'webp' : 'jpg';
          const optimizedFileName = `${originalName.replace(/[^a-zA-Z0-9_-]/g, '_')}_opt.${ext}`;

          const optimizedFile = new File([blob], optimizedFileName, {
            type: targetFormat,
            lastModified: Date.now()
          });

          const previewUrl = URL.createObjectURL(blob);
          const compressionRatio = Number((blob.size / Math.max(1, file.size)).toFixed(2));

          resolve({
            file: optimizedFile,
            blob,
            previewUrl,
            width,
            height,
            originalSize: file.size,
            optimizedSize: blob.size,
            compressionRatio,
            mimeType: targetFormat
          });
        },
        targetFormat,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for optimization. The file may be corrupt.'));
    };

    img.src = objectUrl;
  });
}
