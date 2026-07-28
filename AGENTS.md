<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Yap

**Read [`docs/product-spec.md`](docs/product-spec.md) before changing behaviour, prompts, or data.** It holds the reasoning — what each rule is protecting, what is deliberately out of scope, and the plan for moving off localStorage.

The spec is the source of truth. If you change one of these decisions, update it in the same commit.

## Rules that are not preferences

These look like style choices and are not. Each one is load-bearing.

1. **Praise comes first.** Never open feedback with a correction. Someone who gets grammar-corrected first does not come back tomorrow.
2. **Every question ships with 4–5 idea hints.** "생각이 안 나요" is the reason this app exists. Hints are short fragments (2–6 words) from different angles — never full sentences, never model answers.
3. **The conversation never ends.** Feedback always closes with another question. No "see you tomorrow" sign-offs.
4. **Study material is English; explanations are Korean.** Question, hints, rewrite, expressions, shadowing and examples stay English. Mistake reasons, expression meanings and level notes are Korean (해요체). Explaining in English burns the attention the learner needs for the actual learning.
5. **The rewrite is not a grammar fix.** It is how a native speaker would really say it — while keeping the learner's meaning, details and personality. Never invent facts they did not write.
6. **English variant drives tone, not just spelling.** `src/lib/english.ts` owns it. Changing the variant changes spelling, vocabulary, grammar, register and TTS voice together.

## Working notes

- **Design: this user has rejected two AI-looking redesigns.** The fix was never colour — it was the visual vocabulary (glassmorphism, glowing accents, chunky offset shadows, emoji chrome, novelty fonts all read as "AI template"). Current look is cloud white with hairlines, restrained type and quiet animation. Keep it plain.
- **The API key is the user's and metered.** Gemini's free tier ran out at 20 requests/day in real use. Don't spend calls casually; say so when you do.
- **Commit messages: one line, no body.** English, imperative, sentence case, no `feat:` prefix, no trailing full stop. Say what changed for the learner, not which files moved — "Show the usage card before there is any usage", not "Update Home.tsx". The long explanatory bodies in the history are the user's own; do not imitate them.
- **Verify against the installed SDKs, not memory.** `@google/genai` and Next 16 both have surfaces that postdate training data. Read the `.d.ts` files.
