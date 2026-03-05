import rawIndex from "@/data/preseason-index.json";

export type PreseasonIndexItem = {
  id: string;
  day: number;
  date: string;
  arc: string;
  characters: string[];
  tweet_url: string | null;
  title: string;
  summary: string;
  thumb: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPreseasonIndex(): PreseasonIndexItem[] {
  const entries = rawIndex as PreseasonIndexItem[];
  return [...entries].sort((a, b) => a.day - b.day);
}

export function arcKey(arc: string) {
  return slugify(arc);
}

export function characterKey(character: string) {
  return slugify(character);
}
