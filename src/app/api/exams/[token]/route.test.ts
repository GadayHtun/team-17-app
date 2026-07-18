/**
 * GET /api/exams/[token] — candidate fetch (Ticket 4).
 * The headline assertion (red line 1): answerIndex is ABSENT from the raw
 * response body. Plus the error map: 404 malformed / 404 unknown / 410 used.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ExamFile } from "@/shared/types";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "exam-get-"));
  process.env.DATA_DIR = dir;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const TOKEN = "8f3a91cd-77b2-4c1e-9d3f-2a6b8e4f0c15";

function examFile(overrides: Partial<ExamFile> = {}): ExamFile {
  return {
    token: TOKEN,
    jobTitle: "Frontend Developer",
    candidateEmail: "candidate@mail.com",
    createdAt: "2026-07-07T10:30:00Z",
    status: "active",
    currentQuestionIndex: 0,
    currentDifficulty: "easy",
    questions: [
      {
        id: "q01",
        text: "Which hook manages local state?",
        options: ["useEffect", "useState", "useRef", "useMemo"],
        answerIndex: 1,
        difficulty: "easy",
        marks: 1,
      },
    ],
    ...overrides,
  };
}

const req = new Request("http://localhost/api/exams/x");

describe("GET /api/exams/[token]", () => {
  it("strips answerIndex from the raw body and allowlists fields", async () => {
    const { GET } = await import("./route");
    const { createExam } = await import("@/storage/storage");
    await createExam(examFile());

    const res = await GET(req, { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(200);

    const rawText = await res.clone().text();
    expect(rawText).not.toContain("answerIndex"); // assert on the wire, not just the object

    const body = await res.json();
    expect(body.jobTitle).toBe("Frontend Developer");
    // Response now returns a single question, not an array
    expect(body.question).toBeDefined();
    expect(Object.keys(body.question).sort()).toEqual(
      ["id", "marks", "options", "text"].sort(),
    );
    expect(body.question).not.toHaveProperty("answerIndex");
    expect(body.question).not.toHaveProperty("difficulty");
  });

  it("404 for a malformed token (no fs access)", async () => {
    const { GET } = await import("./route");
    const res = await GET(req, {
      params: Promise.resolve({ token: "../../etc/passwd" }),
    });
    expect(res.status).toBe(404);
  });

  it("404 for an unknown but well-formed token", async () => {
    const { GET } = await import("./route");
    const res = await GET(req, { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(404);
  });

  it("410 when the exam is already used", async () => {
    const { GET } = await import("./route");
    const { createExam } = await import("@/storage/storage");
    await createExam(examFile({ status: "used" }));
    const res = await GET(req, { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
  });
});
