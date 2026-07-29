/**
 * Map mistake tags recorded before the fixed dictionary onto it.
 *
 *   npm run retag           무엇이 어떻게 바뀌는지만 보여줌
 *   npm run retag -- --write 실제로 반영 (백업을 먼저 뜹니다)
 *
 * Every mapping below was decided by reading the actual correction, not by
 * matching on the tag name. Anything unmapped is reported and left alone —
 * guessing would put a wrong pattern in front of the learner.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { TAGS } from "../src/lib/tags.ts";
import { snapshot } from "../src/lib/db.ts";

const FILE = process.env.YAP_DB ?? join(process.cwd(), "data", "yap.db");

/** old tag → new tag, with the correction that decided it. */
const MAPPING: Record<string, string> = {
  // "had a lunch" → "grab some lunch"; "for a 3 years" → "for three years"
  "article-with-meals": "article-unnecessary",
  "article-with-numbers": "article-unnecessary",
  "article-omission": "article-missing",
  // "every my effort" → "all my effort"
  "determiner-choice": "determiner-wrong",
  // "busy to do build" → "flat out building"
  "adjective-plus-gerund": "verb-form",
  // "the coach teach us" → "the coach teaches us"
  "verb-agreement-and-infinitive": "subject-verb-agreement",
  // "prefer ... than" → "prefer ... to"; "on week day" → "during the week"
  "preference-preposition": "preposition",
  "preposition-and-plural": "preposition",
  // "house work" → "housework" is an orthography call, not word choice
  "compound-nouns": "spelling",
  "spelling-cosy": "spelling",
  "spelling-quite-vs-quiet": "spelling",
  "spelling-too-vs-to": "spelling",
  "spelling-and-purpose": "spelling",
};

if (!existsSync(FILE)) {
  console.log(`데이터베이스가 없습니다: ${FILE}`);
  process.exit(1);
}

const write = process.argv.includes("--write");
const db = new DatabaseSync(FILE);

const rows = db
  .prepare("select tag, count(*) as n from mistakes group by tag order by n desc")
  .all() as unknown as { tag: string; n: number }[];

const valid = new Set(TAGS);
const planned: { from: string; to: string; n: number }[] = [];
const alreadyFine: string[] = [];
const unmapped: { tag: string; n: number }[] = [];

for (const r of rows) {
  const n = Number(r.n);
  if (valid.has(r.tag)) alreadyFine.push(`${r.tag} ×${n}`);
  else if (MAPPING[r.tag]) planned.push({ from: r.tag, to: MAPPING[r.tag], n });
  else unmapped.push({ tag: r.tag, n });
}

console.log(`대상: ${FILE}\n`);

if (alreadyFine.length > 0) {
  console.log(`이미 사전에 있음 (${alreadyFine.length}종)`);
  console.log(`  ${alreadyFine.join(", ")}\n`);
}

if (planned.length > 0) {
  console.log(`바꿀 것 (${planned.length}종)`);
  for (const p of planned) {
    console.log(`  ${p.from.padEnd(30)} → ${p.to.padEnd(24)} ${p.n}건`);
  }
  console.log();
}

if (unmapped.length > 0) {
  console.log(`매핑 없음 — 손대지 않습니다 (${unmapped.length}종)`);
  for (const u of unmapped) console.log(`  ${u.tag} ×${u.n}`);
  console.log("  scripts/retag.mts의 MAPPING에 추가하세요.\n");
}

if (planned.length === 0) {
  console.log("바꿀 것이 없습니다.");
  process.exit(0);
}

if (!write) {
  console.log("미리보기입니다. 반영하려면: npm run retag -- --write");
  process.exit(0);
}

const backup = snapshot();
console.log(backup ? `백업: ${backup}` : "YAP_BACKUP이 없어 백업을 건너뜁니다.");

const update = db.prepare("update mistakes set tag = ? where tag = ?");
db.exec("begin");
try {
  let changed = 0;
  for (const p of planned) changed += Number(update.run(p.to, p.from).changes);
  db.exec("commit");
  console.log(`${changed}건 반영했습니다.`);
} catch (err) {
  db.exec("rollback");
  console.error("실패해서 되돌렸습니다:", err);
  process.exit(1);
}
