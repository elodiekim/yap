import { NextResponse } from "next/server";
import { friendlyError } from "@/lib/llm";
import { logUsage } from "@/lib/repo";
import { today } from "@/lib/stats";
import { speakServerSide } from "@/lib/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

/** A shadowing line or an expression. Anything longer is not this feature. */
const TEXT_MAX = 400;

/**
 * Set TTS=system in .env.local to go back to the browser's own voice and stop
 * spending requests on audio.
 */
function serverSideVoice(): boolean {
  return process.env.TTS !== "system";
}

export async function POST(req: Request) {
  try {
    if (!serverSideVoice()) {
      return NextResponse.json({ error: "기기 음성을 쓰도록 설정돼 있어요." }, { status: 501 });
    }

    const body = (await req.json()) as { text?: string; practisedOn?: string };
    const text = body.text?.trim().slice(0, TEXT_MAX) ?? "";
    if (!text) {
      return NextResponse.json({ error: "읽을 문장이 없어요." }, { status: 400 });
    }

    const { wav, usage } = await speakServerSide(text);
    // Null when it came off disk — logging a request that never went out would
    // make the usage card overstate what the key actually cost.
    if (usage) logUsage(body.practisedOn ?? today(), "speak", usage);

    return new NextResponse(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": "private, max-age=31536000, immutable",
        // Lets the client show whether the key was spent on this play.
        "X-Yap-Cached": usage ? "miss" : "hit",
      },
    });
  } catch (err) {
    console.error("[/api/speak]", err);
    const { message, status } = friendlyError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
