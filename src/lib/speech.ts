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
  // Slightly under natural pace — this is for repeating after, not listening to.
  utterance.rate = 0.92;
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
