import { NextResponse } from "next/server";
import { countSessions, listSessions } from "@/lib/repo";

export const runtime = "nodejs";

const PAGE = 30;

export async function GET(req: Request) {
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? 0);
  const sessions = listSessions(PAGE, Number.isFinite(offset) ? offset : 0);
  return NextResponse.json({ sessions, total: countSessions() });
}
