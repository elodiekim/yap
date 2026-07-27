"use client";

import { useEffect, useRef, useState } from "react";
import type { Feedback, Profile, Prompt, Turn } from "@/lib/types";
import { topicKo, topicLabel } from "@/lib/topics";
import { countWords, setProfile, today, type Badge } from "@/lib/store";
import { FeedbackView } from "./FeedbackView";
import { Button, Card, Meta, SectionLabel, Thinking } from "./ui";

interface Props {
  topic: string;
  onBadges: (b: Badge[]) => void;
  onExit: () => void;
}

interface CoachResponse {
  feedback: Feedback;
  profile: Profile;
  badges: Badge[];
}

/**
 * In-flight opening-question requests, keyed by topic.
 *
 * React Strict Mode runs effects twice in development, and a cancelled flag in
 * the cleanup only discards the result — the request still goes out. That was
 * spending two Gemini calls per topic against a 20-a-day free tier. Sharing the
 * promise means the second invocation reuses the first request; clearing the
 * entry once it settles keeps a later visit to the same topic getting a fresh
 * question.
 */
const inFlight = new Map<string, Promise<Prompt>>();

function askQuestion(topic: string): Promise<Prompt> {
  const existing = inFlight.get(topic);
  if (existing) return existing;

  const request = fetch("/api/question", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // The route reads the learner's history from the database itself.
    body: JSON.stringify({ topic, practisedOn: today() }),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Couldn't get a question.");
    return data as Prompt;
  });

  inFlight.set(topic, request);
  // Settle-only cleanup; the caller owns the rejection, so swallow it here.
  request.catch(() => {}).finally(() => inFlight.delete(topic));
  return request;
}

export function Session({ topic, onBadges, onExit }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);

  // Session is remounted (key={topic}) whenever the topic changes, so this
  // effect runs exactly once — the loading state is set in useState above
  // rather than synchronously here. `attempt` re-runs it after a failure.
  useEffect(() => {
    let cancelled = false;
    askQuestion(topic)
      .then((p) => {
        if (!cancelled) setPrompt(p);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrompt(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topic, attempt]);

  /**
   * The opening question is the one call with no way back: a 429 here left the
   * screen showing an error and nothing else, so the only way on was to leave
   * the topic and come back. Rate limits are routine on the free tier, so this
   * needs a button.
   */
  function retryQuestion() {
    setError(null);
    setLoadingPrompt(true);
    setAttempt((n) => n + 1);
  }

  const words = countWords(draft);
  const canSubmit = words >= 8 && !grading && !!prompt;

  async function submit() {
    if (!prompt || !canSubmit) return;
    setGrading(true);
    setError(null);
    const answer = draft.trim();

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          question: prompt.question,
          answer,
          history: turns.map((t) => ({ question: t.question, answer: t.answer })),
          // The server is on UTC; the streak counts the learner's calendar day.
          practisedOn: today(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't get feedback.");
      const { feedback, profile: saved, badges } = data as CoachResponse;

      const turn: Turn = {
        id: crypto.randomUUID(),
        topic,
        question: prompt.question,
        hints: prompt.hints,
        answer,
        words,
        feedback,
        createdAt: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, turn]);
      setDraft("");
      setPrompt(feedback.followUp);

      // The route already wrote the session; this only mirrors the result.
      setProfile(saved);
      if (badges.length) onBadges(badges);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGrading(false);
    }
  }

  useEffect(() => {
    if (turns.length > 0) {
      liveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [turns.length]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-32 pt-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-hair pb-4">
        <div className="flex flex-wrap items-center gap-x-3">
          <span className="text-[15px] font-semibold text-ink">
            {topicLabel(topic)}
          </span>
          <span className="ko text-[13px] text-muted">{topicKo(topic)}</span>
          {turns.length > 0 ? <Meta>답변 {turns.length}개</Meta> : null}
        </div>
        <Button variant="quiet" onClick={onExit}>
          ← 오늘은 여기까지
        </Button>
      </div>

      {turns.map((turn, i) => (
        <div key={turn.id} className="mb-14 space-y-3">
          <AskedQuestion question={turn.question} index={i + 1} />
          <YourAnswer text={turn.answer} words={turn.words} />
          {turn.feedback ? <FeedbackView feedback={turn.feedback} /> : null}
        </div>
      ))}

      <div ref={liveRef} className="scroll-mt-6">
        {loadingPrompt ? (
          <Card className="p-5">
            <Thinking label="질문을 만들고 있어요…" />
          </Card>
        ) : prompt ? (
          <div className="space-y-3">
            <AskedQuestion
              question={prompt.question}
              index={turns.length + 1}
              live
            />
            <HintCard hints={prompt.hints} />
            <Composer
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              words={words}
              grading={grading}
              canSubmit={canSubmit}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <Card tone="bg-flag-soft" className="mt-4 border-flag/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="ko text-[14px] text-flag">{error}</p>
            {prompt ? null : (
              <Button variant="ghost" onClick={retryQuestion}>
                다시 시도
              </Button>
            )}
          </div>
          {prompt ? (
            <p className="ko mt-1.5 text-[13px] text-muted">
              쓰신 답변은 그대로 있으니 잠시 뒤 다시 제출해보세요.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function AskedQuestion({
  question,
  index,
  live = false,
}: {
  question: string;
  index: number;
  live?: boolean;
}) {
  return (
    <div className="animate-rise">
      <p className="text-[13px] tabular-nums text-faint">
        Question {index}
        {live ? <span className="ml-2 text-accent">지금 차례</span> : null}
      </p>
      <p className="mt-1.5 text-[22px] font-semibold leading-snug text-ink sm:text-[26px]">
        {question}
      </p>
    </div>
  );
}

function HintCard({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <Card tone="bg-accent-soft" className="border-accent-line p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between gap-2 text-left"
      >
        <SectionLabel en="Need ideas?" ko="할 말이 안 떠오르면" />
        <span className="shrink-0 text-[13px] text-muted">
          {open ? "접기" : "펼치기"}
        </span>
      </button>
      {open ? (
        <>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {hints.map((h, i) => (
              <li
                key={i}
                className="animate-fade rounded-md border border-accent-line bg-card px-2.5 py-1 text-[13px] text-ink"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {h}
              </li>
            ))}
          </ul>
          <p className="ko mt-3 text-[13px] text-muted">
            이 중 하나만 골라서 이야기를 시작해도 충분해요.
          </p>
        </>
      ) : null}
    </Card>
  );
}

function YourAnswer({ text, words }: { text: string; words: number }) {
  return (
    <Card tone="bg-sunk" className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel en="Your answer" ko="내가 쓴 답" />
        <span className="text-[13px] tabular-nums text-faint">
          {words} words
        </span>
      </div>
      <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-relaxed text-body">
        {text}
      </p>
    </Card>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  words,
  grading,
  canSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  words: number;
  grading: boolean;
  canSubmit: boolean;
}) {
  return (
    <Card className="p-4">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
        }}
        disabled={grading}
        rows={8}
        placeholder="영어로 3~10문장 정도 써보세요. 틀려도 괜찮으니 일단 끝까지 써보는 게 중요해요."
        className="w-full resize-y rounded-lg bg-transparent text-[16px] leading-[1.85] text-ink outline-none placeholder:text-faint disabled:opacity-60"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-3">
        <p className="ko text-[13px] text-muted">
          {words < 8 ? (
            <>{8 - words}단어만 더 쓰면 제출할 수 있어요</>
          ) : (
            <>
              {words} words ·{" "}
              <kbd className="rounded border border-hair-strong bg-sunk px-1 py-0.5 text-[11px]">
                ⌘↵
              </kbd>{" "}
              로 제출
            </>
          )}
        </p>
        {grading ? (
          <Thinking label="답변을 읽고 있어요…" />
        ) : (
          <Button onClick={onSubmit} disabled={!canSubmit}>
            피드백 받기
          </Button>
        )}
      </div>
    </Card>
  );
}
