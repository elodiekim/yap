import { NextResponse } from "next/server";
import { friendlyError, generateJSON } from "@/lib/llm";
import { PROMPT_SCHEMA } from "@/lib/schemas";
import {
  QUESTION_SYSTEM,
  QUESTION_SYSTEM_EASY,
  profileBrief,
} from "@/lib/prompts";
import { logUsage, readProfile, recentQuestions } from "@/lib/repo";
import { today } from "@/lib/stats";
import { topicLabel } from "@/lib/topics";
import type { Mode, Prompt } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      topic?: string;
      practisedOn?: string;
      mode?: Mode;
      /** The question being walked away from — it is not in the DB yet. */
      avoid?: string;
    };
    const topic = body.topic;
    const easy = body.mode === "easy";
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    // The learner's history comes from the database, not the request body.
    const profile = readProfile();
    const pastQuestions = recentQuestions(topic);
    if (body.avoid?.trim()) pastQuestions.push(body.avoid.trim());

    const userParts = [
      `Topic: ${topicLabel(topic)}`,
      "",
      "Learner profile:",
      profileBrief(profile),
    ];
    if (pastQuestions.length > 0) {
      userParts.push(
        "",
        "Questions already asked on this topic, oldest first:",
        ...pastQuestions.map((q) => `- ${q}`),
      );
    }
    if (body.avoid?.trim()) {
      userParts.push(
        "",
        "They read the last question in that list and could not think of anything to say, so they asked for a different one. Do not rescue it with a rephrasing — ask about something else on this topic, smaller and more concrete.",
      );
    }
    userParts.push(
      "",
      "Ask your one open-ended question about this topic, with idea hints.",
    );

    const { data: prompt, usage } = await generateJSON<Prompt>({
      system: easy ? QUESTION_SYSTEM_EASY : QUESTION_SYSTEM,
      user: userParts.join("\n"),
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
