import { createClient } from "@supabase/supabase-js";

/**
 * Configure the Supabase client. We read credentials from environment
 * variables if available (Vite will inject `VITE_SUPABASE_*`), but
 * fall back to the project URL and anon key used during development.
 *
 * The `detectSessionInUrl` flag is critical for magic link/PKCE
 * authentication: it tells the SDK to parse the `?code` parameter on
 * the callback page and exchange it for a session automatically.
 *
 * We also expose a couple of helpers: `toastError` converts errors
 * into toast notifications, and `getUserOrWarn` prompts unauthenticated
 * users to log in before performing actions.
 */
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ctprhpworxixlwbmwhce.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0cHJocHdvcnhpeGx3Ym13aGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjA3MzIsImV4cCI6MjA3NzI5NjczMn0.y_3MlGAi2mMUWZcbTbU9FZPs6LoB3FMAhCyalxLfYos";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});

export function toastError(e: any) {
  const msg = e?.message || String(e);
  (window as any).notify?.(msg, "error");
  console.error(e);
}

export function toastSuccess(msg: string) {
  (window as any).notify?.(msg, "success");
}

export async function getUserOrWarn(){
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    toastError(error);
    return null;
  }
  const user = data?.user || null;
  if (!user) {
    (window as any).notify?.("Please log in first", "error");
    return null;
  }
  // Write a marker to the window so chat bubbles know who "me" is
  (window as any).__uid = user.id;
  return user;
}

/**
 * getUserOrThrow
 *
 * Some pages (like Calendar) imported a helper named `getUserOrThrow`. To
 * remain backwards‑compatible with those imports and prevent build
 * failures, we alias `getUserOrWarn` here. Unlike `getUserOrWarn`, which
 * shows a toast when the user is not authenticated, this function
 * throws an error instead. This is useful when you need a hard failure
 * to break out of a workflow. It still writes the user id to
 * `window.__uid` so that chat bubbles align correctly.
 */
export async function getUserOrThrow() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data?.user;
  if (!user) throw new Error("No authenticated user");
  (window as any).__uid = user.id;
  return user;
}

export async function getUserOrNull() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Auth error:", error);
    return null;
  }
  const user = data?.user || null;
  if (user) {
    (window as any).__uid = user.id;
  }
  return user;
}