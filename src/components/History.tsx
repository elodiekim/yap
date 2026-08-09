"use client";

import { useEffect, useState } from "react";
import type { Feedback, SessionDetail, SessionSummary } from "@/lib/types";
import { topicKo, topicLabel } from "@/lib/topics";
import { gradeSession } from "@/lib/store";
import { FeedbackView } from "./FeedbackView";
import { Button, Card, Meta, SectionLabel, Thinking } from "./ui";

/** "2026-07-26" → "7월 26일 (일)" */
function pretty(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${day})`;
}

export function History({
  onExit,
  initialSession = null,
}: {
  onExit: () => void;
  /** Set when arriving from an expression, to open that session directly. */
  initialSession?: number | null;
}) {
  const [open, setOpen] = useState<number | null>(initialSession);
  return open === null ? (
    <SessionList onOpen={setOpen} onExit={onExit} />
  ) : (
    <SessionPage id={open} onBack={() => setOpen(null)} />
  );
}

/* ------------------------------------------------------------------ 목록 */

function SessionList({
  onOpen,
  onExit,
}: {
  onOpen: (id: number) => void;
  onExit: () => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: { sessions: SessionSummary[]; total: number }) => {
        if (cancelled) return;
        setSessions(d.sessions);
        setTotal(d.total);
      })
      .catch(() => {
        if (!cancelled) setError("기록을 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The route pages at 30. Without this the list just stopped there while the
  // count above it said otherwise, and older sessions were unreachable.
  async function loadMore() {
    if (!sessions) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/sessions?offset=${sessions.length}`);
      const d = (await res.json()) as {
        sessions: SessionSummary[];
        total: number;
      };
      setSessions([...sessions, ...d.sessions]);
      setTotal(d.total);
    } catch {
      setError("더 불러오지 못했어요.");
    } finally {
      setLoadingMore(false);
    }
  }

  // Sessions arrive newest-first; group them under their day.
  const byDay = new Map<string, SessionSummary[]>();
  for (const s of sessions ?? []) {
    const list = byDay.get(s.practisedOn);
    if (list) list.push(s);
    else byDay.set(s.practisedOn, [s]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[24px] font-semibold">
          Past sessions
          <span className="ko ml-2 text-[15px] font-normal text-muted">
            지난 연습
          </span>
        </h1>
        <Button variant="quiet" onClick={onExit}>
          홈으로
        </Button>
      </div>

      {error ? <p className="ko mt-6 text-[14px] text-flag">{error}</p> : null}

      {sessions === null && !error ? (
        <div className="mt-8">
          <Thinking label="불러오는 중" />
        </div>
      ) : null}

      {sessions?.length === 0 ? (
        <Card className="mt-8 p-5">
          <p className="ko text-[14px] leading-relaxed text-muted">
            아직 연습 기록이 없습니다. 홈에서 토픽을 하나 고르면 여기에 쌓이기
            시작합니다.
          </p>
        </Card>
      ) : null}

      {sessions && sessions.length > 0 ? (
        <>
          <p className="ko mt-2 text-[13px] text-muted">
            전체 {total}회 중 {sessions.length}회 보는 중
          </p>
          <div className="mt-6 space-y-8">
            {[...byDay.entries()].map(([day, list], di) => (
              <section
                key={day}
                className="animate-rise"
                style={{ animationDelay: `${di * 40}ms` }}
              >
                <h2 className="ko text-[13px] font-medium text-muted">
                  {pretty(day)}
                </h2>
                <ul className="mt-2.5 space-y-2">
                  {list.map((s) => (
                    <li key={s.id}>
                      <SessionRow session={s} onOpen={onOpen} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {sessions.length < total ? (
            <div className="mt-8 flex justify-center">
              <Button
                variant="ghost"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? "불러오는 중…"
                  : `더 보기 (${total - sessions.length}회 남음)`}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SessionRow({
  session: s,
  onOpen,
}: {
  session: SessionSummary;
  onOpen: (id: number) => void;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold text-ink">
          {s.topic ? topicLabel(s.topic) : "기록"}
          {s.topic ? (
            <span className="ko ml-2 text-[13px] font-normal text-muted">
              {topicKo(s.topic)}
            </span>
          ) : null}
        </span>
        <span className="ko shrink-0 text-[12px] text-faint">
          {/* "실수 0" on an ungraded answer would read as a flawless one. */}
          {s.wordCount}단어 ·{" "}
          {s.graded || s.imported ? (
            <>실수 {s.mistakeCount}</>
          ) : (
            <span className="text-accent">피드백 대기</span>
          )}
        </span>
      </div>
      {s.preview ? (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
          {s.preview}…
        </p>
      ) : (
        <p className="ko mt-1.5 text-[13px] text-faint">
          이전된 기록 — 통계만 남아 있고 대화 내용은 없습니다
        </p>
      )}
    </>
  );

  // Imported rows have nothing to open, so they are not buttons.
  if (s.imported) {
    return (
      <div className="rounded-card border border-dashed border-hair bg-card/60 p-4">
        {body}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpen(s.id)}
      // Same lift as the topic cards — these two look identical, so only one
      // of them moving would read as a bug rather than a choice. See the note
      // there on why the transition lists `translate` and not `transform`.
      className="w-full rounded-card border border-hair bg-card p-4 text-left shadow-card transition-[translate,border-color,box-shadow] duration-200 ease-spring hover:-translate-y-0.5 hover:border-hair-strong hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {body}
    </button>
  );
}

/**
 * An answer whose feedback never arrived (§5.9). The practice already counted;
 * this is only the missing half, and it is one request away.
 */
function Ungraded({
  id,
  onGraded,
}: {
  id: number;
  onGraded: (feedback: Feedback) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function grade() {
    setBusy(true);
    setFailed(false);
    try {
      const { feedback } = await gradeSession(id);
      onGraded(feedback);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <SectionLabel en="Not graded yet" ko="피드백 대기 중" />
      <p className="ko mt-2.5 text-[14px] leading-relaxed text-muted">
        이 답변은 저장됐지만 피드백을 못 받았어요. 이 연습은 이미 기록에
        들어가 있고, 여기서 이어서 받으면 됩니다.
      </p>
      {failed ? (
        <p className="ko mt-2 text-[13px] text-muted">
          아직 요청이 안 열렸어요. 조금 뒤에 다시 눌러보세요.
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

/* ------------------------------------------------------------------ 상세 */

function SessionPage({ id, onBack }: { id: number; onBack: () => void }) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        return (await r.json()) as SessionDetail;
      })
      .then((d) => {
        if (!cancelled) setSession(d);
      })
      .catch(() => {
        if (!cancelled) setError("이 기록을 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-6">
      <Button variant="quiet" onClick={onBack}>
        ← 목록으로
      </Button>

      {error ? <p className="ko mt-6 text-[14px] text-flag">{error}</p> : null}
      {!session && !error ? (
        <div className="mt-8">
          <Thinking label="불러오는 중" />
        </div>
      ) : null}

      {session ? (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Meta>{pretty(session.practisedOn)}</Meta>
            {session.topic ? <Meta>{topicKo(session.topic)}</Meta> : null}
            <Meta>{session.wordCount}단어</Meta>
            {session.level ? <Meta accent>{session.level}</Meta> : null}
          </div>

          <Card className="animate-rise p-5">
            <p className="ko text-[13px] text-muted">받은 질문</p>
            <p className="mt-1.5 text-[16px] leading-relaxed text-ink">
              {session.question}
            </p>
            <p className="ko mt-4 text-[13px] text-muted">내가 쓴 답변</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.8] text-body">
              {session.answer}
            </p>
          </Card>

          {session.feedback ? (
            <FeedbackView
              feedback={session.feedback}
              sessionId={session.id}
              onFeedbackChange={(feedback) =>
                setSession({ ...session, feedback })
              }
            />
          ) : !session.imported ? (
            <Ungraded
              id={session.id}
              onGraded={(feedback) => setSession({ ...session, feedback })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
