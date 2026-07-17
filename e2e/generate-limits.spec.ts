/**
 * Security (#14): the generate endpoints must cap request size SERVER-SIDE and
 * reject oversized input with 400 — BEFORE any LLM call. These are API tests
 * (Playwright `request` fixture, no browser). They run against the dev server
 * started by playwright.config with MOCK_LLM=true; the 400s happen in validation,
 * ahead of generation, so no real LLM is needed and valid requests serve fixtures.
 */
import { test, expect } from "@playwright/test";

const JD = "React + TypeScript role. 3+ years. REST APIs.";

test.describe("POST /api/exams/generate — count caps", () => {
  test("rejects a tier above the cap (easy=21) → 400", async ({ request }) => {
    const res = await request.post("/api/exams/generate", {
      data: { jobDescription: JD, counts: { easy: 21, medium: 0, hard: 0 } },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects negative counts → 400", async ({ request }) => {
    const res = await request.post("/api/exams/generate", {
      data: { jobDescription: JD, counts: { easy: -1, medium: 0, hard: 0 } },
    });
    expect(res.status()).toBe(400);
  });

  test("accepts counts within the cap (1/1/1) → 200 with questions", async ({ request }) => {
    const res = await request.post("/api/exams/generate", {
      data: { jobDescription: JD, counts: { easy: 1, medium: 1, hard: 1 } },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.questions.length).toBeGreaterThan(0);
  });
});

test.describe("POST /api/exams/generate-one — excludeTexts caps", () => {
  test("rejects an over-long excludeTexts array (101 items) → 400", async ({ request }) => {
    const res = await request.post("/api/exams/generate-one", {
      data: {
        jobDescription: JD,
        difficulty: "easy",
        excludeTexts: Array.from({ length: 101 }, (_, i) => `q${i}`),
      },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects an over-long single excludeText (>500 chars) → 400", async ({ request }) => {
    const res = await request.post("/api/exams/generate-one", {
      data: { jobDescription: JD, difficulty: "easy", excludeTexts: ["x".repeat(501)] },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects a non-string element in excludeTexts → 400", async ({ request }) => {
    const res = await request.post("/api/exams/generate-one", {
      data: { jobDescription: JD, difficulty: "easy", excludeTexts: [123] },
    });
    expect(res.status()).toBe(400);
  });

  test("accepts a valid single-question request → 200", async ({ request }) => {
    const res = await request.post("/api/exams/generate-one", {
      data: { jobDescription: JD, difficulty: "easy", excludeTexts: [] },
    });
    expect(res.status()).toBe(200);
  });
});
