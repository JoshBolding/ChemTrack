// Thin auth wrapper around Supabase.
//
// If Supabase isn't configured (credentials missing), we fall back to a
// hardcoded local user so the offline-only POC still runs. As soon as
// VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, real auth kicks in.

import { getSupabase, hasSupabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

// Used everywhere that needs a `createdBy` when no one is signed in.
export const LOCAL_FALLBACK_USER: AuthUser = {
  id: 'local',
  email: 'local@chemtrack.dev',
  displayName: 'jacob',
};

let cachedUser: AuthUser | null = null;
const listeners = new Set<(u: AuthUser | null) => void>();

function notify(u: AuthUser | null) {
  cachedUser = u;
  for (const fn of listeners) fn(u);
}

export function onAuthChange(fn: (u: AuthUser | null) => void): () => void {
  listeners.add(fn);
  // Push the current value immediately so subscribers don't flicker.
  fn(cachedUser);
  return () => listeners.delete(fn);
}

export async function initAuth(): Promise<AuthUser | null> {
  const sb = getSupabase();
  if (!sb) {
    notify(LOCAL_FALLBACK_USER);
    return LOCAL_FALLBACK_USER;
  }
  const { data } = await sb.auth.getSession();
  const user = data.session?.user
    ? toAuthUser(data.session.user)
    : null;
  notify(user);
  sb.auth.onAuthStateChange((_event, session) => {
    notify(session?.user ? toAuthUser(session.user) : null);
  });
  return user;
}

export function currentUser(): AuthUser | null {
  return cachedUser;
}

// The value every action screen should stamp into `createdBy`.
// Prefers the signed-in user, falls back to the local POC user.
export function currentActorId(): string {
  return cachedUser?.displayName ?? LOCAL_FALLBACK_USER.displayName;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase is not configured' };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase is not configured' };
  const { error } = await sb.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

function toAuthUser(u: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const email = u.email ?? 'unknown@unknown';
  const meta = u.user_metadata ?? {};
  const displayName =
    typeof meta.full_name === 'string' && meta.full_name.length > 0
      ? meta.full_name
      : email.split('@')[0];
  return { id: u.id, email, displayName };
}

export { hasSupabase };
