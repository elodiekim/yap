"use client";

import { useEffect, useState } from "react";
import { today } from "@/lib/store";
import type { UsageReport } from "@/lib/types";
import { Card, SectionLabel } from "./ui";

const usd = (n: number) =>
  n < 0.01 && n > 0 ? "$0.01 미만" : `$${n.toFixed(2)}`;

function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function Usage() {
  const [report, setReport] = useState<UsageReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/usage?day=${today()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: UsageReport | null) => {
        if (!cancelled && d) setReport(d);
      })
      .catch(() => {
        // Usage is a side panel; failing to load it must not disturb anything.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Shown even at zero — "requests left today" is worth knowing before you
  // start, and a card that hides itself is a card you can't find.
  if (!report) return null;

  const { today: t, month, dailyRequestLimit: limit } = report;
  // The limit belongs to the conversation model. Reading a sentence aloud goes
  // to the TTS model, which has its own quota, so it cannot come out of this
  // bar — that is how the card was 25x wrong the last time it assumed a number.
  const spoken = t.voiceRequests;
  const talked = t.requests - spoken;
  const left = limit === null ? null : Math.max(0, limit - talked);
  const pct = limit === null ? 0 : Math.min(100, (talked / limit) * 100);
  // A tenth of the day's allowance left, floored so a small limit still warns.
  const tight = left !== null && left <= Math.max(3, limit! * 0.1);

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel en="AI usage" ko="AI 사용량" />
        <span className="text-[12px] text-faint">
          {report.models.join(", ")}
        </span>
      </div>

      {limit !== null ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="ko text-[14px] text-body">
              오늘 <span className="font-semibold text-ink">{talked}</span>회
              요청
            </p>
            <p
              className={`ko text-[13px] ${tight ? "text-flag" : "text-muted"}`}
            >
              무료 한도까지 {left}회
            </p>
          </div>
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sunk"
            role="img"
            aria-label={`오늘 ${talked}회 요청, 무료 한도 ${limit}회 중`}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                tight ? "bg-flag" : "bg-accent"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="ko mt-1.5 text-[12px] text-faint">
            한 번의 대화는 질문 1회 + 답변마다 1회를 씁니다. 하루 한도보다{" "}
            <strong className="font-medium">분당 한도</strong>에 먼저 걸리는
            경우가 많아요 — 그럴 땐 잠시 뒤 다시 하면 됩니다.
          </p>
        </div>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hair pt-4 sm:grid-cols-4">
        <Cell label="오늘 토큰" value={tokens(t.inputTokens + t.outputTokens)} />
        <Cell
          label="오늘 비용"
          value={t.cost === null ? "—" : usd(t.cost)}
        />
        <Cell label="이번 달 요청" value={`${month.requests}회`} />
        <Cell
          label="이번 달 비용"
          value={month.cost === null ? "—" : usd(month.cost)}
        />
      </dl>

      {report.daily.length === 0 ? (
        <p className="ko mt-3 text-[12px] text-faint">
          아직 기록이 없습니다. 다음 답변부터 여기에 쌓입니다.
        </p>
      ) : t.cost === null || month.cost === null ? (
        <p className="ko mt-3 text-[12px] text-faint">
          단가를 모르는 모델이 섞여 있어 비용은 계산하지 않았습니다.
        </p>
      ) : (
        <p className="ko mt-3 text-[12px] text-faint">
          무료 티어를 쓰는 동안은 실제 청구가 $0입니다. 유료 전환했을 때의
          예상치예요.
        </p>
      )}

      <VoiceBudget voice={report.voice} />
    </Card>
  );
}

/**
 * The voice allowance is ten a day, not hundreds, so it gets its own bar. It is
 * counted in new sentences rather than plays — replaying one already heard
 * costs nothing, and the card should not make it look like it does.
 */
function VoiceBudget({ voice }: { voice: UsageReport["voice"] }) {
  if (voice.limit === null) return null;

  const left = Math.max(0, voice.limit - voice.used);
  const pct = Math.min(100, (voice.used / voice.limit) * 100);
  const spent = left === 0;

  return (
    <div className="mt-4 border-t border-hair pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="ko text-[14px] text-body">
          오늘 읽어준 새 문장{" "}
          <span className="font-semibold text-ink">{voice.used}</span>개
        </p>
        <p className={`ko text-[13px] ${spent ? "text-flag" : "text-muted"}`}>
          {spent ? "오늘 몫은 다 썼어요" : `${left}개 남음`}
        </p>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sunk"
        role="img"
        aria-label={`오늘 새 문장 ${voice.used}개, 한도 ${voice.limit}개 중`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            spent ? "bg-flag" : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="ko mt-1.5 text-[12px] text-faint">
        음성은 대화와 <strong className="font-medium">다른 모델</strong>이라
        한도도 따로입니다 — 하루 {voice.limit}개, 분당 3개. 한 번 들어본 문장은
        저장해둬서 다시 들어도 안 깎입니다.
        {voice.spare > 0
          ? ` 한도가 찬 뒤 예비 목소리로 ${voice.spare}개 더 읽었어요.`
          : ""}
      </p>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="ko text-[12px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">
        {value}
      </dd>
    </div>
  );
}
