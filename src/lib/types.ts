export type Level = "A2" | "B1" | "B2" | "C1";

/**
 * How much the learner is up for today.
 *
 * "easy" is not a beginner setting — it is a tired-day setting, and it counts
 * toward the streak exactly the same. See docs/product-spec.md §5.6.
 */
export type Mode = "normal" | "easy";

export const LEVELS: Level[] = ["A2", "B1", "B2", "C1"];

export interface Mistake {
  original: string;
  better: string;
  reason: string;
  example: string;
  tag: string;
}

export interface Expression {
  phrase: string;
  meaning: string;
  example: string;
}

/** How often one kebab-case mistake tag has come up lately. */
export interface MistakePattern {
  tag: string;
  count: number;
}

export interface FollowUp {
  question: string;
  hints: string[];
}

export interface Feedback {
  praise: string;
  rewrite: string;
  mistakes: Mistake[];
  expressions: Expression[];
  shadowing: string[];
  followUp: FollowUp;
  level: Level;
  levelNote: string;
}

export interface Prompt {
  question: string;
  hints: string[];
}

export interface Turn {
  id: string;
  topic: string;
  question: string;
  hints: string[];
  answer: string;
  words: number;
  feedback: Feedback | null;
  createdAt: string;
}

/**
 * One past session, as the history screen sees it.
 *
 * Lives here rather than in repo.ts so client components can name these
 * without importing a module that pulls in node:sqlite.
 */
export interface SessionSummary {
  id: number;
  practisedOn: string;
  topic: string | null;
  wordCount: number;
  mistakeCount: number;
  level: Level | null;
  /** Empty for imported rows, which never had the answer text. */
  preview: string;
  imported: boolean;
}

export interface SessionDetail extends SessionSummary {
  question: string | null;
  answer: string | null;
  feedback: Feedback | null;
}

/** One learned expression, with where it came from. */
export interface ExpressionEntry extends Expression {
  id: number;
  /** null for expressions carried over from localStorage. */
  sessionId: number | null;
  topic: string | null;
  learnedOn: string | null;
}

export interface UsageDay {
  day: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  /** null when a model in the mix has no price on file. */
  cost: number | null;
}

export interface UsageReport {
  today: UsageDay;
  month: { requests: number; tokens: number; cost: number | null };
  daily: UsageDay[];
  models: string[];
  /** Free-tier requests per day, for the "left today" hint. */
  dailyRequestLimit: number | null;
}

/** Everything Yap remembers about the learner. */
export interface Profile {
  level: Level;
  /** Expressions already taught — never teach the same one twice. */
  vocab: Expression[];
  /** Short tags for recurring mistakes, e.g. "article-omission". */
  /** Recently recurring error patterns, most frequent first. */
  mistakePatterns: MistakePattern[];
  topicsPracticed: string[];
  /** ISO dates (YYYY-MM-DD) on which the learner practised. */
  days: string[];
  totalConversations: number;
  totalWords: number;
  /** One entry per session: how many major mistakes were flagged. */
  mistakeHistory: { date: string; count: number; words: number }[];
  /**
   * One entry per session that had any mistake: how many of its tags had
   * already been flagged in an earlier session. This, not the raw count, is
   * what the progress chart reads — see docs/product-spec.md §5.4.
   */
  recurrenceHistory: { date: string; total: number; repeats: number }[];
  levelHistory: { date: string; level: Level }[];
  badges: string[];
  updatedAt: string;
}

export const EMPTY_PROFILE: Profile = {
  level: "B1",
  vocab: [],
  mistakePatterns: [],
  topicsPracticed: [],
  days: [],
  totalConversations: 0,
  totalWords: 0,
  mistakeHistory: [],
  recurrenceHistory: [],
  levelHistory: [],
  badges: [],
  updatedAt: "",
};
