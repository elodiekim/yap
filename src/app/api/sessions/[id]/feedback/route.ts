import { NextResponse } from "next/server";
import { friendlyError, generateJSON } from "@/lib/llm";
import { EASY_FEEDBACK_SCHEMA, FEEDBACK_SCHEMA } from "@/lib/schemas";
import { COACH_SYSTEM, COACH_SYSTEM_EASY, profileBrief } from "@/lib/prompts";
import {
  attachFeedback,
  logUsage,
  pendingAnswer,
  readProfile,
} from "@/lib/repo";
import { today } from "@/lib/stats";
import { topicLabel } from "@/lib/topics";
import type { Feedback } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Feedback for an answer that was written earlier and never graded — the other
 * half of the paused session in §5.9. The answer is already in the database and
 * already counted toward the day; this only fills in what the rate limit ate.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sessionId = Number(id);
    const body = (await req.json().catch(() => ({}))) as {
      practisedOn?: string;
    };
    const pending = pendingAnswer(sessionId);
    if (!pending) {
      return NextResponse.json(
        { error: "이 답변은 이미 피드백을 받았어요." },
        { status: 404 },
      );
    }

    const profile = readProfile();
    const easy = pending.mode === "easy";

    const { data: feedback, usage } = await generateJSON<Feedback>({
      system: easy ? COACH_SYSTEM_EASY : COACH_SYSTEM,
      user: [
        `Topic: ${topicLabel(pending.topic)}`,
        "",
        "Learner profile:",
        profileBrief(profile, false),
        "",
        "Earlier in this session:",
        "(this is the first turn of the session)",
        "",
        "--- CURRENT TURN ---",
        `Your question: ${pending.question}`,
        "",
        "Their answer:",
        pending.answer,
        "",
        // They wrote this yesterday and came back for it; a "you're late"
        // opening would punish exactly the person who returned.
        "They wrote this answer earlier and are only now able to hear back. Do not mention the delay, do not apologise for it, and do not treat it as old — greet the answer as it is.",
        "",
        "Now give your feedback.",
      ].join("\n"),
      schema: easy ? EASY_FEEDBACK_SCHEMA : FEEDBACK_SCHEMA,
      effort: "medium",
      maxTokens: 16000,
    });

    logUsage(body.practisedOn ?? today(), "coach", usage);

    const saved = attachFeedback(sessionId, feedback);
    if (!saved) {
      return NextResponse.json(
        { error: "이 답변은 이미 피드백을 받았어요." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      feedback,
      sessionId,
      profile: saved.profile,
      badges: saved.badges,
    });
  } catch (err) {
    console.error("[/api/sessions/:id/feedback]", err);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
