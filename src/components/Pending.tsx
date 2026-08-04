"use client";

import { useEffect, useState } from "react";
import { fetchPending, gradeSession, today, type Badge } from "@/lib/store";
import { topicKo, topicLabel } from "@/lib/topics";
import type { PendingAnswer } from "@/lib/types";
import { Button, Card, SectionLabel, Thinking } from "./ui";

/**
 * The other end of a session that ran out of requests (§5.9).
 *
 * This is what makes "내일 이어서" real rather than a phrase: the answer they
 * wrote is already saved and already counted, and the one thing still missing
 * is one call away. It sits above the topic grid because continuing something
 * unfinished beats starting something new.
 */
export function Pending({
  onBadges,
  onOpenSession,
}: {
  onBadges: (b: Badge[]) => void;
  onOpenSession: (id: number) => void;
}) {
  const [answer, setAnswer] = useState<PendingAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPending().then((a) => {
      if (!cancelled) setAnswer(a);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!answer) return null;

  async function grade() {
    if (!answer || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const { badges } = await gradeSession(answer.id);
      if (badges.length) onBadges(badges);
      onOpenSession(answer.id);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const when = answer.practisedOn === today() ? "조금 전에" : "지난번에";

  return (
    <Card className="animate-rise p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <SectionLabel en="Pick up where you left off" ko="이어서 하기" />
        <span className="ko shrink-0 text-[13px] text-faint">
          {topicLabel(answer.topic)} · {topicKo(answer.topic)}
        </span>
      </div>
      <p className="ko mt-2.5 text-[15px] leading-relaxed text-ink">
        {when} 쓴 답변이 피드백을 기다리고 있어요.
      </p>
      <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-muted">
        {answer.answer}
      </p>
      {failed ? (
        <p className="ko mt-2.5 text-[13px] text-muted">
          아직 요청이 안 열렸어요. 답변은 그대로 있으니 조금 뒤에 다시
          눌러보세요.
        </p>
      ) : null}
      <div className="mt-4">
        {busy ? (
          <Thinking label="답변을 읽고 있어요…" />
        ) : (
          <Button onClick={grade}>피드백 받기</Button>
        )}
      </div>
    </Card>
  );
}
