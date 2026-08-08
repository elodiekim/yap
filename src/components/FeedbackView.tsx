"use client";

import { useState } from "react";
import type { Feedback } from "@/lib/types";
import { PUBLIC_ENGLISH_VARIANT, variantKo } from "@/lib/english";
import { dismissMistake } from "@/lib/store";
import { speak } from "@/lib/speech";
import { Card, SectionLabel } from "./ui";

export function FeedbackView({
  feedback,
  sessionId,
  onFeedbackChange,
}: {
  feedback: Feedback;
  /** Omitted where the feedback isn't editable yet — no session row to edit. */
  sessionId?: number;
  onFeedbackChange?: (next: Feedback) => void;
}) {
  return (
    <div className="space-y-3">
      <Praise feedback={feedback} />
      <Rewrite text={feedback.rewrite} />
      {feedback.mistakes.length > 0 ? (
        <Mistakes
          feedback={feedback}
          sessionId={sessionId}
          onFeedbackChange={onFeedbackChange}
        />
      ) : null}
      <Expressions feedback={feedback} />
      <Shadowing lines={feedback.shadowing} />
    </div>
  );
}

function Praise({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="animate-rise p-5">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel step={1} en="What went well" ko="잘한 점" />
        <span className="text-[13px] text-muted">{feedback.level}</span>
      </div>
      <p className="mt-2.5 text-[15px] leading-relaxed text-body">
        {feedback.praise}
      </p>
      <p className="mt-2 text-[13px] text-muted">{feedback.levelNote}</p>
    </Card>
  );
}

function Rewrite({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="animate-rise p-5 [animation-delay:40ms]">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel
          step={2}
          en="How a local would say it"
          ko="원어민이라면 이렇게"
        />
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="shrink-0 text-[13px] text-muted hover:text-ink"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <blockquote className="mt-3 border-l-2 border-accent bg-accent-soft/60 py-3 pl-4 pr-3 text-[16px] leading-[1.8] text-ink">
        {text}
      </blockquote>
    </Card>
  );
}

function Mistakes({
  feedback,
  sessionId,
  onFeedbackChange,
}: {
  feedback: Feedback;
  sessionId?: number;
  onFeedbackChange?: (next: Feedback) => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [dropped, setDropped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const editable = sessionId !== undefined && onFeedbackChange !== undefined;

  async function drop(index: number) {
    if (!editable || busy !== null) return;
    setBusy(index);
    setError(null);
    try {
      onFeedbackChange(await dismissMistake(sessionId, index));
      setDropped((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="animate-rise p-5 [animation-delay:80ms]">
      <SectionLabel
        step={3}
        en={`Worth fixing (${feedback.mistakes.length})`}
        ko="짚고 넘어갈 부분"
      />
      {dropped > 0 ? (
        <p className="ko mt-2 text-[13px] text-muted">
          {dropped}개를 뺐어요. 통계와 &ldquo;자주 틀리는 것&rdquo;에서도
          빠집니다.
        </p>
      ) : null}
      {error ? <p className="ko mt-2 text-[13px] text-flag">{error}</p> : null}
      <ul className="mt-3 divide-y divide-hair">
        {feedback.mistakes.map((m, i) => (
          <li key={`${m.original}-${m.better}`} className="py-4 first:pt-1 last:pb-1">
            <div className="grid gap-1.5 sm:grid-cols-[1fr_auto_1fr] sm:items-baseline sm:gap-3">
              <p className="text-[14px] leading-relaxed text-flag line-through decoration-flag/40">
                {m.original}
              </p>
              <span aria-hidden className="hidden text-faint sm:block">
                →
              </span>
              <p className="text-[14px] font-medium leading-relaxed text-accent">
                {m.better}
              </p>
            </div>
            <p className="ko mt-2.5 text-[13px] leading-relaxed text-body">
              {m.reason}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              예: {m.example}
            </p>
            {/*
              Deliberately plain text at the end of the item, not an ✕ in the
              corner: this should take a decision, not a stray tap. §5.12
            */}
            {editable ? (
              <button
                onClick={() => drop(i)}
                disabled={busy !== null}
                className="ko mt-2 rounded-md text-[13px] text-faint hover:text-flag disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {busy === i ? "빼는 중…" : "이 교정은 빼주세요"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Expressions({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="animate-rise p-5 [animation-delay:120ms]">
      <SectionLabel step={4} en="Useful expressions" ko="가져다 쓸 표현" />
      <ul className="mt-3 divide-y divide-hair">
        {feedback.expressions.map((e, i) => (
          <li key={i} className="py-3.5 first:pt-1 last:pb-1">
            <p className="text-[15px] font-medium text-ink">{e.phrase}</p>
            <p className="ko mt-1 text-[13px] leading-relaxed text-body">
              {e.meaning}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {e.example}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const VARIANT_KO = variantKo(PUBLIC_ENGLISH_VARIANT);

function Shadowing({ lines }: { lines: string[] }) {
  const [speaking, setSpeaking] = useState<number | null>(null);

  function play(text: string, i: number) {
    setSpeaking(i);
    if (!speak(text, () => setSpeaking(null))) setSpeaking(null);
  }

  return (
    <Card className="animate-rise p-5 [animation-delay:160ms]">
      <SectionLabel step={5} en="Read these aloud" ko="소리 내어 따라 읽기" />
      <ul className="mt-3 space-y-1.5">
        {lines.map((line, i) => (
          <li key={i}>
            <button
              onClick={() => play(line, i)}
              className="group flex w-full items-baseline gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              <span
                aria-hidden
                className={`shrink-0 text-[11px] text-faint transition-colors group-hover:text-accent ${
                  speaking === i ? "text-accent animate-pulse-dot" : ""
                }`}
              >
                ▶
              </span>
              <span className="text-[15px] leading-relaxed text-ink">
                {line}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="ko mt-3 text-[13px] text-muted">
        문장을 누르면 {VARIANT_KO}식 발음으로 들려줍니다. 입에 붙을 때까지 따라
        읽어보세요.
      </p>
    </Card>
  );
}
