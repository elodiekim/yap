import { NextResponse } from "next/server";
import { listExpressions } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ expressions: listExpressions() });
}
