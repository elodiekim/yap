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

  if (feedback.mistakes.length === 0) push("flawless", "🎯", "고칠 것 없는 답변");

  if (after.topicsPracticed.length >= 5) push("topics-5", "🗺️", "주제 5개");
  if (after.topicsPracticed.length >= 9) push("topics-all", "🧭", "모든 주제");

  const order: Level[] = ["A2", "B1", "B2", "C1"];
  if (order.indexOf(after.level) > order.indexOf(before.level))
    push(`level-${after.level}`, "🚀", `${after.level} 도달`);

  return earned;
}
