import { describe, expect, it } from "vitest";
import { grade, GradingValidationError, type GradingQuestion } from "./grade";

const questions: GradingQuestion[] = [
  {
    id: "q01",
    answerIndex: 1,
    difficulty: "easy",
    marks: 1,
  },
  {
    id: "q02",
    answerIndex: 0,
    difficulty: "medium",
    marks: 2,
  },
  {
    id: "q03",
    answerIndex: 2,
    difficulty: "hard",
    marks: 3,
  },
];

describe("grade", () => {
  it("scores all-correct answers", () => {
    expect(grade(questions, { q01: 1, q02: 0, q03: 2 })).toEqual({
      easy: { score: 1, max: 1 },
      medium: { score: 2, max: 2 },
      hard: { score: 3, max: 3 },
      total: { score: 6, max: 6 },
      percentage: 100,
    });
  });

  it("scores all-wrong answers as zero", () => {
    expect(grade(questions, { q01: 0, q02: 1, q03: 1 })).toEqual({
      easy: { score: 0, max: 1 },
      medium: { score: 0, max: 2 },
      hard: { score: 0, max: 3 },
      total: { score: 0, max: 6 },
      percentage: 0,
    });
  });

  it("scores a hand-computed partial submission", () => {
    expect(grade(questions, { q01: 1, q02: 3, q03: 2 })).toEqual({
      easy: { score: 1, max: 1 },
      medium: { score: 0, max: 2 },
      hard: { score: 3, max: 3 },
      total: { score: 4, max: 6 },
      percentage: 66.7,
    });
  });

  it("treats skipped answers as legal zero-mark answers", () => {
    expect(grade(questions, { q02: 0 })).toEqual({
      easy: { score: 0, max: 1 },
      medium: { score: 2, max: 2 },
      hard: { score: 0, max: 3 },
      total: { score: 2, max: 6 },
      percentage: 33.3,
    });
  });

  it("rejects answers for unknown question ids", () => {
    expect(() => grade(questions, { q99: 1 })).toThrow(
      GradingValidationError
    );
  });

  it("rejects option indexes outside 0 through 3", () => {
    expect(() => grade(questions, { q01: 4 })).toThrow(
      GradingValidationError
    );
  });

  it("rejects non-integer option indexes", () => {
    expect(() => grade(questions, { q01: 1.5 })).toThrow(
      GradingValidationError
    );
  });
});
