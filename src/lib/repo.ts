import { db, snapshot, tx } from "./db";
import type { Usage } from "./llm";
import { costOf, dailyRequestLimit } from "./pricing";
import { LEVEL_WINDOW, levelAfter, newBadges, type Badge } from "./stats";
import {
  EMPTY_PROFILE,
  type Expression,
  type ExpressionEntry,
  type Feedback,
  type Level,
  type Mode,
  type PendingAnswer,
  type Profile,
  type SessionDetail,
  type SessionSummary,
  type UsageDay,
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
    .prepare("select level, about, updated_at from profile where id = 1")
    .get() as
    | { level: Level; about: string; updated_at: string }
    | undefined;

  const vocab = (
    conn
      .prepare(
        `select phrase, meaning, example from expressions
         order by id desc limit ${CAP}`,
      )
      .all() as unknown as Expression[]
  ).reverse();

  // Counted over recent sessions only. All-time counts would keep a pattern
  // the learner has since fixed at the top of the list forever, and the point
  // of this is to aim at what they are getting wrong *now*.
  // `original` and `better` are bare columns beside max(id): SQLite documents
  // that they come from the row the max matched, so each pattern arrives with
  // its most recent real correction attached without a second query.
  const mistakePatterns = conn
    .prepare(
      `select tag, count(*) as count, max(id) as recent, original, better
       from mistakes
       where dismissed_at is null
         and session_id in (select id from sessions order by id desc limit 30)
       group by tag
       order by count desc, recent desc
       limit 12`,
    )
    .all() as unknown as {
    tag: string;
    count: number;
    original: string;
    better: string;
  }[];

  const topicsPracticed = (
    conn
      .prepare("select distinct topic from sessions where topic is not null")
      .all() as unknown as { topic: string }[]
  ).map((r) => r.topic);

  // When each topic last came up. The light way in picks for the learner, so
  // it is the one place the app can widen the material without asking them to
  // decide anything — but only if it knows what is already stale (§5.16).
  const topicLastUsed = Object.fromEntries(
    (
      conn
        .prepare(
          `select topic, max(practised_on) as last from sessions
           where topic is not null group by topic`,
        )
        .all() as unknown as { topic: string; last: string }[]
    ).map((r) => [r.topic, r.last]),
  );

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

  // How much of each session was ground already covered. A tag counts as a
  // repeat when it was first flagged in an *earlier* session, so the very
  // first appearance of a pattern is never held against the learner.
  // Sessions with no mistakes are absent rather than zero: recurrence is
  // undefined when nothing was flagged, and charting it as 0% would read as
  // a perfect session rather than an empty one.
  const recurrenceHistory = (
    conn
      .prepare(
        `select s.practised_on as date,
                count(m.tag) as total,
                sum(case when f.first_seen < s.id then 1 else 0 end) as repeats
         from sessions s
         join mistakes m on m.session_id = s.id and m.dismissed_at is null
         -- Also filtered here: a correction the learner threw out must not be
         -- the thing that makes a later one count as a repeat (§5.12).
         join (select tag, min(session_id) as first_seen
               from mistakes where dismissed_at is null group by tag)
           f on f.tag = m.tag
         group by s.id
         order by s.id desc
         limit ${CAP}`,
      )
      .all() as unknown as { date: string; total: number; repeats: number }[]
  )
    .map((r) => ({
      date: r.date,
      total: Number(r.total),
      repeats: Number(r.repeats),
    }))
    .reverse();

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

  // The raw per-answer readings the promotion rule works on — not the same as
  // levelHistory above, which only keeps the points where the shown level moved.
  const levelReadings = (
    conn
      .prepare(
        `select level from sessions
         where level is not null order by id desc limit ${LEVEL_WINDOW}`,
      )
      .all() as unknown as { level: Level }[]
  )
    .map((r) => r.level)
    .reverse();

  const badges = (
    conn
      .prepare("select badge_id from badges order by earned_at")
      .all() as unknown as { badge_id: string }[]
  ).map((r) => r.badge_id);

  return {
    level: meta?.level ?? EMPTY_PROFILE.level,
    about: meta?.about ?? "",
    vocab,
    mistakePatterns: mistakePatterns.map((r) => ({
      tag: r.tag,
      count: Number(r.count),
      example: { original: r.original, better: r.better },
    })),
    topicsPracticed,
    topicLastUsed,
    days,
    totalConversations: Number(totals.n),
    totalWords: Number(totals.w),
    mistakeHistory,
    recurrenceHistory,
    levelHistory,
    levelReadings,
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
  mode: Mode;
  feedback: Feedback;
}

/**
 * Everything a piece of feedback leaves behind, written against a session row
 * that already exists.
 *
 * Split out of saveSession because feedback can now arrive a day after the
 * answer did (§5.9): the row is inserted the moment the learner writes, and
 * this runs whenever the grading call finally succeeds.
 */
function recordFeedback(sessionId: number, feedback: Feedback, easy: boolean) {
  const conn = db();
  conn
    .prepare(
      "update sessions set mistake_count = ?, level = ?, feedback = ? where id = ?",
    )
    .run(
      feedback.mistakes.length,
      // An easy session records no level at all. A tired one-liner is not
      // evidence about anyone's English, and letting it demote the learner
      // would punish exactly the day this mode exists to make painless (§5.6).
      easy ? null : feedback.level,
      JSON.stringify(feedback),
      sessionId,
    );

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

  if (!easy) {
    // The model judged one answer; the level the learner sees is the app's,
    // worked out from several. Reading the sessions back rather than trusting
    // the single estimate is the whole point of §5.10.
    const shown = (
      conn.prepare("select level from profile where id = 1").get() as {
        level: Level;
      }
    ).level;
    const promoted = levelAfter(shown, recentReadings());
    if (promoted !== shown) {
      conn
        .prepare(
          "update profile set level = ?, updated_at = datetime('now') where id = 1",
        )
        .run(promoted);
    }
  }
}

function recentReadings(): Level[] {
  return (
    db()
      .prepare(
        `select level from sessions
         where level is not null order by id desc limit ${LEVEL_WINDOW}`,
      )
      .all() as unknown as { level: Level }[]
  )
    .map((r) => r.level)
    .reverse();
}

function insertAnswer(input: Omit<SessionInput, "feedback">): number {
  const inserted = db()
    .prepare(
      `insert into sessions
         (practised_on, topic, question, answer, word_count, source, mode)
       values (?, ?, ?, ?, ?, 'live', ?)`,
    )
    .run(
      input.practisedOn,
      input.topic,
      input.question,
      input.answer,
      input.words,
      input.mode,
    );
  return Number(inserted.lastInsertRowid);
}

/**
 * Backup is best-effort: the practice is already committed, so an unmounted
 * drive or a full disk must not turn into a failed session.
 */
function backUp(): void {
  try {
    snapshot();
  } catch (err) {
    console.error("[backup] snapshot failed, practice was still saved:", err);
  }
}

export function saveSession(input: SessionInput): {
  sessionId: number;
  profile: Profile;
  badges: Badge[];
} {
  const before = readProfile();
  let sessionId = 0;

  const after = tx(() => {
    sessionId = insertAnswer(input);
    recordFeedback(sessionId, input.feedback, input.mode === "easy");
    return readProfile();
  });

  const badges = award(before, after, input.feedback);
  backUp();
  return { sessionId, profile: after, badges };
}

/**
 * The answer, with no feedback attached — because the grading call failed.
 *
 * The day counts from this row alone: streak, totals, topic and the text
 * itself are all in place, and the feedback can be fetched later. Losing the
 * answer was the real damage in a rate limit, not losing the feedback (§5.9).
 */
export function saveUngraded(input: Omit<SessionInput, "feedback">): {
  sessionId: number;
  profile: Profile;
  badges: Badge[];
} {
  const before = readProfile();
  let sessionId = 0;

  const after = tx(() => {
    sessionId = insertAnswer(input);
    return readProfile();
  });

  const badges = award(before, after, null);
  backUp();
  return { sessionId, profile: after, badges };
}

/** Grade an answer that was saved earlier. Null if the id isn't waiting. */
export function attachFeedback(
  sessionId: number,
  feedback: Feedback,
): { profile: Profile; badges: Badge[] } | null {
  const pending = readPending(sessionId);
  if (!pending) return null;

  const before = readProfile();
  const after = tx(() => {
    recordFeedback(sessionId, feedback, pending.mode === "easy");
    return readProfile();
  });

  const badges = award(before, after, feedback);
  backUp();
  return { profile: after, badges };
}

/**
 * Throw out one correction the learner says is wrong (§5.12).
 *
 * A wrong correction does two kinds of damage at once — it teaches the wrong
 * thing, and it counts toward "자주 틀리는 것" and the recurrence rate forever.
 * So this has to reach both the stored feedback and the analytics row.
 *
 * The `mistakes` rows for a session are inserted in feedback order and the
 * stored feedback is rewritten here on every dismissal, so the nth surviving
 * row is always the nth entry the learner is looking at.
 */
export function dismissMistake(
  sessionId: number,
  index: number,
): Feedback | null {
  return tx(() => {
    const conn = db();
    const row = conn
      .prepare("select feedback from sessions where id = ?")
      .get(sessionId) as { feedback: string | null } | undefined;
    if (!row?.feedback) return null;

    const feedback = JSON.parse(row.feedback) as Feedback;
    if (index < 0 || index >= feedback.mistakes.length) return null;

    const live = conn
      .prepare(
        `select id from mistakes
         where session_id = ? and dismissed_at is null
         order by id`,
      )
      .all(sessionId) as unknown as { id: number }[];
    if (live[index]) {
      conn
        .prepare(
          "update mistakes set dismissed_at = datetime('now') where id = ?",
        )
        .run(live[index].id);
    }

    feedback.mistakes.splice(index, 1);
    conn
      .prepare("update sessions set feedback = ?, mistake_count = ? where id = ?")
      .run(JSON.stringify(feedback), feedback.mistakes.length, sessionId);

    return feedback;
  });
}

function award(before: Profile, after: Profile, feedback: Feedback | null) {
  const badges = newBadges(before, after, feedback);
  if (badges.length > 0) {
    const give = db().prepare(
      "insert or ignore into badges (badge_id) values (?)",
    );
    for (const b of badges) give.run(b.id);
    after.badges = [...after.badges, ...badges.map((b) => b.id)];
  }
  return badges;
}

function readPending(id: number | null): PendingAnswer | null {
  const row = db()
    .prepare(
      `select id, practised_on, topic, question, answer, word_count, mode
       from sessions
       where source = 'live' and feedback is null
         and question is not null and answer is not null
         and (? is null or id = ?)
       order by id desc limit 1`,
    )
    .get(id, id) as unknown as
    | {
        id: number;
        practised_on: string;
        topic: string;
        question: string;
        answer: string;
        word_count: number;
        mode: Mode;
      }
    | undefined;
  if (!row) return null;
  return {
    id: Number(row.id),
    practisedOn: row.practised_on,
    topic: row.topic,
    question: row.question,
    answer: row.answer,
    words: Number(row.word_count),
    mode: row.mode,
  };
}

/** An answer still waiting on feedback: a given one, or the most recent. */
export function pendingAnswer(id: number | null = null): PendingAnswer | null {
  return readPending(id);
}

export function pendingCount(): number {
  const row = db()
    .prepare(
      `select count(*) as n from sessions
       where source = 'live' and feedback is null and answer is not null`,
    )
    .get() as { n: number };
  return Number(row.n);
}

/**
 * Whether our own log says today's free-tier requests are spent.
 *
 * Ground truth about what this app asked for, which beats guessing from a
 * provider error string — but only as good as FREE_TIER_DAILY_REQUESTS, so
 * "false" here means "not sure", never "there is quota left".
 */
export function dailyQuotaSpent(day: string): boolean {
  const limit = dailyRequestLimit();
  if (limit === null) return false;
  const row = db()
    .prepare("select count(*) as n from usage_log where day = ?")
    .get(day) as { n: number };
  return Number(row.n) >= limit;
}

export function listSessions(limit = 60, offset = 0): SessionSummary[] {
  const rows = db()
    .prepare(
      `select id, practised_on, topic, word_count, mistake_count, level, source,
              feedback is not null as graded,
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
    graded: number;
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
    graded: Number(r.graded) === 1,
  }));
}

/** Actual question text asked on this topic before, oldest first — so the
 * next question can be told what to avoid instead of just that the topic
 * has come up. Imported rows have no question text and are excluded. */
export function recentQuestions(topic: string, limit = 3): string[] {
  const rows = db()
    .prepare(
      `select question from sessions
       where topic = ? and question is not null
       order by id desc limit ?`,
    )
    .all(topic, limit) as unknown as { question: string }[];
  return rows.map((r) => r.question).reverse();
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
    graded: r.feedback !== null,
    question: r.question,
    answer: r.answer,
    feedback: r.feedback ? (JSON.parse(r.feedback) as Feedback) : null,
  };
}

/** Every expression ever taught, newest first. */
/**
 * When, if ever, the learner wrote this phrase again in a later answer.
 *
 * Plain substring match, so a reworded reuse is missed and the number errs
 * low — which is the right direction for a figure that exists to tell us
 * whether §5.15 is working. Measured before building it: 2 of 62.
 */
const REUSED_ON = `(
  select min(s2.practised_on) from sessions s2
  where s2.answer is not null
    and (e.session_id is null or s2.id > e.session_id)
    and instr(lower(s2.answer), lower(e.phrase)) > 0
)`;

export function listExpressions(): ExpressionEntry[] {
  const rows = db()
    .prepare(
      // Only offer the session link when there is something to open. Imported
      // rows hold no question or answer, so linking to one is a dead end — and
      // some existing expressions do point at them.
      `select e.id, e.phrase, e.meaning, e.example,
              case when s.source = 'live' then s.id end as session_id,
              case when s.source = 'live' then s.topic end as topic,
              s.practised_on,
              ${REUSED_ON} as reused_on
       from expressions e
       left join sessions s on s.id = e.session_id
       order by e.id desc`,
    )
    .all() as unknown as {
    id: number;
    phrase: string;
    meaning: string;
    example: string;
    session_id: number | null;
    topic: string | null;
    practised_on: string | null;
    reused_on: string | null;
  }[];

  return rows.map((r) => ({
    id: Number(r.id),
    phrase: r.phrase,
    meaning: r.meaning,
    example: r.example,
    sessionId: r.session_id === null ? null : Number(r.session_id),
    topic: r.topic,
    learnedOn: r.practised_on,
    reusedOn: r.reused_on,
  }));
}

/** Longest a hint is allowed to be, so a returning expression still reads as one. */
const HINT_WORDS = 6;

/**
 * Expressions worth putting back in front of the learner (§5.15).
 *
 * Oldest first and never used since: the ones from last session are still
 * fresh, and one taught a week ago is the one slipping away. Filtered to
 * hint-shaped phrases, because the whole mechanism is that an expression and
 * an idea hint are the same object — 61 of this learner's 62 already qualify.
 */
export function expressionsToRevive(limit = 8): string[] {
  const rows = db()
    .prepare(
      `select e.phrase from expressions e
       where ${REUSED_ON} is null
       order by e.id
       limit 40`,
    )
    .all() as unknown as { phrase: string }[];

  return rows
    .map((r) => r.phrase)
    .filter((p) => {
      const words = p.trim().split(/\s+/).length;
      return words >= 2 && words <= HINT_WORDS && !/\.\.\.|…/.test(p);
    })
    .slice(0, limit);
}

/* ------------------------------------------------------------------ 사용량 */

export function logUsage(
  day: string,
  kind: "question" | "coach" | "opener",
  usage: Usage,
): void {
  db()
    .prepare(
      `insert into usage_log (day, kind, model, input_tokens, output_tokens, thought_tokens)
       values (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      day,
      kind,
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
      usage.thoughtTokens,
    );
}

function rollUp(
  rows: {
    day: string;
    model: string;
    requests: number;
    input_tokens: number;
    output_tokens: number;
  }[],
): UsageDay[] {
  const byDay = new Map<string, UsageDay>();
  for (const r of rows) {
    const entry = byDay.get(r.day) ?? {
      day: r.day,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0 as number | null,
    };
    entry.requests += Number(r.requests);
    entry.inputTokens += Number(r.input_tokens);
    entry.outputTokens += Number(r.output_tokens);

    const cost = costOf(r.model, Number(r.input_tokens), Number(r.output_tokens));
    // One unpriced model makes the whole day's total a guess, so drop it
    // rather than under-report.
    entry.cost = cost === null || entry.cost === null ? null : entry.cost + cost;
    byDay.set(r.day, entry);
  }
  return [...byDay.values()];
}

export function readUsage(days = 30): {
  daily: UsageDay[];
  models: string[];
} {
  const rows = db()
    .prepare(
      `select day, model, count(*) as requests,
              sum(input_tokens) as input_tokens,
              sum(output_tokens + thought_tokens) as output_tokens
       from usage_log
       group by day, model
       order by day desc`,
    )
    .all() as unknown as {
    day: string;
    model: string;
    requests: number;
    input_tokens: number;
    output_tokens: number;
  }[];

  const daily = rollUp(rows)
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, days);

  const models = [...new Set(rows.map((r) => r.model))];
  return { daily, models };
}

/**
 * Replace the learner's note about themselves.
 *
 * Capped because it rides along in every prompt — a couple of lines is what
 * makes questions specific, and a life story would just cost tokens.
 */
export const ABOUT_MAX = 400;

export function saveAbout(text: string): Profile {
  db()
    .prepare(
      "update profile set about = ?, updated_at = datetime('now') where id = 1",
    )
    .run(text.trim().slice(0, ABOUT_MAX));
  return readProfile();
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

/**
 * Wipe the practice record.
 *
 * `usage_log` deliberately survives. Those tokens were actually spent, and
 * deleting the row does not un-spend them — it would just make the monthly
 * cost read lower than the real bill. The confirm text says so.
 */
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
