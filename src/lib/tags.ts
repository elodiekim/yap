/**
 * The fixed vocabulary of mistake patterns.
 *
 * Before this existed the model invented a tag per mistake — 20 corrections
 * produced 16 distinct tags, five of them variations on "spelling" — so
 * "recurring pattern" counted nothing and the question targeting built on top
 * of it was aiming at noise.
 *
 * Adding a tag is a product decision, not a code change: it alters what the
 * learner is told they keep getting wrong. Keep the list short enough that the
 * model picks the same tag twice, and biased toward the mistakes Korean
 * speakers actually make in English.
 */
export const TAG_GROUPS: { label: string; tags: Record<string, string> }[] = [
  {
    label: "관사와 한정사",
    tags: {
      "article-missing": "a/an/the 빠짐",
      "article-unnecessary": "관사를 붙이면 안 되는 자리",
      "determiner-wrong": "a·the·every·all 등 선택이 틀림",
    },
  },
  {
    label: "명사",
    tags: {
      "plural-form": "복수형 오류",
      countability: "셀 수 없는 명사를 세어버림",
    },
  },
  {
    label: "동사와 시제",
    tags: {
      "subject-verb-agreement": "주어와 동사 수 불일치",
      "verb-form": "동사 형태 (to부정사·-ing·과거분사)",
      "tense-past": "과거 시제",
      "tense-present-perfect": "현재완료 (since·for 포함)",
      "tense-habitual": "습관·일상을 말하는 현재",
      "tense-consistency": "한 문단 안에서 시제가 흔들림",
      "modal-verb": "can·should·would 등",
    },
  },
  {
    label: "전치사",
    tags: {
      preposition: "in·on·at·to 등",
      "phrasal-verb": "구동사",
    },
  },
  {
    label: "문장 구조",
    tags: {
      "word-order": "어순",
      "subject-omission": "주어 생략 (한국어 습관)",
      "run-on-sentence": "문장이 안 끊기고 이어짐",
      "conjunction-linking": "and·but·so·because 연결",
      "relative-clause": "관계절",
    },
  },
  {
    label: "단어 선택",
    tags: {
      "word-choice": "뜻은 맞지만 다른 단어가 자연스러움",
      collocation: "같이 안 쓰는 조합",
      "unnatural-phrasing": "문법은 맞는데 원어민은 그렇게 말 안 함",
      "direct-translation": "한국어를 그대로 옮긴 티",
      register: "격식이 상황과 안 맞음",
    },
  },
  {
    label: "영어 변종",
    tags: {
      "variant-mismatch": "배우는 변종이 아닌 표현 (elevator ↔ lift)",
    },
  },
  {
    label: "표기",
    tags: {
      spelling: "철자 (붙여쓰기 포함)",
      punctuation: "구두점",
    },
  },
];

export const TAGS: string[] = TAG_GROUPS.flatMap((g) => Object.keys(g.tags));

const LABELS: Record<string, string> = Object.fromEntries(
  TAG_GROUPS.flatMap((g) => Object.entries(g.tags)),
);

/** Korean label for a tag; falls back to the raw slug for pre-dictionary rows. */
export function tagLabel(tag: string): string {
  return LABELS[tag] ?? tag;
}

/** The tag list as the prompt sees it — slugs only, grouped for legibility. */
export function tagListForPrompt(): string {
  return TAG_GROUPS.map(
    (g) => `  ${Object.keys(g.tags).join(", ")}`,
  ).join("\n");
}
