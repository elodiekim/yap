"use client";

import {
  EMPTY_PROFILE,
  type Feedback,
  type Level,
  type Profile,
} from "./types";

const KEY = "yap.profile.v1";

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function read(): Profile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROFILE;
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Profile) };
  } catch {
    return EMPTY_PROFILE;
  }
}

/* ---------------------------------------------------------------------------
 * localStorage as an external store.
 *
 * Consumed with useSyncExternalStore so React hydrates against
 * getServerSnapshot (an empty profile, matching the server HTML) and then
 * re-renders with the saved one — no effect, no hydration mismatch.
 * ------------------------------------------------------------------------ */

let snapshot: Profile | null = null;
const listeners = new Set<() => void>();

export function subscribeProfile(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getProfileSnapshot(): Profile {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

export function getProfileServerSnapshot(): Profile {
  return EMPTY_PROFILE;
}

export function saveProfile(profile: Profile) {
  snapshot = profile;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  }
  listeners.forEach((l) => l());
}

export function resetProfile() {
  snapshot = EMPTY_PROFILE;
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

/** Consecutive days ending today (or yesterday, if today isn't done yet). */
export function streak(days: string[]): number {
  if (days.length === 0) return 0;
  const set = new Set(days);
  let cursor = today();
  if (!set.has(cursor)) {
    cursor = dayBefore(cursor);
    if (!set.has(cursor)) return 0;
  }
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = dayBefore(cursor);
  }
  return n;
}

export function wordsToday(profile: Profile): number {
  const t = today();
  return profile.mistakeHistory
    .filter((h) => h.date === t)
    .reduce((sum, h) => sum + h.words, 0);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Rolling average of major mistakes per session, oldest → newest. */
export function mistakeTrend(profile: Profile): { date: string; avg: number }[] {
  const recent = profile.mistakeHistory.slice(-14);
  return recent.map((h, i) => {
    const window = recent.slice(Math.max(0, i - 2), i + 1);
    const avg = window.reduce((s, w) => s + w.count, 0) / window.length;
    return { date: h.date, avg };
  });
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
}

/** Badges earned by the session that just finished. */
export function newBadges(
  before: Profile,
  after: Profile,
  feedback: Feedback,
): Badge[] {
  const earned: Badge[] = [];
  const push = (id: string, emoji: string, label: string) => {
    if (!before.badges.includes(id)) earned.push({ id, emoji, label });
  };

  const s = streak(after.days);
  for (const milestone of [3, 7, 14, 30, 100]) {
    if (s >= milestone) push(`streak-${milestone}`, "🔥", `${milestone}-day streak`);
  }

  if (after.totalConversations >= 1) push("first-yap", "🌱", "First yap");
  for (const milestone of [10, 25, 50, 100]) {
    if (after.totalConversations >= milestone)
      push(`talks-${milestone}`, "💬", `${milestone} conversations`);
  }

  const w = wordsToday(after);
  if (w >= 100) push("words-100", "✍️", "Wrote 100 words today");
  if (w >= 200) push("words-200", "🏆", "Wrote 200 words today");

  if (after.vocab.length >= 10) push("vocab-10", "⭐", "10 expressions mastered");
  if (after.vocab.length >= 30) push("vocab-30", "🌟", "30 expressions mastered");
  if (after.vocab.length >= 75) push("vocab-75", "💎", "75 expressions mastered");

  if (feedback.mistakes.length === 0)
    push("flawless", "🎯", "A whole answer with nothing to fix");

  if (after.topicsPracticed.length >= 5)
    push("topics-5", "🗺️", "5 topics explored");
  if (after.topicsPracticed.length >= 9)
    push("topics-all", "🧭", "Every topic tried");

  const order: Level[] = ["A2", "B1", "B2", "C1"];
  if (order.indexOf(after.level) > order.indexOf(before.level))
    push(`level-${after.level}`, "🚀", `Reached ${after.level}`);

  return earned;
}

/** Fold one finished session into the profile. */
export function applySession(
  profile: Profile,
  input: { topic: string; words: number; feedback: Feedback },
): { profile: Profile; badges: Badge[] } {
  const t = today();
  const { feedback, topic, words } = input;

  const next: Profile = {
    ...profile,
    level: feedback.level,
    vocab: [...profile.vocab, ...feedback.expressions].slice(-200),
    mistakeTags: Array.from(
      new Set([...profile.mistakeTags, ...feedback.mistakes.map((m) => m.tag)]),
    ).slice(-60),
    topicsPracticed: Array.from(new Set([...profile.topicsPracticed, topic])),
    days: profile.days.includes(t) ? profile.days : [...profile.days, t],
    totalConversations: profile.totalConversations + 1,
    totalWords: profile.totalWords + words,
    mistakeHistory: [
      ...profile.mistakeHistory,
      { date: t, count: feedback.mistakes.length, words },
    ].slice(-200),
    levelHistory:
      profile.levelHistory.at(-1)?.level === feedback.level
        ? profile.levelHistory
        : [...profile.levelHistory, { date: t, level: feedback.level }],
    updatedAt: new Date().toISOString(),
  };

  const badges = newBadges(profile, next, feedback);
  next.badges = [...profile.badges, ...badges.map((b) => b.id)];

  return { profile: next, badges };
}
