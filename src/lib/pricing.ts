/**
 * Token prices, USD per 1M tokens, paid tier.
 *
 * Checked against ai.google.dev/gemini-api/docs/pricing and Anthropic's
 * pricing page on 2026-07-26. These are hardcoded, so they go stale — an
 * unknown model reports tokens with no cost rather than guessing.
 *
 * Thinking tokens bill at the output rate on both providers.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "gemini-3.6-flash": { input: 1.5, output: 7.5 },
  "gemini-3.5-flash": { input: 1.5, output: 9.0 },
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
  "gemini-3-flash-preview": { input: 1.5, output: 7.5 },
  "claude-opus-5": { input: 5.0, output: 25.0 },
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

export function knownModel(model: string): boolean {
  return model in PRICES;
}

/** USD for one call. Returns null when the model has no price on file. */
export function costOf(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  const p = PRICES[model];
  if (!p) return null;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/**
 * Free-tier requests per day. The API reports `limit: 20` for gemini-3.6-flash
 * but Google publishes the real number only in the AI Studio dashboard, so
 * this is a display hint and overridable, not a rule the app enforces.
 */
export function dailyRequestLimit(): number | null {
  const raw = process.env.FREE_TIER_DAILY_REQUESTS;
  if (raw === "off") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 20;
}
