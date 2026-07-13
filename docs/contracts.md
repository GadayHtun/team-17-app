# Contracts — FROZEN end of day 1

Changes after the freeze require team agreement and go through P7 only.
The executable twin of this document is `src/shared/types.ts` — if they
ever disagree, stop and fix the disagreement before writing more code.

## 1. Question types

```ts
type Difficulty = "easy" | "medium" | "hard";

// What the LLM pipeline produces and HR reviews — no id/marks yet:
interface NewQuestion {
  text: string;
  options: [string, string, string, string];  // exactly 4
  answerIndex: 0 | 1 | 2 | 3;                 // SERVER-SIDE ONLY, never to candidates
  difficulty: Difficulty;
}

// After finalize (POST /api/exams) — server assigns id and marks:
interface Question extends NewQuestion {
  id: string;            // server-assigned, e.g. "q01"
  marks: number;         // from config: easy 1, medium 2, hard 3
}

// What the candidate receives (GET /api/exams/[token]) — allowlisted:
type CandidateQuestion = Omit<Question, "answerIndex">;
```

## 2. Exam file — `data/exams/{token}.json`

```ts
interface ExamFile {
  token: string;                 // UUID v4, crypto.randomUUID()
  jobTitle: string;
  candidateEmail: string;
  createdAt: string;             // ISO 8601
  status: "active" | "used";
  questions: Question[];         // easy block, then medium, then hard
  sentAt?: string;               // set by send-invite (week 2)
  // present only after submit:
  submittedAt?: string;
  answers?: Record<string, number>;   // questionId -> chosen index (0–3)
  scores?: Scores;
}

interface Scores {
  easy:   { score: number; max: number };
  medium: { score: number; max: number };
  hard:   { score: number; max: number };
  total:  { score: number; max: number };
  percentage: number;            // rounded to 1 decimal
}

interface SubmitPayload {
  answers: Record<string, number>;    // questionId -> chosen index (0–3)
}

// One row of results.csv / GET /api/results, same order as §5:
interface ResultRow {
  submittedAt: string;
  token: string;
  candidateEmail: string;
  jobTitle: string;
  easyScore: number;   easyMax: number;
  mediumScore: number; mediumMax: number;
  hardScore: number;   hardMax: number;
  totalScore: number;  totalMax: number;
  percentage: number;
}
```

## 3. Endpoints

| # | Route | Owner | Body → Response |
|---|-------|-------|-----------------|
| 1 | `POST /api/exams/generate` | P4 | `{ jobTitle, jobDescription, counts: { easy, medium, hard } }` → `{ questions: NewQuestion[] }` (with answers — HR-facing; no id/marks yet) |
| 2 | `POST /api/exams/generate-one` | P4 | `{ jobDescription, difficulty, excludeTexts: string[] }` → `{ question: NewQuestion }` |
| 3 | `POST /api/exams` | P5 | `{ jobTitle, candidateEmail, questions: NewQuestion[] }` → `{ token, link, createdAt }` (server assigns id + marks, shuffles options, writes exam file) |
| 4 | `GET /api/exams/[token]` | P5 | — → `{ jobTitle, questions: CandidateQuestion[] }` |
| 5 | `POST /api/exams/[token]/submit` | P6 | `SubmitPayload` → `{ ok: true }` (no score — team decision) |
| 6 | `GET /api/results` (wk 2) | P8 | — → `{ rows: ResultRow[] }` |
| 7 | `POST /api/exams/[token]/send-invite` (wk 2) | P8 | — → `{ sentAt }` or a non-blocking error |

Link format: `link = ${APP_URL}/exam/${token}` (`APP_URL` from env; frontend route `/exam/[token]`).

## 4. Error codes (all endpoints)

| Code | Meaning | Frontend page |
|------|---------|---------------|
| 404 | token malformed / no exam file | generic error |
| 410 | exam status is `used` (duplicate open or submit) | link expired |
| 400 | tampered payload: unknown question id, index outside 0–3, malformed body | generic error |
| 502 | LLM generation failed after 3 attempts | error + retry on HR form |

## 5. results.csv columns (in order)

`submittedAt, token, candidateEmail, jobTitle, easyScore, easyMax, mediumScore, mediumMax, hardScore, hardMax, totalScore, totalMax, percentage`

Header row written on first creation. Proper CSV escaping (library, not string concat).
The CSV is a regenerable report; exam files are the source of truth.

## 6. Config (in `src/shared`)

```ts
export const MARKS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
```

## 7. Policies (decided, don't relitigate)

- Unanswered question = 0 marks, legal, no error.
- Candidate never sees their score.
- Submit order of operations: validate → grade in memory → ONE atomic save
  (result + `status: "used"`) → append CSV row → respond.
- Mid-exam refresh loses answers in v1 (notice shown on first page).
- Draft question batches live in frontend state; no server-side drafts.
- `MOCK_LLM=true` serves `/fixtures/question-batch.json`; CI always runs with it.
- Email invite is fire-and-forget: a send failure never blocks exam creation or
  the copy-link path.
