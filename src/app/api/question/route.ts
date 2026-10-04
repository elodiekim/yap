import { NextResponse } from "next/server";
import {
  friendlyError,
  generateJSON,
  questionModel,
  worthRetryingElsewhere,
} from "@/lib/llm";
import { PROMPT_SCHEMA } from "@/lib/schemas";
import {
  QUESTION_SYSTEM,
  QUESTION_SYSTEM_EASY,
  profileBrief,
  reviveBlock,
} from "@/lib/prompts";
import {
  expressionsToRevive,
  logUsage,
  readProfile,
  recentQuestions,
} from "@/lib/repo";
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

    const revive = expressionsToRevive();
    const userParts = [
      `Topic: ${topicLabel(topic)}`,
      "",
      "Learner profile:",
      profileBrief(profile),
    ];
    userParts.push(...reviveBlock(revive));
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

    const call = {
      system: easy ? QUESTION_SYSTEM_EASY : QUESTION_SYSTEM,
      user: userParts.join("\n"),
      schema: PROMPT_SCHEMA,
      // "low" was fast but too shallow to catch a repeated hook across a list
      // of past questions — that needs a moment to actually compare them, not
      // just answer. "medium" is what was verified to work (§5.19).
      effort: "medium" as const,
      maxTokens: 6000,
    };

    const override = questionModel();
    let result;
    try {
      // Low retry budget on the override attempt: if it is the one having a
      // bad day, the time is better spent switching models (below) than
      // waiting through same-model backoff that measured outages this week
      // outlasted anyway.
      result = await generateJSON<Prompt>({
        ...call,
        model: override,
        maxRetries: override ? 1 : undefined,
      });
    } catch (err) {
      // The override model having a bad day (measured live, §5.19 addendum)
      // is not a reason to lose the question entirely — the plain default
      // model is very unlikely to be down at the same moment. Only worth
      // trying when there is actually a different model to fall back to.
      if (!override || !worthRetryingElsewhere(err)) throw err;
      console.warn(`[question] ${override} failed, falling back to the default model`, err);
      result = await generateJSON<Prompt>(call);
    }

    const { data: prompt, usage } = result;
    logUsage(body.practisedOn ?? today(), "question", usage);
    return NextResponse.json(prompt);
  } catch (err) {
    console.error("[/api/question]", err);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
