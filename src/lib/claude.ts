import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5";

let cached: Anthropic | null = null;

export function claude(): Anthropic {
  if (!cached) {
    // Resolves ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / an `ant auth login`
    // profile) from the environment — never hardcode a key.
    cached = new Anthropic();
  }
  return cached;
}

/**
 * Runs a request with structured output and returns the parsed JSON.
 * Streams so that long generations never hit an HTTP timeout.
 */
export async function generateJSON<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  const stream = claude().messages.stream({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    output_config: {
      effort: opts.effort ?? "medium",
      format: { type: "json_schema", schema: opts.schema },
    },
    messages: [{ role: "user", content: opts.user }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      "Yap couldn't respond to that one. Try rephrasing your answer.",
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("The reply was cut short. Try a slightly shorter answer.");
  }

  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("No text content in model response.");
  }
  try {
    return JSON.parse(text.text) as T;
  } catch {
    throw new Error("Yap returned something unreadable. Please try again.");
  }
}
