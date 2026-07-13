import { NextRequest, NextResponse } from "next/server";
import { generateOne } from "@/llm/generate";
import type { Difficulty } from "@/shared/types";

const VALID_DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

/**
 * POST /api/exams/generate-one
 * Body: { jobDescription, difficulty, excludeTexts: string[] }
 * Response: { question: NewQuestion }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (typeof body.jobDescription !== "string") {
      return NextResponse.json(
        { error: "Missing required field: jobDescription" },
        { status: 400 }
      );
    }

    if (
      typeof body.difficulty !== "string" ||
      !VALID_DIFFICULTIES.includes(body.difficulty as Difficulty)
    ) {
      return NextResponse.json(
        { error: "difficulty must be 'easy', 'medium', or 'hard'" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.excludeTexts)) {
      return NextResponse.json(
        { error: "excludeTexts must be an array of strings" },
        { status: 400 }
      );
    }

    const result = await generateOne({
      jobDescription: body.jobDescription,
      difficulty: body.difficulty as Difficulty,
      excludeTexts: body.excludeTexts,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ question: result.question });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
