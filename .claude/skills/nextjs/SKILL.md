---
name: nextjs
description: Use when creating or modifying anything in the Next.js app — pages under src/app, route handlers under src/app/api, the API client, server-only modules (storage, llm, grading), server/client component boundaries, or styling. Replaces the old frontend + backend skills; covers App Router conventions, the server-only filesystem rule, the RSC answer-leak red line, token/path safety, error semantics, and contracts discipline.
---

# Next.js skill — exam platform

One Next.js tree, one deploy (ADR 0004). This skill merges the old frontend and
backend rules into App Router conventions. Canonical rules live in
`REVIEW_RULES.md` and `docs/contracts.md`; if this file disagrees with those,
they win.

## Stack (do not change)
- Next.js (App Router) + TypeScript (strict). React server components by default.
- No database. File-based storage only, per ADR 0001. Deploy target has a real
  disk (NOT Vercel serverless — ADR 0004). If a task seems to need a DB, stop and flag.
- Plain CSS / CSS modules. No new UI/styling libraries without P7 sign-off.

## The layout (per CLAUDE.md)
- `src/shared/` — contract types + config (MARKS 1/2/3). Changes: P7 only.
- `src/storage/storage.ts` — the ONLY file that touches `fs`. Server-only.
- `src/llm/`, `src/grading/` — server-only modules.
- `src/app/**` — pages (server components by default; `'use client'` only where needed).
- `src/app/api/**/route.ts` — route handlers (same paths/semantics as the old Express routes).
- `src/api/client.ts` — thin HTTP wrapper for candidate-facing BROWSER calls only.
- `fixtures/` committed mocks · `data/` gitignored runtime state.

## Server / client boundary — the rule that makes Next.js dangerous here
The client/server split is now implicit. Getting it wrong leaks answers.
1. **Server-only modules are server-only.** `src/storage`, `src/llm`, `src/grading`,
   and anything importing `fs` must NEVER be imported into a `'use client'`
   component or reachable from one. Add `import 'server-only'` at the top of these
   modules so a bad import fails the build.
2. **Strip before you cross the boundary.** Answer data (`answerIndex`) stays
   behind the server. Convert `Question` → `CandidateQuestion` (allowlist fields)
   BEFORE the object is passed as a prop to, or returned from a server action to,
   any client component. Passing a full `Question` into client props serializes
   `answerIndex` into the page payload — a leak, even if the UI never renders it.
3. **`'use client'` only when you need interactivity** (state, effects, event
   handlers). Default to server components. The exam-taking UI needs client state;
   the review and result displays largely do not.

## Hard rules (backend heritage)
1. **Only `src/storage/storage.ts` touches the filesystem.** No `fs` / `fs/promises`
   imports anywhere else. Everything persists through `createExam`, `loadExam`,
   `saveExam`, `examExists`, `appendResult`.
2. **Atomic writes.** `saveExam` writes a temp file then renames over the target.
   Never write JSON directly to its final path.
3. **Tokens:** generated server-side with `crypto.randomUUID()` at exam creation,
   never accepted from the client. Every incoming token is validated against the
   UUID v4 regex **before** any file path is constructed (path-traversal
   protection). Invalid format → 404 without touching the filesystem.
4. **Answer stripping:** `GET /exams/:token` (i.e. `src/app/api/exams/[token]/route.ts`)
   must never serialize `answerIndex`. Strip it by allowlisting fields, not by
   deleting keys. `marks` and `difficulty` ARE sent to candidates — intentional (ADR 0003).
5. **Scoring data is server-assigned.** `marks` and question `id`s come from
   `MARKS` in `src/shared` at finalize — never from a request body. `answerIndex`
   round-trips only through the HR-facing flow (generate → review → `POST /exams`
   body); it must never flow toward a candidate-facing response. At finalize,
   `POST /exams` shuffles each question's options and updates `answerIndex`, then
   writes the exam file.
6. **Grading lives only in `src/grading/grade.ts`** as a pure function
   `(questions, answers) → Scores`. No I/O inside it. Always-human-review.
7. **The LLM prompt template (`src/llm/prompt.ts`)** is always-human-review. Do not
   tighten or compress it; question quality depends on its exact wording.
8. **Secrets from env only.** `LLM_API_KEY`, `SMTP_*`, `APP_URL` via `.env`.
   Never hardcoded, never logged.
9. **`MOCK_LLM=true` must work.** When set, generation serves
   `fixtures/question-batch.json` instead of calling the API. CI depends on this.
   Nothing test-reachable calls the real LLM API — ever.
10. **Email is fire-and-forget (contracts §7).** A send failure never blocks exam
    creation or returns a blocking error — copy-link is the shipped fallback. On
    success, store `sentAt` in the exam file.

## Hard rules (frontend heritage)
1. **Candidate-facing browser HTTP goes through `src/api/client.ts`.** Client
   components never call `fetch` directly. (Server components read through the
   server modules directly — no HTTP hop needed.)
2. **Types come from `src/shared`.** Never redeclare `NewQuestion`, `Question`,
   `CandidateQuestion`, `ExamFile`, `SubmitPayload`, `Scores`, `ResultRow` locally.
   A missing type is a contracts question for P7, not a local interface.
3. **No browser storage.** No `localStorage`, `sessionStorage`, IndexedDB. Exam
   answers live in React state only (v1 accepts refresh loses progress; show the
   "don't refresh" notice on the first exam page).
4. **Answer state shape:** `Map<questionId, optionIndex>` or
   `Record<string, number>`. Never an ordered array — ordering bugs are silent.
5. **The candidate UI never sees correct answers.** If `answerIndex` appears in
   any response or prop reaching a candidate page, stop and flag it — do not code
   around it. `marks` and `difficulty` in candidate types are intentional (ADR 0003).

## Pages ↔ screens (route segments; lanes per CLAUDE.md)
| Segment | Screen | Owner |
|---|---|---|
| `src/app/create-exam/` | HR form (job title, JD, email, tier counts) | P1 |
| `src/app/review/` | Question review: tier groups, checkboxes, regenerate-one, link + copy | P2 |
| `src/app/take-exam/` | MCQ flow: progress bar, tier badge, Prev/Next, review-before-submit | P3 |
| `src/app/end/` | Success / link expired / generic error | P3 |
| `src/app/results/` | HR results table (week 2) | P8 |

Two owners may touch `src/app/` — coordinate on shared files (`layout.tsx`,
globals); keep each ticket's logic in its own segment/lib folder.

## Route handlers ↔ endpoints (shapes per contracts §3; paths unchanged)
| Route | Handler file | Owner |
|---|---|---|
| `POST /exams/generate`, `/exams/generate-one` | `src/app/api/exams/generate/route.ts` | P4 |
| `POST /exams`, `GET /exams/:token` | `src/app/api/exams/route.ts`, `src/app/api/exams/[token]/route.ts` | P5 |
| `POST /exams/:token/submit` | `src/app/api/exams/[token]/submit/route.ts` | P6 |
| `GET /results` (wk 2) | `src/app/api/results/route.ts` | P8 |
| `POST /exams/:token/send-invite` (wk 2) | `src/app/api/exams/[token]/send-invite/route.ts` | P8 |

`:token` is the `[token]` dynamic segment. Marks, IDs, grading are server-assigned.

## Error semantics (per contracts §4 — that table wins)
| Situation | Code | Candidate page |
|---|---|---|
| Token malformed or no exam file | 404 | generic error ("This link isn't valid") |
| Exam status is `used` | 410 | link expired ("already completed") |
| Payload tampered (unknown question ID, index outside 0–3, malformed body) | 400 | generic error |
| LLM generation failed after 3 attempts | 502 (readable message) | stay on HR form + retry — NOT generic error |

## Order of operations on submit (frozen, contracts §7)
Validate → grade in memory → one atomic save (result + `status: "used"` into the
exam file) → append CSV row → respond `{ ok: true }`. Candidate never sees a score.
Exam file is the source of truth; the CSV is a regenerable report.

## Component conventions
- A shared `QuestionCard` serves both HR review and candidate exam; extend via
  props (e.g. `showCorrectAnswer`), never fork. NOTE: `showCorrectAnswer` data
  must only be available in server/HR context — never pass answer data into the
  candidate render path.
- Loading states are mandatory on every LLM-backed action (generation takes
  10–30s): disable the trigger, show a spinner + message.
- Keep components dumb; page/segment components own state and data access.

## Testing (defer to the testing skill)
- No unit tests required for UI components (team decision); the safety net is the
  Playwright golden-path E2E in `e2e/`. Mandatory tests are `grade.ts`,
  `validate.ts`, and contract tests — see the testing skill.
- Build against `fixtures/*.json` until real endpoints exist; never block on
  backend availability.

## Contracts
All request/response and file shapes come from `src/shared` and
`docs/contracts.md`. A shape change is a P7 decision, never a local edit.
