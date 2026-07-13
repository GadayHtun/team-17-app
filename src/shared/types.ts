/**
 * Executable twin of docs/contracts.md §1, §2 (contracts win if they disagree).
 *
 * P7-OWNED / ALWAYS-HUMAN-REVIEW (CLAUDE.md red line 5). Created by P5 for
 * Ticket 4 because the endpoints and storage cannot compile without the frozen
 * shapes; this file transcribes the contract verbatim and must be reviewed and
 * adopted by P7. Do not add fields or loosen types here without a contracts
 * change through P7.
 */

export type Difficulty = "easy" | "medium" | "hard";

// What the LLM pipeline produces and HR reviews — no id/marks yet:
export interface NewQuestion {
  text: string;
  options: [string, string, string, string]; // exactly 4
  answerIndex: 0 | 1 | 2 | 3; // SERVER-SIDE ONLY, never to candidates
  difficulty: Difficulty;
}

// After finalize (POST /api/exams) — server assigns id and marks:
export interface Question extends NewQuestion {
  id: string; // server-assigned, e.g. "q01"
  marks: number; // from MARKS: easy 1, medium 2, hard 3
}

// What the candidate receives (GET /api/exams/[token]) — allowlisted:
export type CandidateQuestion = Omit<Question, "answerIndex">;

export interface ExamFile {
  token: string; // UUID v4, crypto.randomUUID()
  jobTitle: string;
  candidateEmail: string;
  createdAt: string; // ISO 8601
  status: "active" | "used";
  questions: Question[]; // easy block, then medium, then hard
  sentAt?: string; // set by send-invite (week 2)
  // present only after submit:
  submittedAt?: string;
  answers?: Record<string, number>; // questionId -> chosen index (0–3)
  scores?: Scores;
}

export interface Scores {
  easy: { score: number; max: number };
  medium: { score: number; max: number };
  hard: { score: number; max: number };
  total: { score: number; max: number };
  percentage: number; // rounded to 1 decimal
}

export interface SubmitPayload {
  answers: Record<string, number>; // questionId -> chosen index (0–3)
}

// One row of results.csv / GET /api/results, same order as contracts §5:
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
