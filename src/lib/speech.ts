"use client";

import { PUBLIC_ENGLISH_VARIANT, voicePreference } from "./english";

const VOICE_ORDER = voicePreference(PUBLIC_ENGLISH_VARIANT);

/**
 * Audio comes from `/api/speak` (Gemini TTS, cached on disk) and falls back to
 * the browser's own synthesis when that route is off or unreachable.
 *
 * The fallback is not a nicety. On this machine the only en-AU voice installed
 * is macOS "Karen", which is why the server route exists — but a red error in
 * the middle of shadowing is worse than a robotic voice, so a failed fetch just
 * plays the device voice instead of surfacing anything.
 */

/* -------------------------------------------------------------- 재생 속도 */

export type Pace = "slow" | "normal" | "fast";

/**
 * Playback speed, not three recordings.
 *
 * Generating a slow, a normal and a fast version of one sentence would be
 * three requests and three files for something the audio element does with one
 * property. The bytes on disk are one reading; this stretches them.
 *
 * The numbers are not 0.75/1/1.25 because 1.0 is not "보통". The TTS model
 * reads at about 200 words per minute and will not be talked down — three
 * different pace instructions landed at 124, 195 and 199 wpm. So the rates are
 * pinned to what each label claims, against that 200 wpm baseline:
 *
 *   느리게  0.6  → ~120 wpm, slow enough to repeat after
 *   보통    0.78 → ~155 wpm, ordinary conversation
 *   빠르게  1.0  → ~200 wpm, the raw file, for listening rather than copying
 *
 * A control whose middle setting is faster than real speech would be lying.
 */
export const RATE: Record<Pace, number> = {
  slow: 0.6,
  normal: 0.78,
  fast: 1,
};

const PACE_KEY = "yap.pace.v1";

/**
 * Slowing audio down without pitch correction drops the voice a fifth, which
 * teaches the wrong vowels. Browsers default `preservesPitch` to true, but this
 * feature exists to fix a pronunciation model — too load-bearing to leave to a
 * default.
 */
function applyPace(audio: HTMLAudioElement, pace: Pace): void {
  audio.preservesPitch = true;
  audio.playbackRate = RATE[pace];
}

export function readPace(): Pace {
  if (typeof window === "undefined") return "normal";
  const saved = window.localStorage.getItem(PACE_KEY);
  return saved === "slow" || saved === "fast" ? saved : "normal";
}

/** The server has no localStorage, so it always renders the middle setting. */
export function serverPace(): Pace {
  return "normal";
}

const paceListeners = new Set<() => void>();

export function subscribePace(listener: () => void): () => void {
  paceListeners.add(listener);
  return () => paceListeners.delete(listener);
}

export function setPace(pace: Pace): void {
  window.localStorage.setItem(PACE_KEY, pace);
  // Takes effect mid-sentence, so trying a speed does not mean replaying first.
  if (element) applyPace(element, pace);
  for (const listener of paceListeners) listener();
}

/* ------------------------------------------------------- 기기 음성 (대비책) */

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  for (const tag of VOICE_ORDER) {
    const hit = voices.find((v) => v.lang.replace("_", "-").startsWith(tag));
    if (hit) return hit;
  }
  return null;
}

function speakOnDevice(text: string, onEnd?: () => void): boolean {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? VOICE_ORDER[0];
  utterance.rate = RATE[readPace()];
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
  return true;
}

/* -------------------------------------------------------------- 서버 음성 */

/**
 * One element for the life of the page. Browsers only let audio play off a user
 * gesture, and `speak` is always called from a click — reusing the element that
 * was first created inside one keeps later plays allowed even though the bytes
 * arrive after an await.
 */
let element: HTMLAudioElement | null = null;

/** Blob URLs by phrase, so replaying a line does not even reach the server. */
const played = new Map<string, string>();

/** Bumped on every call so a slow fetch cannot interrupt a newer one. */
let turn = 0;

async function fetchAudio(text: string): Promise<string> {
  const cached = played.get(text);
  if (cached) return cached;

  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`speak route returned ${res.status}`);

  const url = URL.createObjectURL(await res.blob());
  played.set(text, url);
  return url;
}

/* ---------------------------------------------------------------- 공개 API */

export function speechSupported(): boolean {
  return typeof window !== "undefined";
}

/**
 * Read `text` aloud in the accent Yap is teaching. Returns false only when
 * there is no browser at all, so callers can hide the control.
 *
 * `onEnd` fires when playback finishes, whichever voice ended up producing it.
 */
export function speak(text: string, onEnd?: () => void): boolean {
  if (!speechSupported()) return false;

  const mine = ++turn;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  // Created here, inside the click, rather than at module load.
  if (!element) element = new Audio();
  const audio = element;
  audio.pause();

  void fetchAudio(text)
    .then((url) => {
      if (mine !== turn) return;
      audio.src = url;
      applyPace(audio, readPace());
      audio.onended = () => {
        if (mine === turn) onEnd?.();
      };
      audio.onerror = () => {
        if (mine === turn && !speakOnDevice(text, onEnd)) onEnd?.();
      };
      return audio.play();
    })
    .catch((err) => {
      if (mine !== turn) return;
      console.warn("[speak] falling back to the device voice", err);
      if (!speakOnDevice(text, onEnd)) onEnd?.();
    });

  return true;
}
