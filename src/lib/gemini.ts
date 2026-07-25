import { GoogleGenAI } from "@google/genai";
import type { GenerateOptions } from "./llm";

/**
 * gemini-3.6-flash is the model the free tier covers. Pro models moved to
 * paid-only, so don't switch this without checking your quota in AI Studio.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

let cached: GoogleGenAI | null = null;

function gemini(): GoogleGenAI {
  if (!cached) {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "No Gemini API key found. Add GEMINI_API_KEY to .env.local and restart the dev server.",
      );
    }
    cached = new GoogleGenAI({ apiKey });
  }
  return cached;
}

export async function generateJSONWithGemini<T>(
  opts: GenerateOptions,
): Promise<T> {
  const interaction = await gemini().interactions.create({
    model: GEMINI_MODEL,
    system_instruction: opts.system,
    input: opts.user,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: opts.schema,
    },
    generation_config: {
      thinking_level: opts.effort ?? "medium",
      max_output_tokens: opts.maxTokens ?? 8000,
    },
  });

  const text = interaction.output_text;
  if (!text) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Gemini returned something unreadable. Please try again.");
  }
}
