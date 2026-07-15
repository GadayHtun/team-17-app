import type { NewQuestion, Difficulty } from "@/shared/types";
import { buildPrompt, buildOnePrompt } from "./prompt";
import { validateBatch, validateOne } from "./validate";
import { getOpenRouter } from "./openrouter";

const MAX_ATTEMPTS = 3;

/**
 * Free model for local development.
 * Upgrade to paid models (e.g., openai/gpt-4o) for production.
 */
const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";

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
 * Call the LLM API via OpenRouter SDK with JSON mode.
 * Uses configurable model with free tier default for local development.
 */
async function callLlm(prompt: string): Promise<string> {
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const openrouter = getOpenRouter();

  console.log(`[LLM] Calling model: ${model}`);

  const completion = await openrouter.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("LLM returned empty response");
  }

  return content;
}

/**
 * Serve fixture questions filtered by requested counts.
 */
function serveFixtures(input: GenerateInput): GenerateResult {
  console.log("[LLM] Serving fixtures from question-batch.json");
  const fixtures = loadFixtures();
  const easy = fixtures.filter((q) => q.difficulty === "easy").slice(0, input.counts.easy);
  const medium = fixtures.filter((q) => q.difficulty === "medium").slice(0, input.counts.medium);
  const hard = fixtures.filter((q) => q.difficulty === "hard").slice(0, input.counts.hard);
  return { ok: true, questions: [...easy, ...medium, ...hard] };
}

/**
 * Generate a batch of questions with retry, salvage, and fallback to fixtures.
 */
export async function generateQuestions(input: GenerateInput): Promise<GenerateResult> {
  // MOCK_LLM mode — always serve fixtures
  if (process.env.MOCK_LLM === "true") {
    console.log("[LLM] MOCK_LLM=true, serving fixtures");
    return serveFixtures(input);
  }

  // Try LLM with fallback to fixtures
  const prompt = buildPrompt(input.jobDescription, input.counts);
  const allErrors: string[] = [];
  const salvaged: NewQuestion[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callLlm(prompt);
      const validation = validateBatch(raw, input.counts);

      if (validation.ok) {
        console.log(`[LLM] Success on attempt ${attempt}`);
        return { ok: true, questions: validation.questions };
      }

      allErrors.push(...validation.errors);

      // Salvage: collect valid questions from partial batch
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
        console.log(`[LLM] Salvaged ${salvaged.length} valid questions`);
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
      console.warn(`[LLM] Attempt ${attempt} failed: ${msg}`);
    }
  }

  // All LLM attempts failed — fallback to fixtures
  console.warn(`[LLM] All ${MAX_ATTEMPTS} attempts failed, falling back to fixtures`);
  return serveFixtures(input);
}

/**
 * Serve a single fixture question with fallback logic.
 */
function serveOneFixture(input: GenerateOneInput): GenerateOneResult {
  console.log("[LLM] Serving single fixture from question-batch.json");
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

/**
 * Generate a single question with retry and fallback to fixtures.
 */
export async function generateOne(input: GenerateOneInput): Promise<GenerateOneResult> {
  // MOCK_LLM mode — always serve fixtures
  if (process.env.MOCK_LLM === "true") {
    console.log("[LLM] MOCK_LLM=true, serving single fixture");
    return serveOneFixture(input);
  }

  // Try LLM with fallback to fixtures
  const prompt = buildOnePrompt(input.jobDescription, input.difficulty, input.excludeTexts);
  const allErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callLlm(prompt);
      const validation = validateOne(JSON.parse(raw).questions?.[0] ?? raw);

      if (validation.ok) {
        console.log(`[LLM] Single question success on attempt ${attempt}`);
        return { ok: true, question: validation.questions[0] };
      }

      allErrors.push(...validation.errors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      allErrors.push(`Attempt ${attempt}: ${msg}`);
      console.warn(`[LLM] Single question attempt ${attempt} failed: ${msg}`);
    }
  }

  // All LLM attempts failed — fallback to fixtures
  console.warn(`[LLM] All ${MAX_ATTEMPTS} attempts failed for single question, falling back to fixtures`);
  return serveOneFixture(input);
}
