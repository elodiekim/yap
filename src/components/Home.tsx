"use client";

import { TOPICS } from "@/lib/topics";
import type { Profile } from "@/lib/types";
import { streak } from "@/lib/store";
import { Dashboard } from "./Dashboard";
import { Button, Card, Meta } from "./ui";

export function Home({
  profile,
  onStart,
  onReset,
}: {
  profile: Profile;
  onStart: (topic: string) => void;
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
                  onClick={() => onStart(t.id)}
                  className="group flex h-full w-full items-start gap-3 rounded-card border border-hair bg-card p-4 text-left shadow-card transition-all duration-150 hover:border-hair-strong hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
      </section>

      {!fresh ? (
        <section className="mt-16 animate-rise [animation-delay:120ms]">
          <h2 className="mb-4 text-[15px] font-semibold">
            Your progress
            <span className="ko ml-2 font-normal text-muted">기록</span>
          </h2>
          <Dashboard profile={profile} />
          <div className="mt-6 flex justify-end">
            <Button variant="quiet" onClick={onReset}>
              기록 전체 삭제
            </Button>
          </div>
        </section>
      ) : (
        <Card className="mt-16 animate-rise p-5 [animation-delay:120ms]">
          <p className="ko text-[14px] leading-relaxed text-muted">
            연속 학습일, 배운 표현, 실수 추이, 레벨은 첫 답변을 마치면 여기에
            나타납니다. 모든 기록은 이 브라우저에만 저장되고 계정은 필요 없어요.
          </p>
        </Card>
      )}
    </div>
  );
}
