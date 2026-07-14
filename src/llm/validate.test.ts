import { describe, it, expect } from "vitest";
import { validateBatch, validateOne } from "./validate";
import type { NewQuestion } from "@/shared/types";

// ─── Valid fixtures ────────────────────────────────────────────────

const validBatch: NewQuestion[] = [
  {
    text: "What does JSX stand for?",
    options: [
      "JavaScript XML",
      "Java Syntax Extension",
      "JSON XML",
      "JavaScript Extension",
    ],
    answerIndex: 0,
    difficulty: "easy",
  },
  {
    text: "Which hook manages side effects in React?",
    options: ["useState", "useEffect", "useRef", "useMemo"],
    answerIndex: 1,
    difficulty: "easy",
  },
  {
    text: "What is the virtual DOM in React?",
    options: [
      "A direct copy of the real DOM",
      "An in-memory representation of the UI",
      "A browser API for DOM manipulation",
      "A server-side rendering technique",
    ],
    answerIndex: 2,
    difficulty: "medium",
  },
  {
    text: "When would you use useCallback over useMemo?",
    options: [
      "When memoizing a computed value",
      "When memoizing a function reference",
      "When caching API responses",
      "When optimizing CSS animations",
    ],
    answerIndex: 3,
    difficulty: "medium",
  },
  {
    text: "What problem does React Fiber solve?",
    options: [
      "Bundle size reduction",
      "Incremental rendering with priority scheduling",
      "Server-side rendering performance",
      "Type safety for props",
    ],
    answerIndex: 1,
    difficulty: "hard",
  },
  {
    text: "How do you prevent re-renders in a complex component tree?",
    options: [
      "Use React.memo and useMemo strategically",
      "Wrap everything in useCallback",
      "Use shouldComponentUpdate in all components",
      "Disable React DevTools",
    ],
    answerIndex: 0,
    difficulty: "hard",
  },
];

// ─── Layer 1: Parse ────────────────────────────────────────────────

describe("validateBatch — Layer 1 (parse)", () => {
  it("accepts valid JSON string", () => {
    const input = JSON.stringify({ questions: validBatch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(true);
  });

  it("strips markdown-fenced JSON and parses", () => {
    const fenced = "```json\n" + JSON.stringify({ questions: validBatch }) + "\n```";
    const result = validateBatch(fenced, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(true);
  });

  it("strips triple-backtick fences without language tag", () => {
    const fenced = "```\n" + JSON.stringify({ questions: validBatch }) + "\n```";
    const result = validateBatch(fenced, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = validateBatch("not json at all", { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("parse");
    }
  });
});

// ─── Layer 2: Schema ───────────────────────────────────────────────

describe("validateBatch — Layer 2 (schema)", () => {
  it("rejects when 'questions' key is missing", () => {
    const input = JSON.stringify({ notQuestions: [] });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("questions");
    }
  });

  it("rejects a question with only 3 options", () => {
    const bad = [
      ...validBatch.slice(0, 5),
      {
        text: "Bad question",
        options: ["A", "B", "C"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: bad });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("options"))).toBe(true);
    }
  });

  it("rejects a question with 5 options", () => {
    const bad = [
      ...validBatch.slice(0, 5),
      {
        text: "Bad question",
        options: ["A", "B", "C", "D", "E"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: bad });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("options"))).toBe(true);
    }
  });

  it("rejects answerIndex outside 0-3", () => {
    const bad = [
      ...validBatch.slice(0, 5),
      {
        text: "Bad question",
        options: ["A", "B", "C", "D"],
        answerIndex: 5,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: bad });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("answerIndex"))).toBe(true);
    }
  });

  it("rejects invalid difficulty tier", () => {
    const bad = [
      ...validBatch.slice(0, 5),
      {
        text: "Bad question",
        options: ["A", "B", "C", "D"],
        answerIndex: 0,
        difficulty: "expert",
      },
    ];
    const input = JSON.stringify({ questions: bad });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("difficulty"))).toBe(true);
    }
  });

  it("rejects when tier counts don't match requested", () => {
    // Request 3 easy but only 2 provided
    const input = JSON.stringify({ questions: validBatch });
    const result = validateBatch(input, { easy: 3, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("count") || e.includes("easy"))).toBe(true);
    }
  });

  it("rejects a question with missing text field", () => {
    const bad = [
      ...validBatch.slice(0, 5),
      {
        options: ["A", "B", "C", "D"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: bad });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("text"))).toBe(true);
    }
  });
});

// ─── Layer 3: Quality ──────────────────────────────────────────────

describe("validateBatch — Layer 3 (quality)", () => {
  it("rejects duplicate question texts", () => {
    // Use validBatch[0] (easy) twice, then correct tier counts
    const dupe = validBatch[0];
    const batch = [
      dupe,
      dupe, // duplicate easy text
      validBatch[2], // medium
      validBatch[3], // medium
      validBatch[4], // hard
      validBatch[5], // hard
    ];
    const input = JSON.stringify({ questions: batch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.toLowerCase().includes("duplicate"))).toBe(true);
    }
  });

  it("rejects duplicate options within a question", () => {
    const batch = [
      ...validBatch.slice(0, 5),
      {
        text: "Question with duplicate options",
        options: ["Same", "Same", "C", "D"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: batch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("duplicate option"))).toBe(true);
    }
  });

  it("rejects empty string in question text", () => {
    const batch = [
      ...validBatch.slice(0, 5),
      {
        text: "",
        options: ["A", "B", "C", "D"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: batch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
    }
  });

  it("rejects empty string in option", () => {
    const batch = [
      ...validBatch.slice(0, 5),
      {
        text: "Question with empty option",
        options: ["A", "", "C", "D"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: batch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("empty"))).toBe(true);
    }
  });

  it("rejects overlong question text (>500 chars)", () => {
    const batch = [
      ...validBatch.slice(0, 5),
      {
        text: "A".repeat(501),
        options: ["A", "B", "C", "D"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: batch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("overlong"))).toBe(true);
    }
  });

  it("rejects overlong option text (>200 chars)", () => {
    const batch = [
      ...validBatch.slice(0, 5),
      {
        text: "Question with long option",
        options: ["A", "B".repeat(201), "C", "D"],
        answerIndex: 0,
        difficulty: "hard",
      },
    ];
    const input = JSON.stringify({ questions: batch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("overlong"))).toBe(true);
    }
  });

  it("rejects clustered answer positions (all same index)", () => {
    // All answers at index 0 — clustered
    const batch: NewQuestion[] = validBatch.map((q) => ({
      ...q,
      answerIndex: 0,
    }));
    const input = JSON.stringify({ questions: batch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("cluster"))).toBe(true);
    }
  });
});

// ─── validateOne ───────────────────────────────────────────────────

describe("validateOne", () => {
  it("accepts a valid single question", () => {
    const result = validateOne(validBatch[0]);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid answerIndex", () => {
    const result = validateOne({
      text: "Q",
      options: ["A", "B", "C", "D"],
      answerIndex: 99,
      difficulty: "easy",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid difficulty", () => {
    const result = validateOne({
      text: "Q",
      options: ["A", "B", "C", "D"],
      answerIndex: 0,
      difficulty: "invalid",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty text", () => {
    const result = validateOne({
      text: "",
      options: ["A", "B", "C", "D"],
      answerIndex: 0,
      difficulty: "easy",
    });
    expect(result.ok).toBe(false);
  });
});

// ─── Valid batch passes all layers ─────────────────────────────────

describe("validateBatch — full happy path", () => {
  it("passes all three layers for a valid batch", () => {
    const input = JSON.stringify({ questions: validBatch });
    const result = validateBatch(input, { easy: 2, medium: 2, hard: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.questions).toHaveLength(6);
    }
  });
});
