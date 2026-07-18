/**
 * Adaptive question routing engine — pure functions, no I/O.
 *
 * Algorithm:
 * - Start at "easy" difficulty.
 * - Correct answer → move UP one tier (easy→medium, medium→hard).
 * - Wrong answer → move DOWN one tier (hard→medium, medium→easy).
 * - Clamp to [easy, hard] — never go below easy or above hard.
 * - Serve the next unanswered question from the target tier.
 * - When no unanswered questions remain in any tier → exam complete.
 */
import type { Difficulty, Question } from "@/shared/types";

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

/**
 * Given the current difficulty and whether the last answer was correct,
 * return the next difficulty tier to serve.
 */
export function nextDifficulty(
  current: Difficulty,
  wasCorrect: boolean,
): Difficulty {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  if (wasCorrect) {
    return DIFFICULTY_ORDER[Math.min(idx + 1, DIFFICULTY_ORDER.length - 1)];
  }
  return DIFFICULTY_ORDER[Math.max(idx - 1, 0)];
}

/**
 * Pick the next question to serve.
 *
 * @param questions - the full ordered question list (easy block, then medium, then hard)
 * @param answeredIds - set of question IDs already answered
 * @param targetDifficulty - the difficulty tier to pull from
 * @returns the next question, or null if all questions have been answered
 */
export function pickNextQuestion(
  questions: readonly Question[],
  answeredIds: ReadonlySet<string>,
  targetDifficulty: Difficulty,
): Question | null {
  // First, try to find an unanswered question in the target tier.
  for (const q of questions) {
    if (q.difficulty === targetDifficulty && !answeredIds.has(q.id)) {
      return q;
    }
  }

  // If none in target tier, try adjacent tiers (closest first).
  const targetIdx = DIFFICULTY_ORDER.indexOf(targetDifficulty);
  const searchOrder = [
    ...DIFFICULTY_ORDER.slice(targetIdx + 1),
    ...DIFFICULTY_ORDER.slice(0, targetIdx).reverse(),
  ];

  for (const tier of searchOrder) {
    for (const q of questions) {
      if (q.difficulty === tier && !answeredIds.has(q.id)) {
        return q;
      }
    }
  }

  return null; // all questions answered
}
