// ============================================================================
// EDTECHRA LIBRARY: Default Cover Generators, Magic-Byte Validators & URL Utils
// ============================================================================

import { LibraryFileType } from '@/types/library';

/**
 * Creates high-fidelity SVG data URIs for default educational covers.
 * Ensures consistent, beautiful card visuals with 0ms load latency and no stock-photo artifacts.
 */
export function getDefaultCoverDataUri(fileType: LibraryFileType, _title?: string): string {
  if (fileType === 'pptx') {
    // Presentation cover: Rich indigo/slate gradient with amber presentation motifs
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
        <defs>
          <linearGradient id="pptx-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#311042" />
          </linearGradient>
          <linearGradient id="amber-accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="800" height="500" fill="url(#pptx-bg)" />
        <rect width="800" height="500" fill="url(#grid)" />
        
        <!-- Subtle Glow Circle -->
        <circle cx="680" cy="120" r="180" fill="#f59e0b" opacity="0.08" />
        <circle cx="120" cy="400" r="140" fill="#6366f1" opacity="0.12" />

        <!-- Presentation Slide Mockup Card -->
        <rect x="180" y="90" width="440" height="260" rx="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
        <rect x="210" y="125" width="160" height="12" rx="6" fill="#f59e0b" opacity="0.9" />
        <rect x="210" y="150" width="280" height="8" rx="4" fill="rgba(255,255,255,0.3)" />
        <rect x="210" y="170" width="240" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
        
        <!-- Presentation Graphic / Chart Bars -->
        <rect x="210" y="220" width="35" height="70" rx="6" fill="#f59e0b" opacity="0.75" />
        <rect x="260" y="200" width="35" height="90" rx="6" fill="#f59e0b" opacity="0.9" />
        <rect x="310" y="240" width="35" height="50" rx="6" fill="#f59e0b" opacity="0.6" />
        <rect x="360" y="190" width="35" height="100" rx="6" fill="#f59e0b" opacity="1" />

        <!-- Badge & Platform Brand -->
        <g transform="translate(60, 410)">
          <rect width="130" height="32" rx="10" fill="#f59e0b" />
          <text x="65" y="21" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="12" text-anchor="middle" letter-spacing="1">PRESENTATION</text>
          <text x="150" y="22" fill="rgba(255,255,255,0.6)" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14">EdTechra Slide Deck</text>
        </g>
      </svg>
    `.trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (fileType === 'web_blog') {
    // Web / Blog cover: Midnight slate & emerald cyan gradient
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
        <defs>
          <linearGradient id="web-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#022c22" />
            <stop offset="50%" stop-color="#064e3b" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
          <linearGradient id="emerald-accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#06b6d4" />
          </linearGradient>
          <pattern id="web-dots" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.5" fill="rgba(255,255,255,0.06)" />
          </pattern>
        </defs>
        <rect width="800" height="500" fill="url(#web-bg)" />
        <rect width="800" height="500" fill="url(#web-dots)" />

        <!-- Browser Mockup Window -->
        <rect x="160" y="80" width="480" height="280" rx="18" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" />
        <!-- Browser Window Dots -->
        <circle cx="190" cy="105" r="5" fill="#ef4444" opacity="0.8" />
        <circle cx="206" cy="105" r="5" fill="#f59e0b" opacity="0.8" />
        <circle cx="222" cy="105" r="5" fill="#10b981" opacity="0.8" />
        <!-- Search bar inside mockup -->
        <rect x="250" y="96" width="260" height="18" rx="8" fill="rgba(255,255,255,0.12)" />
        <text x="265" y="109" fill="rgba(255,255,255,0.4)" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="10">https://edtechra.org/learning</text>

        <!-- Web Content Layout Inside Mockup -->
        <rect x="190" y="145" width="240" height="14" rx="6" fill="#10b981" opacity="0.9" />
        <rect x="190" y="172" width="420" height="8" rx="4" fill="rgba(255,255,255,0.3)" />
        <rect x="190" y="188" width="380" height="8" rx="4" fill="rgba(255,255,255,0.25)" />
        <rect x="190" y="204" width="310" height="8" rx="4" fill="rgba(255,255,255,0.2)" />

        <rect x="190" y="235" width="120" height="85" rx="10" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" />
        <rect x="330" y="235" width="280" height="10" rx="4" fill="rgba(255,255,255,0.35)" />
        <rect x="330" y="255" width="240" height="8" rx="4" fill="rgba(255,255,255,0.2)" />
        <rect x="330" y="271" width="200" height="8" rx="4" fill="rgba(255,255,255,0.18)" />

        <!-- Badge & Platform Brand -->
        <g transform="translate(60, 410)">
          <rect width="130" height="32" rx="10" fill="#059669" />
          <text x="65" y="21" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="12" text-anchor="middle" letter-spacing="1">WEB / BLOG</text>
          <text x="150" y="22" fill="rgba(255,255,255,0.6)" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14">Interactive Web Lesson</text>
        </g>
      </svg>
    `.trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // PDF default cover: Deep EdTechra navy blue with vibrant sky & crimson accents
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
      <defs>
        <linearGradient id="pdf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#021f3d" />
          <stop offset="50%" stop-color="#033d6b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <pattern id="pdf-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="800" height="500" fill="url(#pdf-bg)" />
      <rect width="800" height="500" fill="url(#pdf-grid)" />

      <!-- Document Sheet Mockup -->
      <g transform="translate(260, 70)">
        <rect width="280" height="330" rx="14" fill="#ffffff" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.4))" />
        <!-- Top Crimson Header Band -->
        <rect width="280" height="12" rx="4" fill="#e11d48" />
        
        <!-- Document Content Lines -->
        <rect x="30" y="40" width="130" height="16" rx="6" fill="#e11d48" opacity="0.85" />
        <rect x="30" y="70" width="220" height="8" rx="4" fill="#cbd5e1" />
        <rect x="30" y="86" width="200" height="8" rx="4" fill="#e2e8f0" />
        <rect x="30" y="102" width="180" height="8" rx="4" fill="#e2e8f0" />

        <rect x="30" y="130" width="220" height="70" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
        <circle cx="60" cy="165" r="14" fill="#e11d48" opacity="0.2" />
        <rect x="90" y="152" width="120" height="8" rx="4" fill="#94a3b8" />
        <rect x="90" y="168" width="80" height="6" rx="3" fill="#cbd5e1" />

        <rect x="30" y="225" width="220" height="8" rx="4" fill="#cbd5e1" />
        <rect x="30" y="241" width="190" height="8" rx="4" fill="#e2e8f0" />
        <rect x="30" y="257" width="210" height="8" rx="4" fill="#e2e8f0" />
      </g>

      <!-- Badge & Platform Brand -->
      <g transform="translate(60, 410)">
        <rect width="90" height="32" rx="10" fill="#e11d48" />
        <text x="45" y="21" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="12" text-anchor="middle" letter-spacing="1">PDF</text>
        <text x="110" y="22" fill="rgba(255,255,255,0.6)" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14">EdTechra Study Guide</text>
      </g>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Validates that an uploaded file is genuinely a PDF by inspecting its header bytes (%PDF-).
 * Does not trust file extension or mime-type alone.
 */
export async function validatePdfFile(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. Max size check (100MB)
  const MAX_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds the 100 MB limit for PDF documents.' };
  }

  // 2. Extension check
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File must have a .pdf extension.' };
  }

  // 3. Magic byte inspection: The first 5 bytes of any valid PDF must be "%PDF-" (0x25, 0x50, 0x44, 0x46, 0x2D)
  try {
    const chunk = file.slice(0, 8);
    const buffer = await chunk.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const headerString = String.fromCharCode(...bytes.slice(0, 5));

    if (headerString !== '%PDF-') {
      return {
        valid: false,
        error: 'The uploaded file is not a valid PDF document (missing %PDF header signature).'
      };
    }
  } catch (err: any) {
    return { valid: false, error: `Failed to inspect PDF file: ${err.message || 'Corrupted file'}` };
  }

  return { valid: true };
}

/**
 * Validates that an uploaded presentation file is a valid PPTX package.
 * PPTX files are OpenXML ZIP packages whose first 4 bytes are "PK\x03\x04" (0x50, 0x4B, 0x03, 0x04).
 */
export async function validatePresentationFile(file: File): Promise<{ valid: boolean; error?: string }> {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const MAX_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds the 100 MB limit for presentations.' };
  }

  const lowerName = file.name.toLowerCase();
  const isPptx = lowerName.endsWith('.pptx');
  const isPpt = lowerName.endsWith('.ppt');

  if (!isPptx && !isPpt) {
    return { valid: false, error: 'File must have a .pptx or .ppt extension.' };
  }

  // If PPTX, inspect ZIP magic bytes
  if (isPptx) {
    try {
      const chunk = file.slice(0, 4);
      const buffer = await chunk.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // PK\x03\x04
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4B || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
        return {
          valid: false,
          error: 'The uploaded file is not a valid PowerPoint (.pptx) presentation package.'
        };
      }
    } catch (err: any) {
      return { valid: false, error: `Failed to inspect presentation file: ${err.message || 'Corrupted file'}` };
    }
  }

  return { valid: true };
}

/**
 * Validates an uploaded HTML document for Web / Blog learning activities.
 */
export async function validateHtmlFile(file: File): Promise<{ valid: boolean; error?: string; sampleHtml?: string }> {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'HTML file exceeds the 50 MB limit.' };
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.html') && !lowerName.endsWith('.htm')) {
    return { valid: false, error: 'File must have a .html or .htm extension.' };
  }

  try {
    // Read first 2KB to ensure it contains HTML markers
    const textSample = await file.slice(0, 2048).text();
    const hasHtmlStructure =
      /<(!doctype\s+html|html|head|body|div|p|h[1-6]|main|section|article)/i.test(textSample);

    if (!hasHtmlStructure) {
      return {
        valid: false,
        error: 'The uploaded file does not appear to contain valid HTML markup.'
      };
    }

    return { valid: true, sampleHtml: textSample };
  } catch (err: any) {
    return { valid: false, error: `Failed to inspect HTML file: ${err.message || 'Corrupted file'}` };
  }
}

/**
 * Validates external Web or GitHub URLs.
 * Checks protocol (must be HTTPS or HTTP, rejects javascript: or data: schemes)
 * and detects GitHub repository vs Pages vs direct HTML.
 */
export function validateWebUrl(rawUrl: string): {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
  isGitHub?: boolean;
  isGitHubRepo?: boolean;
  message?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a URL.' };
  }

  // Reject dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:')
  ) {
    return { valid: false, error: 'Dangerous URL scheme rejected. Please use a secure HTTPS link.' };
  }

  let parsed: URL;
  try {
    // Auto-prefix https:// if omitted
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withProto);
  } catch {
    return { valid: false, error: 'Please enter a valid website address (e.g., https://example.com/lesson).' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must use HTTPS or HTTP protocol.' };
  }

  const host = parsed.hostname.toLowerCase();
  const isGitHub = host === 'github.com' || host === 'raw.githubusercontent.com' || host.endsWith('.github.io');
  let isGitHubRepo = false;
  let message: string | undefined;

  if (host === 'github.com') {
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    // If it's a repo link like /user/repo
    if (pathParts.length >= 2 && !parsed.pathname.includes('/blob/')) {
      isGitHubRepo = true;
      message = 'GitHub repository links cannot be embedded directly in an iframe due to GitHub security headers. Students will open this repository in a dedicated tab.';
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    isGitHub,
    isGitHubRepo,
    message
  };
}
