import { TAGS } from "./tags";

const hints = {
  type: "array",
  minItems: 4,
  maxItems: 5,
  items: { type: "string" },
} as const;

export const PROMPT_SCHEMA = {
  type: "object",
  properties: {
    question: { type: "string" },
    hints,
  },
  required: ["question", "hints"],
  additionalProperties: false,
} as Record<string, unknown>;

export const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    praise: { type: "string" },
    rewrite: { type: "string" },
    mistakes: {
      type: "array",
      maxItems: 5,
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
      minItems: 3,
      maxItems: 3,
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
      minItems: 2,
      maxItems: 3,
      items: { type: "string" },
    },
    followUp: {
      type: "object",
      properties: {
        question: { type: "string" },
        hints,
      },
      required: ["question", "hints"],
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
} as Record<string, unknown>;
