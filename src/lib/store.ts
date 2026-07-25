"use client";

import { EMPTY_PROFILE, type Profile } from "./types";

export {
  countWords,
  mistakeTrend,
  streak,
  today,
  wordsToday,
  type Badge,
} from "./stats";

/* ---------------------------------------------------------------------------
 * The profile now lives in SQLite on this machine; this module is just the
 * browser's cached copy of it, shaped for useSyncExternalStore.
 *
 * Writes happen server-side inside /api/coach, so nothing here ever needs to
 * push state upward — it only takes what the server hands back.
 * ------------------------------------------------------------------------ */

let snapshot: Profile = EMPTY_PROFILE;
const listeners = new Set<() => void>();

export function subscribeProfile(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getProfileSnapshot(): Profile {
  return snapshot;
}

export function getProfileServerSnapshot(): Profile {
  return EMPTY_PROFILE;
}

export function setProfile(profile: Profile) {
  snapshot = profile;
  listeners.forEach((l) => l());
}

async function fetchProfile(): Promise<void> {
  const res = await fetch("/api/profile");
  if (res.ok) setProfile((await res.json()) as Profile);
}

const LEGACY_KEY = "yap.profile.v1";
const ARCHIVE_KEY = "yap.profile.v1.migrated";

/**
 * Move a pre-database profile into SQLite, once.
 *
 * The old copy is archived under a second key rather than deleted — if the
 * import turns out to have gone wrong, the original is still sitting there.
 */
async function migrateLegacy(): Promise<void> {
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return;

  let profile: Profile;
  try {
    profile = { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Profile) };
  } catch {
    window.localStorage.removeItem(LEGACY_KEY); // unreadable, nothing to save
    return;
  }

  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile }),
  });

  // 409 means the database already holds real practice, so this copy is stale
  // and archiving it is right too. Any other failure leaves it for next time.
  if (res.ok || res.status === 409) {
    window.localStorage.setItem(ARCHIVE_KEY, raw);
    window.localStorage.removeItem(LEGACY_KEY);
  }
}

let started = false;

/** Called once on mount: migrate anything left in localStorage, then load. */
export async function initProfile(): Promise<void> {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    await migrateLegacy();
  } catch {
    // A failed migration must not stop the app from loading what's in the DB.
  }
  await fetchProfile();
}

export async function resetProfile(): Promise<void> {
  const res = await fetch("/api/profile", { method: "DELETE" });
  if (res.ok) setProfile((await res.json()) as Profile);
}
