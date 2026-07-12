# Exam platform — agent project notes

AI-powered MCQ screening tool. HR pastes a JD → LLM generates tiered questions
(easy/medium/hard) → HR curates → one-time link → candidate takes exam → server
grades → results.csv. 2-week build, 8 people, no database (files only).

Stack: Next.js + TS (frontend & backend APIs) · file storage · vitest + Playwright.

## Read before coding (in this order)
1. `docs/contracts.md` — FROZEN schemas + endpoints. Deviations are bugs.
2. `docs/WORKFLOW.md` — toolchain install list + the build loop (which skill/agent runs when).
3. `docs/tasks.md` — the 9 tickets, owners, done-when criteria.
4. `REVIEW_RULES.md` — what the pre-PR review checks (canonical rule list).
5. `.claude/skills/` — nextjs, security-review, testing rules auto-apply.
6. `docs/adr/` + `docs/CONTEXT.md` — decided trade-offs and glossary. Do not relitigate
   (esp. 0001 no-database, 0002 no adaptive logic, 0003 answers never leave server).

## Team / ownership (one branch per ticket, folders don't overlap)
P1 `src/app/create-exam/` (CreateExam page) · P2 `src/app/review/` (ReviewQuestions page) ·
P3 `src/app/take-exam/` + `src/app/end/` (TakeExam + EndPages) ·
P4 `src/llm/` (prompt, generate, validate) · P5 `src/storage/` + `src/app/api/exams/` ·
P6 `src/grading/` + `src/app/api/submit/` · P7 lead: `src/shared/`, `src/contracts/`, integration ·
P8 flex: results view (`src/app/results/`), email invite (week 2), reinforcement.

## Layout
- `src/shared/` — contract types + config (MARKS 1/2/3). Changes: P7 only.
- `src/storage/` — fs access ONLY in `src/storage/storage.ts`.
- `src/api/client.ts` — Frontend HTTP client/wrapper. HTTP ONLY through this client.
- `src/app/` — Next.js App Router (pages and layouts).
- `src/app/api/` — Next.js backend API routes (routes/endpoints).
- `fixtures/` committed mocks (P4 replaces with real captures); `data/` gitignored runtime state.
- `e2e/golden-path.spec.ts` — the definition of "the project works".

## Commands
`npm test` (unit + contract) · `npm run e2e` (golden path, MOCK_LLM=true) ·
`npm run dev` (Next.js development server; honors MOCK_LLM in .env).

## Toolchain (install checklist + versions: docs/WORKFLOW.md)
Gates (must be identical on all 8 machines): aihero skills (grill-with-docs,
to-tickets, implement w/ tdd + code-review), OpenCode, fix-agent. Helpers
(optional/per-person): GSD, caveman. Context7 MCP is repo-pinned via `.mcp.json`
— approve it on first run. P7 verifies every machine on day 1.

## Build loop (details in docs/WORKFLOW.md)
Per ticket: /implement (drives tdd + self code-review) → security-review skill →
tests green → OpenCode review with REVIEW_RULES.md (independent pre-PR gate) →
fix-agent loop, MAX 3 rounds or ~2h stuck → human eval. Pass → PR with review
verdict in the description → CI (tests + e2e) → merge. No PR without a verdict;
nothing merges without green CI. /grill-with-docs before building anything fuzzy;
new one-way decisions become ADRs.

## Decided policies (don't re-ask, don't re-decide)
- Unanswered question = 0 marks, legal, no error.
- Candidate never sees their score; response to submit is `{ ok: true }`.
- Mid-exam refresh loses answers in v1 (notice on first exam page).
- Draft question batches live in frontend state; no server-side drafts.
- MOCK_LLM=true serves fixtures; tests and CI never call the real LLM API.
- Email invite + results view are week-2; copy-link is the shipped fallback.

## Red lines (never cross)
1. `answerIndex` never reaches a candidate-facing response (allowlist fields, don't delete keys).
2. Token: crypto.randomUUID(); regex-validate before building any path.
3. Errors: 404 unknown / 410 used / 400 tampered / 502 generation failed.
4. Marks, IDs, grading are server-assigned — never from a request body.
5. grade.ts, prompt.ts, src/shared/, answer-stripping, REVIEW_RULES.md,
   any SKILL.md → human review ALWAYS, even if all gates pass.
6. Never weaken or delete a failing test to make it pass — dispute it for a human.
