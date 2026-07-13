# tasks.md — the 9 tickets

Publish these as GitHub issues via /to-tickets (see docs/WORKFLOW.md).
Blocking links are MERGE-ORDER ONLY — "Blocked by" means cannot merge before,
never cannot start. Every ticket names what it can start against immediately.
All shapes, endpoints, and error codes referenced here are defined in
docs/contracts.md — that document wins over any wording here.

Stack: Next.js + TS (frontend & backend APIs) · file storage (no DB, ADR 0001) · vitest + Playwright.
Tickets 8–9 are week-2; the core flow must work without them.

---

## Ticket 1 — HR fills exam form
**Owner:** P1 · **Estimate:** 3–4 days · **Blocked by (merge):** contracts freeze
**Starts immediately with:** `fixtures/question-batch.json` via API client mock mode

Build `src/app/create-exam/page.tsx` (mockup screen 1).

**Scope**
- Fields: job title, job description (textarea), candidate email, counts per tier (default 10 each).
- Client-side validation: non-empty JD, valid email format, counts 1–20 per tier.
- On submit: call `POST /api/exams/generate` through `src/api/client.ts`; loading state is mandatory (10–30s generation) — disable button, spinner, "Generating questions…".
- Handle 502 with a readable message and retry.
- On success: hand the `NewQuestion[]` batch to ReviewQuestions (agree the prop shape with P2 in week 1).

**Done when:** HR can fill the form, trigger generation, see loading, land on review with a real batch; invalid input never reaches the backend; 502 path shows retry.

---

## Ticket 2 — Generate questions (LLM pipeline)
**Owner:** P4 · **Estimate:** 5–6 days, START DAY 1 (highest-risk ticket) · **Blocked by (merge):** contracts freeze
**Starts immediately with:** nothing — fully independent

Build `src/llm/` (prompt.ts, generate.ts, validate.ts) and Next.js Route Handlers:
- `src/app/api/exams/generate/route.ts`
- `src/app/api/exams/generate-one/route.ts`

**Scope**
- Prompt template (`src/llm/prompt.ts` — always-human-review): role/task, inputs (JD + counts), output rules (JSON only, exact `NewQuestion` structure, no fences), quality rules — 4 options exactly, one correct, plausible distractors, questions from JD skills, explicit tier definitions (easy = recall, medium = apply, hard = edge cases/trade-offs).
- LLM call with provider JSON mode, 60s timeout.
- Three-layer validation (`src/llm/validate.ts`, TEST-FIRST per testing skill): (1) strip fences + parse; (2) schema — fields, 4 options, answerIndex 0–3, valid tier, counts match; (3) quality — no duplicate texts, no duplicate options, no empty/overlong strings, answer positions not clustered.
- Retry loop: max 3 attempts, feed the validation error back, salvage partial batches (re-request only the shortfall). After 3: respond 502.
- `POST /api/exams/generate` and `POST /api/exams/generate-one` (with excludeTexts) per contracts §3 — both return `NewQuestion` shapes (NO id/marks — those are assigned at finalize by Ticket 4).
- `MOCK_LLM=true` branch serves `fixtures/question-batch.json`.
- Replace starter fixtures with 3–4 real captured outputs in one PR.

**Done when:** 4 different real JDs (frontend, backend, data, one vague) each yield a valid batch within 3 attempts; validate.test.ts passes; fixtures replaced; mock mode works.

---

## Ticket 3 — HR reviews and selects
**Owner:** P2 · **Estimate:** 3–4 days · **Blocked by (merge):** contracts freeze
**Starts immediately with:** `fixtures/question-batch.json`

Build `src/app/review/page.tsx` (mockup screen 2).

**Scope**
- Render `NewQuestion[]` grouped by tier with badges and per-tier selected counters.
- Checkbox per question; show text, all options, mark the correct one (HR-facing only).
- Regenerate button per question → `POST /api/exams/generate-one` with excludeTexts, swap in place, per-question loading state.
- "Create exam": send selected questions + metadata to `POST /api/exams`; show returned `link` with copy-to-clipboard (+ Send invite button slot for Ticket 9).
- Warn (don't block) if a tier has zero selected.

**Done when:** deselect, regenerate, and create all work; the copied link opens a working candidate exam.

---

## Ticket 4 — Exam endpoints + storage module
**Owner:** P5 · **Estimate:** 5–6 days · **Blocked by (merge):** contracts freeze · **Blocks (merge):** Tickets 6, 9
**Starts immediately with:** hand-made exam JSON files

Build `src/storage/storage.ts` (days 1–2 — the shared foundation) and Route Handlers:
- `src/app/api/exams/route.ts` (POST /api/exams)
- `src/app/api/exams/[token]/route.ts` (GET /api/exams/[token])

**Scope**
- Storage module — the ONLY fs access in the codebase: `createExam`, `loadExam`, `saveExam` (atomic: temp + rename), `examExists`, `appendResult` (CSV via library, header on first write).
- `POST /api/exams`: accept `{ jobTitle, candidateEmail, questions: NewQuestion[] }`; server generates token (`crypto.randomUUID()`), assigns ids + marks from `MARKS`, SHUFFLES each question's options (updating answerIndex), writes ExamFile with `status: "active"`, returns `{ token, link, createdAt }` with `link = ${APP_URL}/exam/${token}`.
- `GET /api/exams/[token]`: UUID-regex validation BEFORE any path construction; 404 unknown, 410 used; success returns jobTitle + `CandidateQuestion[]` built by FIELD ALLOWLIST (id, text, options, difficulty, marks) — `answerIndex` never serialized.
- Error responses distinguish 404 vs 410 so the frontend maps pages correctly.

**Done when:** created exam is fetchable with answers stripped (assert on the raw response body); 404/410 behave per contracts §4; kill-mid-save test never leaves corrupt JSON; contracts.test.ts covers the shapes.

---

## Ticket 5 — Candidate takes exam
**Owner:** P3 · **Estimate:** 4–5 days · **Blocked by (merge):** contracts freeze
**Starts immediately with:** `fixtures/exam-active.json`

Build page components under `src/app/exam/[token]/page.tsx` (mockup screen 3).

**Scope**
- Route `/exam/[token]`: fetch via API client; 404 → generic error page, 410 → expired page (Ticket 7).
- MCQ UI: one question per page (or small groups), 4 radio options, Prev/Next, progress ("Question 14 of 30 · Section 2 of 3"), tier badge with marks. Sections in order easy → medium → hard.
- Answers in state as `Map<questionId, optionIndex>` — never an ordered array. Skipping is allowed.
- Review-before-submit page: all questions with answered/unanswered flags, jump-to-question, last Next becomes "Submit exam".
- "Don't refresh" notice on first page (v1 policy: refresh loses answers).

**Done when:** a full 30-question exam from a real file can be completed with skips, reviewed, and submitted; both error pages render for bad/used tokens; golden-path E2E steps 3–4 pass.

---

## Ticket 6 — Submit and grade
**Owner:** P6 · **Estimate:** 3–4 days · **Blocked by (merge):** Ticket 4 (storage module)
**Starts immediately with:** `src/grading/grade.ts` + grade.test.ts — pure function, zero dependencies, TEST-FIRST, days 1–3

Build `src/grading/grade.ts` and Next.js Route Handler `src/app/api/exams/[token]/submit/route.ts`.

**Scope**
- `POST /api/exams/[token]/submit` with `SubmitPayload`. Validation chain per contracts: 404 → 410 (duplicate-submit protection) → 400 for unknown question ids or index outside 0–3. Unanswered = 0 marks, legal.
- `grade(questions, answers) → Scores`: pure, no I/O. Required test cases per testing skill: all-correct, all-wrong, partial (hand-computed), skipped, deterministic percentage rounding.
- Order of operations (contracts §7): validate → grade in memory → ONE atomic save (answers + scores + submittedAt + `status: "used"`) → `appendResult` CSV row (contracts §5 columns) → respond `{ ok: true }` — no score to the candidate.

**Done when:** correct scores land in both the exam file and results.csv; second submit returns 410; grade.test.ts green with all required cases; golden-path steps 4–6 pass.

---

## Ticket 7 — End pages
**Owner:** P3 (with Ticket 5) · **Estimate:** 1 day · **Blocked by (merge):** contracts freeze

Build success, expired, and error sub-pages under `src/app/exam/[token]/` (mockup screen 4).

**Scope**
- Success page (`src/app/exam/[token]/success/page.tsx`): confirmation, no score, no route back into the exam.
- Expired page (`src/app/exam/[token]/expired/page.tsx`): "already completed", contact-the-team line.
- Generic error page (`src/app/exam/[token]/error/page.tsx` or global handler).
- Verify explicitly: submit → revisit link → expired page.

**Done when:** all three pages render and the submit → revisit → expired loop works end to end.

---

## Ticket 8 — HR results view (week 2)
**Owner:** P8 · **Estimate:** 1–2 days · **Blocked by (merge):** Ticket 6 (real CSV rows)

Build Route Handler `src/app/api/results/route.ts` and page `src/app/results/page.tsx`.

**Scope**
- `GET /api/results`: parse results.csv → `{ rows: ResultRow[] }`.
- Table: Candidate, Job title, Submitted (readable date), Easy/Medium/Hard as `8/10` cells, Total as `35/60`, Score `58%`. Token hidden. Default sort: percentage desc.
- Empty state before any results. Stretch: row expands to per-question detail from the exam file.

**Done when:** after two test submissions, both rows appear ranked correctly with readable formatting.

---

## Ticket 9 — Send invite email (week 2)
**Owner:** P8 · **Estimate:** 1 day code + up to ½ day SMTP config · **Blocked by (merge):** Ticket 4

Build `src/email/invite.ts` and route handler `src/app/api/exams/[token]/send-invite/route.ts`. Fire-and-forget by contract: a send failure NEVER blocks exam creation or the copy-link path.

**Scope**
- `POST /api/exams/[token]/send-invite`: reads candidateEmail + jobTitle from the exam file; minimal template (job title, one sentence, the link); Nodemailer + SMTP (Gmail app password or a free tier like Brevo/SendGrid).
- Store `sentAt` in the exam file on success.
- On failure: non-blocking error the UI shows as a warning ("Couldn't send — copy the link instead").
- Wire the Send invite button on ReviewQuestions (coordinate with P2).

**Done when:** a real invite arrives with a working link; a deliberately broken SMTP config degrades gracefully to copy-link.

---

## Cross-cutting — P7 (lead/integrator), not a ticket
Owns: contracts + shared folder types (freeze end of day 1), repo scaffold, `.mcp.json`,
toolchain verification on all 8 machines, starter fixtures, REVIEW_RULES.md and the
SKILL.md files, staleness re-read of meta-docs on any contracts change, code review
of always-human diffs, integration testing from day 8 (first test: HR half's exam
file fed untouched into the candidate half), edge cases, timeboxes.

## Checkpoints
- Day 1: repo + toolchain + frozen contracts everywhere.
- End week 1: HR flow end-to-end with real LLM output.
- Day 10: candidate flow end-to-end; feature freeze.
- Days 11–14: integration, bugs, polish. Week-2 extras only if the core is green.
