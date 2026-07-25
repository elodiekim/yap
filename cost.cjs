const { GoogleGenAI } = require("@google/genai");
const P = require(process.env.SP + "/cost/prompts.js");
const S = require(process.env.SP + "/cost/schemas.js");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ANSWER = `I work as a backend developer at a small startup in Seoul. My typical day starts around nine, and the first thing I do is check if any alerts fired overnight. Last week we had a really difficult bug where our payment webhook was timing out, and it took me two days to find out that the database connection pool was too small. I felt a bit stupid because the fix was only one line, but my team lead said that finding it was the hard part. On the weekend I try not to think about work at all.`;
const wait = (s) => new Promise(r => setTimeout(r, s * 1000));

(async () => {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const it = await ai.interactions.create({
        model: "gemini-3.6-flash",
        system_instruction: P.COACH_SYSTEM,
        input: `Topic: job\nQuestion: What does a normal working day look like for you?\nAnswer: ${ANSWER}`,
        response_format: { type: "text", mime_type: "application/json", schema: S.FEEDBACK_SCHEMA },
        generation_config: { thinking_level: "medium", max_output_tokens: 8000 },
      });
      const u = it.usage ?? {};
      console.log(`시도 ${attempt}: 성공`);
      console.log("  입력:", u.total_input_tokens, "| 출력:", u.total_output_tokens,
                  "| 그중 사고:", u.total_thought_tokens);
      return;
    } catch (e) {
      const msg = e?.error?.error?.message ?? e.message ?? "";
      const delay = (msg.match(/retry in ([\d.]+)s/) || [])[1];
      console.log(`시도 ${attempt}: 429 | 재시도 대기 안내: ${delay ?? "없음"}초`);
      if (attempt < 4) { console.log(`  → 30초 기다렸다 재시도`); await wait(30); }
    }
  }
  console.log("4회 모두 실패 → 분당이 아니라 하루 한도일 가능성이 높음");
})();
