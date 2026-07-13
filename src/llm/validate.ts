import type { NewQuestion, Difficulty } from "@/shared/types";

const VALID_DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];
const MAX_TEXT_LENGTH = 500;
const MAX_OPTION_LENGTH = 200;
const MIN_CLUSTER_RATIO = 0.6; // if >60% answers share same index → clustered

interface CountRequest {
  easy: number;
  medium: number;
  hard: number;
}

interface ValidationError {
  layer: "parse" | "schema" | "quality";
  message: string;
}

interface ValidResult {
  ok: true;
  questions: NewQuestion[];
}

interface InvalidResult {
  ok: false;
  errors: string[];
}

export type ValidationResult = ValidResult | InvalidResult;

/**
 * Strip markdown fences and parse JSON.
 * Layer 1: Parse
 */
function stripAndParse(raw: string): { parsed: unknown } | { error: string } {
  let cleaned = raw.trim();

  // Strip markdown fences: ```json ... ``` or ``` ... ```
  if (cleaned.startsWith("```")) {
    // Remove opening fence (with optional language tag)
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "");
    // Remove closing fence
    cleaned = cleaned.replace(/\n?```\s*$/, "");
    cleaned = cleaned.trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return { parsed };
  } catch {
    return { error: "parse: Invalid JSON — could not parse LLM output" };
  }
}

/**
 * Validate schema: fields, option count, answerIndex, difficulty, tier counts.
 * Layer 2: Schema
 */
function validateSchema(
  parsed: unknown,
  counts: CountRequest
): { questions: NewQuestion[] } | { errors: string[] } {
  const errors: string[] = [];

  if (
  typeof parsed !== "object" ||
  parsed === null ||
  !("questions" in parsed) ||
  !Array.isArray((parsed as Record<string, unknown>).questions)
) {
    return { errors: ["schema: Missing or invalid 'questions' array"] };
  }

  const questions = (parsed as { questions: unknown[] }).questions;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>;
    const prefix = `schema: Question ${i + 1} ("${String(q.text ?? "???").slice(0, 40)}")`;

    if (typeof q.text !== "string") {
      errors.push(`${prefix} — missing or invalid 'text'`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`${prefix} — 'options' must be an array of exactly 4`);
    }
    if (typeof q.answerIndex !== "number" || q.answerIndex < 0 || q.answerIndex > 3) {
      errors.push(`${prefix} — 'answerIndex' must be 0-3`);
    }
    if (typeof q.difficulty !== "string" || !VALID_DIFFICULTIES.includes(q.difficulty as Difficulty)) {
      errors.push(`${prefix} — 'difficulty' must be "easy", "medium", or "hard"`);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  // Check tier counts
  const typedQuestions = questions as NewQuestion[];
  const tierCounts = { easy: 0, medium: 0, hard: 0 };
  for (const q of typedQuestions) {
    tierCounts[q.difficulty]++;
  }

  if (tierCounts.easy !== counts.easy) {
    errors.push(`schema: Expected ${counts.easy} easy questions, got ${tierCounts.easy}`);
  }
  if (tierCounts.medium !== counts.medium) {
    errors.push(`schema: Expected ${counts.medium} medium questions, got ${tierCounts.medium}`);
  }
  if (tierCounts.hard !== counts.hard) {
    errors.push(`schema: Expected ${counts.hard} hard questions, got ${tierCounts.hard}`);
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { questions: typedQuestions };
}

/**
 * Validate quality: duplicates, empty/overlong strings, answer clustering.
 * Layer 3: Quality
 */
function validateQuality(questions: NewQuestion[]): { ok: true } | { errors: string[] } {
  const errors: string[] = [];

  // Check duplicate question texts
  const texts = new Set<string>();
  for (let i = 0; i < questions.length; i++) {
    const text = questions[i].text;
    if (texts.has(text)) {
      errors.push(`quality: Duplicate question text at position ${i + 1}: "${text.slice(0, 50)}"`);
    }
    texts.add(text);
  }

  // Check duplicate options within each question, empty/overlong strings
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `quality: Question ${i + 1}`;

    // Empty or overlong text
    if (q.text.trim().length === 0) {
      errors.push(`${prefix} — empty question text`);
    } else if (q.text.length > MAX_TEXT_LENGTH) {
      errors.push(`${prefix} — overlong question text (${q.text.length} > ${MAX_TEXT_LENGTH})`);
    }

    // Check options
    const optionSet = new Set<string>();
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      if (opt.trim().length === 0) {
        errors.push(`${prefix} — empty option at position ${j + 1}`);
      } else if (opt.length > MAX_OPTION_LENGTH) {
        errors.push(`${prefix} — overlong option at position ${j + 1} (${opt.length} > ${MAX_OPTION_LENGTH})`);
      }
      if (optionSet.has(opt)) {
        errors.push(`${prefix} — duplicate option "${opt.slice(0, 30)}"`);
      }
      optionSet.add(opt);
    }
  }

  // Check answer clustering (skip for single question — always 100%)
  if (questions.length > 1) {
    const indexCounts = [0, 0, 0, 0];
    for (const q of questions) {
      indexCounts[q.answerIndex]++;
    }
    const maxCount = Math.max(...indexCounts);
    const ratio = maxCount / questions.length;
    if (ratio > MIN_CLUSTER_RATIO) {
      const dominantIndex = indexCounts.indexOf(maxCount);
      errors.push(
        `quality: Answer positions clustered — ${maxCount}/${questions.length} answers at index ${dominantIndex}`
      );
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { ok: true };
}

/**
 * Validate a full batch of questions from LLM output.
 * Runs all three layers: parse → schema → quality.
 */
export function validateBatch(
  raw: string,
  counts: CountRequest
): ValidationResult {
  // Layer 1: Parse
  const parseResult = stripAndParse(raw);
  if ("error" in parseResult) {
    return { ok: false, errors: [parseResult.error] };
  }

  // Layer 2: Schema
  const schemaResult = validateSchema(parseResult.parsed, counts);
  if ("errors" in schemaResult) {
    return { ok: false, errors: schemaResult.errors };
  }

  // Layer 3: Quality
  const qualityResult = validateQuality(schemaResult.questions);
  if ("errors" in qualityResult) {
    return { ok: false, errors: qualityResult.errors };
  }

  return { ok: true, questions: schemaResult.questions };
}

/**
 * Validate a single question (for generate-one).
 * Wraps in an array and validates structure + quality, skipping count checks.
 */
export function validateOne(q: unknown): ValidationResult {
  // Wrap in array and validate structure
  const wrapped = { questions: [q] };
  const raw = JSON.stringify(wrapped);

  const parseResult = stripAndParse(raw);
  if ("error" in parseResult) {
    return { ok: false, errors: [parseResult.error] };
  }

  // Validate structure without count checks (pass generous counts that always match)
  const schemaResult = validateSchema(parseResult.parsed, { easy: 100, medium: 100, hard: 100 });
  if ("errors" in schemaResult) {
    // Filter out only count-mismatch errors (start with "schema: Expected")
    const structuralErrors = schemaResult.errors.filter(
      (e) => !e.startsWith("schema: Expected")
    );
    if (structuralErrors.length > 0) {
      return { ok: false, errors: structuralErrors };
    }
  }

  // Get the typed question from parsed output
  const parsed = parseResult.parsed as { questions: NewQuestion[] };
  const question = parsed.questions[0];

  // Validate quality
  const qualityResult = validateQuality([question]);
  if ("errors" in qualityResult) {
    return { ok: false, errors: qualityResult.errors };
  }

  return { ok: true, questions: [question] };
}
