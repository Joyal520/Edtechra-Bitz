import type { AchievementSnapshot } from './classChampionsUtils';

const DEFAULT_LOGO_PATH = '/images/edtechra-classroom-logo.png';
const IMAGE_FETCH_TIMEOUT_MS = 6000;

/**
 * Fetches an image URL and converts it into an inline base64 data URL so
 * SVG serialization onto an HTMLCanvasElement stays CORS-clean and never taints.
 */
export async function imageUrlToDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS) : undefined;

  try {
    const isSameOrigin =
      trimmed.startsWith('/') ||
      (typeof window !== 'undefined' && trimmed.startsWith(window.location.origin));

    const response = await fetch(trimmed, {
      mode: isSameOrigin ? 'same-origin' : 'cors',
      cache: 'force-cache',
      signal: controller?.signal,
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
  }
}

export interface PreloadedCertificateAssets {
  logoUrl: string;
  avatarDataUrls: Partial<Record<1 | 2 | 3, string | null>>;
}

/**
 * Resolves the EdTechra logo and Top 3 champion avatars into inline data URLs
 * in parallel for instant, CORS-safe PNG export.
 */
export async function preloadCertificateAssets(
  snapshot: AchievementSnapshot
): Promise<PreloadedCertificateAssets> {
  const rank1 = snapshot.champions.find((c) => c.rank === 1);
  const rank2 = snapshot.champions.find((c) => c.rank === 2);
  const rank3 = snapshot.champions.find((c) => c.rank === 3);

  const [logoDataUrl, avatar1, avatar2, avatar3] = await Promise.all([
    imageUrlToDataUrl(DEFAULT_LOGO_PATH),
    imageUrlToDataUrl(rank1?.avatarUrl),
    imageUrlToDataUrl(rank2?.avatarUrl),
    imageUrlToDataUrl(rank3?.avatarUrl),
  ]);

  return {
    logoUrl: logoDataUrl || DEFAULT_LOGO_PATH,
    avatarDataUrls: {
      1: avatar1,
      2: avatar2,
      3: avatar3,
    },
  };
}

/**
 * Renders the certificate SVG DOM node onto an offscreen canvas and exports
 * a crisp high-resolution PNG Blob (default 1200 x 1300).
 */
export async function renderCertificateSvgToPngBlob(
  svgElement: SVGSVGElement,
  width = 1200,
  height = 1300
): Promise<Blob> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.width = width;
      image.height = height;
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load rendered SVG image'));
      image.src = svgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not initialize 2D canvas context');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });

    if (!pngBlob) {
      throw new Error('Canvas failed to export PNG blob');
    }

    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/**
 * Builds a clean download filename matching EdTechra_Class_Champions_<Name>.png.
 */
export function getCertificateFilename(classroomName: string): string {
  const safeName = (classroomName || 'Classroom')
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]+/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `EdTechra_Class_Champions_${safeName || 'Classroom'}.png`;
}

/**
 * Triggers a browser file download for the generated achievement certificate PNG.
 */
export function downloadCertificateBlob(blob: Blob, classroomName: string): void {
  const filename = getCertificateFilename(classroomName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Builds the default WhatsApp/share message accompanying the certificate.
 */
export function buildWhatsAppShareMessage(classroomName: string, shareUrl?: string): string {
  const name = classroomName?.trim() || 'our Classroom';
  const lines = [
    `🏆 *EdTechra Class Champions — ${name}*`,
    'Congratulations to our Top 3 performers! Keep learning, keep growing, and reach even greater heights! ✨',
  ];
  if (shareUrl) {
    lines.push('', `View certificate: ${shareUrl}`);
  }
  return lines.join('\n');
}

export interface WhatsAppShareParams {
  blob: Blob;
  classroomName: string;
  shareUrl?: string;
}

/**
 * Shares the PNG certificate directly via Web Share API when supported
 * (mobile/PWA browsers), otherwise downloads the PNG cleanly and opens WhatsApp Web.
 */
export async function shareCertificateOnWhatsApp({
  blob,
  classroomName,
  shareUrl,
}: WhatsAppShareParams): Promise<'native_file' | 'fallback_whatsapp'> {
  const filename = getCertificateFilename(classroomName);
  const message = buildWhatsAppShareMessage(classroomName, shareUrl);

  if (typeof navigator !== 'undefined' && typeof File !== 'undefined') {
    const file = new File([blob], filename, { type: 'image/png' });
    const canShareFiles =
      typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

    if (canShareFiles && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'EdTechra Class Champions',
          text: message,
          files: [file],
        });
        return 'native_file';
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          throw err;
        }
      }
    }
  }

  downloadCertificateBlob(blob, classroomName);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  return 'fallback_whatsapp';
}
