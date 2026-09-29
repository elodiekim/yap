export interface Topic {
  id: string;
  label: string;
  /** Korean reading of the topic, shown under the English label. */
  ko: string;
  emoji: string;
  blurb: string;
}

export const TOPICS: Topic[] = [
  {
    id: "introduce-yourself",
    label: "Introduce yourself",
    ko: "자기소개",
    emoji: "🙂",
    blurb: "내가 어떤 사람인지 내 말로",
  },
  {
    id: "your-job",
    label: "Your job",
    ko: "하는 일",
    emoji: "💼",
    blurb: "하루 종일 무슨 일을 하는지",
  },
  {
    id: "your-hobbies",
    label: "Your hobbies",
    ko: "취미",
    emoji: "🎧",
    blurb: "쉴 때 뭘 하고 노는지",
  },
  {
    id: "biggest-challenge",
    label: "Your biggest challenge",
    ko: "힘들었던 일",
    emoji: "⛰️",
    blurb: "버텨냈던 어려운 순간",
  },
  {
    id: "hometown",
    label: "Your hometown",
    ko: "고향",
    emoji: "🏘️",
    blurb: "내가 자란 동네",
  },
  {
    id: "travel",
    label: "Travel experience",
    ko: "여행 경험",
    emoji: "✈️",
    blurb: "아직도 생각나는 여행",
  },
  {
    id: "goals",
    label: "Your goals",
    ko: "목표",
    emoji: "🎯",
    blurb: "앞으로 가고 싶은 방향",
  },
  {
    id: "dating",
    label: "Dating",
    ko: "연애",
    emoji: "💬",
    blurb: "설렜던 일, 어색했던 일",
  },
  {
    id: "daily-routine",
    label: "Daily routine",
    ko: "하루 일과",
    emoji: "☕",
    blurb: "평범한 하루의 흐름",
  },
];

export function topicLabel(id: string): string {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}

export function topicKo(id: string): string {
  return TOPICS.find((t) => t.id === id)?.ko ?? "";
}
