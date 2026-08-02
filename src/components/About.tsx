"use client";

import { useState } from "react";
import { saveAbout } from "@/lib/store";
import { Button, Card, SectionLabel } from "./ui";

const MAX = 400;

/**
 * A couple of lines about the learner's life, so nine topics can ask more than
 * nine questions. Optional on purpose — an empty box must never block practice,
 * and this app's whole argument is that friction is the enemy.
 */
export function About({ value }: { value: string }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveAbout(draft);
      setEditing(false);
    } catch {
      setError("저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel en="About you" ko="나에 대해" />
          <button
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="ko shrink-0 text-[13px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {value ? "고치기" : "쓰기"}
          </button>
        </div>
        {value ? (
          <p className="ko mt-2.5 whitespace-pre-wrap text-[14px] leading-relaxed text-body">
            {value}
          </p>
        ) : (
          <p className="ko mt-2.5 text-[13px] leading-relaxed text-muted">
            요즘 하는 일이나 관심사를 두어 줄 적어두면, 같은 토픽이라도 나에 대한
            질문이 나옵니다. &ldquo;취미&rdquo;가 아니라 내가 배우는 스쿠버 얘기를
            묻는 식으로요. 안 적어도 연습에는 지장 없습니다.
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionLabel en="About you" ko="나에 대해" />
      <p className="ko mt-2 text-[13px] leading-relaxed text-muted">
        직업, 요즘 배우는 것, 자주 가는 곳, 같이 지내는 사람 — 질문에 쓸 재료면
        무엇이든. 한국어로 적어도 됩니다.
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
        autoFocus
        rows={4}
        placeholder="예: 서울에서 시스템 통합 엔지니어로 일해요. 요즘 스쿠버 다이빙 자격증 준비 중이고, 주말엔 도예 수업에 다닙니다."
        className="ko mt-3 w-full resize-y rounded-lg border border-hair bg-sunk px-3 py-2.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-hair-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="ko text-[12px] text-faint">
          {draft.length} / {MAX}자 · 매 질문에 함께 전달돼요
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="quiet"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            취소
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="ko mt-2 text-[13px] text-flag">{error}</p>
      ) : null}
    </Card>
  );
}
