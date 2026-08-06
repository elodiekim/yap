"use client";

import { useMemo, useState } from "react";
import { LEVELS, type Profile } from "@/lib/types";
import {
  levelProgress,
  recurrenceTrend,
  streakInfo,
  wordsToday,
} from "@/lib/store";
import { Card, SectionLabel } from "./ui";

/**
 * Only two encodings carry data here, so there is no categorical palette:
 *  - LINE  — one series, one colour. 5.4:1 on the white card (WCAG AA).
 *  - RAMP  — the CEFR meter is ordinal magnitude, so it uses one hue with
 *            strictly decreasing lightness (0.75 → 0.55 → 0.32 → 0.13).
 * Keep both properties if you change these values.
 */
const LINE = "#14776a";
const RAMP = ["#cfe6e0", "#9bcdc2", "#5fa697", "#1f6f60"];

export function Dashboard({ profile }: { profile: Profile }) {
  const chain = streakInfo(profile.days);
  const trend = useMemo(() => recurrenceTrend(profile), [profile]);
  // A broken chain is the moment people stop coming back, so the line under
  // the grid leads with the number that never goes down (spec §2).
  const broken = chain.days === 0 && profile.days.length > 0;

  return (
    <div className="space-y-3">
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
          <Stat
            value={chain.days}
            unit="일"
            label="연속 학습"
            accent={chain.days > 0}
          />
          <Stat value={profile.days.length} unit="일" label="총 학습일" />
          <Stat value={profile.totalConversations} unit="회" label="대화" />
          <Stat value={profile.vocab.length} unit="개" label="배운 표현" />
        </div>
        <p className="ko mt-5 border-t border-hair pt-4 text-[13px] text-muted">
          {broken ? (
            <>
              지금까지{" "}
              <span className="font-semibold text-ink">
                {profile.days.length}일
              </span>{" "}
              연습했어요. 오늘 한 문장이면 다시 이어집니다.
            </>
          ) : (
            <>
              누적 {profile.totalWords.toLocaleString()}단어 · 오늘{" "}
              {wordsToday(profile)}단어
              {chain.rests > 0 ? (
                <span className="text-faint"> · 쉬는 날 {chain.rests}</span>
              ) : null}
            </>
          )}
        </p>
      </Card>

      <LevelMeter profile={profile} />
      <Recurrence trend={trend} />
      <Badges profile={profile} />
    </div>
  );
}

function Stat({
  value,
  unit,
  label,
  accent = false,
}: {
  value: number | string;
  unit: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-[26px] font-semibold tabular-nums leading-none ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
        <span className="ml-0.5 text-[13px] font-normal text-muted">
          {unit}
        </span>
      </p>
      <p className="ko mt-1.5 text-[13px] text-muted">{label}</p>
    </div>
  );
}

function LevelMeter({ profile }: { profile: Profile }) {
  const idx = LEVELS.indexOf(profile.level);
  const gate = levelProgress(profile.level, profile.levelReadings);
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        {/* "도달" not "지금": this only ever goes up, so say which it is. */}
        <SectionLabel en="Level reached" ko="도달 레벨" />
        <span className="text-[15px] font-semibold text-ink">
          {profile.level}
        </span>
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-1.5">
        {LEVELS.map((lv, i) => {
          const reached = i <= idx;
          return (
            <li key={lv}>
              <div
                className="h-1.5 rounded-full transition-colors duration-500"
                style={{
                  background: reached ? RAMP[i] : "var(--color-hair)",
                }}
              />
              <p
                className={`mt-2 text-[13px] tabular-nums ${
                  i === idx ? "font-semibold text-ink" : "text-faint"
                }`}
              >
                {lv}
              </p>
            </li>
          );
        })}
      </ol>
      {/*
        Saying the rule out loud turns a meter that sits still into something
        with a target on it. It also keeps the app honest about what the
        number means: earned over several answers, never a single verdict.
      */}
      {gate.next ? (
        <p className="ko mt-3 text-[13px] leading-relaxed text-muted">
          최근 {gate.of}회 중 {gate.needed}회가 {gate.next} 이상이면 올라가요
          {gate.have >= gate.of && gate.reached > 0 ? (
            <span className="text-accent"> · 지금 {gate.reached}회</span>
          ) : null}
        </p>
      ) : (
        <p className="ko mt-3 text-[13px] text-muted">
          제일 위까지 왔어요. 여기서부터는 레벨 말고 문장으로 늘어요.
        </p>
      )}
      {profile.levelHistory.length > 1 ? (
        <p className="ko mt-1.5 text-[13px] text-faint">
          {profile.levelHistory[0].date}에 {profile.levelHistory[0].level}로
          시작했어요.
        </p>
      ) : null}
    </Card>
  );
}

function Recurrence({ trend }: { trend: { date: string; rate: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (trend.length < 3) {
    return (
      <Card className="p-5">
        <SectionLabel en="Old mistakes coming back" ko="같은 실수를 또 하는 비율" />
        <p className="ko mt-2.5 text-[13px] leading-relaxed text-muted">
          답변 {3 - trend.length}개를 더 쓰면, 지적받았던 실수가 다시 나오는
          비율이 줄고 있는지 보여줍니다.
        </p>
      </Card>
    );
  }

  const W = 640;
  const H = 110;
  const PAD = { t: 12, r: 12, b: 12, l: 12 };
  const max = 100;
  const x = (i: number) =>
    PAD.l + (i / (trend.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const path = trend
    .map((t, i) => `${i ? "L" : "M"}${x(i)},${y(t.rate)}`)
    .join(" ");
  const last = trend[trend.length - 1];
  const first = trend[0];
  // Recent direction, not first-versus-last: one unusual early session should
  // not decide what the whole card says.
  const half = Math.max(1, Math.floor(trend.length / 2));
  const mean = (xs: { rate: number }[]) =>
    xs.reduce((s, t) => s + t.rate, 0) / xs.length;
  const delta = mean(trend.slice(-half)) - mean(trend.slice(0, half));
  const active = hover === null ? trend.length - 1 : hover;

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel en="Old mistakes coming back" ko="같은 실수를 또 하는 비율" />
        <button
          onClick={() => setShowTable((s) => !s)}
          className="shrink-0 text-[13px] text-muted hover:text-ink"
        >
          {showTable ? "그래프로" : "표로"}
        </button>
      </div>

      <p className="ko mt-2 text-[13px] leading-relaxed text-body">
        {delta < -8 ? (
          <>
            {Math.round(first.rate)}%에서{" "}
            <span className="font-semibold text-ink">
              {Math.round(last.rate)}%
            </span>
            로 줄었어요. 한 번 짚은 건 덜 반복하고 있다는 뜻입니다.
          </>
        ) : delta > 8 ? (
          <>
            <span className="font-semibold text-ink">
              {Math.round(last.rate)}%
            </span>
            로 늘었어요. 익숙한 실수가 다시 나오는 중이니, 아래 &ldquo;자주 틀리는
            것&rdquo;을 한 번 훑어보면 좋겠어요.
          </>
        ) : (
          <>
            최근 지적 중{" "}
            <span className="font-semibold text-ink">
              {Math.round(last.rate)}%
            </span>
            가 전에도 짚었던 것이에요.
          </>
        )}
      </p>

      {showTable ? (
        <table className="mt-4 w-full text-[13px]">
          <caption className="sr-only">날짜별 이미 지적받았던 실수의 비율</caption>
          <thead>
            <tr className="text-left text-faint">
              <th className="pb-2 font-normal">날짜</th>
              <th className="pb-2 text-right font-normal">반복 비율</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {trend.map((t, i) => (
              <tr key={i} className="border-t border-hair">
                <td className="py-1.5 tabular-nums">{t.date}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {Math.round(t.rate)}%
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
            aria-label={`최근 ${trend.length}회 반복 실수 비율 추이. ${Math.round(first.rate)}%에서 ${Math.round(last.rate)}%.`}
            onMouseLeave={() => setHover(null)}
          >
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={H - PAD.b}
              y2={H - PAD.b}
              stroke="var(--color-hair)"
              strokeWidth={1}
            />
            <path
              d={path}
              fill="none"
              stroke={LINE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={x(active)}
              cy={y(trend[active].rate)}
              r={4}
              fill={LINE}
              stroke="var(--color-card)"
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
          <figcaption className="mt-2 flex items-baseline justify-between text-[12px] tabular-nums text-faint">
            <span>{first.date}</span>
            <span className="text-muted">
              {trend[active].date} · {Math.round(trend[active].rate)}%
            </span>
            <span>{last.date}</span>
          </figcaption>
        </figure>
      )}
    </Card>
  );
}

const BADGE_LABELS: Record<string, string> = {
  "first-yap": "첫 대화",
  "streak-3": "3일 연속",
  "streak-7": "7일 연속",
  "streak-14": "14일 연속",
  "streak-30": "30일 연속",
  "streak-100": "100일 연속",
  "talks-10": "대화 10회",
  "talks-25": "대화 25회",
  "talks-50": "대화 50회",
  "talks-100": "대화 100회",
  "words-100": "하루 100단어",
  "words-200": "하루 200단어",
  "vocab-10": "표현 10개",
  "vocab-30": "표현 30개",
  "vocab-75": "표현 75개",
  flawless: "고칠 것 없는 답변",
  "topics-5": "주제 5개",
  "topics-all": "모든 주제",
  "level-B1": "B1 도달",
  "level-B2": "B2 도달",
  "level-C1": "C1 도달",
};

function Badges({ profile }: { profile: Profile }) {
  return (
    <Card className="p-5">
      <SectionLabel en="Milestones" ko={`달성 ${profile.badges.length}개`} />
      {profile.badges.length === 0 ? (
        <p className="ko mt-2.5 text-[13px] text-muted">
          아직 없어요. 답변 하나면 첫 기록이 생깁니다.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {profile.badges.map((id) => {
            const label = BADGE_LABELS[id];
            if (!label) return null;
            return (
              <li
                key={id}
                className="ko rounded-md border border-hair bg-sunk px-2.5 py-1 text-[13px] text-body"
              >
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
