import { NextResponse } from "next/server";
import { friendlyError, generateJSON } from "@/lib/llm";
import { PROMPT_SCHEMA } from "@/lib/schemas";
import { QUESTION_SYSTEM, profileBrief } from "@/lib/prompts";
import { logUsage, readProfile } from "@/lib/repo";
import { today } from "@/lib/stats";
import { topicLabel } from "@/lib/topics";
import type { Prompt } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { topic?: string; practisedOn?: string };
    const topic = body.topic;
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    // The learner's history comes from the database, not the request body.
    const profile = readProfile();

    const { data: prompt, usage } = await generateJSON<Prompt>({
      system: QUESTION_SYSTEM,
      user: [
        `Topic: ${topicLabel(topic)}`,
        "",
        "Learner profile:",
        profileBrief(profile),
        "",
        "Ask your one open-ended question about this topic, with idea hints.",
      ].join("\n"),
      schema: PROMPT_SCHEMA,
      effort: "low",
      maxTokens: 6000,
    });

    logUsage(body.practisedOn ?? today(), "question", usage);
    return NextResponse.json(prompt);
  } catch (err) {
    console.error("[/api/question]", err);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
