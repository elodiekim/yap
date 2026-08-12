import { NextResponse } from "next/server";
import { dailyRequestLimit } from "@/lib/pricing";
import { readUsage, speakRequestsToday } from "@/lib/repo";
import { TTS_MODEL, voiceDailyLimit } from "@/lib/tts";
import type { UsageReport } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Voice is split from the conversation figures because it is a different model
 * on a far tighter free tier — ten a day against hundreds. Rolling them into
 * one number would hide whichever ran out.
 */
function voiceBudget(): UsageReport["voice"] {
  const byModel = speakRequestsToday();
  const used = byModel[TTS_MODEL] ?? 0;
  const spare = Object.entries(byModel)
    .filter(([model]) => model !== TTS_MODEL)
    .reduce((n, [, count]) => n + count, 0);

  return { used, limit: voiceDailyLimit(), spare };
}

export async function GET(req: Request) {
  // The browser passes its own calendar date so "today" matches the streak.
  const day = new URL(req.url).searchParams.get("day") ?? "";
  const { daily, models } = readUsage();

  const today = daily.find((d) => d.day === day) ?? {
    day,
    requests: 0,
    voiceRequests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
  };

  const month = day.slice(0, 7);
  const thisMonth = daily.filter((d) => d.day.startsWith(month));

  const report: UsageReport = {
    today,
    month: {
      requests: thisMonth.reduce((n, d) => n + d.requests, 0),
      tokens: thisMonth.reduce(
        (n, d) => n + d.inputTokens + d.outputTokens,
        0,
      ),
      cost: thisMonth.some((d) => d.cost === null)
        ? null
        : thisMonth.reduce((n, d) => n + (d.cost ?? 0), 0),
    },
    daily,
    models,
    dailyRequestLimit: dailyRequestLimit(),
    voice: voiceBudget(),
  };

  return NextResponse.json(report);
}
