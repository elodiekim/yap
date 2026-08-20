/**
 * Pure derivations over a Profile — no storage, no React, no Node built-ins.
 *
 * Deliberately importable from both sides: the API routes award badges here,
 * and the dashboard renders from the same functions.
 */
import type { Feedback, Level, Profile } from "./types";

export function today(): string {
  return isoDate(new Date());
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The trailing span the rhythm is measured over. */
export const RHYTHM_WINDOW = 30;

export interface Rhythm {
  /** Days practised inside the window, including today. */
  days: number;
  /** The window, so no caller hardcodes 30. */
  of: number;
}

/**
 * How many of the last 30 days were practised.
 *
 * This replaced a consecutive-day chain with two bridged rest days per month,
 * and it was replaced because **the chain went down on days the learner turned
 * up.** Measured 2026-08-21 on real data:
 *
 *   08-07  not practised   10 days
 *   08-08  PRACTISED        7 days
 *   08-17  not practised   15 days
 *   08-18  PRACTISED       11 days
 *
 * The rest allowance slides on a 30-day window, so spending a new rest could
 * push an older one out of reach and retroactively cut the chain behind it.
 * The learner did nothing wrong on either of those days — they showed up and
 * the only number the app uses to say "keep going" fell by three or four.
 * §5.7 exists to stop exactly that, and the chain was doing it.
 *
 * The deeper mismatch: the chain assumed daily with the odd slip, and allowed
 * two rests per 30 days — effectively demanding 28 of 30. The real rhythm is 21
 * of 30, a session every 1.4 days. That is a good habit that the chain was
 * obliged to keep calling a failure.
 *
 * A rolling count cannot break, cannot be retroactively cut, and cannot fall on
 * a day that was practised. It goes down only when a practised day ages out of
 * the window, which is true and is the point. This is not §5.7's rejected
 * "weekly target" — there is no target to miss.
 */
export function rhythm(days: string[], on: string = today()): Rhythm {
  const first = new Date(`${on}T00:00:00`);
  first.setDate(first.getDate() - (RHYTHM_WINDOW - 1));
  const from = isoDate(first);

  const counted = new Set(days.filter((d) => d >= from && d <= on));
  return { days: counted.size, of: RHYTHM_WINDOW };
}

/** Just the number, for the places that only show the count. */
export function streak(days: string[]): number {
  return rhythm(days).days;
}

export function wordsToday(profile: Profile): number {
  const t = today();
  return profile.mistakeHistory
    .filter((h) => h.date === t)
    .reduce((sum, h) => sum + h.words, 0);
}

/**
 * Share of flagged mistakes that were patterns the learner had already been
 * told about, oldest → newest, smoothed over three sessions.
 *
 * This replaced "mistakes per answer", which could not move: the prompt asks
 * for the 3-5 most important issues, and across ten real sessions the count
 * was 3, 4 or 5 every single time — a floor and a ceiling at once. Dividing by
 * length was worse; it made a 30-word answer the worst session on record and
 * would have put one-sentence days off the chart entirely.
 *
 * Recurrence moves because it measures something the learner controls: not how
 * much was wrong, but how much of it was old news.
 */
const WARM_UP = 3;

export function recurrenceTrend(
  profile: Profile,
): { date: string; rate: number }[] {
  // The opening sessions have almost no past to repeat, so they read near 0%
  // no matter how the learner did, and every beginner would be told their
  // recurrence is "rising". Drop them rather than explain an artefact.
  const recent = profile.recurrenceHistory.slice(WARM_UP).slice(-14);
  return recent.map((h, i) => {
    const window = recent.slice(Math.max(0, i - 2), i + 1);
    const repeats = window.reduce((s, w) => s + w.repeats, 0);
    const total = window.reduce((s, w) => s + w.total, 0);
    return { date: h.date, rate: total === 0 ? 0 : (repeats / total) * 100 };
  });
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
}

/** Badges earned by the session that just finished. */
/**
 * `feedback` is null when the answer was saved but never graded (§5.9). The
 * day still earns everything it did by being written — only the trophies that
 * read the feedback itself are held back until it arrives.
 */
/* ------------------------------------------------------------------ 토픽 */

/** How wide a pool the light day draws from. See below for why it isn't 1. */
export const STALE_POOL = 3;

/**
 * The topics that have gone longest without coming up, oldest first, with
 * never-used ones ahead of everything (§5.16).
 *
 * The light way in picks the topic itself, so uniform random could hand back
 * yesterday's topic — and with nine topics practised unevenly it did: seven
 * light sessions on one topic while another was never opened at all.
 */
export function stalestTopics(
  ids: string[],
  lastUsed: Record<string, string>,
  count = STALE_POOL,
): string[] {
  return [...ids]
    .sort((a, b) => (lastUsed[a] ?? "").localeCompare(lastUsed[b] ?? ""))
    .slice(0, count);
}

/**
 * One of them, at random.
 *
 * Not the single stalest: pressing the button and leaving without answering
 * records nothing, so a purely deterministic pick would hand back the same
 * topic on the next press. Three keeps that from happening while every
 * candidate is still genuinely overdue.
 */
export function pickStaleTopic(
  ids: string[],
  lastUsed: Record<string, string>,
): string {
  const pool = stalestTopics(ids, lastUsed);
  return pool[Math.floor(Math.random() * pool.length)] ?? ids[0];
}

/* ------------------------------------------------------------------ 레벨 */

/** How many recent graded answers the promotion rule looks at. */
export const LEVEL_WINDOW = 5;
/** How many of them have to reach the next level for it to be awarded. */
export const LEVEL_PROMOTE = 3;

const ORDER: Level[] = ["A2", "B1", "B2", "C1"];

function rank(level: Level): number {
  return ORDER.indexOf(level);
}

/**
 * The level to show, given the level currently shown and the per-answer
 * readings from recent sessions (newest last).
 *
 * Two rules, and the reasoning for both is in §5.10:
 *
 *  - **It only ever goes up.** A displayed level that can fall turns one tired
 *    evening into a demotion and makes the 🚀 trophy something the app can take
 *    back. Nothing in this app punishes a bad day.
 *  - **One step at a time, on repeated evidence.** Three of the last five, so a
 *    single generous reading cannot promote anyone, and B2 is not skipped on
 *    the way to C1 — each level is a milestone worth arriving at.
 */
export function levelAfter(current: Level, readings: Level[]): Level {
  const window = readings.slice(-LEVEL_WINDOW);
  if (window.length < LEVEL_WINDOW) return current;

  const next = ORDER[rank(current) + 1];
  if (!next) return current;

  const reached = window.filter((l) => rank(l) >= rank(next)).length;
  return reached >= LEVEL_PROMOTE ? next : current;
}

/** How close the next level is, for the meter to say so out loud. */
export function levelProgress(
  current: Level,
  readings: Level[],
): {
  next: Level | null;
  reached: number;
  needed: number;
  of: number;
  /** Readings available so far — the rule does not run below `of`. */
  have: number;
} {
  const next = ORDER[rank(current) + 1] ?? null;
  const window = readings.slice(-LEVEL_WINDOW);
  return {
    next,
    reached: next ? window.filter((l) => rank(l) >= rank(next)).length : 0,
    needed: LEVEL_PROMOTE,
    of: LEVEL_WINDOW,
    have: window.length,
  };
}

export function newBadges(
  before: Profile,
  after: Profile,
  feedback: Feedback | null,
): Badge[] {
  const earned: Badge[] = [];
  const push = (id: string, emoji: string, label: string) => {
    if (!before.badges.includes(id)) earned.push({ id, emoji, label });
  };

  // Milestones stop at the window: 100 consecutive days was reachable when this
  // counted a chain, and is not when it counts days inside a month. The ids keep
  // their `streak-` prefix so already-earned rows survive the change of meaning,
  // and nothing is falsely claimed — anyone who held a 14-day chain also had 14
  // days inside the month it sat in.
  const practised = rhythm(after.days);
  for (const milestone of [3, 7, 14, 21, 30]) {
    if (practised.days >= milestone) {
      push(`streak-${milestone}`, "🔥", `${RHYTHM_WINDOW}일 중 ${milestone}일`);
    }
  }

  if (after.totalConversations >= 1) push("first-yap", "🌱", "첫 대화");
  for (const milestone of [10, 25, 50, 100]) {
    if (after.totalConversations >= milestone)
      push(`talks-${milestone}`, "💬", `대화 ${milestone}회`);
  }

  const w = wordsToday(after);
  if (w >= 100) push("words-100", "✍️", "하루 100단어");
  if (w >= 200) push("words-200", "🏆", "하루 200단어");

  if (after.vocab.length >= 10) push("vocab-10", "⭐", "표현 10개");
  if (after.vocab.length >= 30) push("vocab-30", "🌟", "표현 30개");
  if (after.vocab.length >= 75) push("vocab-75", "💎", "표현 75개");

  if (feedback && feedback.mistakes.length === 0)
    push("flawless", "🎯", "고칠 것 없는 답변");

  if (after.topicsPracticed.length >= 5) push("topics-5", "🗺️", "주제 5개");
  if (after.topicsPracticed.length >= 9) push("topics-all", "🧭", "모든 주제");

  const order: Level[] = ["A2", "B1", "B2", "C1"];
  if (order.indexOf(after.level) > order.indexOf(before.level))
    push(`level-${after.level}`, "🚀", `${after.level} 도달`);

  return earned;
}
