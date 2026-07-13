# REVIEW_RULES.md — OpenCode pre-PR gate

Include this file in every review run, alongside the diff against `main` and the
ticket's "Done when" criteria. Report the two axes SEPARATELY. Never merge them
into one verdict — a diff can pass one axis and fail the other.

## Axis 1 — Standards: "is it built right?"
Check the diff against these project rules (canonical source — the SKILL.md files
reference this list, not the other way around):

1. TypeScript strict; no `any` without an inline justification comment.
2. Filesystem access only inside `src/storage/storage.ts`.
3. Atomic writes for every exam file save (temp file + rename).
4. All frontend HTTP through `src/api/client.ts`; all shared shapes imported from `src/shared`, never redeclared.
5. No browser storage APIs anywhere in the frontend.
6. Tokens: `crypto.randomUUID()` only; UUID-regex validation before any path construction.
7. Error semantics per `docs/contracts.md` §4: 404 unknown, 410 used, 400 tampered,
   502 generation failed after retries. No other codes without P7.
8. No new dependencies without P7 sign-off recorded in the ticket.
9. Secrets from env only; `.env` gitignored.
10. General code quality: flag duplicated logic, mysterious names, dead code — as judgement calls, not blockers.
11. Test integrity (BLOCKING): the diff must not delete tests, weaken assertions,
    loosen expected values, or mark tests skipped in order to pass. If a test is
    wrong, the diff must dispute it for a human, not silence it.
12. Mandatory-test coupling (BLOCKING): changes to `src/grading/grade.ts` or
    `src/llm/validate.ts` must include corresponding changes/additions in their test
    files, or an explicit statement of why existing tests still fully cover the change.

## Axis 2 — Spec: "is it the right thing?"
1. Does the diff implement the ticket's "Done when" criteria — all of them, and nothing beyond them (flag scope creep explicitly)?
2. Does it conform to `docs/contracts.md`? Any request/response/file shape not matching the contracts is a BLOCKING finding.
3. Security-spec red lines (blocking):
   - `answerIndex` must not appear in any candidate-facing response (GET /api/exams/[token]). Response must be field-allowlisted.
   - Grading, marks, and IDs are server-assigned; none accepted from clients.
   - Submit order preserved: validate → grade → atomic save (result + status used) → CSV append → respond.
4. ADR compliance: no database, fixed 3-tier MCQ (no adaptive logic), exam file as source of truth, candidate sees no score.
5. Offline discipline: no test, fixture, or CI-reachable code path calls the real
   LLM API; MOCK_LLM=true must remain sufficient to run everything.

## Always-human-review (overrides everything)
If the diff touches any of: `src/grading/grade.ts`, `src/llm/prompt.ts`, `src/shared/**`,
answer-stripping logic, this file, `docs/WORKFLOW.md`, `CLAUDE.md`, `.claude/agents/fix-agent.md`, or any SKILL.md
→ verdict must include `⚠ REQUIRES HUMAN REVIEW` even if both axes are clean.

## Output format
```
## Standards
<findings with file:line, or "clean">
## Spec
<findings citing the contract/ticket line violated, or "clean">
## Verdict: PASS | ISSUES (n) | ⚠ REQUIRES HUMAN REVIEW
```

## Loop protocol
- PASS → attach this verdict block to the PR description and open the PR.
- ISSUES → hand findings to the fix agent. Maximum 3 loops; loop 3 with open
  issues, or ~2 hours stuck on one finding → human eval.
