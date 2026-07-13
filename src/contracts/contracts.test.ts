/**
 * Contract tests (testing skill §3): every committed fixture parses into its
 * src/shared type, and the answer-strip transform yields the CandidateQuestion
 * shape. Shapes are frozen by docs/contracts.md — a break here is a contract bug.
 */
import { describe, expect, it } from "vitest";

import batch from "../../fixtures/question-batch.json";
import examActive from "../../fixtures/exam-active.json";
import type {
  CandidateQuestion,
  ExamFile,
  NewQuestion,
  Question,
} from "@/shared/types";

const DIFFICULTIES = ["easy", "medium", "hard"];

function assertNewQuestion(q: NewQuestion) {
  expect(typeof q.text).toBe("string");
  expect(q.text.length).toBeGreaterThan(0);
  expect(q.options).toHaveLength(4);
  q.options.forEach((o) => expect(typeof o).toBe("string"));
  expect(Number.isInteger(q.answerIndex)).toBe(true);
  expect(q.answerIndex).toBeGreaterThanOrEqual(0);
  expect(q.answerIndex).toBeLessThanOrEqual(3);
  expect(DIFFICULTIES).toContain(q.difficulty);
}

describe("fixtures parse into shared types", () => {
  it("question-batch.json is NewQuestion[]", () => {
    const b = batch as { questions: NewQuestion[] };
    expect(Array.isArray(b.questions)).toBe(true);
    expect(b.questions.length).toBeGreaterThan(0);
    b.questions.forEach(assertNewQuestion);
  });

  it("exam-active.json is an ExamFile with finalized Questions", () => {
    const exam = examActive as ExamFile;
    expect(typeof exam.token).toBe("string");
    expect(typeof exam.jobTitle).toBe("string");
    expect(typeof exam.candidateEmail).toBe("string");
    expect(typeof exam.createdAt).toBe("string");
    expect(["active", "used"]).toContain(exam.status);
    exam.questions.forEach((q: Question) => {
      assertNewQuestion(q);
      expect(typeof q.id).toBe("string");
      expect(typeof q.marks).toBe("number");
    });
  });
});

describe("CandidateQuestion shape (GET /api/exams/[token])", () => {
  it("omits answerIndex, keeps the allowlisted fields", () => {
    const q = (examActive as ExamFile).questions[0];
    const cq: CandidateQuestion = {
      id: q.id,
      text: q.text,
      options: q.options,
      difficulty: q.difficulty,
      marks: q.marks,
    };
    expect(cq).not.toHaveProperty("answerIndex");
    expect(Object.keys(cq).sort()).toEqual(
      ["difficulty", "id", "marks", "options", "text"].sort(),
    );
  });
});
