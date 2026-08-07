import { NextResponse } from "next/server";
import {
  friendlyError,
  generateJSON,
  isRateLimit,
  rateLimitWall,
  type Wall,
} from "@/lib/llm";
import { EASY_FEEDBACK_SCHEMA, FEEDBACK_SCHEMA } from "@/lib/schemas";
import { COACH_SYSTEM, COACH_SYSTEM_EASY, profileBrief } from "@/lib/prompts";
import {
  dailyQuotaSpent,
  logUsage,
  readProfile,
  saveSession,
  saveUngraded,
} from "@/lib/repo";
import { countWords, today } from "@/lib/stats";
import { topicLabel } from "@/lib/topics";
import type { Feedback, Mode } from "@/lib/types";
import type { SessionInput } from "@/lib/repo";

export const runtime = "nodejs";
export const maxDuration = 300;

interface HistoryTurn {
  question: string;
  answer: string;
}

export async function POST(req: Request) {
  /**
   * The answer, held aside until the grading call returns.
   *
   * If that call fails there is nothing to save it with, and the old code
   * simply dropped it — so a rate limit on the fourth answer cost the writing,
   * the streak and the day. Keeping it here means the catch below can still
   * bank it. Cleared once the feedback is in hand, so a failure *after*
   * generation can never overwrite good feedback with an ungraded row (§5.9).
   */
  let unsaved: Omit<SessionInput, "feedback"> | null = null;

  try {
    const body = (await req.json()) as {
      topic?: string;
      question?: string;
      answer?: string;
      history?: HistoryTurn[];
      practisedOn?: string;
      mode?: Mode;
    };

    const { topic, question, answer } = body;
    if (!topic || !question || !answer?.trim()) {
      return NextResponse.json(
        { error: "topic, question and answer are required" },
        { status: 400 },
      );
    }

    const mode: Mode = body.mode === "easy" ? "easy" : "normal";
    const day = body.practisedOn ?? today();
    unsaved = {
      topic,
      question,
      answer: answer.trim(),
      words: countWords(answer),
      // The browser knows the learner's calendar date; the server may be on UTC.
      practisedOn: day,
      mode,
    };

    const profile = readProfile();
    const history = (body.history ?? []).slice(-4);

    const transcript = history.length
      ? history
          .map(
            (h, i) =>
              `Turn ${i + 1}\nYou asked: ${h.question}\nThey answered: ${h.answer}`,
          )
          .join("\n\n")
      : "(this is the first turn of the session)";

    const { data: feedback, usage } = await generateJSON<Feedback>({
      system: mode === "easy" ? COACH_SYSTEM_EASY : COACH_SYSTEM,
      user: [
        `Topic: ${topicLabel(topic)}`,
        "",
        "Learner profile:",
        profileBrief(profile, false),
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
      schema: mode === "easy" ? EASY_FEEDBACK_SCHEMA : FEEDBACK_SCHEMA,
      effort: "medium",
      // Reasoning shares this budget with the response on both providers, so
      // leave headroom or the JSON gets truncated.
      maxTokens: 16000,
    });

    const input = unsaved;
    unsaved = null;
    logUsage(day, "coach", usage);

    // Persist before responding: if the browser is closed between receiving
    // feedback and saving it, the practice is gone. Writing here closes that gap.
    const saved = saveSession({ ...input, feedback });

    return NextResponse.json({
      feedback,
      sessionId: saved.sessionId,
      profile: saved.profile,
      badges: saved.badges,
    });
  } catch (err) {
    console.error("[/api/coach]", err);

    /*
      The conversation is not allowed to end on an error toast, and after
      today's requests are gone there is no call left to end it gracefully
      with. So the graceful ending is made out of what we already have: their
      answer, saved, and a note that the feedback is the first thing waiting
      tomorrow. §5.9.
    */
    if (unsaved) {
      try {
        const banked = saveUngraded(unsaved);
        const limited = isRateLimit(err);
        const wall: Wall =
          limited && dailyQuotaSpent(unsaved.practisedOn)
            ? "day"
            : rateLimitWall(err);
        return NextResponse.json({
          paused: true,
          rateLimited: limited,
          wall,
          sessionId: banked.sessionId,
          profile: banked.profile,
          badges: banked.badges,
          detail: friendlyError(err).message,
        });
      } catch (saveErr) {
        console.error("[/api/coach] could not bank the answer:", saveErr);
      }
    }

    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
