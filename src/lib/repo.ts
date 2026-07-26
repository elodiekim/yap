import { db, snapshot, tx } from "./db";
import { newBadges, type Badge } from "./stats";
import {
  EMPTY_PROFILE,
  type Expression,
  type Feedback,
  type Level,
  type Profile,
  type SessionDetail,
  type SessionSummary,
} from "./types";

/**
 * All reads and writes against the SQLite file.
 *
 * `sessions` is the source of truth; every statistic below is derived from it
 * rather than stored, so a Profile can never drift out of sync with the
 * sessions that produced it (docs/product-spec.md §8).
 */

const CAP = 200; // how much history a Profile carries; the DB keeps everything

export function readProfile(): Profile {
  const conn = db();

  const meta = conn
    .prepare("select level, updated_at from profile where id = 1")
    .get() as { level: Level; updated_at: string } | undefined;

  const vocab = (
    conn
      .prepare(
        `select phrase, meaning, example from expressions
         order by id desc limit ${CAP}`,
      )
      .all() as unknown as Expression[]
  ).reverse();

  const mistakeTags = (
    conn
      .prepare(
        `select tag from mistakes group by tag
         order by max(id) desc limit 60`,
      )
      .all() as unknown as { tag: string }[]
  )
    .map((r) => r.tag)
    .reverse();

  const topicsPracticed = (
    conn
      .prepare("select distinct topic from sessions where topic is not null")
      .all() as unknown as { topic: string }[]
  ).map((r) => r.topic);

  const days = (
    conn
      .prepare(
        "select distinct practised_on from sessions order by practised_on",
      )
      .all() as unknown as { practised_on: string }[]
  ).map((r) => r.practised_on);

  const totals = conn
    .prepare(
      `select count(*) as n, coalesce(sum(word_count), 0) as w from sessions`,
    )
    .get() as { n: number; w: number };

  const mistakeHistory = (
    conn
      .prepare(
        `select practised_on as date, mistake_count as count, word_count as words
         from sessions order by id desc limit ${CAP}`,
      )
      .all() as unknown as { date: string; count: number; words: number }[]
  ).reverse();

  // Only the points where the level actually moved, matching what the old
  // client-side store recorded.
  const levelRows = conn
    .prepare(
      `select practised_on as date, level from sessions
       where level is not null order by id`,
    )
    .all() as unknown as { date: string; level: Level }[];
  const levelHistory: { date: string; level: Level }[] = [];
  for (const row of levelRows) {
    if (levelHistory.at(-1)?.level !== row.level) levelHistory.push(row);
  }

  const badges = (
    conn
      .prepare("select badge_id from badges order by earned_at")
      .all() as unknown as { badge_id: string }[]
  ).map((r) => r.badge_id);

  return {
    level: meta?.level ?? EMPTY_PROFILE.level,
    vocab,
    mistakeTags,
    topicsPracticed,
    days,
    totalConversations: Number(totals.n),
    totalWords: Number(totals.w),
    mistakeHistory,
    levelHistory,
    badges,
    updatedAt: meta?.updated_at ?? "",
  };
}

export interface SessionInput {
  topic: string;
  question: string;
  answer: string;
  words: number;
  /** Local calendar date from the browser — see §8 on why this isn't derived. */
  practisedOn: string;
  feedback: Feedback;
}

export function saveSession(input: SessionInput): {
  profile: Profile;
  badges: Badge[];
} {
  const { feedback } = input;
  const before = readProfile();

  const after = tx(() => {
    const conn = db();
    const inserted = conn
      .prepare(
        `insert into sessions
           (practised_on, topic, question, answer, word_count, mistake_count, level, feedback, source)
         values (?, ?, ?, ?, ?, ?, ?, ?, 'live')`,
      )
      .run(
        input.practisedOn,
        input.topic,
        input.question,
        input.answer,
        input.words,
        feedback.mistakes.length,
        feedback.level,
        JSON.stringify(feedback),
      );
    const sessionId = Number(inserted.lastInsertRowid);

    const addMistake = conn.prepare(
      `insert into mistakes (session_id, tag, original, better, reason)
       values (?, ?, ?, ?, ?)`,
    );
    for (const m of feedback.mistakes) {
      addMistake.run(sessionId, m.tag, m.original, m.better, m.reason);
    }

    // "insert or ignore" is where the unique index on lower(phrase) does its
    // job: the same expression is never recorded as taught twice.
    const addExpression = conn.prepare(
      `insert or ignore into expressions (session_id, phrase, meaning, example)
       values (?, ?, ?, ?)`,
    );
    for (const e of feedback.expressions) {
      addExpression.run(sessionId, e.phrase, e.meaning, e.example);
    }

    conn
      .prepare(
        "update profile set level = ?, updated_at = datetime('now') where id = 1",
      )
      .run(feedback.level);

    return readProfile();
  });

  const badges = newBadges(before, after, feedback);
  if (badges.length > 0) {
    const award = db().prepare(
      "insert or ignore into badges (badge_id) values (?)",
    );
    for (const b of badges) award.run(b.id);
    after.badges = [...after.badges, ...badges.map((b) => b.id)];
  }

  // The practice is already safely committed, so a backup that fails — an
  // unmounted drive, a full disk — must not turn into a failed session.
  try {
    snapshot();
  } catch (err) {
    console.error("[backup] snapshot failed, practice was still saved:", err);
  }

  return { profile: after, badges };
}

export function listSessions(limit = 60, offset = 0): SessionSummary[] {
  const rows = db()
    .prepare(
      `select id, practised_on, topic, word_count, mistake_count, level, source,
              substr(coalesce(answer, ''), 1, 120) as preview
       from sessions order by id desc limit ? offset ?`,
    )
    .all(limit, offset) as unknown as {
    id: number;
    practised_on: string;
    topic: string | null;
    word_count: number;
    mistake_count: number;
    level: Level | null;
    source: string;
    preview: string;
  }[];

  return rows.map((r) => ({
    id: Number(r.id),
    practisedOn: r.practised_on,
    topic: r.topic,
    wordCount: Number(r.word_count),
    mistakeCount: Number(r.mistake_count),
    level: r.level,
    preview: r.preview,
    imported: r.source === "import",
  }));
}

export function countSessions(): number {
  const row = db().prepare("select count(*) as n from sessions").get() as {
    n: number;
  };
  return Number(row.n);
}

export function readSession(id: number): SessionDetail | null {
  const r = db()
    .prepare(
      `select id, practised_on, topic, word_count, mistake_count, level, source,
              question, answer, feedback
       from sessions where id = ?`,
    )
    .get(id) as unknown as
    | {
        id: number;
        practised_on: string;
        topic: string | null;
        word_count: number;
        mistake_count: number;
        level: Level | null;
        source: string;
        question: string | null;
        answer: string | null;
        feedback: string | null;
      }
    | undefined;

  if (!r) return null;
  return {
    id: Number(r.id),
    practisedOn: r.practised_on,
    topic: r.topic,
    wordCount: Number(r.word_count),
    mistakeCount: Number(r.mistake_count),
    level: r.level,
    preview: (r.answer ?? "").slice(0, 120),
    imported: r.source === "import",
    question: r.question,
    answer: r.answer,
    feedback: r.feedback ? (JSON.parse(r.feedback) as Feedback) : null,
  };
}

export function isEmpty(): boolean {
  const row = db().prepare("select count(*) as n from sessions").get() as {
    n: number;
  };
  return Number(row.n) === 0;
}

/**
 * One-time lift of a localStorage profile into the database.
 *
 * The old format never stored the question or the answer, so imported rows
 * carry `source = 'import'` with those columns empty: every statistic and the
 * whole trend chart survive, but past conversations cannot be re-read.
 */
export function importLegacy(legacy: Profile): { sessions: number } {
  return tx(() => {
    const conn = db();
    const stub = conn.prepare(
      `insert into sessions
         (practised_on, word_count, mistake_count, source)
       values (?, ?, ?, 'import')`,
    );

    for (const h of legacy.mistakeHistory) {
      stub.run(h.date, h.words, h.count);
    }

    // Days the trimmed history no longer covers would otherwise break the
    // streak, so give each one a zero-weight session.
    const covered = new Set(legacy.mistakeHistory.map((h) => h.date));
    for (const day of legacy.days) {
      if (!covered.has(day)) stub.run(day, 0, 0);
    }

    const addExpression = conn.prepare(
      `insert or ignore into expressions (phrase, meaning, example)
       values (?, ?, ?)`,
    );
    for (const e of legacy.vocab) {
      addExpression.run(e.phrase, e.meaning, e.example);
    }

    const award = conn.prepare(
      "insert or ignore into badges (badge_id) values (?)",
    );
    for (const id of legacy.badges) award.run(id);

    conn
      .prepare(
        "update profile set level = ?, updated_at = datetime('now') where id = 1",
      )
      .run(legacy.level);

    const total = conn.prepare("select count(*) as n from sessions").get() as {
      n: number;
    };
    return { sessions: Number(total.n) };
  });
}

export function resetAll(): void {
  tx(() => {
    const conn = db();
    for (const table of ["mistakes", "expressions", "badges", "sessions"]) {
      conn.exec(`delete from ${table}`);
    }
    conn.exec(
      `update profile set level = '${EMPTY_PROFILE.level}', updated_at = datetime('now') where id = 1`,
    );
  });
}
