"use client";

import { useMemo, useState } from "react";
import { LEVELS, type Profile } from "@/lib/types";
import { mistakeTrend, streak, wordsToday } from "@/lib/store";
import { Card, Pill, SectionLabel } from "./ui";

/**
 * Data-mark colors, validated with scripts/validate_palette.js against the
 * white card surface (#FFFFFF) in light mode — all six checks pass. The softer
 * UI tokens (grass, lilac, coral) are for chrome and text, never for marks.
 */
const MARK = {
  teal: "#0d9488",
  violet: "#8b5cf6",
  amber: "#d97706",
};

export function Dashboard({ profile }: { profile: Profile }) {
  const days = streak(profile.days);
  const trend = useMemo(() => mistakeTrend(profile), [profile]);

  return (
    <div className="space-y-4">
      <StreakHero days={days} wordsToday={wordsToday(profile)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat emoji="📅" label="Days practised" value={profile.days.length} />
        <Stat emoji="💬" label="Chats" value={profile.totalConversations} />
        <Stat
          emoji="✍️"
          label="Words written"
          value={profile.totalWords.toLocaleString()}
        />
        <Stat emoji="⭐" label="Expressions" value={profile.vocab.length} />
      </div>

      <LevelMeter profile={profile} />
      <MistakeTrend trend={trend} />
      <Badges profile={profile} />
    </div>
  );
}

function StreakHero({ days, wordsToday }: { days: number; wordsToday: number }) {
  return (
    <Card tint="bg-coral-soft" className="border-coral/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span aria-hidden className="animate-wiggle text-5xl">
            {days > 0 ? "🔥" : "🌱"}
          </span>
          <div>
            <p className="text-sm font-bold text-coral-ink">Current streak</p>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold tabular-nums text-coral-ink">
                {days}
              </span>
              <span className="font-display text-lg font-semibold text-coral-ink/70">
                {days === 1 ? "day" : "days"}
              </span>
            </p>
          </div>
        </div>
        <p className="max-w-[20rem] text-sm leading-relaxed text-ink/70">
          {days === 0
            ? "Nothing yet today. One answer starts a streak."
            : `${wordsToday} words today. One more sentence than yesterday!`}
        </p>
      </div>
    </Card>
  );
}

function Stat({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-4 text-center">
      <span aria-hidden className="text-xl">
        {emoji}
      </span>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{label}</p>
    </Card>
  );
}

function LevelMeter({ profile }: { profile: Profile }) {
  const idx = LEVELS.indexOf(profile.level);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel color="bg-lilac text-paper">Your level</SectionLabel>
        <Pill tone="lilac">Now: {profile.level}</Pill>
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-2">
        {LEVELS.map((lv, i) => {
          const reached = i <= idx;
          return (
            <li key={lv}>
              <div
                className="h-3 rounded-full border-2 border-line-strong transition-colors duration-500"
                style={{
                  background: reached ? MARK.violet : "var(--color-cream)",
                  opacity: reached ? 0.45 + (i / 3) * 0.55 : 1,
                }}
              />
              <p
                className={`mt-2 font-display text-sm ${
                  i === idx ? "font-bold text-ink" : "text-faint"
                }`}
              >
                {lv}
              </p>
            </li>
          );
        })}
      </ol>
      {profile.levelHistory.length > 1 ? (
        <p className="mt-3 text-sm text-faint">
          You started at {profile.levelHistory[0].level} on{" "}
          {profile.levelHistory[0].date}.
        </p>
      ) : null}
    </Card>
  );
}

function MistakeTrend({ trend }: { trend: { date: string; avg: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (trend.length < 3) {
    return (
      <Card className="p-5">
        <SectionLabel color="bg-line text-muted">
          Mistakes per answer
        </SectionLabel>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {3 - trend.length} more{" "}
          {3 - trend.length === 1 ? "answer" : "answers"} and Yap will start
          charting whether your mistakes are going down. 📉
        </p>
      </Card>
    );
  }

  const W = 640;
  const H = 120;
  const PAD = { t: 14, r: 14, b: 14, l: 14 };
  const max = Math.max(2, ...trend.map((t) => t.avg));
  const x = (i: number) =>
    PAD.l + (i / (trend.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const path = trend.map((t, i) => `${i ? "L" : "M"}${x(i)},${y(t.avg)}`).join(" ");
  const last = trend[trend.length - 1];
  const first = trend[0];
  const delta = last.avg - first.avg;
  const active = hover === null ? trend.length - 1 : hover;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel color="bg-line text-muted">
          Mistakes per answer
        </SectionLabel>
        <button
          onClick={() => setShowTable((s) => !s)}
          className="text-sm font-semibold text-muted underline decoration-line-strong decoration-2 underline-offset-4 hover:text-ink"
        >
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted">
        {delta < -0.3 ? (
          <>
            Down from {first.avg.toFixed(1)} to{" "}
            <span className="font-bold text-ink">{last.avg.toFixed(1)}</span> —
            fewer mistakes than when you started. 🎉
          </>
        ) : delta > 0.3 ? (
          <>
            Up to <span className="font-bold text-ink">{last.avg.toFixed(1)}</span>{" "}
            — usually a sign you&apos;re trying harder sentences. That&apos;s a
            good thing!
          </>
        ) : (
          <>
            Steady around{" "}
            <span className="font-bold text-ink">{last.avg.toFixed(1)}</span> per
            answer.
          </>
        )}
      </p>

      {showTable ? (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">
            Rolling average of major mistakes per answer, by date
          </caption>
          <thead>
            <tr className="text-left text-xs text-faint">
              <th className="pb-2 font-semibold">Date</th>
              <th className="pb-2 text-right font-semibold">Avg mistakes</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {trend.map((t, i) => (
              <tr key={i} className="border-t-2 border-line">
                <td className="py-1.5">{t.date}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {t.avg.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <figure className="mt-4">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={`Rolling average of major mistakes per answer over the last ${trend.length} sessions, from ${first.avg.toFixed(1)} to ${last.avg.toFixed(1)}.`}
            onMouseLeave={() => setHover(null)}
          >
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={H - PAD.b}
              y2={H - PAD.b}
              stroke="var(--color-line)"
              strokeWidth={2}
            />
            <path
              d={path}
              fill="none"
              stroke={MARK.teal}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={x(active)}
              cy={y(trend[active].avg)}
              r={5}
              fill={MARK.teal}
              stroke="var(--color-paper)"
              strokeWidth={2}
            />
            {trend.map((t, i) => (
              <rect
                key={i}
                x={x(i) - W / trend.length / 2}
                y={0}
                width={W / trend.length}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}
          </svg>
          <figcaption className="mt-2 flex items-center justify-between text-xs text-faint">
            <span>{first.date}</span>
            <span className="font-semibold text-muted">
              {trend[active].date}: {trend[active].avg.toFixed(1)} mistakes
            </span>
            <span>{last.date}</span>
          </figcaption>
        </figure>
      )}
    </Card>
  );
}

const BADGE_LABELS: Record<string, { emoji: string; label: string }> = {
  "first-yap": { emoji: "🌱", label: "First yap" },
  "streak-3": { emoji: "🔥", label: "3-day streak" },
  "streak-7": { emoji: "🔥", label: "7-day streak" },
  "streak-14": { emoji: "🔥", label: "14-day streak" },
  "streak-30": { emoji: "🔥", label: "30-day streak" },
  "streak-100": { emoji: "🔥", label: "100-day streak" },
  "talks-10": { emoji: "💬", label: "10 chats" },
  "talks-25": { emoji: "💬", label: "25 chats" },
  "talks-50": { emoji: "💬", label: "50 chats" },
  "talks-100": { emoji: "💬", label: "100 chats" },
  "words-100": { emoji: "✍️", label: "100 words in a day" },
  "words-200": { emoji: "🏆", label: "200 words in a day" },
  "vocab-10": { emoji: "⭐", label: "10 expressions" },
  "vocab-30": { emoji: "🌟", label: "30 expressions" },
  "vocab-75": { emoji: "💎", label: "75 expressions" },
  flawless: { emoji: "🎯", label: "Nothing to fix" },
  "topics-5": { emoji: "🗺️", label: "5 topics" },
  "topics-all": { emoji: "🧭", label: "Every topic" },
  "level-B1": { emoji: "🚀", label: "Reached B1" },
  "level-B2": { emoji: "🚀", label: "Reached B2" },
  "level-C1": { emoji: "🚀", label: "Reached C1" },
};

function Badges({ profile }: { profile: Profile }) {
  return (
    <Card className="p-5">
      <SectionLabel color="bg-butter text-butter-ink">
        Trophies ({profile.badges.length})
      </SectionLabel>
      {profile.badges.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          None yet — your first one is one answer away!
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {profile.badges.map((id) => {
            const b = BADGE_LABELS[id];
            if (!b) return null;
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-full border-2 border-line-strong bg-cream px-3.5 py-1.5 text-sm font-semibold"
              >
                <span aria-hidden>{b.emoji}</span>
                {b.label}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
