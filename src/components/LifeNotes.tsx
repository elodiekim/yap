"use client";

import { useState } from "react";
import { dismissLifeNote } from "@/lib/store";
import type { LifeNote } from "@/lib/types";
import { Card, SectionLabel } from "./ui";

/**
 * What Yap has picked up from the learner's own answers, as opposed to
 * `About` — which they sat down and wrote themselves. Quiet by design: no
 * card at all when there is nothing to show, and each note is removable the
 * same way a wrong correction is (§5.20) — the model's judgement of what is
 * "worth remembering" will not always be right.
 */
export function LifeNotes({ notes }: { notes: LifeNote[] }) {
  const [busy, setBusy] = useState<number | null>(null);

  if (notes.length === 0) return null;

  async function remove(id: number) {
    setBusy(id);
    try {
      await dismissLifeNote(id);
    } catch {
      // The row is still there; nothing to reconcile.
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <SectionLabel en="Yap remembers" ko="기억하고 있는 것" />
      <p className="ko mt-2 text-[13px] leading-relaxed text-muted">
        답변에서 알게 된 것들이에요. 다음 질문에 계속 반영됩니다. 틀렸거나 더
        기억할 필요 없으면 지우세요.
      </p>
      <ul className="mt-3 space-y-1.5">
        {notes.map((n) => (
          <li
            key={n.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-hair bg-sunk px-3 py-2 text-[14px] leading-relaxed text-body"
          >
            <span className="ko">{n.note}</span>
            <button
              onClick={() => remove(n.id)}
              disabled={busy === n.id}
              className="ko shrink-0 text-[12px] text-faint hover:text-flag focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              지우기
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
