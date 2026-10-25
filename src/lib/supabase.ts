import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

// Auto-heal any cached session in localStorage whose JWT access_token was bloated by base64 user_metadata (> 4KB),
// which would otherwise cause HTTP 431 / CORS failures on PostgREST queries.
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = window.localStorage.getItem(key);
        if (raw && raw.length > 4500) {
          const parsed = JSON.parse(raw);
          const tokenLen = typeof parsed?.access_token === 'string' ? parsed.access_token.length : 0;
          const hasDataAvatar =
            typeof parsed?.user?.user_metadata?.avatar_url === 'string' &&
            parsed.user.user_metadata.avatar_url.startsWith('data:');
          if (tokenLen > 4000 || hasDataAvatar) {
            // Force GoTrueClient.__loadSession() to immediately exchange refresh_token for a clean, compact JWT
            parsed.expires_at = Math.floor(Date.now() / 1000) - 60;
            if (parsed.user?.user_metadata) {
              if (typeof parsed.user.user_metadata.avatar_url === 'string' && parsed.user.user_metadata.avatar_url.startsWith('data:')) {
                delete parsed.user.user_metadata.avatar_url;
              }
              if (typeof parsed.user.user_metadata.picture === 'string' && parsed.user.user_metadata.picture.startsWith('data:')) {
                delete parsed.user.user_metadata.picture;
              }
            }
            window.localStorage.setItem(key, JSON.stringify(parsed));
          }
        }
      }
    }
  } catch (e) {
    // Ignore storage access errors
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

