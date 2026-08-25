let rootSupabase = null;
let rootSupabaseError = "";

const SUPABASE_BROWSER_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

function loadSupabaseBrowserLibrary() {
  if (window.supabase?.createClient) {
    return Promise.resolve();
  }

  const existing = document.querySelector(`script[src="${SUPABASE_BROWSER_LIBRARY_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Root Supabase browser library failed to load.")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SUPABASE_BROWSER_LIBRARY_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Root Supabase browser library failed to load."));
    document.head.appendChild(script);
  });
}

try {
  await loadSupabaseBrowserLibrary();
  await import("../../../../assets/js/brand-assets.js");
  const rootClientModule = await import("../../../../assets/js/supabase.js");
  rootSupabase = rootClientModule.supabase;
} catch (error) {
  rootSupabaseError = error?.message || String(error);
}

function getClient() {
  return rootSupabase;
}

function getStatus() {
  if (!rootSupabase) {
    return {
      configured: false,
      available: false,
      libraryLoaded: Boolean(window.supabase?.createClient),
      source: "root-client",
      reason: rootSupabaseError || "Root Supabase client is unavailable."
    };
  }

  return {
    configured: true,
    available: true,
    libraryLoaded: Boolean(window.supabase?.createClient),
    source: "root-client",
    projectUrl: rootSupabase.supabaseUrl || null
  };
}

async function getSession() {
  if (!rootSupabase) return null;

  const { data, error } = await rootSupabase.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

async function getUser() {
  if (!rootSupabase) return null;

  const { data, error } = await rootSupabase.auth.getUser();
  if (error) throw error;
  return data.user || null;
}

async function getProfile(userId) {
  if (!rootSupabase || !userId) return null;

  const { data, error } = await rootSupabase
    .from("profiles")
    .select("id, display_name, role, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

window.DigitalClassroomSupabase = {
  getClient,
  getConfig: () => ({ source: "root-client" }),
  getStatus,
  getSession,
  getUser,
  getProfile
};

for (const src of [
  "assets/js/mock-data.js",
  "assets/js/classroom-state.js",
  "assets/js/classroom-api.js",
  "assets/js/classroom-ui.js",
  "assets/js/app.js"
]) {
  await loadScript(src);
}
