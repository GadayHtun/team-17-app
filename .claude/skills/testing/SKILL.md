---
name: testing
description: Use when writing, modifying, or running tests for the exam platform — unit tests, contract tests, or the Playwright golden-path E2E. Defines where tests are mandatory, where TDD applies, the fixture policy, and the commands.
---

# Testing skill — exam platform

Canonical rules live in `REVIEW_RULES.md` and `docs/contracts.md`; this skill
applies them to test work. Test integrity is REVIEW_RULES §11: never delete,
weaken, or skip a failing test to pass a gate — dispute it for a human.

## Where tests are MANDATORY (no PR without them)
Tests are colocated with their module under `src/` (matches `package.json`'s
`test:grade` → `src/grading/grade.test.ts`).
1. **`src/grading/grade.ts`** — `src/grading/grade.test.ts`. Write these TEST-FIRST (tdd). Required cases:
   - all correct → full marks per tier and total
   - all wrong → zero
   - partial mix across tiers → exact expected numbers (hand-computed)
   - skipped questions → score zero, no crash
   - answer for unknown question ID → the validation layer rejects (400), grade never sees it
   - percentage rounding is deterministic
2. **`src/llm/validate.ts`** — `src/llm/validate.test.ts`. TEST-FIRST. Required cases:
   - valid fixture batch passes all three layers
   - markdown-fenced JSON is stripped then parsed
   - missing field / 3 options / answerIndex out of range / wrong tier counts → layer-2 failures naming the question
   - duplicate question text, duplicate options → layer-3 failures
   - correct-answer positions clustered on one letter → layer-3 failure (per Ticket 2 quality rules)
3. **Contract tests** — `src/contracts/contracts.test.ts`: every fixture in `/fixtures` parses into its `src/shared` type; each endpoint response shape matches its declared type.

## Where tests are NOT required (team decision)
- React components and pages (server or client). Their safety net is the E2E. Do not add component test suites; the 2-week budget goes elsewhere.

## TDD scope
`/tdd` (or implement's internal tdd) applies to the two mandatory-test modules above. For UI tickets and glue code, test-after or E2E-only is fine. Do not force test-first on pure-UI tickets.

## The golden path (E2E, `/e2e/golden-path.spec.ts`)
One Playwright spec IS the definition of "the project works":
1. HR fills the form → generation returns a batch (MOCK_LLM=true, served from fixtures)
2. HR deselects one question, creates the exam → link appears
3. Candidate opens the link → questions render, answers stripped (assert `answerIndex` absent from the raw network response body)
4. Candidate answers questions **BY OPTION TEXT, not by position** — finalize shuffles options (contracts §3), so positions differ every run. The spec knows the fixture's correct answer strings; it finds the matching radio label wherever it landed. Answer all but one (skip one), review, submit → success page
5. `results.csv` contains one row with the exact expected score (computable because answers were chosen by text)
6. Reopening the link → expired page (410)

Run it before every handoff. CI runs it on every PR. If this spec seems flaky
around scoring, suspect position-based answering before suspecting the app.

## Fixtures policy
- `/fixtures` is committed; `/data` is gitignored runtime state. Never confuse them.
- Tests and MOCK_LLM mode read fixtures; nothing in tests calls the real LLM API — ever (cost, speed, determinism).
- When P4 captures better real outputs, they REPLACE fixtures in one PR so mocks and reality stay aligned. The E2E's answer-text lookups read from the fixture file, so they survive fixture replacement automatically.

## Commands
```bash
npm test                 # all unit + contract tests (vitest)
npm run test:grade       # grading only
npm run e2e              # Playwright golden path (boots the Next.js server with MOCK_LLM=true)
```
