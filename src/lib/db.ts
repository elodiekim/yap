import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
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
  reason      text not null
);
create index if not exists mistakes_tag on mistakes (tag);

create table if not exists badges (
  badge_id   text primary key,
  earned_at  text not null default (datetime('now'))
);
`;

function open(): DatabaseSync {
  mkdirSync(dirname(FILE), { recursive: true });
  const conn = new DatabaseSync(FILE);
  // WAL survives a hard kill mid-write; foreign keys are off by default in
  // SQLite and the cascade from sessions to mistakes depends on them.
  conn.exec("pragma journal_mode = WAL");
  conn.exec("pragma foreign_keys = ON");
  conn.exec(SCHEMA);
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
