/**
 * Spoken English, generated rather than synthesised on the device.
 *
 * The browser's own speech synthesis was the first implementation, and on this
 * machine it resolved to macOS "Karen" every time — an en-AU voice from the
 * concatenative era. Slowing it to 0.92 for shadowing made the joins audible.
 * A learner repeating after a robot learns a robot's rhythm.
 *
 * So the audio comes from Gemini's TTS model instead. That turns every play
 * into a metered request, which would be unaffordable for a feature whose whole
 * point is listening to the same line five times — hence the cache below. A
 * phrase is generated once, ever. Replays are file reads.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { ENGLISH_VARIANT, speakerHome, type EnglishVariant } from "./english";
import { isRateLimit, type Usage } from "./llm";

/**
 * TTS models to try, best first.
 *
 * The free tier is far tighter here than on the conversation model — measured
 * 2026-08-13, `gemini-3.1-flash-tts` refuses the eleventh request of the day
 * ("limit: 10"), and waiting does not help, so it is a daily ceiling and not a
 * per-minute one. One feedback card is two or three shadowing lines plus three
 * expressions, so a single learner can exhaust it before lunch.
 *
 * Each model carries its own quota, so falling through to the next buys a
 * second allowance for nothing. `gemini-2.5-pro-preview-tts` is not in the list
 * because the free tier reports "limit: 0" for it — it would only ever be a
 * wasted round trip.
 */
export const TTS_MODELS: string[] = [
  ...new Set([
    process.env.GEMINI_TTS_MODEL ?? "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts",
  ]),
];

/** What the cache is keyed on: the preferred voice, not whichever answered. */
export const TTS_MODEL = TTS_MODELS[0];

/**
 * Gemini's prebuilt voices are not tied to an accent — the language code and
 * the style instruction carry that. Aoede reads warm and level, which suits a
 * line meant to be repeated rather than performed.
 */
const VOICE = process.env.GEMINI_TTS_VOICE ?? "Aoede";

/**
 * Only "en-AU" and "en-US" are used. New Zealand has no language code of its
 * own here, so the nz variant rides en-AU and leans on the style line — which
 * is how the accent was actually reaching the model anyway.
 */
function languageCode(variant: EnglishVariant): string {
  return variant === "us" ? "en-US" : "en-AU";
}

/**
 * Asking for a slow read was a mistake. The first version said "warm and
 * unhurried, at a pace a language learner can repeat after" and produced 124
 * words per minute against roughly 150 for ordinary speech — which the learner
 * heard as "너무 느린데".
 *
 * Pace is not really steerable from here, though. Measured on the same
 * sentence, 2026-08-13:
 *
 *   "unhurried, a pace a learner can repeat after"   124 wpm
 *   "the pace you would say it to a friend"          195 wpm
 *   "ordinary conversational pace — around 150 wpm"  199 wpm
 *
 * Naming a number moved it by four words a minute. So this asks for a natural
 * read, takes the ~200 wpm that comes back as the baseline, and lets the
 * player's speed control do the actual work — which costs nothing per play.
 */
function styleLine(variant: EnglishVariant): string {
  return [
    `Read the following aloud in a natural ${speakerHome(variant)} accent.`,
    "Warm and even, at an ordinary conversational pace — around 150 words per",
    "minute. Do not slow down for a learner, and do not rush.",
    "Read it exactly as written. Do not add, greet, explain or comment.",
  ].join(" ");
}

/**
 * Bump when `styleLine` changes how the audio sounds.
 *
 * The cache key is built from the text and the voice, not the instruction —
 * so without this, rewriting the line above would leave every phrase already
 * on disk reading at the old pace forever.
 */
const STYLE_VERSION = "3";

/* ------------------------------------------------------------------- 캐시 */

const CACHE_DIR = path.join(process.cwd(), "data", "audio");

/**
 * The model, voice and style version are in the key, not just the text:
 * changing any of them has to produce new audio rather than serve the old
 * reading from disk.
 *
 * Playback speed is deliberately NOT in the key. The player changes that for
 * nothing, so three speeds would be three times the requests for one phrase.
 */
function cacheKey(text: string, variant: EnglishVariant): string {
  const parts = [
    TTS_MODEL,
    VOICE,
    languageCode(variant),
    variant,
    STYLE_VERSION,
    text,
  ];
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

async function readCache(key: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(CACHE_DIR, `${key}.wav`));
  } catch {
    return null;
  }
}

async function writeCache(key: string, wav: Buffer): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${key}.wav`), wav);
  } catch (err) {
    // A cache that cannot be written is a slower app, not a broken one.
    console.error("[tts] could not cache audio", err);
  }
}

/* -------------------------------------------------------------------- WAV */

/**
 * The model returns `audio/l16` — raw little-endian 16-bit PCM with no
 * container, which no `<audio>` element will play. Forty-four bytes of RIFF
 * header in front of it is the whole conversion.
 */
function wav(pcm: Buffer, sampleRate: number, channels: number): Buffer {
  const bits = 16;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // format 1 = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bits) / 8, 28); // byte rate
  header.writeUInt16LE((channels * bits) / 8, 32); // block align
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** `audio/l16; rate=24000; channels=1` — the numbers are worth reading back. */
function describe(mime: string | undefined): { rate: number; channels: number } {
  return {
    rate: Number(/rate=(\d+)/.exec(mime ?? "")?.[1] ?? 24000),
    channels: Number(/channels=(\d+)/.exec(mime ?? "")?.[1] ?? 1),
  };
}

/* -------------------------------------------------------------------- 생성 */

let client: GoogleGenAI | null = null;

function gemini(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "No Gemini API key found. Add GEMINI_API_KEY to .env.local and restart the dev server.",
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface Spoken {
  wav: Buffer;
  /** Null when the phrase was already on disk — nothing was spent. */
  usage: Usage | null;
}

/**
 * Generations that have not landed on disk yet, by cache key.
 *
 * Without this, tapping the same line twice in quick succession spends the key
 * twice: the second request arrives before the first has written its file, so
 * it misses the cache and generates the identical audio again. Measured on
 * 2026-08-13 — four requests had produced three files.
 */
const inFlight = new Map<string, Promise<Spoken>>();

/**
 * Playable WAV bytes for `text`, from disk if it has been said before.
 *
 * Note `response_format: { type: "audio" }` carries no `mime_type`: passing one
 * is rejected outright ("Audio mime_type is not supported in response_format",
 * 400, measured 2026-08-13), so the format is whatever the model returns.
 */
export async function speakServerSide(
  text: string,
  variant: EnglishVariant = ENGLISH_VARIANT,
): Promise<Spoken> {
  const key = cacheKey(text, variant);
  const hit = await readCache(key);
  if (hit) return { wav: hit, usage: null };

  const running = inFlight.get(key);
  // A second listener rides the first request's audio and is billed nothing.
  if (running) return { wav: (await running).wav, usage: null };

  const pending = generate(text, variant, key);
  inFlight.set(key, pending);
  try {
    return await pending;
  } finally {
    inFlight.delete(key);
  }
}

/** `interactions.create` is overloaded with a streaming form we never ask for. */
type NonStreamingInteraction = Extract<
  Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>>,
  { output_audio?: unknown }
>;

/**
 * Walks `TTS_MODELS` until one produces audio.
 *
 * Only a rate limit moves on to the next model — a 400 or a 404 would fail the
 * same way on all of them, and retrying would just spend the other model's
 * allowance to arrive at the same error.
 */
async function firstModelThatAnswers(
  text: string,
  variant: EnglishVariant,
): Promise<{ interaction: NonStreamingInteraction; model: string }> {
  let lastError: unknown;

  for (const model of TTS_MODELS) {
    try {
      const interaction = await gemini().interactions.create({
        model,
        input: `${styleLine(variant)}\n\n${text}`,
        response_format: { type: "audio" },
        generation_config: {
          speech_config: [{ voice: VOICE, language: languageCode(variant) }],
        },
      });
      return { interaction, model };
    } catch (err) {
      if (!isRateLimit(err)) throw err;
      console.warn(`[tts] ${model} is out of quota, trying the next voice`);
      lastError = err;
    }
  }

  throw lastError;
}

async function generate(
  text: string,
  variant: EnglishVariant,
  key: string,
): Promise<Spoken> {
  const { interaction, model } = await firstModelThatAnswers(text, variant);

  const audio = interaction.output_audio;
  if (!audio?.data) {
    throw new Error("Gemini returned no audio. Please try again.");
  }

  const { rate, channels } = describe(audio.mime_type);
  const bytes = wav(
    Buffer.from(audio.data, "base64"),
    audio.sample_rate ?? rate,
    audio.channels ?? channels,
  );
  await writeCache(key, bytes);

  const u = interaction.usage;
  return {
    wav: bytes,
    usage: {
      model,
      inputTokens: Number(u?.total_input_tokens ?? 0),
      outputTokens: Number(u?.total_output_tokens ?? 0),
      thoughtTokens: Number(u?.total_thought_tokens ?? 0),
    },
  };
}
