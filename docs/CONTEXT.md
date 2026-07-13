# CONTEXT.md — shared vocabulary

One meaning per term, for all 8 people and every agent. If a conversation uses a
term differently than defined here, the conversation is wrong or this file needs
a P7-approved update. Normally grown by /grill-with-docs; this version is
pre-seeded from the planning phase — ratify on day 1, extend as new terms appear.

## Domain

**Exam** — one generated, curated question set tied to one candidate via one token.
One exam = one file = one link = one attempt. There is no "exam template" reused
across candidates in v1.

**Question** — a finalized MCQ: id, text, exactly 4 options, one correct
answerIndex, difficulty, marks. Before finalize it is a **NewQuestion** (no
id/marks yet). See contracts §1 — the types are the definition.

**Batch** — the full set of NewQuestions one generation call produces, before HR
curates it. Lives only in frontend state; never stored server-side.

**Tier / difficulty** — easy, medium, or hard. Defined by cognitive level (recall /
apply / edge cases), not by topic. Fixed per question at generation; never adaptive
(ADR 0002).

**Marks** — the weight of a question: easy 1, medium 2, hard 3 (`MARKS` in
`src/shared`). Server-assigned at finalize. Visible to candidates; that's intentional.

**Finalize** — the act of `POST /api/exams`: HR's selected NewQuestions become
Questions (server assigns ids + marks, shuffles options), the exam file is written,
the token/link is born. "Generated" ≠ "finalized" — a batch HR is still reviewing
is not an exam.

**Regenerate-one** — replacing a single bad question in the batch via
`POST /api/exams/generate-one` with excludeTexts, without regenerating the batch.

**Token** — a `crypto.randomUUID()` string that is simultaneously the exam's
identity, its filename, and its only authentication. Contains NO information
(no expiry, no candidate data) — all state lives in the exam file it points to.

**Link** — `${APP_URL}/exam/${token}`. "Sending the invite" means delivering this
link; email (Ticket 9) is optional, copy-paste is the shipped fallback.

**Exam file** — `data/exams/{token}.json`, the SOURCE OF TRUTH for one exam's
entire lifecycle: questions (with answers), status, and after submit, the result.
Everything else (CSV, results view) is derived and regenerable from exam files.

**Status: active / used** — the exam file's only two states. `active` = link
works; `used` = submitted and locked. **Expired** is what the candidate-facing UI
calls `used` (and any future `expiresAt` overrun) — there is no third status value.

**Stripping / allowlist** — building the candidate-facing question by listing the
allowed fields (id, text, options, difficulty, marks), never by deleting
answerIndex from the full object. "Stripped" = answerIndex cannot appear in the
response body, verifiable by grep.

**Submit** — the one-shot `POST /api/exams/[token]/submit`. Order of operations is
contractual: validate → grade in memory → one atomic save (result + used) →
CSV append → respond. No score in the response.

**Grading** — the pure function `grade(questions, answers) → Scores` in
`src/grading/grade.ts`. "Pure" means no file, network, or clock access inside it.
Unanswered = 0 marks, legal.

**Scores / percentage** — per-tier `{score, max}` pairs plus total and a
percentage rounded to 1 decimal. A score without its max is meaningless — always
store and display both.

**results.csv** — the append-only HR report (contracts §5 columns). A REPORT,
not a record: if it burns down, regenerate it from the exam files.

**Candidate** — the person taking the exam. Sees: questions (stripped), marks,
progress, end pages. Never sees: answerIndex, their score, other candidates.

**HR** — the person creating exams and reading results. Sees everything,
including correct answers during review.

## Process

**Contracts** — docs/contracts.md + its executable twin `src/shared`. FROZEN
end of day 1; changes go through P7 only. When any document disagrees with the
contracts, the contracts win.

**Ticket** — one of the 9 items in docs/tasks.md, published as a GitHub issue.
One ticket = one branch = one pass through the build loop.

**Blocker (merge-order)** — a GitHub blocking link meaning "cannot MERGE before
X is merged". It never means "cannot start" — every ticket starts day 1 against
its named fixture/mock. An edge that would delay a start is a wrong edge.

**Frontier** — the set of tickets whose blockers are all merged; what's grabbable
right now.

**Fixture** — a committed sample JSON in /fixtures used as mock data by frontends,
tests, and MOCK_LLM mode. Distinct from **data/** (gitignored runtime state).
Fixtures mirror contract types exactly — contracts.test.ts enforces it.

**Mock mode / MOCK_LLM** — env flag making generation serve fixtures instead of
calling the real LLM API. Tests and CI always run with it; nothing test-reachable
ever calls the real API.

**Golden path** — the one Playwright spec (e2e/golden-path.spec.ts) that IS the
definition of "the project works": create → curate → link → take → submit →
CSV row → expired. Green golden path = demoable product.

**Build loop** — per ticket: /implement (tdd where mandatory + self-review) →
security-review skill → tests → OpenCode review → fix-agent → re-run, max 3
loops or ~2h stuck → human eval; pass → PR (verdict attached) → CI → merge.
Details: docs/WORKFLOW.md.

**Two axes** — the review format: Standards ("built right?") and Spec ("right
thing?"), always reported separately. Defined in REVIEW_RULES.md.

**Verdict** — the review's output block (PASS / ISSUES(n) / ⚠ REQUIRES HUMAN
REVIEW), pasted into every PR description. No verdict, no PR.

**Always-human list** — files whose every change needs human review regardless of
green gates: grade.ts, prompt.ts, src/shared/, answer-stripping,
REVIEW_RULES.md, WORKFLOW.md, CLAUDE.md, SKILL.md files.

**Gate vs helper** — gate tools (aihero skills, OpenCode, fix-agent) must be
identical on all 8 machines; helper tools (GSD, caveman) may vary per person.
Context7 is repo-pinned via .mcp.json.

**Freeze** — the end-of-day-1 moment after which contracts, this glossary, and
the meta-docs change only through P7 with team agreement. **Feature freeze** is
different: day 10, after which only fixes land.

**P1–P8** — the ownership map in CLAUDE.md. "P7" as a verb ("that's a P7 change")
means: requires the lead's sign-off.
