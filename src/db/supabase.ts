// Supabase client.
//
// Credentials are read from Vite env vars at build time. If they're missing,
// we return null and the rest of the app still works — all writes stay in
// IndexedDB and the sync worker becomes a no-op. This is intentional so the
// POC runs standalone until credentials are provisioned.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!URL || !ANON_KEY) return null;
  client = createClient(URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // HashRouter means URL hash is ours — don't let Supabase try to parse
      // it as an auth callback.
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function hasSupabase(): boolean {
  return Boolean(URL && ANON_KEY);
}
