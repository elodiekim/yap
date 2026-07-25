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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="grass">{topicLabel(topic)}</Pill>
          {turns.length > 0 ? (
            <Pill tone="plain">
              {turns.length} {turns.length === 1 ? "answer" : "answers"}
            </Pill>
          ) : null}
        </div>
        <Button variant="quiet" onClick={onExit}>
          ← Done for now
        </Button>
      </div>

      {turns.map((turn, i) => (
        <div key={turn.id} className="mb-12 space-y-4">
          <AskedQuestion question={turn.question} index={i + 1} />
          <YourAnswer text={turn.answer} words={turn.words} />
          {turn.feedback ? <FeedbackView feedback={turn.feedback} /> : null}
        </div>
      ))}

      <div ref={liveRef} className="scroll-mt-6">
        {loadingPrompt ? (
          <Card className="p-6">
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
        <Card tint="bg-coral-soft" className="mt-4 border-coral/40 p-4">
          <p className="text-sm font-semibold text-coral-ink">{error}</p>
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
    <div className="animate-rise flex items-start gap-3">
      <span
        aria-hidden
        className={`grid size-11 shrink-0 place-items-center rounded-2xl border-2 text-xl ${
          live
            ? "border-ink bg-butter shadow-sticker"
            : "border-line-strong bg-cream"
        }`}
      >
        🐣
      </span>
      <div className="pt-0.5">
        <p className="text-sm font-semibold text-faint">Question {index}</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-snug sm:text-[28px]">
          {question}
        </p>
      </div>
    </div>
  );
}

function HintCard({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <Card tint="bg-butter-soft" className="border-butter p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2"
      >
        <SectionLabel color="bg-butter text-butter-ink">
          💡 Stuck? Here are some ideas
        </SectionLabel>
        <span className="text-sm font-semibold text-butter-ink">
          {open ? "hide" : "show"}
        </span>
      </button>
      {open ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {hints.map((h, i) => (
            <li
              key={i}
              className="animate-pop rounded-full border-2 border-butter bg-paper px-3.5 py-1.5 text-sm font-semibold text-ink"
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
    <Card tint="bg-cream" className="p-5">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel color="bg-line text-muted">You said</SectionLabel>
        <span className="text-sm text-faint">{words} words</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/75">
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
        rows={7}
        placeholder="Write 3–10 sentences. Mistakes are totally fine — just keep going!"
        className="w-full resize-y rounded-2xl bg-cream p-4 text-[17px] leading-[1.8] outline-none placeholder:text-faint focus:ring-3 focus:ring-grass/30 disabled:opacity-60"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {words < 8 ? (
            <>{8 - words} more words and you&apos;re good to go</>
          ) : (
            <>
              {words} words ·{" "}
              <kbd className="rounded-md border-2 border-line-strong bg-cream px-1.5 py-0.5 text-xs font-bold">
                ⌘↵
              </kbd>{" "}
              to send
            </>
          )}
        </p>
        {grading ? (
          <Thinking label="Yap is reading…" />
        ) : (
          <Button onClick={onSubmit} disabled={!canSubmit}>
            Show me! →
          </Button>
        )}
      </div>
    </Card>
  );
}
