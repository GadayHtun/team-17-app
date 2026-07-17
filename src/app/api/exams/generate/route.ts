import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/llm/generate";

// SECURITY (#14): bound per-request LLM cost (denial-of-wallet). Never trust the
// client's own limit — the frontend caps each tier at 20; enforce it here too.
const MAX_PER_TIER = 20;

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

    if (
      body.counts.easy > MAX_PER_TIER ||
      body.counts.medium > MAX_PER_TIER ||
      body.counts.hard > MAX_PER_TIER
    ) {
      return NextResponse.json(
        { error: `Each count must be at most ${MAX_PER_TIER}` },
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
