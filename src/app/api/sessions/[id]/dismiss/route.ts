import { NextResponse } from "next/server";
import { dismissMistake, readProfile } from "@/lib/repo";

export const runtime = "nodejs";

/**
 * "이건 아닌 것 같아요" — the learner rejecting one correction (§5.12).
 * No model call: this is the app being told it was wrong, not asking.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { index?: number };
  if (typeof body.index !== "number") {
    return NextResponse.json({ error: "index is required" }, { status: 400 });
  }

  const feedback = dismissMistake(Number(id), body.index);
  if (!feedback) {
    return NextResponse.json(
      { error: "지울 항목을 찾지 못했어요." },
      { status: 404 },
    );
  }
  return NextResponse.json({ feedback, profile: readProfile() });
}
