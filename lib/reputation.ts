export interface ReputationBadge {
  label: string;
  minScore: number;
  color: string;
}

// Ordered highest to lowest — pick the first one the score qualifies for.
export const REPUTATION_BADGES: ReputationBadge[] = [
  { label: "Top contribuidor", minScore: 500, color: "var(--color-fallar-text)" },
  { label: "Apuntes estrella", minScore: 200, color: "var(--color-estudiar-text)" },
  { label: "Contribuidor activo", minScore: 50, color: "var(--color-explicar-text)" },
];

export function getBadgeForScore(score: number): ReputationBadge | null {
  return REPUTATION_BADGES.find((b) => score >= b.minScore) ?? null;
}

export const REPUTATION_POINTS = {
  postUpvote: 10,
  commentUpvote: 5,
  fiveStarNote: 20,
  noteDownload: 2,
} as const;
