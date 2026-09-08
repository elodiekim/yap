import { NextResponse } from "next/server";
import { dismissLifeNote, readProfile } from "@/lib/repo";

export const runtime = "nodejs";

/**
 * The learner removing something Yap auto-remembered about them (§5.20) —
 * wrong, stale, or just not something they want fed back into questions.
 * No model call: this is the app being told, not asking.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  dismissLifeNote(Number(id));
  return NextResponse.json({ profile: readProfile() });
}
