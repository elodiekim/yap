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
      <nav className="sticky top-0 z-20 border-b-2 border-line-strong bg-cream/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => setTopic(null)}
            className="rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-lilac"
          >
            <Logo small />
          </button>
          <p className="hidden text-sm text-faint sm:block">
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
            className="animate-pop flex items-center gap-3 rounded-full border-2 border-ink bg-butter px-5 py-3 shadow-sticker-lg"
          >
            <span aria-hidden className="text-2xl">
              {b.emoji}
            </span>
            <div>
              <p className="text-xs font-bold text-butter-ink">Unlocked!</p>
              <p className="font-display text-[15px] font-semibold">{b.label}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
