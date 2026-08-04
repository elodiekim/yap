"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Expressions } from "@/components/Expressions";
import { History } from "@/components/History";
import { Home } from "@/components/Home";
import { Session } from "@/components/Session";
import { Logo } from "@/components/ui";
import type { Mode } from "@/lib/types";
import {
  getProfileServerSnapshot,
  getProfileSnapshot,
  initProfile,
  resetProfile,
  subscribeProfile,
  type Badge,
} from "@/lib/store";

function BadgeStack({ badges, onDone }: { badges: Badge[]; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onDone, 220);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <>
      {badges.map((b) => (
        <div
          key={b.id}
          className={`${leaving ? "animate-rise-out" : "animate-rise"} flex items-center gap-2.5 rounded-lg border border-hair bg-card px-4 py-2.5 shadow-raised`}
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
    </>
  );
}

function NavLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`ko rounded-md px-1 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
        active ? "text-accent" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export default function Page() {
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );
  const [topic, setTopic] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [view, setView] = useState<"home" | "history" | "expressions">("home");
  const [openSession, setOpenSession] = useState<number | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeBatch, setBadgeBatch] = useState(0);

  function goHome() {
    setTopic(null);
    setMode("normal");
    setView("home");
    setOpenSession(null);
  }

  function go(next: "history" | "expressions") {
    setTopic(null);
    setOpenSession(null);
    setView(next);
  }

  // Pulls the profile out of SQLite, migrating a leftover localStorage copy on
  // the way. initProfile guards itself, so Strict Mode's second run is a no-op.
  useEffect(() => {
    void initProfile();
  }, []);

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
            <NavLink
              active={view === "history" && !topic}
              onClick={() => go("history")}
            >
              지난 연습
            </NavLink>
            <NavLink
              active={view === "expressions" && !topic}
              onClick={() => go("expressions")}
            >
              표현
            </NavLink>
          </div>
        </div>
      </nav>

      {topic ? (
        <Session
          key={`${mode}:${topic}`}
          topic={topic}
          mode={mode}
          onBadges={(b) => {
            setBadges(b);
            setBadgeBatch((n) => n + 1);
          }}
          onExit={goHome}
        />
      ) : view === "history" ? (
        <History onExit={goHome} initialSession={openSession} />
      ) : view === "expressions" ? (
        <Expressions
          onExit={goHome}
          onOpenSession={(id) => {
            setOpenSession(id);
            setView("history");
          }}
        />
      ) : (
        <Home
          profile={profile}
          onStart={(t, m) => {
            setMode(m);
            setTopic(t);
          }}
          onHistory={() => go("history")}
          onExpressions={() => go("expressions")}
          onOpenSession={(id) => {
            setOpenSession(id);
            setView("history");
          }}
          onBadges={(b) => {
            setBadges(b);
            setBadgeBatch((n) => n + 1);
          }}
          onReset={() => {
            if (
              confirm(
                "연습 기록을 모두 지울까요?\n\n" +
                  "지워지는 것 — 지난 연습, 연속 학습일, 배운 표현, 실수 기록, 트로피\n" +
                  "남는 것 — AI 사용량과 비용 (실제로 쓴 금액이라 지우면 오히려 안 맞습니다)\n\n" +
                  "되돌릴 수 없습니다.",
              )
            ) {
              void resetProfile();
            }
          }}
        />
      )}

      {/*
        The live region stays mounted and empty between badges. Screen readers
        announce changes *inside* an existing region — creating the region with
        its content already in place is routinely missed.
      */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2 px-4"
      >
        {badges.length > 0 ? (
          <BadgeStack
            key={badgeBatch}
            badges={badges}
            onDone={() => setBadges([])}
          />
        ) : null}
      </div>
    </main>
  );
}
