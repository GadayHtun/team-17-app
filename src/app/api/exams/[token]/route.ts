/**
 * GET /api/exams/[token] — candidate fetch (contracts §3 row 4, Ticket 4).
 *
 * Returns { jobTitle, questions: CandidateQuestion[] }.
 *
 * SECURITY (CLAUDE.md red lines 1 & 2):
 *  - Validate the token against the UUID regex BEFORE any path is built.
 *  - Build the candidate view by FIELD ALLOWLIST — answerIndex is never
 *    serialized. We construct new objects; we do not delete keys.
 *
 * Errors (contracts §4): 404 malformed/unknown token · 410 exam already used.
 */
import { NextResponse } from "next/server";

import type { CandidateQuestion, Question } from "@/shared/types";
import { isValidToken, loadExam } from "@/storage/storage";

// Answer-strip allowlist: the ONLY fields a candidate ever receives.
// answerIndex is intentionally absent; marks + difficulty are intentional (ADR 0003).
function toCandidateQuestion(q: Question): CandidateQuestion {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
    marks: q.marks,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;

  if (!isValidToken(token)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const exam = await loadExam(token);
  if (!exam) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (exam.status === "used") {
    return NextResponse.json({ error: "exam already used" }, { status: 410 });
  }

  return NextResponse.json({
    jobTitle: exam.jobTitle,
    questions: exam.questions.map(toCandidateQuestion),
  });
}
