import { NextResponse } from "next/server";
import { friendlyError, generateJSON } from "@/lib/llm";
import { EASY_FEEDBACK_SCHEMA, FEEDBACK_SCHEMA } from "@/lib/schemas";
import { COACH_SYSTEM, COACH_SYSTEM_EASY, profileBrief } from "@/lib/prompts";
import { logUsage, readProfile, saveSession } from "@/lib/repo";
import { countWords, today } from "@/lib/stats";
import { topicLabel } from "@/lib/topics";
import type { Feedback, Mode } from "@/lib/types";

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
      schema: mode === "easy" ? EASY_FEEDBACK_SCHEMA : FEEDBACK_SCHEMA,
      effort: "medium",
      // Reasoning shares this budget with the response on both providers, so
      // leave headroom or the JSON gets truncated.
      maxTokens: 16000,
    });

    const day = body.practisedOn ?? today();
    logUsage(day, "coach", usage);

    // Persist before responding: if the browser is closed between receiving
    // feedback and saving it, the practice is gone. Writing here closes that gap.
    const saved = saveSession({
      topic,
      question,
      answer: answer.trim(),
      words: countWords(answer),
      // The browser knows the learner's calendar date; the server may be on UTC.
      practisedOn: day,
      mode,
      feedback,
    });

    return NextResponse.json({
      feedback,
      profile: saved.profile,
      badges: saved.badges,
    });
  } catch (err) {
    console.error("[/api/coach]", err);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
