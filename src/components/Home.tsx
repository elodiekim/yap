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
      <header className="animate-rise text-center sm:text-left">
        <span
          aria-hidden
          className="inline-block animate-wiggle text-6xl sm:text-7xl"
        >
          🐣
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.15] sm:text-5xl">
          Every day, <span className="text-grass-ink">one more sentence</span>{" "}
          than yesterday.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:mx-0 sm:text-lg">
          Yap is a friendly tutor who just wants you to keep talking. It hands
          you ideas when your mind goes blank, and shows you how a native would
          have said it.
        </p>
        <div className="mt-5 flex min-h-[34px] flex-wrap justify-center gap-2 sm:justify-start">
          <Pill tone="lilac">Level {profile.level}</Pill>
          {s > 0 ? <Pill tone="coral">🔥 {s}-day streak</Pill> : null}
          {profile.totalConversations > 0 ? (
            <Pill tone="plain">{profile.totalConversations} chats</Pill>
          ) : null}
        </div>
      </header>

      <section className="mt-12 animate-rise [animation-delay:80ms]">
        <h2 className="font-display text-xl font-semibold">
          {fresh ? "What should we talk about?" : "What today?"}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t, i) => {
            const done = profile.topicsPracticed.includes(t.id);
            return (
              <li
                key={t.id}
                className="animate-pop"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <button
                  onClick={() => onStart(t.id)}
                  className="group h-full w-full rounded-blob border-2 border-line-strong bg-paper p-4 text-left shadow-sticker transition-all duration-150 hover:-translate-y-1 hover:border-grass hover:shadow-lift focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lilac active:translate-y-0 active:shadow-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      aria-hidden
                      className="grid size-12 place-items-center rounded-2xl bg-cream text-2xl transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6"
                    >
                      {t.emoji}
                    </span>
                    {done ? (
                      <span className="rounded-full bg-grass-soft px-2 py-0.5 text-xs font-bold text-grass-ink">
                        done ✓
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 font-display text-lg font-semibold">
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-muted">
                    {t.blurb}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {!fresh ? (
        <section className="mt-14 animate-rise [animation-delay:140ms]">
          <h2 className="mb-4 font-display text-xl font-semibold">
            How you&apos;re doing
          </h2>
          <Dashboard profile={profile} />
          <div className="mt-6 flex justify-end">
            <Button variant="quiet" onClick={onReset}>
              Reset all progress
            </Button>
          </div>
        </section>
      ) : (
        <Card
          tint="bg-butter-soft"
          className="mt-14 animate-rise p-6 [animation-delay:140ms]"
        >
          <p className="text-[15px] leading-relaxed text-ink/80">
            <span aria-hidden className="mr-1.5">
              🌱
            </span>
            Your streak, your words and your trophies show up here after your
            first answer. Everything stays in this browser — no account, no
            sign-up.
          </p>
        </Card>
      )}
    </div>
  );
}
