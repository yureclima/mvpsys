import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const isServer = typeof window === "undefined";
  const supabaseUrl = isServer
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey = isServer
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : (window as any).__ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient(
    supabaseUrl || "https://placeholder-url.supabase.co",
    supabaseAnonKey || "placeholder-anon-key"
  );
}
