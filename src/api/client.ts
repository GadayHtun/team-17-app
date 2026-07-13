/**
 * Thin HTTP wrapper for candidate/HR-facing BROWSER calls (nextjs skill, hard
 * rule: client components never call fetch directly). Server components read
 * through the server modules directly.
 */
import type { Difficulty, NewQuestion } from "@/shared/types";

export interface GenerateQuestionsInput {
  jobTitle: string;
  jobDescription: string;
  counts: Record<Difficulty, number>;
}

export class GenerationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GenerationError";
    this.status = status;
  }
}

/** POST /api/exams/generate — contracts §3 endpoint 1. */
export async function generateQuestions(
  input: GenerateQuestionsInput
): Promise<NewQuestion[]> {
  let res: Response;
  try {
    res = await fetch("/api/exams/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new GenerationError(
      "Couldn't reach the server. Check your connection and try again.",
      0
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      res.status === 502
        ? "Question generation failed. Please try again."
        : typeof body.error === "string"
          ? body.error
          : "Something went wrong. Please try again.";
    throw new GenerationError(message, res.status);
  }

  const data = await res.json();
  return data.questions as NewQuestion[];
}
