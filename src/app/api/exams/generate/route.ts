import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/llm/generate";

/**
 * POST /api/exams/generate
 * Body: { jobTitle, jobDescription, counts: { easy, medium, hard } }
 * Response: { questions: NewQuestion[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (
      typeof body.jobDescription !== "string" ||
      !body.counts ||
      typeof body.counts.easy !== "number" ||
      typeof body.counts.medium !== "number" ||
      typeof body.counts.hard !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing required fields: jobDescription, counts (easy, medium, hard)" },
        { status: 400 }
      );
    }

    if (
      body.counts.easy < 0 ||
      body.counts.medium < 0 ||
      body.counts.hard < 0 ||
      !Number.isInteger(body.counts.easy) ||
      !Number.isInteger(body.counts.medium) ||
      !Number.isInteger(body.counts.hard)
    ) {
      return NextResponse.json(
        { error: "Counts must be non-negative integers" },
        { status: 400 }
      );
    }

    const total = body.counts.easy + body.counts.medium + body.counts.hard;
    if (total === 0) {
      return NextResponse.json(
        { error: "Total count must be at least 1" },
        { status: 400 }
      );
    }

    const result = await generateQuestions({
      jobDescription: body.jobDescription,
      counts: body.counts,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ questions: result.questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
