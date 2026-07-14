/**
 * Unit tests for candidate exam page helpers — pure functions, no I/O.
 * TDD seam: groupByTier, flattenSections, locateQuestion.
 */
import { describe, expect, it } from "vitest";

import type { CandidateQuestion } from "@/shared/types";

import {
  type Section,
  flattenSections,
  groupByTier,
  locateQuestion,
} from "./helpers";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

function q(id: string, difficulty: CandidateQuestion["difficulty"]): CandidateQuestion {
  return {
    id,
    text: `Question ${id}`,
    options: ["a", "b", "c", "d"],
    difficulty,
    marks: difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3,
  };
}

const MIXED_QUESTIONS: CandidateQuestion[] = [
  q("q01", "easy"),
  q("q02", "medium"),
  q("q03", "easy"),
  q("q04", "hard"),
  q("q05", "medium"),
];

const EASY_ONLY: CandidateQuestion[] = [q("q01", "easy"), q("q02", "easy")];

/* ------------------------------------------------------------------ */
/*  groupByTier                                                       */
/* ------------------------------------------------------------------ */

describe("groupByTier", () => {
  it("groups questions by difficulty in easy → medium → hard order", () => {
    const sections = groupByTier(MIXED_QUESTIONS);

    expect(sections).toHaveLength(3);
    expect(sections[0].tier).toBe("easy");
    expect(sections[1].tier).toBe("medium");
    expect(sections[2].tier).toBe("hard");
  });

  it("preserves question order within each tier", () => {
    const sections = groupByTier(MIXED_QUESTIONS);

    expect(sections[0].questions.map((q) => q.id)).toEqual(["q01", "q03"]);
    expect(sections[1].questions.map((q) => q.id)).toEqual(["q02", "q05"]);
    expect(sections[2].questions.map((q) => q.id)).toEqual(["q04"]);
  });

  it("returns only tiers that have questions", () => {
    const sections = groupByTier(EASY_ONLY);

    expect(sections).toHaveLength(1);
    expect(sections[0].tier).toBe("easy");
  });

  it("returns empty array for empty input", () => {
    expect(groupByTier([])).toEqual([]);
  });

  it("handles a single question", () => {
    const sections = groupByTier([q("q01", "hard")]);

    expect(sections).toHaveLength(1);
    expect(sections[0].tier).toBe("hard");
    expect(sections[0].questions).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  flattenSections                                                   */
/* ------------------------------------------------------------------ */

describe("flattenSections", () => {
  it("flattens sections back into a single list", () => {
    const sections = groupByTier(MIXED_QUESTIONS);
    const flat = flattenSections(sections);

    expect(flat).toHaveLength(5);
    expect(flat.map((q) => q.id)).toEqual([
      "q01", "q03", // easy
      "q02", "q05", // medium
      "q04",        // hard
    ]);
  });

  it("returns empty array for empty sections", () => {
    expect(flattenSections([])).toEqual([]);
  });

  it("preserves order: easy questions come before medium, medium before hard", () => {
    const sections = groupByTier(MIXED_QUESTIONS);
    const flat = flattenSections(sections);

    const difficulties = flat.map((q) => q.difficulty);
    expect(difficulties).toEqual(["easy", "easy", "medium", "medium", "hard"]);
  });
});

/* ------------------------------------------------------------------ */
/*  locateQuestion                                                    */
/* ------------------------------------------------------------------ */

describe("locateQuestion", () => {
  const sections = groupByTier(MIXED_QUESTIONS);

  it("finds the first easy question (section 0, position 0)", () => {
    const loc = locateQuestion(sections, "q01");
    expect(loc).toEqual({ sectionIdx: 0, posInSection: 0 });
  });

  it("finds the second easy question (section 0, position 1)", () => {
    const loc = locateQuestion(sections, "q03");
    expect(loc).toEqual({ sectionIdx: 0, posInSection: 1 });
  });

  it("finds the first medium question (section 1, position 0)", () => {
    const loc = locateQuestion(sections, "q02");
    expect(loc).toEqual({ sectionIdx: 1, posInSection: 0 });
  });

  it("finds the hard question (section 2, position 0)", () => {
    const loc = locateQuestion(sections, "q04");
    expect(loc).toEqual({ sectionIdx: 2, posInSection: 0 });
  });

  it("returns null for an unknown question id", () => {
    expect(locateQuestion(sections, "q99")).toBeNull();
  });

  it("returns null for empty sections", () => {
    expect(locateQuestion([], "q01")).toBeNull();
  });
});
