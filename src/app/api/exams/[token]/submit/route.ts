import {
  grade,
  GradingValidationError,
  type Answers,
  type Scores,
} from "@/grading/grade";
import {
  appendResult,
  loadExam,
  saveExam,
} from "@/storage/storage";
import type { ExamFile, ResultRow } from "@/shared/types";

export const runtime = "nodejs";

type Params = Promise<{ token: string }>;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Params }) {
  const { token } = await params;

  if (!UUID_V4.test(token)) {
    return Response.json({ error: "Exam not found" }, { status: 404 });
  }

  const exam = await loadExam(token);

  if (!exam) {
    return Response.json({ error: "Exam not found" }, { status: 404 });
  }

  if (exam.status === "used") {
    return Response.json({ error: "Exam already submitted" }, { status: 410 });
  }

  const payload = await readSubmitPayload(request);

  if (!payload) {
    return Response.json({ error: "Malformed submit payload" }, { status: 400 });
  }

  let scores: Scores;

  try {
    scores = grade(exam.questions, payload.answers);
  } catch (error) {
    if (error instanceof GradingValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  const submittedAt = new Date().toISOString();
  const submittedExam: ExamFile = {
    ...exam,
    status: "used",
    submittedAt,
    answers: payload.answers,
    scores,
  };

  await saveExam(submittedExam);
  await appendResult(toResultRow(submittedExam));

  return Response.json({ ok: true });
}

async function readSubmitPayload(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body) || !isRecord(body.answers)) {
      return null;
    }

    return { answers: body.answers as Answers };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toResultRow(exam: ExamFile): ResultRow {
  if (!exam.submittedAt || !exam.scores) {
    throw new Error("Cannot create a result row for an ungraded exam");
  }

  return {
    submittedAt: exam.submittedAt,
    token: exam.token,
    candidateEmail: exam.candidateEmail,
    jobTitle: exam.jobTitle,
    easyScore: exam.scores.easy.score,
    easyMax: exam.scores.easy.max,
    mediumScore: exam.scores.medium.score,
    mediumMax: exam.scores.medium.max,
    hardScore: exam.scores.hard.score,
    hardMax: exam.scores.hard.max,
    totalScore: exam.scores.total.score,
    totalMax: exam.scores.total.max,
    percentage: exam.scores.percentage,
  };
}
