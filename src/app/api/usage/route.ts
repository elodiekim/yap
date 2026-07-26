import { NextResponse } from "next/server";
import { dailyRequestLimit } from "@/lib/pricing";
import { readUsage } from "@/lib/repo";
import type { UsageReport } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // The browser passes its own calendar date so "today" matches the streak.
  const day = new URL(req.url).searchParams.get("day") ?? "";
  const { daily, models } = readUsage();

  const today = daily.find((d) => d.day === day) ?? {
    day,
    requests: 0,
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
  };

  return NextResponse.json(report);
}
