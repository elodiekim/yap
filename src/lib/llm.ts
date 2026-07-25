/**
 * Provider-neutral entry point for the two API routes.
 *
 * Switch providers with LLM_PROVIDER in .env.local:
 *   LLM_PROVIDER=gemini   (default — Google AI Studio has a free tier)
 *   LLM_PROVIDER=claude   (Anthropic — pay as you go, no free tier)
 */

export type Effort = "low" | "medium" | "high";

export interface GenerateOptions {
  system: string;
  user: string;
  /** JSON Schema the response must conform to. */
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
}

export type Provider = "gemini" | "claude";

export function provider(): Provider {
  return process.env.LLM_PROVIDER === "claude" ? "claude" : "gemini";
}

export async function generateJSON<T>(opts: GenerateOptions): Promise<T> {
  if (provider() === "claude") {
    const { generateJSONWithClaude } = await import("./claude");
    return generateJSONWithClaude<T>(opts);
  }
  const { generateJSONWithGemini } = await import("./gemini");
  return generateJSONWithGemini<T>(opts);
}

/** Turns a provider error into something worth showing a learner. */
export function friendlyError(err: unknown): { message: string; status: number } {
  const status =
    typeof (err as { status?: number } | null)?.status === "number"
      ? (err as { status: number }).status
      : 500;

  if (!(err instanceof Error)) {
    return { message: "Something went wrong. Please try again.", status };
  }

  const text = err.message;

  if (/api[_ ]?key|API key|authentication|unauthenticated|permission/i.test(text)) {
    return {
      message:
        provider() === "claude"
          ? "No Anthropic API key found. Add ANTHROPIC_API_KEY to .env.local and restart the dev server."
          : "No Gemini API key found. Add GEMINI_API_KEY to .env.local and restart the dev server.",
      status: 401,
    };
  }

  if (status === 429 || /rate limit|quota|RESOURCE_EXHAUSTED/i.test(text)) {
    return {
      message:
        "Hit the free-tier rate limit. Wait a minute and try again — or check your quota in Google AI Studio.",
      status: 429,
    };
  }

  return { message: text, status };
}
