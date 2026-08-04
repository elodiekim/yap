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

/**
 * What a call cost, as reported by the provider in the response we already
 * paid for. Reading it is free — there is no extra request.
 */
export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Reasoning tokens. Billed at the output rate on both providers. */
  thoughtTokens: number;
}

export interface Generated<T> {
  data: T;
  usage: Usage;
}

export function provider(): Provider {
  return process.env.LLM_PROVIDER === "claude" ? "claude" : "gemini";
}

export async function generateJSON<T>(
  opts: GenerateOptions,
): Promise<Generated<T>> {
  if (provider() === "claude") {
    const { generateJSONWithClaude } = await import("./claude");
    return generateJSONWithClaude<T>(opts);
  }
  const { generateJSONWithGemini } = await import("./gemini");
  return generateJSONWithGemini<T>(opts);
}

/** Which wall a request hit, as far as we can tell. */
export type Wall = "day" | "minute" | "unknown";

export function isRateLimit(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  const text = err instanceof Error ? err.message : "";
  return status === 429 || /rate limit|quota|RESOURCE_EXHAUSTED/i.test(text);
}

/**
 * Best-effort only. Google names the quota it refused in the error body, so a
 * per-day metric is a strong signal — but the shape of that body is not
 * something this app can pin down, so anything unrecognised stays "unknown"
 * and the copy has to work without knowing (§5.9).
 */
export function rateLimitWall(err: unknown): Wall {
  const text = err instanceof Error ? err.message : "";
  if (/per[_ ]?day|requests_per_day|daily/i.test(text)) return "day";
  if (/per[_ ]?minute|requests_per_minute/i.test(text)) return "minute";
  return "unknown";
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
