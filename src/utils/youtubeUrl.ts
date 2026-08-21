// ============================================================================
// EDTECHRA-BITZ: YouTube URL Parsing & Thumbnail Helper Utility
// ============================================================================

/**
 * Extracts a clean 11-character YouTube video ID from various URL formats or raw ID string.
 * Supported formats:
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID&t=10s
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Raw 11-character video ID (e.g. "43zVx_kWp6s")
 *
 * @param urlOrId Input string containing URL or raw ID
 * @returns Clean 11-character video ID, or null if invalid
 */
export function extractYouTubeVideoId(urlOrId?: string | null): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // 1. Raw 11-character video ID check (letters, numbers, underscore, hyphen)
  const rawIdMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (rawIdMatch) {
    return trimmed;
  }

  try {
    // 2. Pattern matches for YouTube Shorts: /shorts/{id}
    const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }

    // 3. Shortened youtu.be links: youtu.be/{id}
    const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (youtuBeMatch && youtuBeMatch[1]) {
      return youtuBeMatch[1];
    }

    // 4. Standard watch URLs: youtube.com/watch?v={id}
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }

    // 5. Embed URLs: youtube.com/embed/{id}
    const embedMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (embedMatch && embedMatch[1]) {
      return embedMatch[1];
    }

    // 6. Generic pathname fallback if formatted as URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const searchParamId = url.searchParams.get('v');
      if (searchParamId && searchParamId.length === 11) {
        return searchParamId;
      }
      const pathParts = url.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(lastPart)) {
        return lastPart;
      }
    }
  } catch (e) {
    // URL parsing failed, regex fallbacks already attempted
  }

  return null;
}

/**
 * Returns standard YouTube thumbnail URLs based on video ID.
 * Defaults to maxresdefault with fallback capability.
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'maxres' | 'hq' | 'mq' | 'default' = 'maxres'
): string {
  if (!videoId) return '';
  const qualityMap = {
    maxres: 'maxresdefault.jpg',
    hq: 'hqdefault.jpg',
    mq: 'mqdefault.jpg',
    default: 'default.jpg'
  };
  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality] || 'hqdefault.jpg'}`;
}

/**
 * Generates standard official YouTube Shorts URL
 */
export function getYouTubeShortsUrl(videoId: string): string {
  if (!videoId) return '';
  return `https://www.youtube.com/shorts/${videoId}`;
}

/**
 * Generates official privacy-enhanced YouTube embed player URL
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay = true): string {
  if (!videoId) return '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`;
}
