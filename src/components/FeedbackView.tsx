"use client";

import { useState } from "react";
import type { Feedback } from "@/lib/types";
import { Card, Pill, SectionLabel } from "./ui";

export function FeedbackView({ feedback }: { feedback: Feedback }) {
  return (
    <div className="space-y-4">
      <Praise feedback={feedback} />
      <Rewrite text={feedback.rewrite} />
      {feedback.mistakes.length > 0 ? <Mistakes feedback={feedback} /> : null}
      <Expressions feedback={feedback} />
      <Shadowing lines={feedback.shadowing} />
    </div>
  );
}

function Praise({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="animate-rise p-5" accent="rgba(163,230,53,0.5)">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel step={1} color="var(--color-lime)">
          Nice work
        </SectionLabel>
        <Pill tone="violet">{feedback.level}</Pill>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-fg/90">{feedback.praise}</p>
      <p className="mt-2 text-sm text-faint">{feedback.levelNote}</p>
    </Card>
  );
}

function Rewrite({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card
      className="animate-rise p-5 [animation-delay:60ms]"
      accent="rgba(94,234,212,0.6)"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel step={2}>How a native would say it</SectionLabel>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="text-xs font-medium text-faint transition-colors hover:text-mint"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <blockquote className="mt-3 rounded-xl bg-mint/[0.06] p-4 text-[17px] leading-[1.75] text-fg ring-1 ring-inset ring-mint/20">
        {text}
      </blockquote>
    </Card>
  );
}

function Mistakes({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="animate-rise p-5 [animation-delay:120ms]">
      <SectionLabel step={3} color="var(--color-amber)">
        Worth fixing ({feedback.mistakes.length})
      </SectionLabel>
      <ul className="mt-4 space-y-3">
        {feedback.mistakes.map((m, i) => (
          <li
            key={i}
            className="rounded-xl border border-line-soft bg-surface-2/60 p-4"
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <p className="text-sm leading-relaxed text-rose/90 line-through decoration-rose/40">
                {m.original}
              </p>
              <span aria-hidden className="hidden text-faint sm:block">
                →
              </span>
              <p className="text-sm font-medium leading-relaxed text-mint">
                {m.better}
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{m.reason}</p>
            <p className="mt-2 border-l-2 border-line pl-3 text-sm italic leading-relaxed text-faint">
              {m.example}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Expressions({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="animate-rise p-5 [animation-delay:180ms]">
      <SectionLabel step={4} color="var(--color-violet)">
        Steal these expressions
      </SectionLabel>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {feedback.expressions.map((e, i) => (
          <div
            key={i}
            className="rounded-xl border border-violet/20 bg-violet/[0.06] p-4"
          >
            <p className="font-mono text-sm font-semibold text-violet">{e.phrase}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{e.meaning}</p>
            <p className="mt-2 text-sm italic leading-relaxed text-faint">
              {e.example}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Shadowing({ lines }: { lines: string[] }) {
  const [speaking, setSpeaking] = useState<number | null>(null);

  function speak(text: string, i: number) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    u.onend = () => setSpeaking(null);
    u.onerror = () => setSpeaking(null);
    setSpeaking(i);
    window.speechSynthesis.speak(u);
  }

  return (
    <Card className="animate-rise p-5 [animation-delay:240ms]">
      <SectionLabel step={5}>Say these out loud</SectionLabel>
      <ul className="mt-4 space-y-2">
        {lines.map((line, i) => (
          <li key={i}>
            <button
              onClick={() => speak(line, i)}
              className="group flex w-full items-start gap-3 rounded-xl border border-line-soft bg-surface-2/60 p-4 text-left transition-colors hover:border-mint/30 hover:bg-mint/[0.04]"
            >
              <span
                aria-hidden
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-mint/12 text-mint transition-transform group-hover:scale-110 ${
                  speaking === i ? "animate-breathe" : ""
                }`}
              >
                ▶
              </span>
              <span className="text-[15px] leading-relaxed text-fg/90">{line}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-faint">
        Tap a line to hear it, then repeat it until it feels like yours.
      </p>
    </Card>
  );
}
