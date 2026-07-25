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
    <Card tint="bg-grass-soft" className="animate-rise border-grass/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel step={1} color="bg-grass text-paper">
          Nice work!
        </SectionLabel>
        <Pill tone="lilac">{feedback.level}</Pill>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
        {feedback.praise}
      </p>
      <p className="mt-2 text-sm text-grass-ink">{feedback.levelNote}</p>
    </Card>
  );
}

function Rewrite({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="animate-rise p-5 [animation-delay:60ms]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel step={2}>How a native would say it</SectionLabel>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="text-sm font-semibold text-muted underline decoration-line-strong decoration-2 underline-offset-4 hover:text-grass-ink"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <blockquote className="mt-3 rounded-2xl border-2 border-grass/35 bg-grass-soft/60 p-4 text-[17px] leading-[1.75]">
        {text}
      </blockquote>
    </Card>
  );
}

function Mistakes({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="animate-rise p-5 [animation-delay:120ms]">
      <SectionLabel step={3} color="bg-coral text-paper">
        A few things worth fixing
      </SectionLabel>
      <ul className="mt-4 space-y-3">
        {feedback.mistakes.map((m, i) => (
          <li key={i} className="rounded-2xl border-2 border-line bg-cream p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <p className="text-sm leading-relaxed text-berry-ink line-through decoration-berry/50 decoration-2">
                {m.original}
              </p>
              <span aria-hidden className="hidden text-faint sm:block">
                →
              </span>
              <p className="text-sm font-bold leading-relaxed text-grass-ink">
                {m.better}
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{m.reason}</p>
            <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm italic leading-relaxed text-muted">
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
      <SectionLabel step={4} color="bg-lilac text-paper">
        Steal these three
      </SectionLabel>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {feedback.expressions.map((e, i) => (
          <div
            key={i}
            className="rounded-2xl border-2 border-lilac/35 bg-lilac-soft p-4"
          >
            <p className="font-display text-[15px] font-bold text-lilac-ink">
              {e.phrase}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">
              {e.meaning}
            </p>
            <p className="mt-2 text-sm italic leading-relaxed text-muted">
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
      <SectionLabel step={5} color="bg-butter text-butter-ink">
        Say these out loud
      </SectionLabel>
      <ul className="mt-4 space-y-2">
        {lines.map((line, i) => (
          <li key={i}>
            <button
              onClick={() => speak(line, i)}
              className="group flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-cream p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-grass hover:shadow-sticker active:translate-y-0 active:shadow-none"
            >
              <span
                aria-hidden
                className={`grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-grass text-sm text-paper transition-transform group-hover:scale-110 ${
                  speaking === i ? "animate-wiggle" : ""
                }`}
              >
                ▶
              </span>
              <span className="text-[15px] leading-relaxed">{line}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-faint">
        Tap a line to hear it, then repeat it until it feels like yours.
      </p>
    </Card>
  );
}
