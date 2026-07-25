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
      <nav className="sticky top-0 z-20 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => setTopic(null)}
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint"
          >
            <Logo small />
          </button>
          <p className="hidden text-xs text-faint sm:block">
            every day, one more sentence than yesterday
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
            if (confirm("Delete your streak, vocabulary and history?")) {
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
            className="animate-pop flex items-center gap-3 rounded-2xl border border-amber/30 bg-surface px-5 py-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]"
          >
            <span aria-hidden className="text-2xl">
              {b.emoji}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber">
                Unlocked
              </p>
              <p className="text-sm font-medium text-fg">{b.label}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
