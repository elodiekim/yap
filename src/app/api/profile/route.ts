import { NextResponse } from "next/server";
import { importLegacy, isEmpty, readProfile, resetAll } from "@/lib/repo";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(readProfile());
}

/**
 * One-time migration of a localStorage profile.
 *
 * Refuses once the database has any session, so a stale copy left in another
 * browser can never overwrite or double-count real practice.
 */
export async function PUT(req: Request) {
  const body = (await req.json()) as { profile?: Profile };
  if (!body.profile) {
    return NextResponse.json({ error: "profile is required" }, { status: 400 });
  }
  if (!isEmpty()) {
    return NextResponse.json(
      { imported: false, reason: "database already has sessions" },
      { status: 409 },
    );
  }
  const { sessions } = importLegacy(body.profile);
  return NextResponse.json({
    imported: true,
    sessions,
    profile: readProfile(),
  });
}

export async function DELETE() {
  resetAll();
  return NextResponse.json(readProfile());
}
