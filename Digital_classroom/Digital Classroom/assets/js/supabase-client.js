// Deprecated Phase 1: Digital Classroom now uses assets/js/root-supabase-bridge.js,
// which imports the root Edtechra client from /assets/js/supabase.js.
// Kept temporarily for rollback only. Do not load this file from Digital Classroom pages.
(function () {
  const DEFAULT_AUTH_OPTIONS = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  };

  let cachedClient;
  let cachedConfig;

  function readMetaValue(name) {
    return document.querySelector(`meta[name="${name}"]`)?.content?.trim() || "";
  }

  function resolveConfig() {
    const sources = [
      window.EDTECHRA_DC_ENV,
      window.__DIGITAL_CLASSROOM_ENV__,
      window.EDTECHRA_ENV,
      window.__EDTECHRA_ENV__
    ].filter(Boolean);

    for (const source of sources) {
      const url = String(source.SUPABASE_URL || "").trim();
      const anonKey = String(source.SUPABASE_ANON_KEY || "").trim();
      if (url && anonKey) {
        return {
          SUPABASE_URL: url,
          SUPABASE_ANON_KEY: anonKey,
          source: "window"
        };
      }
    }

    const metaUrl = readMetaValue("SUPABASE_URL");
    const metaAnonKey = readMetaValue("SUPABASE_ANON_KEY");
    if (metaUrl && metaAnonKey) {
      return {
        SUPABASE_URL: metaUrl,
        SUPABASE_ANON_KEY: metaAnonKey,
        source: "meta"
      };
    }

    return null;
  }

  function getClient() {
    if (cachedClient !== undefined) {
      return cachedClient;
    }

    cachedConfig = resolveConfig();

    if (!cachedConfig) {
      cachedClient = null;
      return cachedClient;
    }

    if (!window.supabase?.createClient) {
      cachedClient = null;
      return cachedClient;
    }

    cachedClient = window.supabase.createClient(
      cachedConfig.SUPABASE_URL,
      cachedConfig.SUPABASE_ANON_KEY,
      DEFAULT_AUTH_OPTIONS
    );
    return cachedClient;
  }

  function getStatus() {
    const config = cachedConfig || resolveConfig();
    const libraryLoaded = Boolean(window.supabase?.createClient);
    const client = getClient();

    if (!config) {
      return {
        configured: false,
        available: false,
        libraryLoaded,
        reason: "Missing SUPABASE_URL / SUPABASE_ANON_KEY config."
      };
    }

    if (!libraryLoaded) {
      return {
        configured: true,
        available: false,
        libraryLoaded: false,
        reason: "Supabase browser library is not loaded."
      };
    }

    return {
      configured: true,
      available: Boolean(client),
      libraryLoaded: true,
      source: config.source,
      projectUrl: config.SUPABASE_URL
    };
  }

  async function getSession() {
    const client = getClient();
    if (!client) return null;

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function getUser() {
    const session = await getSession();
    return session?.user || null;
  }

  async function getProfile(userId) {
    const client = getClient();
    if (!client || !userId) return null;

    const { data, error } = await client
      .from("profiles")
      .select("id, display_name, role, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  window.DigitalClassroomSupabase = {
    getClient,
    getConfig: resolveConfig,
    getStatus,
    getSession,
    getUser,
    getProfile
  };
})();
