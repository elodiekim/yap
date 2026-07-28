"use client";

import { useEffect, useMemo, useState } from "react";
import { speak, speechSupported } from "@/lib/speech";
import { topicKo } from "@/lib/topics";
import type { ExpressionEntry } from "@/lib/types";
import { Button, Card, Thinking } from "./ui";

export function Expressions({
  onExit,
  onOpenSession,
}: {
  onExit: () => void;
  onOpenSession: (id: number) => void;
}) {
  const [all, setAll] = useState<ExpressionEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const canSpeak = speechSupported();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/expressions")
      .then((r) => r.json())
      .then((d: { expressions: ExpressionEntry[] }) => {
        if (!cancelled) setAll(d.expressions);
      })
      .catch(() => {
        if (!cancelled) setError("표현을 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Searching the Korean meaning matters as much as the English: you usually
  // remember what you wanted to say, not the phrase you were given.
  const shown = useMemo(() => {
    if (!all) return [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (e) =>
        e.phrase.toLowerCase().includes(q) ||
        e.meaning.toLowerCase().includes(q) ||
        e.example.toLowerCase().includes(q),
    );
  }, [all, query]);

  function play(e: ExpressionEntry) {
    setSpeaking(e.id);
    if (!speak(e.phrase, () => setSpeaking(null))) setSpeaking(null);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[24px] font-semibold">
          Expressions
          <span className="ko ml-2 text-[15px] font-normal text-muted">
            배운 표현
          </span>
        </h1>
        <Button variant="quiet" onClick={onExit}>
          홈으로
        </Button>
      </div>

      {error ? <p className="ko mt-6 text-[14px] text-flag">{error}</p> : null}
      {!all && !error ? (
        <div className="mt-8">
          <Thinking label="불러오는 중" />
        </div>
      ) : null}

      {all && all.length === 0 ? (
        <Card className="mt-8 p-5">
          <p className="ko text-[14px] leading-relaxed text-muted">
            아직 배운 표현이 없습니다. 답변을 하나 제출하면 Yap이 리라이트에서
            표현 3개를 뽑아 여기에 모아둡니다.
          </p>
        </Card>
      ) : null}

      {all && all.length > 0 ? (
        <>
          <div className="mt-5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="표현이나 뜻으로 찾기"
              aria-label="표현 검색"
              className="ko w-full rounded-card border border-hair bg-card px-4 py-2.5 text-[15px] text-ink shadow-card outline-none placeholder:text-faint focus:border-hair-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
            <p className="ko mt-2 text-[13px] text-muted">
              {query.trim()
                ? `${shown.length}개 찾음 · 전체 ${all.length}개`
                : `전체 ${all.length}개`}
              {canSpeak ? " · 표현을 누르면 소리로 들려줍니다" : null}
            </p>
          </div>

          {shown.length === 0 ? (
            <Card className="mt-6 p-5">
              <p className="ko text-[14px] text-muted">
                검색 결과가 없습니다.
              </p>
            </Card>
          ) : (
            <ul className="mt-4 space-y-2">
              {shown.map((e, i) => (
                <li
                  key={e.id}
                  className="animate-fade"
                  style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
                >
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => play(e)}
                        disabled={!canSpeak}
                        className="group flex min-w-0 flex-1 items-baseline gap-2.5 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default"
                      >
                        {canSpeak ? (
                          <span
                            aria-hidden
                            className={`shrink-0 text-[11px] transition-colors ${
                              speaking === e.id
                                ? "animate-pulse-dot text-accent"
                                : "text-faint group-hover:text-accent"
                            }`}
                          >
                            ▶
                          </span>
                        ) : null}
                        <span className="text-[16px] font-medium leading-snug text-ink">
                          {e.phrase}
                        </span>
                      </button>
                      {e.sessionId !== null ? (
                        <button
                          onClick={() => onOpenSession(e.sessionId!)}
                          className="ko shrink-0 text-[12px] text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          {e.topic ? topicKo(e.topic) : "연습"} →
                        </button>
                      ) : null}
                    </div>
                    <p className="ko mt-1.5 text-[14px] leading-relaxed text-body">
                      {e.meaning}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">
                      {e.example}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
