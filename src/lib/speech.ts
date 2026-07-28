"use client";

import { PUBLIC_ENGLISH_VARIANT, voicePreference } from "./english";

const VOICE_ORDER = voicePreference(PUBLIC_ENGLISH_VARIANT);

/**
 * Voices load asynchronously, so read the list at click time rather than on
 * mount. Falls through the variant's preferred accents to any English; if the
 * device has none of them, `lang` alone still nudges the default voice.
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

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Read `text` aloud in the accent Yap is teaching. Returns false when the
 * browser has no speech synthesis, so callers can hide the control.
 */
export function speak(text: string, onEnd?: () => void): boolean {
  if (!speechSupported()) return false;
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
