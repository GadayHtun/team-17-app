/**
 * Pure helper functions for the candidate exam page.
 * Extracted for testability — no React, no I/O.
 */
import type { CandidateQuestion } from "@/shared/types";

export interface Section {
  tier: string;
  questions: CandidateQuestion[];
}

export const TIER_ORDER = ["easy", "medium", "hard"] as const;

/**
 * Group questions by difficulty tier in easy → medium → hard order.
 * Only includes tiers that have at least one question.
 */
export function groupByTier(questions: CandidateQuestion[]): Section[] {
  const groups = new Map<string, CandidateQuestion[]>();
  for (const tier of TIER_ORDER) {
    groups.set(tier, []);
  }
  for (const q of questions) {
    groups.get(q.difficulty)?.push(q);
  }
  return TIER_ORDER
    .filter((tier) => groups.get(tier)!.length > 0)
    .map((tier) => ({ tier, questions: groups.get(tier)! }));
}

/**
 * Flatten sections back into a single question list (preserving tier order).
 */
export function flattenSections(sections: Section[]): CandidateQuestion[] {
  return sections.flatMap((s) => s.questions);
}

/**
 * Find which section and position a question occupies.
 * Returns null if the questionId is not found.
 */
export function locateQuestion(
  sections: Section[],
  questionId: string,
): { sectionIdx: number; posInSection: number } | null {
  for (let si = 0; si < sections.length; si++) {
    for (let pi = 0; pi < sections[si].questions.length; pi++) {
      if (sections[si].questions[pi].id === questionId) {
        return { sectionIdx: si, posInSection: pi };
      }
    }
  }
  return null;
}
