/**
 * Contract types — frozen end of day 1.
 * Executable twin of docs/contracts.md. If they disagree, stop and fix.
 */

export type Difficulty = "easy" | "medium" | "hard";

/**
 * What the LLM pipeline produces and HR reviews — no id/marks yet.
 * Fields: text, options (exactly 4), answerIndex (0-3), difficulty.
 */
export interface NewQuestion {
  text: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
}

/**
 * After finalize (POST /api/exams) — server assigns id and marks.
 */
export interface Question extends NewQuestion {
  id: string;
  marks: number;
}

/**
 * What the candidate receives (GET /api/exams/[token]) — allowlisted.
 */
export type CandidateQuestion = Omit<Question, "answerIndex">;

/**
 * Exam file stored at data/exams/{token}.json
 */
export interface ExamFile {
  token: string;
  jobTitle: string;
  candidateEmail: string;
  createdAt: string;
  status: "active" | "used";
  questions: Question[];
  sentAt?: string;
  submittedAt?: string;
  answers?: Record<string, number>;
  scores?: Scores;
}

export interface Scores {
  easy: { score: number; max: number };
  medium: { score: number; max: number };
  hard: { score: number; max: number };
  total: { score: number; max: number };
  percentage: number;
}

export interface SubmitPayload {
  answers: Record<string, number>;
}

/**
 * One row of results.csv / GET /api/results
 */
export interface ResultRow {
  submittedAt: string;
  token: string;
  candidateEmail: string;
  jobTitle: string;
  easyScore: number;
  easyMax: number;
  mediumScore: number;
  mediumMax: number;
  hardScore: number;
  hardMax: number;
  totalScore: number;
  totalMax: number;
  percentage: number;
}
