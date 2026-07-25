"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Home } from "@/components/Home";
import { Session } from "@/components/Session";
import { Logo } from "@/components/ui";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
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
  const [badges, setBadges] = useState<Badge[]>([]);

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
            onClick={() => setTopic(null)}
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <Logo small />
          </button>
          <p className="ko hidden text-[13px] text-faint sm:block">
            어제보다 한 문장 더
          </p>
        </div>
      </nav>

      {topic ? (
        <Session
          key={topic}
          topic={topic}
          profile={profile}
          onBadges={setBadges}
          onExit={() => setTopic(null)}
        />
      ) : (
        <Home
          profile={profile}
          onStart={setTopic}
          onReset={() => {
            if (confirm("연속 학습일, 배운 표현, 기록을 모두 지울까요?")) {
              resetProfile();
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
