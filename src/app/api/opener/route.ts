import { NextResponse } from "next/server";
import { friendlyError, generateJSON } from "@/lib/llm";
import { OPENER_SCHEMA } from "@/lib/schemas";
import { OPENER_SYSTEM } from "@/lib/prompts";
import { logUsage } from "@/lib/repo";
import { today } from "@/lib/stats";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Enough Korean to be worth a call, not a stray particle in an English draft. */
const MIN_HANGUL = 4;
const DRAFT_MAX = 1200;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      question?: string;
      draft?: string;
      practisedOn?: string;
    };
    const draft = body.draft?.trim().slice(0, DRAFT_MAX) ?? "";
    const hangul = draft.match(/[가-힣]/g)?.length ?? 0;
    if (hangul < MIN_HANGUL) {
      return NextResponse.json(
        { error: "한국어로 쓴 내용이 있어야 첫 문장을 만들 수 있어요." },
        { status: 400 },
      );
    }

    const { data, usage } = await generateJSON<{ english: string }>({
      system: OPENER_SYSTEM,
      user: [
        `The question they were asked: ${body.question ?? "(unknown)"}`,
        "",
        "What they wrote, in Korean:",
        draft,
        "",
        "Give the first sentence of that answer in English.",
      ].join("\n"),
      schema: OPENER_SCHEMA,
      effort: "low",
      // One sentence out, but reasoning shares the budget on both providers.
      maxTokens: 3000,
    });

    logUsage(body.practisedOn ?? today(), "opener", usage);
    return NextResponse.json({ english: data.english.trim() });
  } catch (err) {
    console.error("[/api/opener]", err);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
