import { NextResponse } from "next/server";
import { readSession } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = readSession(Number(id));
  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}
