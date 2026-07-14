/**
 * POST /api/exams — finalize an exam (contracts §3 row 3, Ticket 4).
 *
 * Body:   { jobTitle, candidateEmail, questions: NewQuestion[] }
 * Server: generates token, assigns ids + marks from MARKS, SHUFFLES each
 *         question's options (updating answerIndex), writes the exam file.
 * Returns { token, link, createdAt }.
 *
 * Marks, ids, and the token are server-assigned — NEVER read from the body
 * (CLAUDE.md red line 4).
 */
import { NextResponse } from "next/server";

import { MARKS } from "@/shared/constants";
import type { Difficulty, ExamFile, NewQuestion, Question } from "@/shared/types";
import { createExam } from "@/storage/storage";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// Validate an untrusted NewQuestion from the request body. answerIndex is
// HR-facing here (it round-trips generate → review → this body) but must still
// be well-formed; it never flows toward a candidate response.
function isValidNewQuestion(q: unknown): q is NewQuestion {
  if (typeof q !== "object" || q === null) return false;
  const c = q as Record<string, unknown>;
  if (!isNonEmptyString(c.text)) return false;
  if (
    !Array.isArray(c.options) ||
    c.options.length !== 4 ||
    !c.options.every(isNonEmptyString)
  ) {
    return false;
  }
  if (
    typeof c.answerIndex !== "number" ||
    !Number.isInteger(c.answerIndex) ||
    c.answerIndex < 0 ||
    c.answerIndex > 3
  ) {
    return false;
  }
  if (!DIFFICULTIES.includes(c.difficulty as Difficulty)) return false;
  return true;
}

// Fisher–Yates over a copy; returns the new options and the relocated answer.
function shuffleOptions(
  options: [string, string, string, string],
  answerIndex: number,
): { options: [string, string, string, string]; answerIndex: 0 | 1 | 2 | 3 } {
  const correct = options[answerIndex];
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {
    options: shuffled as [string, string, string, string],
    answerIndex: shuffled.indexOf(correct) as 0 | 1 | 2 | 3,
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (
    !isNonEmptyString(b.jobTitle) ||
    !isNonEmptyString(b.candidateEmail) ||
    !Array.isArray(b.questions) ||
    b.questions.length === 0 ||
    !b.questions.every(isValidNewQuestion)
  ) {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  const incoming = b.questions as NewQuestion[];

  // Store easy block, then medium, then hard (contracts §2); assign sequential
  // ids and marks in that order.
  const ordered = DIFFICULTIES.flatMap((d) =>
    incoming.filter((q) => q.difficulty === d),
  );

  const questions: Question[] = ordered.map((q, i) => {
    const s = shuffleOptions(q.options, q.answerIndex);
    return {
      id: `q${String(i + 1).padStart(2, "0")}`,
      text: q.text,
      options: s.options,
      answerIndex: s.answerIndex,
      difficulty: q.difficulty,
      marks: MARKS[q.difficulty],
    };
  });

  const token = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const exam: ExamFile = {
    token,
    jobTitle: b.jobTitle,
    candidateEmail: b.candidateEmail,
    createdAt,
    status: "active",
    questions,
  };

  await createExam(exam);

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const link = `${appUrl}/exam/${token}`;

  return NextResponse.json({ token, link, createdAt }, { status: 201 });
}
