import type { Difficulty } from "./types";

/**
 * Marks per difficulty tier — contracts section 6.
 */
export const MARKS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};
