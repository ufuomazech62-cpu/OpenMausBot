/**
 * The words people see when they use MausBot. Raw ids, endpoints and technical
 * notes stop here: none of them belong in a consumer surface. Detailed views
 * keep their precise labels separately.
 */

/** The one name a non-technical person needs for the intelligence behind the app. */
export const CONSUMER_AI_LABEL = "MausBot AI";

/**
 * True for strings that read like an implementation detail rather than a
 * product name: a slash path, a namespaced or pinned id, a hash, or a
 * parenthesised config. Plain model names and local tags ("GPT-5.6",
 * "Opus 5.5", "gemma2:2b") stay untouched so advanced views stay precise.
 */
export function looksTechnical(label: string): boolean {
  const value = label.trim();
  if (!value) return false;
  return [
    /[/\\]/,
    /::/,
    /@/,
    /#[0-9a-f]{6,}/i,
    /\([^)]*\b(?:config|configuration|api|key|endpoint|provider|engine|runtime|host|port|server|cli|model)\b[^)]*\)/i,
  ].some((pattern) => pattern.test(value));
}

/** Replace raw technical labels with the calm product name; keep human names. */
export function consumerModelLabel(label: string): string {
  return looksTechnical(label) ? CONSUMER_AI_LABEL : label;
}

export interface ConsumerInsight {
  id: string;
  title: string;
  body: string;
}

/** The complete insights copy: curated, friendly, and the same on every skin. */
export const CONSUMER_INSIGHTS: readonly ConsumerInsight[] = [
  {
    id: "learning",
    title: "Your assistant is learning",
    body: "Every conversation helps it understand how you like to work. It becomes more useful with each day.",
  },
  {
    id: "sync",
    title: "Team work stays in sync",
    body: "Shared work lands in one place, so everyone sees the latest without chasing updates.",
  },
  {
    id: "files",
    title: "Files are easier to find",
    body: "Ask for what you need in plain words. Your assistant finds the right file and brings it to you.",
  },
];
