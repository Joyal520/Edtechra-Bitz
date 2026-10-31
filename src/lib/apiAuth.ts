// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: UNIFIED API AUTHENTICATION LAYER
// Centralized token acquisition, proactive expiry checks, auto-refresh,
// transparent retry on 401, and consistent Authorization header propagation.
// ============================================================================

import { supabase } from '@/lib/supabase';

let _inFlightRefreshPromise: Promise<string | null> | null = null;

/**
 * Safely decodes JWT payload to inspect expiration without external dependencies
 */
function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return typeof parsed?.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired or within the safety buffer (default: 45 seconds)
 */
function isTokenExpired(token: string, bufferSeconds = 45): boolean {
  if (!token) return true;
  const exp = parseJwtExp(token);
  if (!exp) return false; // If we cannot parse exp, trust Supabase's internal check
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec + bufferSeconds >= exp;
}

/**
 * Fallback to directly inspect localStorage for the Supabase auth token
 * Useful during initial page mount or rapid redirect flows before GoTrue loads into memory.
 */
function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.access_token === 'string' && parsed.access_token.length > 20) {
            return parsed.access_token;
          }
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

/**
 * Retrieves a verified, non-expired Supabase access token.
 * Proactively refreshes the session via supabase.auth.refreshSession() if near expiry.
 */
export async function getValidAuthToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
  const client = supabase;
  if (!client) return null;

  // Deduplicate concurrent refresh calls
  if (_inFlightRefreshPromise) {
    return _inFlightRefreshPromise;
  }

  const resolveToken = async (): Promise<string | null> => {
    try {
      // 1. If force refresh requested, refresh immediately
      if (options?.forceRefresh) {
        const { data: refreshed, error: refreshErr } = await client.auth.refreshSession();
        if (!refreshErr && refreshed?.session?.access_token) {
          return refreshed.session.access_token;
        }
      }

      // 2. Query active session from Supabase client
      let { data: sessionData, error: sessionErr } = await client.auth.getSession();
      let session = sessionData?.session;

      // 3. Fallback: if session is null, wait briefly or check localStorage
      if (!session && !sessionErr) {
        const storedToken = getStoredAccessToken();
        if (storedToken && !isTokenExpired(storedToken)) {
          return storedToken;
        }

        // Wait up to 300ms if session is currently hydrating after OAuth redirect
        await new Promise((r) => setTimeout(r, 300));
        const retry = await client.auth.getSession();
        session = retry.data?.session;
      }

      if (!session || !session.access_token) {
        return null;
      }

      // 4. Proactive Expiration Check: If token is expired or expiring within 45s, refresh it
      if (isTokenExpired(session.access_token, 45)) {
        console.log('[apiAuth] Access token is near expiration or expired. Refreshing session...');
        const { data: refreshed, error: refreshErr } = await client.auth.refreshSession();
        if (!refreshErr && refreshed?.session?.access_token) {
          return refreshed.session.access_token;
        }
        // If refresh fails, fall back to current token as last resort
        return session.access_token;
      }

      return session.access_token;
    } catch (err) {
      console.warn('[apiAuth] getValidAuthToken notice:', err);
      return null;
    } finally {
      _inFlightRefreshPromise = null;
    }
  };

  _inFlightRefreshPromise = resolveToken();
  return _inFlightRefreshPromise;
}

/**
 * Returns HTTP headers object with Content-Type and Authorization: Bearer <valid_token>
 */
export async function getAuthHeaders(
  additionalHeaders?: HeadersInit
): Promise<Record<string, string>> {
  const token = await getValidAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (additionalHeaders) {
    if (additionalHeaders instanceof Headers) {
      additionalHeaders.forEach((val, key) => {
        headers[key] = val;
      });
    } else if (Array.isArray(additionalHeaders)) {
      for (const [key, val] of additionalHeaders) {
        headers[key] = val;
      }
    } else {
      Object.assign(headers, additionalHeaders);
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  return headers;
}

/**
 * Robust, authenticated wrapper around fetch.
 * - Injects Authorization: Bearer <token>.
 * - If the server responds with 401 Unauthorized, automatically forces a session refresh
 *   and retries the request once before failing.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getValidAuthToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token.trim()}`);
  }

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers
    });
  } catch (netErr) {
    throw netErr;
  }

  // If 401 Unauthorized, attempt token refresh and retry ONCE
  if (response.status === 401 && supabase) {
    console.warn(`[apiAuth] Received 401 from ${input.toString()}. Attempting automatic token refresh and retry...`);
    const freshToken = await getValidAuthToken({ forceRefresh: true });
    if (freshToken) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${freshToken.trim()}`);

      try {
        const retryResponse = await fetch(input, {
          ...init,
          headers: retryHeaders
        });
        return retryResponse;
      } catch (retryErr) {
        console.error('[apiAuth] Retry after refresh failed:', retryErr);
      }
    }
  }

  return response;
}
