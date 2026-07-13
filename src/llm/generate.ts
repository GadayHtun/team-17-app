import type { NewQuestion, Difficulty } from "@/shared/types";
import { buildPrompt, buildOnePrompt } from "./prompt";
import { validateBatch, validateOne } from "./validate";

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 60_000;

interface GenerateInput {
  jobDescription: string;
  counts: { easy: number; medium: number; hard: number };
}

interface GenerateOneInput {
  jobDescription: string;
  difficulty: Difficulty;
  excludeTexts: string[];
}

interface GenerateSuccess {
  ok: true;
  questions: NewQuestion[];
}

interface GenerateOneSuccess {
  ok: true;
  question: NewQuestion;
}

interface GenerateError {
  ok: false;
  error: string;
}

type GenerateResult = GenerateSuccess | GenerateError;
type GenerateOneResult = GenerateOneSuccess | GenerateError;

/**
 * Load fixture questions for MOCK_LLM mode.
 */
function loadFixtures(): NewQuestion[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fixture = require("../../fixtures/question-batch.json");
  return fixture.questions as NewQuestion[];
}

/**
 * Call the LLM API with JSON mode.
 */
async function callLlm(prompt: string): Promise<string> {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("LLM_BASE_URL and LLM_API_KEY must be set");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      throw new Error(`LLM API returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate a batch of questions with retry and salvage logic.
 */
export async function generateQuestions(input: GenerateInput): Promise<GenerateResult> {
  // MOCK_LLM mode — serve fixtures
  if (process.env.MOCK_LLM === "true") {
    const fixtures = loadFixtures();
    // Filter to match requested counts
    const easy = fixtures.filter((q) => q.difficulty === "easy").slice(0, input.counts.easy);
    const medium = fixtures.filter((q) => q.difficulty === "medium").slice(0, input.counts.medium);
    const hard = fixtures.filter((q) => q.difficulty === "hard").slice(0, input.counts.hard);
    return { ok: true, questions: [...easy, ...medium, ...hard] };
  }

  const prompt = buildPrompt(input.jobDescription, input.counts);
  const allErrors: string[] = [];
  const salvaged: NewQuestion[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callLlm(prompt);
      const validation = validateBatch(raw, input.counts);

      if (validation.ok) {
        return { ok: true, questions: validation.questions };
      }

      allErrors.push(...validation.errors);

      // Salvage: collect valid questions from partial batch
      // Re-parse to extract what we can
      try {
        let cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
        }
        const parsed = JSON.parse(cleaned) as { questions?: unknown[] };
        if (Array.isArray(parsed.questions)) {
          for (const q of parsed.questions) {
            const singleResult = validateOne(q);
            if (singleResult.ok) {
              salvaged.push(singleResult.questions[0]);
            }
          }
        }
      } catch {
        // Ignore parse errors during salvage
      }

      // Check if we have enough salvaged questions
      const easyCount = salvaged.filter((q) => q.difficulty === "easy").length;
      const mediumCount = salvaged.filter((q) => q.difficulty === "medium").length;
      const hardCount = salvaged.filter((q) => q.difficulty === "hard").length;

      if (
        easyCount >= input.counts.easy &&
        mediumCount >= input.counts.medium &&
        hardCount >= input.counts.hard
      ) {
        return {
          ok: true,
          questions: [
            ...salvaged.filter((q) => q.difficulty === "easy").slice(0, input.counts.easy),
            ...salvaged.filter((q) => q.difficulty === "medium").slice(0, input.counts.medium),
            ...salvaged.filter((q) => q.difficulty === "hard").slice(0, input.counts.hard),
          ],
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      allErrors.push(`Attempt ${attempt}: ${msg}`);
    }
  }

  return {
    ok: false,
    error: `LLM generation failed after ${MAX_ATTEMPTS} attempts: ${allErrors.join("; ")}`,
  };
}

/**
 * Generate a single question with retry logic.
 */
export async function generateOne(input: GenerateOneInput): Promise<GenerateOneResult> {
  // MOCK_LLM mode — serve from fixtures
  if (process.env.MOCK_LLM === "true") {
    const fixtures = loadFixtures();
    const matching = fixtures.find(
      (q) => q.difficulty === input.difficulty && !input.excludeTexts.includes(q.text)
    );
    if (matching) {
      return { ok: true, question: matching };
    }
    // Fallback: return any question matching difficulty
    const any = fixtures.find((q) => q.difficulty === input.difficulty);
    if (any) {
      return { ok: true, question: any };
    }
    // Last resort: return first fixture
    return { ok: true, question: fixtures[0] };
  }

  const prompt = buildOnePrompt(input.jobDescription, input.difficulty, input.excludeTexts);
  const allErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callLlm(prompt);
      const validation = validateOne(JSON.parse(raw).questions?.[0] ?? raw);

      if (validation.ok) {
        return { ok: true, question: validation.questions[0] };
      }

      allErrors.push(...validation.errors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      allErrors.push(`Attempt ${attempt}: ${msg}`);
    }
  }

  return {
    ok: false,
    error: `LLM generation failed after ${MAX_ATTEMPTS} attempts: ${allErrors.join("; ")}`,
  };
}
