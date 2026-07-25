"use client";

import { useState } from "react";
import type { Feedback } from "@/lib/types";
import { PUBLIC_ENGLISH_VARIANT, voicePreference } from "@/lib/english";
import { Card, SectionLabel } from "./ui";

export function FeedbackView({ feedback }: { feedback: Feedback }) {
  return (
    <div className="space-y-3">
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

function Mistakes({ feedback }: { feedback: Feedback }) {
  return (
    <Card className="animate-rise p-5 [animation-delay:80ms]">
      <SectionLabel
        step={3}
        en={`Worth fixing (${feedback.mistakes.length})`}
        ko="짚고 넘어갈 부분"
      />
      <ul className="mt-3 divide-y divide-hair">
        {feedback.mistakes.map((m, i) => (
          <li key={i} className="py-4 first:pt-1 last:pb-1">
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

const VOICE_ORDER = voicePreference(PUBLIC_ENGLISH_VARIANT);

/**
 * Voices load asynchronously, so read the list at click time rather than on
 * mount. Falls through en-NZ → en-AU → en-GB → any English; if the device has
 * none of them, `lang` alone still nudges the default voice.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  for (const tag of VOICE_ORDER) {
    const hit = voices.find((v) => v.lang.replace("_", "-").startsWith(tag));
    if (hit) return hit;
  }
  return null;
}

function Shadowing({ lines }: { lines: string[] }) {
  const [speaking, setSpeaking] = useState<number | null>(null);

  function speak(text: string, i: number) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? VOICE_ORDER[0];
    u.rate = 0.92;
    u.onend = () => setSpeaking(null);
    u.onerror = () => setSpeaking(null);
    setSpeaking(i);
    window.speechSynthesis.speak(u);
  }

  return (
    <Card className="animate-rise p-5 [animation-delay:160ms]">
      <SectionLabel step={5} en="Read these aloud" ko="소리 내어 따라 읽기" />
      <ul className="mt-3 space-y-1.5">
        {lines.map((line, i) => (
          <li key={i}>
            <button
              onClick={() => speak(line, i)}
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
        문장을 누르면 호주·뉴질랜드 발음으로 들려줍니다. 입에 붙을 때까지 따라 읽어보세요.
      </p>
    </Card>
  );
}
