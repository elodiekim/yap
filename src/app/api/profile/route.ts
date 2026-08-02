import { NextResponse } from "next/server";
import {
  ABOUT_MAX,
  importLegacy,
  isEmpty,
  readProfile,
  resetAll,
  saveAbout,
} from "@/lib/repo";
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

export async function PATCH(req: Request) {
  const body = (await req.json()) as { about?: string };
  if (typeof body.about !== "string") {
    return NextResponse.json({ error: "about is required" }, { status: 400 });
  }
  return NextResponse.json(saveAbout(body.about.slice(0, ABOUT_MAX)));
}

export async function DELETE() {
  resetAll();
  return NextResponse.json(readProfile());
}
