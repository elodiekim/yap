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

function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** How many rest days a 30-day span may absorb before the chain breaks. */
const RESTS_PER_MONTH = 2;
const REST_WINDOW = 30;

function daysBetween(a: string, b: string): number {
  const ms =
    new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

export interface Streak {
  /** Days practised in the current chain. Rest days are not counted. */
  days: number;
  /** Missed days the chain absorbed — shown so the number isn't a lie. */
  rests: number;
}

/**
 * The chain, ending today (or yesterday, if today isn't done yet).
 *
 * A single missed day is bridged rather than fatal: the common failure is one
 * late night or one bad cold, and losing a month over it is what stops people
 * coming back at all. Two missed days in a row is a real gap and does break it.
 *
 * Bridges are capped at two per 30-day span so the chain cannot quietly become
 * an every-other-day habit while still calling itself a daily streak. Nothing
 * is stored — this is derived from the practised dates each time.
 */
export function streakInfo(days: string[]): Streak {
  if (days.length === 0) return { days: 0, rests: 0 };

  const set = new Set(days);
  let cursor = today();
  if (!set.has(cursor)) {
    cursor = dayBefore(cursor);
    // Missing both today and yesterday is already two days: nothing to bridge.
    if (!set.has(cursor)) return { days: 0, rests: 0 };
  }

  let counted = 0;
  const rests: string[] = [];

  for (;;) {
    if (set.has(cursor)) {
      counted += 1;
      cursor = dayBefore(cursor);
      continue;
    }

    // A gap. It can only be bridged if it is exactly one day long, the day
    // before it was practised, and this 30-day span has rests left.
    const before = dayBefore(cursor);
    const spent = rests.filter((r) => daysBetween(r, cursor) < REST_WINDOW);
    if (!set.has(before) || spent.length >= RESTS_PER_MONTH) break;

    rests.push(cursor);
    cursor = before;
  }

  return { days: counted, rests: rests.length };
}

/** Just the number, for the places that only show the chain. */
export function streak(days: string[]): number {
  return streakInfo(days).days;
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
export function newBadges(
  before: Profile,
  after: Profile,
  feedback: Feedback | null,
): Badge[] {
  const earned: Badge[] = [];
  const push = (id: string, emoji: string, label: string) => {
    if (!before.badges.includes(id)) earned.push({ id, emoji, label });
  };

  const s = streak(after.days);
  for (const milestone of [3, 7, 14, 30, 100]) {
    if (s >= milestone) push(`streak-${milestone}`, "🔥", `${milestone}일 연속`);
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
