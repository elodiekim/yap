import { NextResponse } from "next/server";
import { friendlyError, generateJSON } from "@/lib/llm";
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
      // Reasoning shares this budget with the response on both providers, so
      // leave headroom or the JSON gets truncated.
      maxTokens: 16000,
    });

    return NextResponse.json(feedback);
  } catch (err) {
    console.error("[/api/coach]", err);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
