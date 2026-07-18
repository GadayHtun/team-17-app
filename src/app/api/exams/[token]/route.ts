/**
 * GET /api/exams/[token] — candidate fetch (contracts §3 row 4).
 *
 * Returns the current question for the adaptive exam flow.
 * When all questions are answered, returns review data.
 *
 * SECURITY (CLAUDE.md red lines 1 & 2):
 *  - Validate the token against the UUID regex BEFORE any path is built.
 *  - Build the candidate view by FIELD ALLOWLIST — answerIndex is never
 *    serialized. difficulty is never serialized (interviewer-only).
 *
 * Errors (contracts §4): 404 malformed/unknown token · 410 exam already used.
 */
import { NextResponse } from "next/server";

import type { CandidateQuestion, Question } from "@/shared/types";
import { isValidToken, loadExam } from "@/storage/storage";

// Answer-strip allowlist: the ONLY fields a candidate ever receives.
// answerIndex is intentionally absent; difficulty is intentionally absent
// (interviewer-only); marks is intentional.
function toCandidateQuestion(q: Question): CandidateQuestion {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
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

  const answeredIds = new Set(Object.keys(exam.answers ?? {}));
  const allAnswered = answeredIds.size >= exam.questions.length;

  if (allAnswered) {
    // All questions answered — return review data
    const answers = exam.answers ?? {};
    return NextResponse.json({
      status: "review" as const,
      jobTitle: exam.jobTitle,
      questions: exam.questions.map((q) => ({
        ...toCandidateQuestion(q),
        answer: answers[q.id] ?? null,
      })),
    });
  }

  // Return current question
  const currentQ = exam.questions[exam.currentQuestionIndex];
  return NextResponse.json({
    status: "exam" as const,
    jobTitle: exam.jobTitle,
    question: toCandidateQuestion(currentQ),
    questionNumber: answeredIds.size + 1,
    totalQuestions: exam.questions.length,
  });
}
