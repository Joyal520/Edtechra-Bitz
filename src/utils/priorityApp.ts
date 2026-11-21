// ============================================================================
// EDTECHRA LIBRARY: PRIORITY APP CLIENT HELPERS & SESSION ANTI-LOOP FLAGS
// ============================================================================

import type { LibraryResource } from '@/types/library';
import { getNormalizedFileType, getNormalizedTrainingFormat } from '@/types/library';
import type { PriorityAppLaunchType } from '@/types/priorityApp';

export const PRIORITY_BYPASS_KEY = 'edtechra_priority_bypass';
export const PRIORITY_HANDLED_UID_KEY = 'edtechra_priority_handled_uid';

export function isSafePriorityAppUrl(rawUrl?: string | null): boolean {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    trimmed.startsWith('//')
  ) {
    return false;
  }

  if (trimmed.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isPriorityAppCompatible(resource: Partial<LibraryResource> | null | undefined): boolean {
  if (!resource || !resource.id) return false;
  return isSafePriorityAppUrl(resource.file_url);
}

export function getPriorityAppLaunchPath(
  app: LibraryResource,
  launchType?: PriorityAppLaunchType | null
): string {
  const url = (app.file_url || '').trim();

  if (launchType === 'internal' || (url.startsWith('/') && !url.startsWith('//'))) {
    return url || '/library';
  }

  const normalizedType = getNormalizedFileType(app);
  const isPptx =
    launchType === 'presentation' ||
    normalizedType === 'pptx' ||
    (normalizedType === 'training' && getNormalizedTrainingFormat(app) === 'pptx');

  if (isPptx) {
    return `/library/present/${app.id}?from=priority`;
  }

  return `/library/app/${app.id}`;
}

export function setPriorityBypass(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(PRIORITY_BYPASS_KEY, '1');
    }
  } catch {
    // Ignore storage access errors
  }
}

export function hasPriorityBypass(): boolean {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(PRIORITY_BYPASS_KEY) === '1';
    }
  } catch {
    // Ignore storage access errors
  }
  return false;
}

export function markPriorityHandledForUser(uid: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage && uid) {
      window.sessionStorage.setItem(PRIORITY_HANDLED_UID_KEY, uid);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function wasPriorityHandledForUser(uid?: string | null): boolean {
  if (!uid) return false;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(PRIORITY_HANDLED_UID_KEY) === uid;
    }
  } catch {
    // Ignore storage access errors
  }
  return false;
}

export function clearPrioritySessionFlags(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(PRIORITY_BYPASS_KEY);
      window.sessionStorage.removeItem(PRIORITY_HANDLED_UID_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}
