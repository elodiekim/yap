import { DatabaseSync } from "node:sqlite";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * The whole database is one file on this laptop. No server, no login — see
 * docs/product-spec.md §7 for why that is enough and what it costs (backups
 * are now manual: copy data/yap.db somewhere synced).
 *
 * Server-only. Importing this from a client component will fail the build.
 */
const FILE = process.env.YAP_DB ?? join(process.cwd(), "data", "yap.db");

const SCHEMA = `
create table if not exists profile (
  id               integer primary key check (id = 1),
  level            text not null default 'B1' check (level in ('A2','B1','B2','C1')),
  english_variant  text not null default 'anz',
  -- A couple of lines about the learner's actual life, so nine topics can ask
  -- more than nine questions. Free text, optional, theirs to write.
  about            text not null default '',
  updated_at       text not null default (datetime('now'))
);

create table if not exists sessions (
  id             integer primary key autoincrement,
  practised_on   text not null,
  topic          text,
  question       text,
  answer         text,
  word_count     integer not null default 0,
  mistake_count  integer not null default 0,
  level          text check (level in ('A2','B1','B2','C1')),
  feedback       text,
  source         text not null default 'live' check (source in ('live','import')),
  mode           text not null default 'normal' check (mode in ('normal','easy')),
  created_at     text not null default (datetime('now'))
);
create index if not exists sessions_day on sessions (practised_on);

create table if not exists expressions (
  id          integer primary key autoincrement,
  session_id  integer references sessions(id) on delete set null,
  phrase      text not null,
  meaning     text not null,
  example     text not null,
  created_at  text not null default (datetime('now'))
);
create unique index if not exists expressions_phrase on expressions (lower(phrase));

create table if not exists mistakes (
  id          integer primary key autoincrement,
  session_id  integer not null references sessions(id) on delete cascade,
  tag         text not null,
  original    text not null,
  better      text not null,
  reason      text not null,
  -- Set when the learner said the correction was wrong (§5.12). Every query
  -- that counts mistakes filters these out; nothing deletes them.
  dismissed_at text
);
create index if not exists mistakes_tag on mistakes (tag);

create table if not exists badges (
  badge_id   text primary key,
  earned_at  text not null default (datetime('now'))
);

-- Every model call, including the ones that don't become a session. The
-- numbers come back inside responses we already paid for, so logging them
-- costs nothing extra.
create table if not exists usage_log (
  id             integer primary key autoincrement,
  day            text not null,      -- learner's local date
  kind           text not null,      -- 'question' | 'coach' | 'opener'
  model          text not null,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  thought_tokens integer not null default 0,
  created_at     text not null default (datetime('now'))
);
create index if not exists usage_day on usage_log (day);
`;

/**
 * `create table if not exists` cannot add a column to a table that already
 * exists, so columns introduced later need this. Adding one is safe to run on
 * every open; dropping or retyping one is not, and would need a real migration.
 */
function addColumnIfMissing(
  conn: DatabaseSync,
  table: string,
  column: string,
  definition: string,
) {
  const columns = conn
    .prepare(`pragma table_info(${table})`)
    .all() as unknown as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    conn.exec(`alter table ${table} add column ${definition}`);
  }
}

function open(): DatabaseSync {
  mkdirSync(dirname(FILE), { recursive: true });
  const conn = new DatabaseSync(FILE);
  // WAL survives a hard kill mid-write; foreign keys are off by default in
  // SQLite and the cascade from sessions to mistakes depends on them.
  conn.exec("pragma journal_mode = WAL");
  conn.exec("pragma foreign_keys = ON");
  conn.exec(SCHEMA);
  addColumnIfMissing(
    conn,
    "sessions",
    "mode",
    "mode text not null default 'normal' check (mode in ('normal','easy'))",
  );
  addColumnIfMissing(conn, "profile", "about", "about text not null default ''");
  // A correction the learner rejected. Kept rather than deleted — it is a
  // record of the model being wrong, and every count filters it out anyway.
  addColumnIfMissing(conn, "mistakes", "dismissed_at", "dismissed_at text");
  conn.exec("insert or ignore into profile (id) values (1)");
  return conn;
}

// The dev server re-evaluates modules on every edit; without this the file
// gets reopened on each hot reload until the handles run out.
const cache = globalThis as unknown as { yapDb?: DatabaseSync };

export function db(): DatabaseSync {
  cache.yapDb ??= open();
  return cache.yapDb;
}

/** Run `fn` in a transaction, rolling back if it throws. */
export function tx<T>(fn: () => T): T {
  const conn = db();
  conn.exec("begin");
  try {
    const out = fn();
    conn.exec("commit");
    return out;
  } catch (err) {
    conn.exec("rollback");
    throw err;
  }
}

/**
 * Copy the database to YAP_BACKUP, if it is set.
 *
 * `vacuum into` rather than a file copy: the live database has a WAL beside it,
 * so copying the .db alone can capture a half-written state. This writes one
 * consistent file, which is what makes it safe to point at iCloud or Dropbox.
 *
 * Writes to a temp path first and renames, so an interrupted backup can never
 * leave a truncated file where the good one was.
 */
export function snapshot(): string | null {
  const target = process.env.YAP_BACKUP;
  if (!target) return null;

  const tmp = `${target}.writing`;
  mkdirSync(dirname(target), { recursive: true });
  rmSync(tmp, { force: true }); // `vacuum into` refuses an existing file
  db().exec(`vacuum into '${tmp.replaceAll("'", "''")}'`);
  renameSync(tmp, target);
  return target;
}
