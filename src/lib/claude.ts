import Anthropic from "@anthropic-ai/sdk";
import type { GenerateOptions, Generated } from "./llm";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

let cached: Anthropic | null = null;

function claude(): Anthropic {
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
export async function generateJSONWithClaude<T>(
  opts: GenerateOptions,
): Promise<Generated<T>> {
  const stream = claude().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    system: [
      { type: "text", text: opts.system, cache_control: { type: "ephemeral" } },
    ],
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
  // Anthropic bills thinking within output_tokens rather than breaking it out,
  // so thoughtTokens stays 0 here and the cost maths still comes out right.
  const usage = {
    model: CLAUDE_MODEL,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    thoughtTokens: 0,
  };

  try {
    return { data: JSON.parse(text.text) as T, usage };
  } catch {
    throw new Error("Yap returned something unreadable. Please try again.");
  }
}
