export type Level = "A2" | "B1" | "B2" | "C1";

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

/** Everything Yap remembers about the learner. */
export interface Profile {
  level: Level;
  /** Expressions already taught — never teach the same one twice. */
  vocab: Expression[];
  /** Short tags for recurring mistakes, e.g. "article-omission". */
  mistakeTags: string[];
  topicsPracticed: string[];
  /** ISO dates (YYYY-MM-DD) on which the learner practised. */
  days: string[];
  totalConversations: number;
  totalWords: number;
  /** One entry per session: how many major mistakes were flagged. */
  mistakeHistory: { date: string; count: number; words: number }[];
  levelHistory: { date: string; level: Level }[];
  badges: string[];
  updatedAt: string;
}

export const EMPTY_PROFILE: Profile = {
  level: "B1",
  vocab: [],
  mistakeTags: [],
  topicsPracticed: [],
  days: [],
  totalConversations: 0,
  totalWords: 0,
  mistakeHistory: [],
  levelHistory: [],
  badges: [],
  updatedAt: "",
};
