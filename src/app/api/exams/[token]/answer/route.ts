/**
 * POST /api/exams/[token]/answer — submit a single answer (adaptive flow).
 *
 * Body: { questionId: string, answerIndex: number }
 *
 * Server:
 *  1. Validates token + exam status
 *  2. Validates the questionId belongs to this exam and answerIndex is 0-3
 *  3. Checks correctness server-side (answerIndex never sent to candidate)
 *  4. Stores the answer in the exam file
 *  5. Computes next question via adaptive engine
 *  6. Returns next question or review status
 *
 * SECURITY: answerIndex is validated against the server's own answerIndex,
 * never trusted from the client.
 */
import { NextResponse } from "next/server";

import { nextDifficulty, pickNextQuestion } from "@/exam/adaptive";
import type { CandidateQuestion, Question } from "@/shared/types";
import { isValidToken, loadExam, saveExam } from "@/storage/storage";

function toCandidateQuestion(q: Question): CandidateQuestion {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
    marks: q.marks,
  };
}

export async function POST(
  request: Request,
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

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).questionId !== "string" ||
    typeof (body as Record<string, unknown>).answerIndex !== "number"
  ) {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  const { questionId, answerIndex } = body as {
    questionId: string;
    answerIndex: number;
  };

  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    return NextResponse.json({ error: "invalid answerIndex" }, { status: 400 });
  }

  // Find the question in the exam
  const question = exam.questions.find((q) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ error: "unknown questionId" }, { status: 400 });
  }

  // Store the answer
  const answers = exam.answers ?? {};
  answers[questionId] = answerIndex;

  // Check correctness
  const wasCorrect = answerIndex === question.answerIndex;

  // Compute next difficulty
  const newDifficulty = nextDifficulty(exam.currentDifficulty, wasCorrect);

  // Find next unanswered question
  const answeredIds = new Set(Object.keys(answers));
  const nextQ = pickNextQuestion(exam.questions, answeredIds, newDifficulty);

  if (!nextQ) {
    // All questions answered — save and return review status
    const updatedExam = {
      ...exam,
      answers,
      currentDifficulty: newDifficulty,
    };
    await saveExam(updatedExam);

    return NextResponse.json({
      status: "review" as const,
      jobTitle: exam.jobTitle,
      questions: exam.questions.map((q) => ({
        ...toCandidateQuestion(q),
        answer: answers[q.id] ?? null,
      })),
    });
  }

  // Save updated state
  const updatedExam = {
    ...exam,
    answers,
    currentQuestionIndex: exam.questions.indexOf(nextQ),
    currentDifficulty: newDifficulty,
  };
  await saveExam(updatedExam);

  return NextResponse.json({
    status: "exam" as const,
    jobTitle: exam.jobTitle,
    question: toCandidateQuestion(nextQ),
    questionNumber: answeredIds.size + 1,
    totalQuestions: exam.questions.length,
  });
}
