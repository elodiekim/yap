"use client";

import { TOPICS } from "@/lib/topics";
import type { Profile } from "@/lib/types";
import { streak } from "@/lib/store";
import { Dashboard } from "./Dashboard";
import { Button, Card, Pill } from "./ui";

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
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-10 sm:px-6">
      <header className="animate-rise">
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Every day,
          <br />
          <span className="text-mint">one more sentence</span>
          <br />
          than yesterday.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Yap is a friendly native English tutor. It won&apos;t nitpick your
          grammar — it asks you something, gives you ideas when your mind goes
          blank, and shows you how a native would have said it.
        </p>
        <div className="mt-5 flex min-h-[26px] flex-wrap items-center gap-2">
          <Pill tone="violet">Level {profile.level}</Pill>
          {s > 0 ? <Pill tone="amber">🔥 {s}-day streak</Pill> : null}
          {profile.totalConversations > 0 ? (
            <Pill tone="muted">{profile.totalConversations} conversations</Pill>
          ) : null}
        </div>
      </header>

      <section className="mt-12 animate-rise [animation-delay:80ms]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-faint">
          {fresh ? "Pick something to talk about" : "What today?"}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t, i) => {
            const done = profile.topicsPracticed.includes(t.id);
            return (
              <li key={t.id} className="animate-pop" style={{ animationDelay: `${i * 35}ms` }}>
                <button
                  onClick={() => onStart(t.id)}
                  className="group h-full w-full rounded-2xl border border-line bg-surface/70 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-mint/40 hover:bg-mint/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span aria-hidden className="text-2xl">
                      {t.emoji}
                    </span>
                    {done ? (
                      <span className="text-[11px] text-mint/70">done ✓</span>
                    ) : null}
                  </div>
                  <p className="mt-3 font-medium text-fg group-hover:text-mint">
                    {t.label}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-faint">{t.blurb}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {!fresh ? (
        <section className="mt-14 animate-rise [animation-delay:140ms]">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-faint">
            Your progress
          </h2>
          <Dashboard profile={profile} />
          <div className="mt-6 flex justify-end">
            <Button variant="quiet" onClick={onReset}>
              Reset all progress
            </Button>
          </div>
        </section>
      ) : (
        <Card className="mt-14 animate-rise p-6 [animation-delay:140ms]">
          <p className="text-sm leading-relaxed text-muted">
            Your streak, vocabulary, mistake trend and CEFR level will show up
            here once you finish your first answer. Everything stays in this
            browser — no account, no sign-up.
          </p>
        </Card>
      )}
    </div>
  );
}
