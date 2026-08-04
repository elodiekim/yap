import { NextResponse } from "next/server";
import { pendingAnswer, pendingCount } from "@/lib/repo";

export const runtime = "nodejs";

/** Is anything the learner wrote still waiting on its feedback? (§5.9) */
export async function GET() {
  return NextResponse.json({
    answer: pendingAnswer(),
    total: pendingCount(),
  });
}
