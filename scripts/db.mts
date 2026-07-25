/**
 * Read the practice log from the terminal.
 *
 *   npm run db          요약 + 최근 세션
 *   npm run db -- 12    12번 세션 전문 (질문·답변·피드백 전체)
 *
 * Read-only on purpose: this is for looking, not fixing.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";

const FILE = process.env.YAP_DB ?? join(process.cwd(), "data", "yap.db");

if (!existsSync(FILE)) {
  console.log(`아직 데이터베이스가 없습니다: ${FILE}`);
  console.log("npm run dev 로 한 번 연습하면 만들어집니다.");
  process.exit(1);
}

const db = new DatabaseSync(FILE, { readOnly: true });
// The trailing comma keeps .mts from reading `<T>` as JSX.
const rows = <T,>(sql: string, ...args: (string | number)[]) =>
  db.prepare(sql).all(...args) as unknown as T[];
const one = <T,>(sql: string, ...args: (string | number)[]) =>
  db.prepare(sql).get(...args) as unknown as T | undefined;

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const rule = () => console.log(dim("─".repeat(64)));

/* ------------------------------------------------------------------ 세션 전문 */

const wanted = process.argv[2];
if (wanted) {
  const s = one<{
    id: number;
    practised_on: string;
    topic: string | null;
    question: string | null;
    answer: string | null;
    word_count: number;
    level: string | null;
    feedback: string | null;
    source: string;
  }>("select * from sessions where id = ?", Number(wanted));

  if (!s) {
    console.log(`${wanted}번 세션이 없습니다.`);
    process.exit(1);
  }

  console.log(bold(`세션 #${s.id}`), dim(`· ${s.practised_on} · ${s.topic ?? "토픽 없음"} · ${s.word_count}단어`));
  if (s.source === "import") {
    rule();
    console.log("localStorage에서 가져온 기록이라 질문과 답변 원문이 없습니다.");
    console.log(dim("통계로는 남아 있지만, 대화 내용은 이전 이후 세션부터 볼 수 있습니다."));
    process.exit(0);
  }

  rule();
  console.log(bold("질문"));
  console.log(s.question);
  console.log();
  console.log(bold("내 답변"));
  console.log(s.answer);

  if (s.feedback) {
    const f = JSON.parse(s.feedback);
    rule();
    console.log(bold("칭찬"));
    console.log(f.praise);
    console.log();
    console.log(bold("자연스러운 리라이트"));
    console.log(f.rewrite);
    if (f.mistakes.length > 0) {
      console.log();
      console.log(bold("고칠 부분"));
      for (const m of f.mistakes) {
        console.log(`  ${m.original}  →  ${m.better}`);
        console.log(dim(`    ${m.reason}`));
      }
    }
    console.log();
    console.log(bold("표현"));
    for (const e of f.expressions) {
      console.log(`  ${e.phrase}`);
      console.log(dim(`    ${e.meaning}`));
    }
    console.log();
    console.log(bold("쉐도잉"));
    for (const line of f.shadowing) console.log(`  ${line}`);
    console.log();
    console.log(bold("다음 질문"), dim(`(레벨 ${f.level})`));
    console.log(`  ${f.followUp.question}`);
  }
  process.exit(0);
}

/* -------------------------------------------------------------------- 요약 */

const totals = one<{ n: number; w: number; days: number }>(
  `select count(*) n, coalesce(sum(word_count), 0) w,
          count(distinct practised_on) days from sessions`,
)!;
const level = one<{ level: string }>("select level from profile where id = 1");
const vocab = one<{ n: number }>("select count(*) n from expressions")!;

console.log(bold("Yap 연습 기록"), dim(`· ${FILE}`));
rule();
console.log(`연습한 날      ${totals.days}일`);
console.log(`대화           ${totals.n}회`);
console.log(`누적 단어      ${totals.w.toLocaleString()}단어`);
console.log(`배운 표현      ${vocab.n}개`);
console.log(`현재 레벨      ${level?.level ?? "-"}`);

const badges = rows<{ badge_id: string }>(
  "select badge_id from badges order by earned_at",
);
if (badges.length > 0) {
  console.log(`트로피         ${badges.map((b) => b.badge_id).join(", ")}`);
}

/* --------------------------------------------------------------- 최근 세션 */

const recent = rows<{
  id: number;
  practised_on: string;
  topic: string | null;
  word_count: number;
  mistake_count: number;
  source: string;
}>(
  `select id, practised_on, topic, word_count, mistake_count, source
   from sessions order by id desc limit 12`,
);

console.log();
console.log(bold("최근 세션"));
rule();
for (const s of recent) {
  const tag = s.source === "import" ? dim(" (이전됨)") : "";
  const topic = (s.topic ?? "-").padEnd(10);
  console.log(
    `${String(s.id).padStart(4)}  ${s.practised_on}  ${topic}` +
      `${String(s.word_count).padStart(4)}단어  실수 ${s.mistake_count}${tag}`,
  );
}

/* ------------------------------------------------------------- 자주 틀리는 것 */

const tags = rows<{ tag: string; n: number }>(
  `select tag, count(*) n from mistakes group by tag
   order by n desc, max(id) desc limit 8`,
);
if (tags.length > 0) {
  console.log();
  console.log(bold("자주 틀리는 패턴"));
  rule();
  for (const t of tags) console.log(`  ${String(t.n).padStart(3)}회  ${t.tag}`);
}

/* ------------------------------------------------------------------ 표현 */

const latest = rows<{ phrase: string; meaning: string }>(
  "select phrase, meaning from expressions order by id desc limit 12",
);
if (latest.length > 0) {
  console.log();
  console.log(bold("최근 배운 표현"));
  rule();
  for (const e of latest) {
    console.log(`  ${e.phrase}`);
    console.log(dim(`    ${e.meaning}`));
  }
}

console.log();
console.log(dim("세션 전문 보기:  npm run db -- <번호>"));
console.log(dim(`직접 SQL 실행:   sqlite3 ${FILE}`));
