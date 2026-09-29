export interface Topic {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
}

export const TOPICS: Topic[] = [
  {
    id: "introduce-yourself",
    label: "Introduce yourself",
    emoji: "🙂",
    blurb: "내가 어떤 사람인지 내 말로",
  },
  {
    id: "your-job",
    label: "Your job",
    emoji: "💼",
    blurb: "하루 종일 무슨 일을 하는지",
  },
  {
    id: "your-hobbies",
    label: "Your hobbies",
    emoji: "🎧",
    blurb: "쉴 때 뭘 하고 노는지",
  },
  {
    id: "biggest-challenge",
    label: "Your biggest challenge",
    emoji: "⛰️",
    blurb: "버텨냈던 어려운 순간",
  },
  {
    id: "hometown",
    label: "Your hometown",
    emoji: "🏘️",
    blurb: "내가 자란 동네",
  },
  {
    id: "travel",
    label: "Travel experience",
    emoji: "✈️",
    blurb: "아직도 생각나는 여행",
  },
  {
    id: "goals",
    label: "Your goals",
    emoji: "🎯",
    blurb: "앞으로 가고 싶은 방향",
  },
  {
    id: "dating",
    label: "Dating",
    emoji: "💬",
    blurb: "설렜던 일, 어색했던 일",
  },
  {
    id: "daily-routine",
    label: "Daily routine",
    emoji: "☕",
    blurb: "평범한 하루의 흐름",
  },
];

export function topicLabel(id: string): string {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}
