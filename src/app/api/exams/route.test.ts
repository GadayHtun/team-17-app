/**
 * POST /api/exams — finalize behaviour (Ticket 4).
 * Server assigns token + ids + marks, orders easy→medium→hard, shuffles options
 * while preserving the correct answer, and rejects malformed bodies with 400.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { NewQuestion } from "@/shared/types";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "exam-post-"));
  process.env.DATA_DIR = dir;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const QUESTIONS: NewQuestion[] = [
  {
    text: "hard-q",
    options: ["a", "b", "c", "d"],
    answerIndex: 2,
    difficulty: "hard",
  },
  {
    text: "easy-q",
    options: ["w", "x", "y", "z"],
    answerIndex: 0,
    difficulty: "easy",
  },
  {
    text: "medium-q",
    options: ["m", "n", "o", "p"],
    answerIndex: 3,
    difficulty: "medium",
  },
];

function post(body: unknown): Request {
  return new Request("http://localhost/api/exams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/exams", () => {
  it("finalizes: token, link, ordered ids + marks, answer preserved after shuffle", async () => {
    const { POST } = await import("./route");
    const { loadExam } = await import("@/storage/storage");

    const res = await POST(
      post({ jobTitle: "FE", candidateEmail: "c@mail.com", questions: QUESTIONS }),
    );
    expect(res.status).toBe(201);
    const out = await res.json();
    expect(out.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(out.link).toBe(`http://localhost:3000/exam/${out.token}`);
    expect(typeof out.createdAt).toBe("string");

    const exam = (await loadExam(out.token))!;
    // stored easy → medium → hard, ids sequential, marks from MARKS
    expect(exam.questions.map((q) => q.difficulty)).toEqual([
      "easy",
      "medium",
      "hard",
    ]);
    expect(exam.questions.map((q) => q.id)).toEqual(["q01", "q02", "q03"]);
    expect(exam.questions.map((q) => q.marks)).toEqual([1, 2, 3]);
    // shuffle relocates the correct option but keeps it correct
    const easy = exam.questions[0];
    expect(easy.options.slice().sort()).toEqual(["w", "x", "y", "z"]);
    expect(easy.options[easy.answerIndex]).toBe("w");
    expect(exam.status).toBe("active");
  });

  it.each([
    ["missing questions", { jobTitle: "FE", candidateEmail: "c@mail.com" }],
    ["empty questions", { jobTitle: "FE", candidateEmail: "c@mail.com", questions: [] }],
    [
      "answerIndex out of range",
      {
        jobTitle: "FE",
        candidateEmail: "c@mail.com",
        questions: [{ ...QUESTIONS[0], answerIndex: 5 }],
      },
    ],
    [
      "wrong option count",
      {
        jobTitle: "FE",
        candidateEmail: "c@mail.com",
        questions: [{ ...QUESTIONS[0], options: ["a", "b", "c"] }],
      },
    ],
    ["empty jobTitle", { jobTitle: "", candidateEmail: "c@mail.com", questions: QUESTIONS }],
  ])("rejects %s with 400", async (_label, body) => {
    const { POST } = await import("./route");
    const res = await POST(post(body));
    expect(res.status).toBe(400);
  });

  it("rejects a non-JSON body with 400", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/exams", { method: "POST", body: "{" }),
    );
    expect(res.status).toBe(400);
  });
});
