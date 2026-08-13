"use client";

import { useEffect, useRef, useState } from "react";
import type { Feedback, Mode, Profile, Prompt, Turn } from "@/lib/types";
import { topicKo, topicLabel } from "@/lib/topics";
import {
  countWords,
  gradeSession,
  setProfile,
  today,
  type Badge,
} from "@/lib/store";
import { FeedbackView } from "./FeedbackView";
import { Button, Card, Meta, SectionLabel, Thinking } from "./ui";

interface Props {
  topic: string;
  mode: Mode;
  onBadges: (b: Badge[]) => void;
  onExit: () => void;
}

interface CoachResponse {
  feedback: Feedback;
  sessionId: number;
  profile: Profile;
  badges: Badge[];
}

/**
 * The grading call failed, but the answer is saved. Not an error response —
 * from the learner's side nothing was lost except the feedback, and that is
 * waiting for them (§5.9).
 */
interface PausedResponse {
  paused: true;
  rateLimited: boolean;
  wall: "day" | "minute" | "unknown";
  sessionId: number;
  profile: Profile;
  badges: Badge[];
  detail: string;
}

/**
 * In-flight opening-question requests, keyed by topic.
 *
 * React Strict Mode runs effects twice in development, and a cancelled flag in
 * the cleanup only discards the result — the request still goes out. That was
 * spending two Gemini calls per topic against a 20-a-day free tier. Sharing the
 * promise means the second invocation reuses the first request; clearing the
 * entry once it settles keeps a later visit to the same topic getting a fresh
 * question.
 */
const inFlight = new Map<string, Promise<Prompt>>();

function requestQuestion(
  topic: string,
  mode: Mode,
  avoid?: string,
): Promise<Prompt> {
  return fetch("/api/question", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // The route reads the learner's history from the database itself.
    body: JSON.stringify({ topic, mode, avoid, practisedOn: today() }),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "질문을 받아오지 못했어요.");
    return data as Prompt;
  });
}

function askQuestion(topic: string, mode: Mode): Promise<Prompt> {
  const key = `${mode}:${topic}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = requestQuestion(topic, mode);
  inFlight.set(key, request);
  // Settle-only cleanup; the caller owns the rejection, so swallow it here.
  request.catch(() => {}).finally(() => inFlight.delete(key));
  return request;
}

function hangulCount(text: string): number {
  return text.match(/[가-힣]/g)?.length ?? 0;
}

/**
 * The first run of Korean in the draft, with the English on either side of it.
 *
 * The run ends at whichever comes first: a sentence mark, or the point where
 * English starts again. Both matter — the original version took everything
 * from the first Hangul to the end of the draft, so writing
 * `I went to the beach. 파도가 무서웠어. But I stayed.` and asking for help
 * silently deleted "But I stayed." (§5.8).
 */
function koreanSpan(
  text: string,
): { before: string; span: string; after: string } | null {
  const start = text.search(/[가-힣]/);
  if (start < 0) return null;

  const rest = text.slice(start);
  const latin = rest.search(/[A-Za-z]/);
  const sentence = rest.search(/[.!?]/);
  const len =
    sentence >= 0 && (latin < 0 || sentence < latin)
      ? sentence + 1
      : latin >= 0
        ? latin
        : rest.length;

  return {
    before: text.slice(0, start),
    span: rest.slice(0, len).trim(),
    after: rest.slice(len),
  };
}

export function Session({ topic, mode, onBadges, onExit }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  /**
   * Asking for an easier question is the same admission as choosing the light
   * way in from home, so it lands in the same mode — and it stays there for the
   * rest of the session, because every follow-up from here is a small question
   * and grading a small question at the full bar is the trap §5.6 removed.
   */
  const [turnMode, setTurnMode] = useState<Mode>(mode);
  const [swapping, setSwapping] = useState(false);
  const [swapped, setSwapped] = useState(false);
  /** Korean set aside when the opener replaced it, kept visible to finish from. */
  const [korean, setKorean] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [paused, setPaused] = useState<PausedResponse | null>(null);
  const [resuming, setResuming] = useState(false);
  const [resumeFailed, setResumeFailed] = useState(false);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const easy = turnMode === "easy";
  // The floor is what made the app contradict its own slogan on tired days.
  const floor = easy ? 3 : 8;

  // Session is remounted (key={topic}) whenever the topic changes, so this
  // effect runs exactly once — the loading state is set in useState above
  // rather than synchronously here. `attempt` re-runs it after a failure.
  useEffect(() => {
    let cancelled = false;
    askQuestion(topic, mode)
      .then((p) => {
        if (!cancelled) setPrompt(p);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingPrompt(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topic, mode, attempt]);

  /**
   * The opening question is the one call with no way back: a 429 here left the
   * screen showing an error and nothing else, so the only way on was to leave
   * the topic and come back. Rate limits are routine on the free tier, so this
   * needs a button.
   */
  function retryQuestion() {
    setError(null);
    setLoadingPrompt(true);
    setAttempt((n) => n + 1);
  }

  /**
   * The first wall (§5.8): the hints did not land either. Trading the question
   * in costs a request, which is worth it — the alternative the learner reaches
   * for at this exact moment is closing the tab, and that costs the streak.
   */
  async function lighten() {
    if (!prompt || swapping) return;
    setSwapping(true);
    setError(null);
    try {
      const next = await requestQuestion(topic, "easy", prompt.question);
      setPrompt(next);
      setTurnMode("easy");
      setSwapped(true);
      setKorean(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSwapping(false);
    }
  }

  /**
   * The second wall: they know what to say, in Korean, and the English will not
   * come. One Korean run at a time, swapped in place, so the sentences they
   * already managed on either side survive.
   *
   * Still one sentence back and never the whole answer — a translated answer is
   * not practice, and the rest of the paragraph is the part they came here for.
   * Anything the sentence did not cover stays visible in the aside.
   */
  async function openInEnglish() {
    const part = prompt ? koreanSpan(draft) : null;
    if (!part || opening) return;
    setOpening(true);
    setError(null);
    try {
      const res = await fetch("/api/opener", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: prompt!.question,
          draft,
          korean: part.span,
          practisedOn: today(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "영어로 바꾸지 못했어요.");

      const english = (data.english as string).trim();
      const head = part.before.trimEnd();
      const tail = part.after.trimStart();
      const next = [head, english, tail].filter(Boolean).join(" ");

      setKorean(part.span);
      setDraft(tail ? next : `${next} `);
      // Land the caret right after the new sentence, which is where they are
      // now writing — not at the end, which may be a paragraph further on.
      const caret = (head ? head.length + 1 : 0) + english.length + 1;
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        const at = Math.min(caret, el.value.length);
        el.setSelectionRange(at, at);
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpening(false);
    }
  }

  /**
   * Try again for the feedback that was missed. Succeeding here puts the
   * conversation back exactly where it stopped — the answer is already saved,
   * so this only fills in the gap and hands back the next question.
   */
  async function resume() {
    if (!paused || resuming) return;
    setResuming(true);
    setResumeFailed(false);
    try {
      const { feedback, sessionId, badges } = await gradeSession(
        paused.sessionId,
      );
      setTurns((prev) =>
        prev.map((t, i) =>
          i === prev.length - 1 ? { ...t, feedback, sessionId } : t,
        ),
      );
      setPaused(null);
      setSwapped(false);
      setPrompt(feedback.followUp);
      if (badges.length) onBadges(badges);
    } catch {
      // Deliberately not an error card: the answer is safe either way, and the
      // page already says where to pick it up.
      setResumeFailed(true);
    } finally {
      setResuming(false);
    }
  }

  const words = countWords(draft);
  const hangul = hangulCount(draft);
  const solid = draft.replace(/\s/g, "").length;
  // Enough Korean to be worth translating — including a stall halfway through
  // a sentence they started in English.
  const offerOpener = hangul >= 4 && !grading;
  // Mostly Korean is not an answer yet, whatever the word count says. Only
  // "mostly", so that one Korean word inside an English sentence never locks
  // the button — being stuck at the door is the thing this screen exists to fix.
  const stillKorean = solid > 0 && hangul / solid > 0.5;
  const canSubmit = words >= floor && !stillKorean && !grading && !!prompt;
  // Only while the box is empty: someone with a draft is not stuck, and this
  // way trading the question in can never throw away something they wrote.
  const offerSwap = !swapped && solid === 0;

  async function submit() {
    if (!prompt || !canSubmit) return;
    setGrading(true);
    setError(null);
    const answer = draft.trim();

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          question: prompt.question,
          answer,
          history: turns.map((t) => ({ question: t.question, answer: t.answer })),
          mode: turnMode,
          // The server is on UTC; the streak counts the learner's calendar day.
          practisedOn: today(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "피드백을 받아오지 못했어요.");

      const turn: Turn = {
        id: crypto.randomUUID(),
        sessionId: null,
        topic,
        question: prompt.question,
        meaning: prompt.meaning,
        hints: prompt.hints,
        answer,
        words,
        feedback: null,
        createdAt: new Date().toISOString(),
      };

      // The answer got saved but not graded. Close the day deliberately rather
      // than leaving a red box on top of a live composer (§5.9).
      if ((data as PausedResponse).paused) {
        const p = data as PausedResponse;
        setTurns((prev) => [...prev, { ...turn, sessionId: p.sessionId }]);
        setDraft("");
        setKorean(null);
        setPrompt(null);
        setPaused(p);
        setProfile(p.profile);
        if (p.badges.length) onBadges(p.badges);
        return;
      }

      const { feedback, sessionId, profile: saved, badges } = data as CoachResponse;
      setTurns((prev) => [...prev, { ...turn, feedback, sessionId }]);
      setDraft("");
      setKorean(null);
      setSwapped(false); // a new question gets its own way out
      setPrompt(feedback.followUp);

      // The route already wrote the session; this only mirrors the result.
      setProfile(saved);
      if (badges.length) onBadges(badges);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGrading(false);
    }
  }

  // Land on the feedback that was just written, not the next question —
  // jumping straight to the live prompt skipped past it entirely.
  useEffect(() => {
    if (turns.length > 0) {
      lastTurnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [turns.length]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-32 pt-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-hair pb-4">
        <div className="flex flex-wrap items-center gap-x-3">
          <span className="text-[15px] font-semibold text-ink">
            {topicLabel(topic)}
          </span>
          <span className="ko text-[13px] text-muted">{topicKo(topic)}</span>
          {easy ? <Meta accent>가볍게</Meta> : null}
          {turns.length > 0 ? <Meta>답변 {turns.length}개</Meta> : null}
        </div>
        <Button variant="quiet" onClick={onExit}>
          ← 오늘은 여기까지
        </Button>
      </div>

      {turns.map((turn, i) => (
        <div
          key={turn.id}
          ref={i === turns.length - 1 ? lastTurnRef : undefined}
          className="mb-14 space-y-3 scroll-mt-6"
        >
          <AskedQuestion
            question={turn.question}
            meaning={turn.meaning}
            index={i + 1}
          />
          <YourAnswer text={turn.answer} words={turn.words} />
          {turn.feedback ? (
            <FeedbackView
              feedback={turn.feedback}
              sessionId={turn.sessionId ?? undefined}
              onFeedbackChange={(feedback) =>
                setTurns((prev) =>
                  prev.map((t) => (t.id === turn.id ? { ...t, feedback } : t)),
                )
              }
            />
          ) : null}
        </div>
      ))}

      <div>
        {paused ? (
          <PausedCard
            paused={paused}
            busy={resuming}
            failed={resumeFailed}
            onResume={resume}
            onExit={onExit}
          />
        ) : loadingPrompt ? (
          <Card className="p-5">
            <Thinking label="질문을 만들고 있어요…" />
          </Card>
        ) : prompt ? (
          <div className="space-y-3">
            <AskedQuestion
              question={prompt.question}
              meaning={prompt.meaning}
              index={turns.length + 1}
              live
            />
            <HintCard hints={prompt.hints} />
            {offerSwap ? (
              <WayOut onSwap={lighten} busy={swapping} easy={easy} />
            ) : null}
            {korean ? (
              <KoreanAside text={korean} onClose={() => setKorean(null)} />
            ) : null}
            <Composer
              inputRef={inputRef}
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              words={words}
              grading={grading}
              canSubmit={canSubmit}
              floor={floor}
              easy={easy}
              stillKorean={stillKorean}
              offerOpener={offerOpener}
              opening={opening}
              onOpener={openInEnglish}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <Card tone="bg-flag-soft" className="mt-4 border-flag/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="ko text-[14px] text-flag">{error}</p>
            {prompt ? null : (
              <Button variant="ghost" onClick={retryQuestion}>
                다시 시도
              </Button>
            )}
          </div>
          {prompt ? (
            <p className="ko mt-1.5 text-[13px] text-muted">
              쓰신 답변은 그대로 있으니 잠시 뒤 다시 제출해보세요.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function AskedQuestion({
  question,
  meaning,
  index,
  live = false,
}: {
  question: string;
  meaning?: string;
  index: number;
  live?: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="animate-rise">
      <p className="text-[13px] tabular-nums text-faint">
        Question {index}
        {live ? <span className="ml-2 text-accent">지금 차례</span> : null}
      </p>
      <p className="mt-1.5 text-[22px] font-semibold leading-snug text-ink sm:text-[26px]">
        {question}
      </p>
      {meaning ? (
        shown ? (
          <p className="ko mt-2 text-[15px] leading-relaxed text-muted">
            {meaning}
          </p>
        ) : (
          <button
            onClick={() => setShown(true)}
            className="ko mt-2 text-[13px] text-faint underline-offset-4 transition-colors hover:text-body hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            무슨 뜻이죠?
          </button>
        )
      ) : null}
    </div>
  );
}

function HintCard({ hints }: { hints: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <Card tone="bg-accent-soft" className="border-accent-line p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-2 text-left"
      >
        <SectionLabel en="Need ideas?" ko="할 말이 안 떠오르면" />
        <span className="shrink-0 text-[13px] text-muted">
          {open ? "접기" : "펼치기"}
        </span>
      </button>
      {/*
        Collapsing with grid rows keeps the hints in the DOM so the height can
        animate, which also keeps them in the accessibility tree — hide them
        explicitly or a screen reader reads out a panel that looks shut.
      */}
      <div
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {hints.map((h, i) => (
              <li
                key={i}
                className="animate-fade rounded-md border border-accent-line bg-card px-2.5 py-1 text-[13px] text-ink"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {h}
              </li>
            ))}
          </ul>
          <p className="ko mt-3 text-[13px] text-muted">
            이 중 하나만 골라서 이야기를 시작해도 충분해요.
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Kept deliberately plain and set below the hints — this is the door you find
 * after the hints failed, not a second button competing with them.
 */
function WayOut({
  onSwap,
  busy,
  easy,
}: {
  onSwap: () => void;
  busy: boolean;
  easy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
      <p className="ko text-[13px] text-muted">
        힌트를 봐도 안 떠오르나요?
      </p>
      {busy ? (
        <Thinking label="다른 질문을 찾는 중이에요…" />
      ) : (
        <button
          onClick={onSwap}
          className="ko rounded-md text-[13px] text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {easy ? "다른 질문으로 →" : "더 쉬운 질문으로 →"}
        </button>
      )}
    </div>
  );
}

/**
 * The end of a session that ran out of requests.
 *
 * Rule 3 of this app is that the conversation never ends — and after the day's
 * quota is gone there is no call left to end it gracefully with. So the ending
 * is built from what is already in hand: their answer, saved, counted, and a
 * plain statement of where the feedback will be waiting. §5.9.
 */
function PausedCard({
  paused,
  busy,
  failed,
  onResume,
  onExit,
}: {
  paused: PausedResponse;
  busy: boolean;
  failed: boolean;
  onResume: () => void;
  onExit: () => void;
}) {
  const tomorrow = paused.rateLimited && paused.wall === "day";
  return (
    <Card className="animate-rise p-5">
      <SectionLabel
        en={tomorrow ? "That's today" : "Paused"}
        ko={tomorrow ? "오늘은 여기까지" : "잠시 멈췄어요"}
      />
      <p className="ko mt-2.5 text-[15px] leading-relaxed text-ink">
        방금 쓴 답변은 저장했어요. <strong className="font-semibold">오늘 연습으로 기록됐고, 연속 학습일도 이어집니다.</strong>
      </p>
      <p className="ko mt-2 text-[14px] leading-relaxed text-muted">
        {!paused.rateLimited
          ? "다만 피드백을 받아오지 못했어요. 잠시 뒤에 다시 받아보거나, 홈에서 이어서 받아도 됩니다."
          : tomorrow
            ? "오늘 쓸 수 있는 AI 요청을 다 썼습니다. 피드백은 내일 홈에서 첫 순서로 기다리고 있어요."
            : "AI 요청이 잠시 막혔어요. 조금 뒤에 다시 받아보거나, 홈에서 이어서 받아도 됩니다."}
      </p>
      {failed ? (
        <p className="ko mt-2 text-[13px] text-muted">
          아직 안 열렸네요. 답변은 그대로 저장돼 있으니 홈에서 이어서 받으면
          됩니다.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {busy ? (
          <Thinking label="답변을 읽고 있어요…" />
        ) : (
          <>
            <Button
              variant={tomorrow ? "ghost" : "primary"}
              onClick={onResume}
            >
              지금 피드백 받아보기
            </Button>
            <Button variant="quiet" onClick={onExit}>
              홈으로
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

/** What they wrote in Korean, parked where they can finish translating it. */
function KoreanAside({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <Card tone="bg-sunk" className="animate-rise p-4">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel en="What you meant" ko="내가 쓰려던 말" />
        <button
          onClick={onClose}
          className="ko shrink-0 text-[13px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          닫기
        </button>
      </div>
      <p className="ko mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-body">
        {text}
      </p>
      <p className="ko mt-2.5 text-[13px] text-muted">
        이 부분을 영어로 바꿔 넣었어요. 못 담긴 내용이 있으면 여기 보면서 이어서
        써보세요.
      </p>
    </Card>
  );
}

function YourAnswer({ text, words }: { text: string; words: number }) {
  return (
    <Card tone="bg-sunk" className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel en="Your answer" ko="내가 쓴 답" />
        <span className="text-[13px] tabular-nums text-faint">
          {words} words
        </span>
      </div>
      <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-relaxed text-body">
        {text}
      </p>
    </Card>
  );
}

function Composer({
  inputRef,
  value,
  onChange,
  onSubmit,
  words,
  grading,
  canSubmit,
  floor,
  easy,
  stillKorean,
  offerOpener,
  opening,
  onOpener,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  words: number;
  grading: boolean;
  canSubmit: boolean;
  floor: number;
  easy: boolean;
  stillKorean: boolean;
  offerOpener: boolean;
  opening: boolean;
  onOpener: () => void;
}) {
  return (
    <Card className="p-4">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
        }}
        disabled={grading}
        rows={easy ? 3 : 8}
        placeholder={
          easy
            ? "영어로 한 문장이면 됩니다. 그거면 오늘 몫은 다 한 거예요."
            : "영어로 3~10문장 정도 써보세요. 틀려도 괜찮으니 일단 끝까지 써보는 게 중요해요."
        }
        className="w-full resize-y rounded-lg bg-transparent text-[16px] leading-[1.85] text-ink outline-none placeholder:text-faint disabled:opacity-60"
      />
      {/*
        The other half of "생각이 안 나요": they thought of it, in Korean, and
        the English will not come. One run at a time is a push off the wall; a
        whole translation would take the practice away.

        Named for the action, not the position — it was "첫 문장 만들기", which
        read as something you only use before you start writing. The learner
        asked for exactly this feature while it was sitting on their screen.
      */}
      {offerOpener ? (
        <div className="animate-fade mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-accent-line bg-accent-soft px-3 py-2.5">
          <p className="ko text-[13px] text-body">
            한국어로 쓴 데가 있네요. 한 군데씩 영어로 바꿔 드릴게요.
          </p>
          {opening ? (
            <Thinking label="영어로 옮기는 중이에요…" />
          ) : (
            <button
              onClick={onOpener}
              className="ko shrink-0 rounded-md text-[13px] font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              이 부분 영어로 →
            </button>
          )}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-3">
        <p className="ko text-[13px] text-muted">
          {stillKorean ? (
            <>영어로 옮기고 나면 제출할 수 있어요</>
          ) : words < floor ? (
            <>{floor - words}단어만 더 쓰면 제출할 수 있어요</>
          ) : easy ? (
            <>
              {words} words · 이거면 충분해요 ·{" "}
              <kbd className="rounded border border-hair-strong bg-sunk px-1 py-0.5 text-[11px]">
                ⌘↵
              </kbd>{" "}
              로 제출
            </>
          ) : (
            <>
              {words} words ·{" "}
              <kbd className="rounded border border-hair-strong bg-sunk px-1 py-0.5 text-[11px]">
                ⌘↵
              </kbd>{" "}
              로 제출
            </>
          )}
        </p>
        {grading ? (
          <Thinking label="답변을 읽고 있어요…" />
        ) : (
          <Button onClick={onSubmit} disabled={!canSubmit}>
            피드백 받기
          </Button>
        )}
      </div>
    </Card>
  );
}
