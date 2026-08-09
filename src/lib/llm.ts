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

function keyName(): string {
  return provider() === "claude" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY";
}

function modelName(): string {
  return provider() === "claude" ? "ANTHROPIC_MODEL" : "GEMINI_MODEL";
}

/**
 * Turns a provider error into one Korean sentence a person can act on.
 *
 * The old version fell through to `err.message`, which meant a red card in the
 * middle of an English lesson reading
 * `400 API error occurred: {"httpMeta":{"response":{},"request":{}}}`.
 * Nothing in that string helps, and English error text breaks the app's own
 * language rule (설명은 한국어) at the worst possible moment.
 *
 * Status is the signal, not the text — measured against the SDK on 2026-08-09:
 *
 *   wrong key   → BadRequestError, status 400, message with no detail at all
 *   wrong model → NotFoundError,   status 404, message that actually explains
 *
 * The raw error is never sent to the browser. Every route console.errors it
 * first, and the terminal running `npm run dev` is two feet away (§3).
 */
export function friendlyError(err: unknown): { message: string; status: number } {
  const status =
    typeof (err as { status?: number } | null)?.status === "number"
      ? (err as { status: number }).status
      : 0;
  const text = err instanceof Error ? err.message : "";

  // Our own pre-flight throw, before any request goes out.
  if (/api[_ ]?key/i.test(text)) {
    return {
      message: `AI 키가 없어요. .env.local에 ${keyName()}를 넣고 서버를 다시 시작해주세요.`,
      status: 401,
    };
  }

  if (isRateLimit(err)) {
    return {
      message:
        "요청이 잠시 막혔어요. 분당 한도에 걸렸을 수 있으니 조금 뒤에 다시 해보세요.",
      status: 429,
    };
  }

  if (status === 401 || status === 403) {
    return {
      message: `AI 키가 거절됐어요. .env.local의 ${keyName()}를 확인하고 서버를 다시 시작해주세요.`,
      status,
    };
  }

  // A 400 here is nearly always the key, since the request itself is built by
  // this app and does not vary. "대개는" rather than a flat claim — guessing
  // with confidence is how the usage card ended up 25x wrong.
  if (status === 400) {
    return {
      message: `AI가 요청을 거절했어요. 대개는 키 문제라, .env.local의 ${keyName()}를 먼저 확인해보세요.`,
      status,
    };
  }

  if (status === 404) {
    return {
      message: `설정한 모델을 찾을 수 없어요. .env.local의 ${modelName()}를 확인해주세요.`,
      status,
    };
  }

  if (status >= 500) {
    return {
      message: "AI 쪽에 문제가 생겼어요. 잠시 뒤에 다시 해보세요.",
      status,
    };
  }

  if (/timeout|timed out|aborted|ECONNRESET|fetch failed|network/i.test(text)) {
    return {
      message: "응답이 오래 걸리거나 연결이 끊겼어요. 잠시 뒤에 다시 해보세요.",
      status: 504,
    };
  }

  return {
    message:
      "지금은 응답을 받지 못했어요. 잠시 뒤에 다시 해보세요. (자세한 내용은 터미널에 찍혀 있어요)",
    status: status || 500,
  };
}
