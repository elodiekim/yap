import { TAGS } from "./tags";
import type { Mode } from "./types";

const hints = {
  type: "array",
  minItems: 4,
  maxItems: 5,
  items: { type: "string" },
} as const;

/**
 * The question in Korean, for the learner who cannot parse the English one.
 *
 * It rides along in the call that writes the question rather than being a
 * lookup of its own, so the escape hatch costs no requests — which is what made
 * it affordable at all on a metered key.
 */
const meaning = { type: "string" } as const;

export const PROMPT_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    meaning,
    hints,
  },
  required: ["question", "meaning", "hints"],
  additionalProperties: false,
} as Record<string, unknown>;

export const OPENER_SCHEMA = {
  type: "object",
  properties: { english: { type: "string" } },
  required: ["english"],
  additionalProperties: false,
} as Record<string, unknown>;

/**
 * How much feedback each mode asks for.
 *
 * The counts are the schema's job, not the prompt's: five corrections on a
 * one-sentence answer is not a lighter mode, it is a harsher one, and asking
 * politely for fewer is less reliable than making more impossible.
 */
const SIZES: Record<Mode, { mistakes: number; expressions: number; shadowing: [number, number] }> = {
  normal: { mistakes: 5, expressions: 3, shadowing: [2, 3] },
  easy: { mistakes: 2, expressions: 1, shadowing: [1, 1] },
};

function feedbackSchema(mode: Mode): Record<string, unknown> {
  const size = SIZES[mode];
  return {
    type: "object",
    properties: {
      praise: { type: "string" },
      rewrite: { type: "string" },
      mistakes: {
        type: "array",
        maxItems: size.mistakes,
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            better: { type: "string" },
            reason: { type: "string" },
            example: { type: "string" },
            // Enum, not a free string: the provider now rejects an invented tag
            // instead of letting it quietly break the pattern counts.
            tag: { type: "string", enum: TAGS },
          },
          required: ["original", "better", "reason", "example", "tag"],
          additionalProperties: false,
        },
      },
      expressions: {
        type: "array",
        minItems: size.expressions,
        maxItems: size.expressions,
        items: {
          type: "object",
          properties: {
            phrase: { type: "string" },
            meaning: { type: "string" },
            example: { type: "string" },
          },
          required: ["phrase", "meaning", "example"],
          additionalProperties: false,
        },
      },
      shadowing: {
        type: "array",
        minItems: size.shadowing[0],
        maxItems: size.shadowing[1],
        items: { type: "string" },
      },
      followUp: {
        type: "object",
        properties: {
          question: { type: "string" },
          meaning,
          hints,
        },
        required: ["question", "meaning", "hints"],
        additionalProperties: false,
      },
      level: { type: "string", enum: ["A2", "B1", "B2", "C1"] },
      levelNote: { type: "string" },
    },
    required: [
      "praise",
      "rewrite",
      "mistakes",
      "expressions",
      "shadowing",
      "followUp",
      "level",
      "levelNote",
    ],
    additionalProperties: false,
  };
}

export const FEEDBACK_SCHEMA = feedbackSchema("normal");
export const EASY_FEEDBACK_SCHEMA = feedbackSchema("easy");
