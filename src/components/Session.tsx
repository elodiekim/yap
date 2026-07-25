"use client";

import { useEffect, useRef, useState } from "react";
import type { Feedback, Profile, Prompt, Turn } from "@/lib/types";
import { topicLabel } from "@/lib/topics";
import {
  applySession,
  countWords,
  getProfileSnapshot,
  saveProfile,
  type Badge,
} from "@/lib/store";
import { FeedbackView } from "./FeedbackView";
import { Button, Card, Pill, SectionLabel, Thinking } from "./ui";

interface Props {
  topic: string;
  profile: Profile;
  onBadges: (b: Badge[]) => void;
  onExit: () => void;
}

export function Session({ topic, profile, onBadges, onExit }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  // Session is remounted (key={topic}) whenever the topic changes, so this
  // effect runs exactly once — the loading state is set in useState above
  // rather than synchronously here.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/question", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Read the store directly: the profile prop changes as answers land, and
      // depending on it here would refetch the opening question.
      body: JSON.stringify({ topic, profile: getProfileSnapshot() }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Couldn't get a question.");
        return data as Prompt;
      })
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
  }, [topic]);

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
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't get feedback.");
      const feedback = data as Feedback;

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

      const { profile: next, badges } = applySession(getProfileSnapshot(), {
        topic,
        words,
        feedback,
      });
      saveProfile(next);
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill tone="mint">{topicLabel(topic)}</Pill>
          {turns.length > 0 ? (
            <Pill tone="muted">
              {turns.length} {turns.length === 1 ? "answer" : "answers"}
            </Pill>
          ) : null}
        </div>
        <Button variant="quiet" onClick={onExit}>
          ← Done for now
        </Button>
      </div>

      {turns.map((turn, i) => (
        <div key={turn.id} className="mb-10 space-y-4">
          <AskedQuestion question={turn.question} index={i + 1} />
          <YourAnswer text={turn.answer} words={turn.words} />
          {turn.feedback ? <FeedbackView feedback={turn.feedback} /> : null}
        </div>
      ))}

      <div ref={liveRef} className="scroll-mt-6">
        {loadingPrompt ? (
          <Card className="shimmer p-6">
            <Thinking label="Yap is thinking of a question…" />
          </Card>
        ) : prompt ? (
          <div className="space-y-4">
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
        <Card className="mt-4 border-rose/30 bg-rose/[0.06] p-4">
          <p className="text-sm text-rose">{error}</p>
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
    <div className="animate-rise flex gap-3">
      <span
        aria-hidden
        className={`mt-1 grid size-8 shrink-0 place-items-center rounded-xl text-sm ${
          live ? "bg-mint/15 ring-1 ring-mint/30" : "bg-white/5"
        }`}
      >
        💬
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-faint">
          Question {index}
        </p>
        <p className="mt-1.5 text-xl font-medium leading-snug text-fg sm:text-[26px] sm:leading-tight">
          {question}
        </p>
      </div>
    </div>
  );
}

function HintCard({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="animate-rise border-amber/20 bg-amber/[0.04] p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2"
      >
        <SectionLabel color="var(--color-amber)">💡 Need ideas?</SectionLabel>
        <span className="text-xs text-faint">{open ? "hide" : "show"}</span>
      </button>
      {open ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {hints.map((h, i) => (
            <li
              key={i}
              className="animate-pop rounded-lg border border-amber/20 bg-amber/[0.07] px-3 py-1.5 text-sm text-amber/95"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              {h}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function YourAnswer({ text, words }: { text: string; words: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel color="var(--color-muted)">You said</SectionLabel>
        <span className="text-xs text-faint">{words} words</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-muted">
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
    <Card className="p-4" accent="rgba(94,234,212,0.35)">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
        }}
        disabled={grading}
        rows={7}
        placeholder="Write 3–10 sentences. Don't worry about mistakes — just keep going."
        className="w-full resize-y bg-transparent p-2 text-[17px] leading-[1.8] text-fg outline-none placeholder:text-faint/70 disabled:opacity-50"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
        <p className="text-xs text-faint">
          {words < 8 ? (
            <>Keep going — {8 - words} more words to go</>
          ) : (
            <>
              {words} words ·{" "}
              <kbd className="rounded border border-line px-1 font-mono text-[10px]">
                ⌘↵
              </kbd>{" "}
              to send
            </>
          )}
        </p>
        {grading ? (
          <Thinking label="Yap is reading your answer…" />
        ) : (
          <Button onClick={onSubmit} disabled={!canSubmit}>
            Get feedback →
          </Button>
        )}
      </div>
    </Card>
  );
}
