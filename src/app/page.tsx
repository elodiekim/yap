"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { History } from "@/components/History";
import { Home } from "@/components/Home";
import { Session } from "@/components/Session";
import { Logo } from "@/components/ui";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  initProfile,
  resetProfile,
  subscribeProfile,
  type Badge,
} from "@/lib/store";

export default function Page() {
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );
  const [topic, setTopic] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);

  function goHome() {
    setTopic(null);
    setHistory(false);
  }

  // Pulls the profile out of SQLite, migrating a leftover localStorage copy on
  // the way. initProfile guards itself, so Strict Mode's second run is a no-op.
  useEffect(() => {
    void initProfile();
  }, []);

  useEffect(() => {
    if (badges.length === 0) return;
    const t = setTimeout(() => setBadges([]), 5000);
    return () => clearTimeout(t);
  }, [badges]);

  return (
    <main className="min-h-dvh">
      <nav className="sticky top-0 z-20 border-b border-hair bg-cloud/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-3.5 sm:px-6">
          <button
            onClick={goHome}
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <Logo small />
          </button>
          <div className="flex items-center gap-4">
            <p className="ko hidden text-[13px] text-faint sm:block">
              어제보다 한 문장 더
            </p>
            <button
              onClick={() => {
                setTopic(null);
                setHistory(true);
              }}
              className={`ko rounded-md px-1 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                history ? "text-accent" : "text-muted hover:text-ink"
              }`}
            >
              지난 연습
            </button>
          </div>
        </div>
      </nav>

      {topic ? (
        <Session
          key={topic}
          topic={topic}
          onBadges={setBadges}
          onExit={goHome}
        />
      ) : history ? (
        <History onExit={goHome} />
      ) : (
        <Home
          profile={profile}
          onStart={setTopic}
          onHistory={() => setHistory(true)}
          onReset={() => {
            if (confirm("연속 학습일, 배운 표현, 기록을 모두 지울까요?")) {
              void resetProfile();
            }
          }}
        />
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2 px-4"
      >
        {badges.map((b) => (
          <div
            key={b.id}
            className="animate-rise flex items-center gap-2.5 rounded-lg border border-hair bg-card px-4 py-2.5 shadow-raised"
          >
            <span aria-hidden className="text-[15px]">
              {b.emoji}
            </span>
            <p className="ko text-[14px] text-ink">
              <span className="text-muted">달성 · </span>
              {b.label}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
