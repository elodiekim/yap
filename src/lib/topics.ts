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
    emoji: "👋",
    blurb: "Who you are, in your own words",
  },
  {
    id: "your-job",
    label: "Your job",
    emoji: "💼",
    blurb: "What you do all day",
  },
  {
    id: "your-hobbies",
    label: "Your hobbies",
    emoji: "🎧",
    blurb: "What you do for fun",
  },
  {
    id: "biggest-challenge",
    label: "Your biggest challenge",
    emoji: "⛰️",
    blurb: "Something hard you went through",
  },
  {
    id: "hometown",
    label: "Your hometown",
    emoji: "🏘️",
    blurb: "Where you're from",
  },
  {
    id: "travel",
    label: "Travel experience",
    emoji: "✈️",
    blurb: "A trip you still think about",
  },
  {
    id: "goals",
    label: "Your goals",
    emoji: "🎯",
    blurb: "Where you're headed",
  },
  {
    id: "dating",
    label: "Dating",
    emoji: "💘",
    blurb: "Relationships, the awkward and the good",
  },
  {
    id: "daily-routine",
    label: "Daily routine",
    emoji: "☕",
    blurb: "A normal day for you",
  },
];

export function topicLabel(id: string): string {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}
