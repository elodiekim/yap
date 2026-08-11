"use client";

import { TOPICS } from "@/lib/topics";
import type { Mode, Profile } from "@/lib/types";
import { pickStaleTopic, streak, type Badge } from "@/lib/store";
import { About } from "./About";
import { Dashboard } from "./Dashboard";
import { Pending } from "./Pending";
import { Usage } from "./Usage";
import { Button, Card, Meta } from "./ui";

export function Home({
  profile,
  onStart,
  onHistory,
  onExpressions,
  onOpenSession,
  onBadges,
  onReset,
}: {
  profile: Profile;
  onStart: (topic: string, mode: Mode) => void;
  onHistory: () => void;
  onExpressions: () => void;
  onOpenSession: (id: number) => void;
  onBadges: (b: Badge[]) => void;
  onReset: () => void;
}) {
  const s = streak(profile.days);
  const fresh = profile.totalConversations === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-14 sm:px-6">
      <header className="animate-rise">
        <h1 className="text-[32px] font-semibold leading-[1.25] sm:text-[40px]">
          Every day, one more sentence than yesterday.
        </h1>
        <p className="ko mt-3 text-[17px] leading-relaxed text-body">
          어제보다 한 문장 더. 문법을 지적당하는 대신, 계속 말하게 만드는 영어
          연습.
        </p>
        <p className="ko mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          질문 하나를 받고 영어로 답하면, 원어민이라면 어떻게 말했을지 다시
          써줍니다. 할 말이 떠오르지 않을 땐 힌트를 같이 줍니다.
        </p>
        <div className="mt-6 flex min-h-[20px] flex-wrap items-center gap-x-4 gap-y-1">
          <Meta>레벨 {profile.level}</Meta>
          {s > 0 ? <Meta accent>{s}일 연속</Meta> : null}
          {profile.totalConversations > 0 ? (
            <Meta>대화 {profile.totalConversations}회</Meta>
          ) : null}
        </div>
      </header>

      {/* Above the grid on purpose: finishing something beats starting one. */}
      <div className="mt-10 empty:mt-0">
        <Pending onBadges={onBadges} onOpenSession={onOpenSession} />
      </div>

      <section className="mt-14 animate-rise [animation-delay:60ms]">
        <h2 className="text-[15px] font-semibold">
          Pick a topic
          <span className="ko ml-2 font-normal text-muted">
            오늘은 무슨 얘기를 해볼까요?
          </span>
        </h2>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {TOPICS.map((t, i) => {
            const done = profile.topicsPracticed.includes(t.id);
            return (
              <li
                key={t.id}
                className="animate-fade"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <button
                  onClick={() => onStart(t.id, "normal")}
                  /*
                    The one place with hover movement (todo 10). Named
                    properties rather than transition-all, so layout is never
                    animated by accident.

                    `translate`, not `transform`: Tailwind v4 compiles
                    -translate-y-0.5 to the standalone `translate` property.
                    Listing `transform` here looks right and animates nothing —
                    the card would just snap up. Checked against the built CSS.
                  */
                  className="group flex h-full w-full items-start gap-3 rounded-card border border-hair bg-card p-4 text-left shadow-card transition-[translate,border-color,box-shadow] duration-200 ease-spring hover:-translate-y-0.5 hover:border-hair-strong hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-sunk text-[15px]"
                  >
                    {t.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-semibold text-ink">
                        {t.label}
                      </span>
                      {done ? (
                        <span className="shrink-0 text-[12px] text-accent">
                          완료
                        </span>
                      ) : null}
                    </span>
                    <span className="ko mt-0.5 block text-[13px] text-muted">
                      {t.ko} · {t.blurb}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <LightDay onStart={onStart} profile={profile} />
      </section>

      {!fresh ? (
        <section className="mt-16 animate-rise [animation-delay:120ms]">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold">
              Your progress
              <span className="ko ml-2 font-normal text-muted">기록</span>
            </h2>
            <div className="flex shrink-0 items-baseline gap-4">
              <button
                onClick={onExpressions}
                className="ko rounded-md text-[13px] text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                배운 표현 {profile.vocab.length}개 →
              </button>
              <button
                onClick={onHistory}
                className="ko rounded-md text-[13px] text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                지난 연습 →
              </button>
            </div>
          </div>
          <About value={profile.about} />
          <div className="mt-3">
            <Dashboard profile={profile} />
          </div>
          <div className="mt-3">
            <Usage />
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="quiet" onClick={onReset}>
              기록 전체 삭제
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-16 animate-rise space-y-3 [animation-delay:120ms]">
          <About value={profile.about} />
          <Card className="p-5">
            <p className="ko text-[14px] leading-relaxed text-muted">
              연속 학습일, 배운 표현, 실수 추이, 레벨은 첫 답변을 마치면 여기에
              나타납니다. 기록은 이 노트북에만 저장되고 계정은 필요 없어요.
            </p>
          </Card>
        </section>
      )}
    </div>
  );
}

/**
 * The way in on a day with nothing left. Deliberately quieter than the topic
 * grid — it should be findable, not tempting (spec §5.6) — and it picks the
 * topic itself, because choosing is part of what feels like too much today.
 *
 * Picking *for* them is also the app's only chance to widen the material
 * without adding a decision, so the pick leans on what has gone stale rather
 * than rolling a fair die (§5.16).
 */
function LightDay({
  onStart,
  profile,
}: {
  onStart: (topic: string, mode: Mode) => void;
  profile: Profile;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-hair pt-4">
      <p className="ko text-[13px] text-muted">
        오늘은 여력이 없나요? 한 문장이면 충분합니다.
      </p>
      <button
        onClick={() =>
          onStart(
            pickStaleTopic(
              TOPICS.map((t) => t.id),
              profile.topicLastUsed,
            ),
            "easy",
          )
        }
        className="ko rounded-md text-[13px] text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        가볍게 한 문장 →
      </button>
    </div>
  );
}
