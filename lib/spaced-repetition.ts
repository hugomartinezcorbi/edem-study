import type { SpacedRepetition } from "@/lib/types";

/**
 * SM-2 spaced repetition, simplified. `quality` is 0-5 (5 = perfect recall).
 */
export function updateSpacedRepetition(
  current: Pick<SpacedRepetition, "ease_factor" | "interval_days" | "repetitions">,
  quality: number
): Pick<SpacedRepetition, "ease_factor" | "interval_days" | "repetitions" | "next_review" | "last_reviewed"> {
  let { ease_factor, interval_days, repetitions } = current;

  if (quality >= 3) {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 3;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval_days = 1;
  }

  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval_days);

  return {
    ease_factor,
    interval_days,
    repetitions,
    next_review: nextReview.toISOString().slice(0, 10),
    last_reviewed: new Date().toISOString(),
  };
}

/** Maps a simple correct/incorrect + phase outcome to an SM-2 quality score. */
export function qualityFromOutcome(correctInFallar: boolean, correctInVolver: boolean): number {
  if (correctInFallar) return 5;
  if (correctInVolver) return 3;
  return 1;
}

export function masteryFromHistory(timesCorrect: number, timesAsked: number): number {
  if (timesAsked === 0) return 0;
  return Math.min(1, timesCorrect / timesAsked);
}
