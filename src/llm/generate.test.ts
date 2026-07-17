import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the OpenRouter client so no test ever hits the real LLM API.
const createMock = vi.fn();
vi.mock("./openrouter", () => ({
  getOpenRouter: () => ({
    chat: { completions: { create: createMock } },
  }),
}));

import { generateQuestions, generateOne } from "./generate";
import fixtureBatch from "../../fixtures/question-batch.json";

/** Queue a raw assistant message as the next LLM response. */
function respondWith(content: string) {
  createMock.mockResolvedValueOnce({ choices: [{ message: { content } }] });
}

const oneQuestion = {
  text: "Which keyword declares a constant binding in JavaScript?",
  options: ["var", "let", "const", "static"],
  answerIndex: 2,
  difficulty: "easy",
};

const originalMock = process.env.MOCK_LLM;

beforeEach(() => {
  createMock.mockReset();
  process.env.MOCK_LLM = "false";
});

afterEach(() => {
  process.env.MOCK_LLM = originalMock;
});

// ─── Failure must surface, never fall back to fixtures ──────────────

describe("generateQuestions — failure surfaces as an error (contract: 502)", () => {
  it("returns ok:false after 3 failed attempts instead of serving fixtures", async () => {
    createMock.mockRejectedValue(new Error("429 rate limit exceeded"));

    const result = await generateQuestions({
      jobDescription: "ICU nurse",
      counts: { easy: 1, medium: 0, hard: 0 },
    });

    expect(result.ok).toBe(false);
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("includes the underlying failure reason in the error", async () => {
    createMock.mockRejectedValue(new Error("429 rate limit exceeded"));

    const result = await generateQuestions({
      jobDescription: "ICU nurse",
      counts: { easy: 1, medium: 0, hard: 0 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("429 rate limit exceeded");
  });

  it("never returns fixture questions when the LLM is unreachable", async () => {
    createMock.mockRejectedValue(new Error("network down"));

    const result = await generateQuestions({
      jobDescription: "ICU nurse",
      counts: { easy: 1, medium: 0, hard: 0 },
    });

    // A fixture batch would look ok:true with JS/React questions.
    expect(result.ok).toBe(false);
  });
});

describe("generateOne — failure surfaces as an error (contract: 502)", () => {
  it("returns ok:false after 3 failed attempts instead of serving a fixture", async () => {
    createMock.mockRejectedValue(new Error("429 rate limit exceeded"));

    const result = await generateOne({
      jobDescription: "ICU nurse",
      difficulty: "easy",
      excludeTexts: [],
    });

    expect(result.ok).toBe(false);
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("includes the underlying failure reason in the error", async () => {
    createMock.mockRejectedValue(new Error("429 rate limit exceeded"));

    const result = await generateOne({
      jobDescription: "ICU nurse",
      difficulty: "easy",
      excludeTexts: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("429 rate limit exceeded");
  });
});

// ─── MOCK_LLM must still serve fixtures (contract + CI depend on it) ─

describe("MOCK_LLM=true still serves fixtures", () => {
  it("generateQuestions serves fixtures without calling the LLM", async () => {
    process.env.MOCK_LLM = "true";

    const result = await generateQuestions({
      jobDescription: "anything",
      counts: { easy: 2, medium: 1, hard: 1 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.questions).toHaveLength(4);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("generateOne serves a fixture without calling the LLM", async () => {
    process.env.MOCK_LLM = "true";

    const result = await generateOne({
      jobDescription: "anything",
      difficulty: "easy",
      excludeTexts: [],
    });

    expect(result.ok).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
  });
});

// ─── MOCK_LLM fixture pool must never hand back a duplicate ─────────

describe("MOCK_LLM=true fixture pool respects excludeTexts", () => {
  const fixtures = fixtureBatch.questions;
  const easyTexts = fixtures.filter((q) => q.difficulty === "easy").map((q) => q.text);

  it("never returns a question the caller asked to exclude", async () => {
    process.env.MOCK_LLM = "true";

    const result = await generateOne({
      jobDescription: "anything",
      difficulty: "easy",
      // All but one easy fixture already on screen.
      excludeTexts: easyTexts.slice(0, easyTexts.length - 1),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(easyTexts.slice(0, easyTexts.length - 1)).not.toContain(result.question.text);
      expect(result.question.text).toBe(easyTexts[easyTexts.length - 1]);
    }
  });

  it("errors instead of duplicating when the pool for that tier is exhausted", async () => {
    process.env.MOCK_LLM = "true";

    const result = await generateOne({
      jobDescription: "anything",
      difficulty: "easy",
      excludeTexts: easyTexts, // every easy fixture already on screen
    });

    expect(result.ok).toBe(false);
  });

  it("says why the pool is exhausted", async () => {
    process.env.MOCK_LLM = "true";

    const result = await generateOne({
      jobDescription: "anything",
      difficulty: "easy",
      excludeTexts: easyTexts,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/fixture/i);
      expect(result.error).toContain("easy");
    }
  });

  it("never returns a question of the wrong difficulty", async () => {
    process.env.MOCK_LLM = "true";
    const hardTexts = fixtures.filter((q) => q.difficulty === "hard").map((q) => q.text);

    const result = await generateOne({
      jobDescription: "anything",
      difficulty: "hard",
      excludeTexts: hardTexts.slice(0, hardTexts.length - 1),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.difficulty).toBe("hard");
  });
});

// ─── generateOne response-shape robustness ──────────────────────────

describe("generateOne parses the shapes a model actually returns", () => {
  it("accepts the documented { questions: [q] } wrapper", async () => {
    respondWith(JSON.stringify({ questions: [oneQuestion] }));

    const result = await generateOne({
      jobDescription: "JS dev",
      difficulty: "easy",
      excludeTexts: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.text).toBe(oneQuestion.text);
  });

  it("accepts a bare question object with no wrapper", async () => {
    respondWith(JSON.stringify(oneQuestion));

    const result = await generateOne({
      jobDescription: "JS dev",
      difficulty: "easy",
      excludeTexts: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.text).toBe(oneQuestion.text);
  });

  it("accepts a response wrapped in markdown fences", async () => {
    respondWith("```json\n" + JSON.stringify({ questions: [oneQuestion] }) + "\n```");

    const result = await generateOne({
      jobDescription: "JS dev",
      difficulty: "easy",
      excludeTexts: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.text).toBe(oneQuestion.text);
  });

  it("retries and succeeds when the first response is unparseable", async () => {
    respondWith("Sure! Here is your question:");
    respondWith(JSON.stringify({ questions: [oneQuestion] }));

    const result = await generateOne({
      jobDescription: "JS dev",
      difficulty: "easy",
      excludeTexts: [],
    });

    expect(result.ok).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
