"use client";

import {
  PUBLIC_ENGLISH_VARIANT,
  preferredVoiceNames,
  voicePreference,
} from "./english";

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

/**
 * Set NEXT_PUBLIC_SPEECH_VOICE to a name from the browser's own list to pin one
 * — the only way to override a choice the API gives no other handle on.
 */
const NAMED = process.env.NEXT_PUBLIC_SPEECH_VOICE?.trim();

function byName(
  voices: SpeechSynthesisVoice[],
  name: string,
): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.name.toLowerCase().startsWith(name.toLowerCase()));
}

function inAccent(voice: SpeechSynthesisVoice): boolean {
  const lang = voice.lang.replace("_", "-");
  return VOICE_ORDER.some((tag) => lang.startsWith(tag));
}

/**
 * Pinned name, then the machine's own choice, then a known modern voice, then
 * anything in the right accent.
 *
 * The second step is the one that matters. Matching on "(Premium)" does not
 * work — see `preferredVoiceNames` — but the voice flagged `default` is the one
 * chosen in System Settings › Spoken Content › System Voice, and that flag does
 * tell the two Karens apart (measured 2026-08-13: the upgraded one came back
 * `default: true`, the compact one `false`). Someone who went and installed a
 * better voice has already said which one they want; the app should not argue.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  if (NAMED) {
    const pinned = byName(voices, NAMED);
    if (pinned) return pinned;
  }

  // Only when it speaks the variety being taught — a US system voice must not
  // override Australian English (rule 6).
  const chosen = voices.find((v) => v.default && inAccent(v));
  if (chosen) return chosen;

  for (const name of preferredVoiceNames(PUBLIC_ENGLISH_VARIANT)) {
    const hit = byName(voices, name);
    if (hit) return hit;
  }

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

/* --------------------------------------------------- 어떤 목소리가 났는가 */

/**
 * Which voice the last play used, and — for the device voice — whether that was
 * the plan.
 *
 * Falling back is silent by design: an error card in the middle of shadowing is
 * worse than a plain voice. But silent turned out to mean invisible, and when
 * the ten-a-day ran out the learner just heard a different voice and asked why
 * some lines "안 되는" 것 같은지. So a fallback says so.
 *
 * `chosen` exists because that note then started lying the other way. With
 * `TTS=system` every play is the device voice on purpose, and a line reading
 * "오늘 한도를 다 썼거나" turned a working setting into an apparent fault.
 * Only `fallback` is worth telling anyone about.
 */
export type VoiceSource = "server" | "chosen" | "fallback";

let voice: VoiceSource = "server";
const voiceListeners = new Set<() => void>();

export function readVoice(): VoiceSource {
  return voice;
}

export function serverVoice(): VoiceSource {
  return "server";
}

export function subscribeVoice(listener: () => void): () => void {
  voiceListeners.add(listener);
  return () => voiceListeners.delete(listener);
}

function usedVoice(source: VoiceSource): void {
  if (voice === source) return;
  voice = source;
  for (const listener of voiceListeners) listener();
}

/** The route answering 501: the app is configured to use the device voice. */
class ServerVoiceOff extends Error {}

/**
 * Remembered after the first 501, so `TTS=system` costs one round trip per page
 * rather than one per tap.
 */
let serverVoiceOff = false;

async function fetchAudio(text: string): Promise<string> {
  const cached = played.get(text);
  if (cached) return cached;
  if (serverVoiceOff) throw new ServerVoiceOff();

  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (res.status === 501) {
    serverVoiceOff = true;
    throw new ServerVoiceOff();
  }
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
      // Assigning src re-runs the load algorithm even when the URL is
      // unchanged, so a second listen restarts from the top on its own —
      // verified in headless Chrome on 2026-08-13 rather than assumed.
      audio.src = url;
      applyPace(audio, readPace());
      audio.onended = () => {
        if (mine === turn) onEnd?.();
      };
      audio.onerror = () => {
        if (mine !== turn) return;
        usedVoice("fallback");
        if (!speakOnDevice(text, onEnd)) onEnd?.();
      };
      usedVoice("server");
      return audio.play();
    })
    .catch((err) => {
      if (mine !== turn) return;
      const chosen = err instanceof ServerVoiceOff;
      if (!chosen) console.warn("[speak] falling back to the device voice", err);
      usedVoice(chosen ? "chosen" : "fallback");
      if (!speakOnDevice(text, onEnd)) onEnd?.();
    });

  return true;
}
