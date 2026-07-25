import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/claude";
import { FEEDBACK_SCHEMA } from "@/lib/schemas";
import { COACH_SYSTEM, profileBrief } from "@/lib/prompts";
import { topicLabel } from "@/lib/topics";
import { EMPTY_PROFILE, type Feedback, type Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface HistoryTurn {
  question: string;
  answer: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      topic?: string;
      question?: string;
      answer?: string;
      history?: HistoryTurn[];
      profile?: Profile;
    };

    const { topic, question, answer } = body;
    if (!topic || !question || !answer?.trim()) {
      return NextResponse.json(
        { error: "topic, question and answer are required" },
        { status: 400 },
      );
    }

    const profile = { ...EMPTY_PROFILE, ...(body.profile ?? {}) };
    const history = (body.history ?? []).slice(-4);

    const transcript = history.length
      ? history
          .map(
            (h, i) =>
              `Turn ${i + 1}\nYou asked: ${h.question}\nThey answered: ${h.answer}`,
          )
          .join("\n\n")
      : "(this is the first turn of the session)";

    const feedback = await generateJSON<Feedback>({
      system: COACH_SYSTEM,
      user: [
        `Topic: ${topicLabel(topic)}`,
        "",
        "Learner profile:",
        profileBrief(profile),
        "",
        "Earlier in this session:",
        transcript,
        "",
        "--- CURRENT TURN ---",
        `Your question: ${question}`,
        "",
        "Their answer:",
        answer.trim(),
        "",
        "Now give your feedback.",
      ].join("\n"),
      schema: FEEDBACK_SCHEMA,
      effort: "medium",
      // Thinking is on by default on Opus 5 and shares this budget with the
      // response, so leave generous headroom or the JSON gets truncated.
      maxTokens: 16000,
    });

    return NextResponse.json(feedback);
  } catch (err) {
    console.error("[/api/coach]", err);
    return NextResponse.json({ error: message(err) }, { status: status(err) });
  }
}

function message(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("api_key") || err.message.includes("authentication")) {
      return "No Anthropic API key found. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.";
    }
    return err.message;
  }
  return "Something went wrong.";
}

function status(err: unknown): number {
  const s = (err as { status?: number } | null)?.status;
  return typeof s === "number" ? s : 500;
}
