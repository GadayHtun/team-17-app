---
name: security-review
description: Use before committing, before opening a PR, or whenever asked to security-review changes on the exam platform. Runs generic scans (secrets, dependencies) plus the app-specific checks — answer leaks (route + RSC/client-props), token/path safety, secrets in env — and enforces the always-human-review list.
---

# Security review skill — exam platform

Canonical rules live in `REVIEW_RULES.md` and `docs/contracts.md`; the
always-human list below must stay identical to the one in REVIEW_RULES.md.
Run every section. Report findings per section; an empty section reports "clean".

## 1. Generic scans
- `gitleaks detect` (or `git secrets --scan`) on the diff — no API keys, SMTP credentials, or tokens in code or fixtures.
- `npm audit` — flag new high/critical vulnerabilities introduced by dependency changes.
- No new dependencies at all without P7 sign-off noted in the PR description.
- Nothing under `data/` is staged or committed — runtime exam files contain live
  answer keys; landing one in git history is a permanent leak. (`git status data/`
  must be clean; `data/` stays in .gitignore.)
- Fixtures contain no real personal data — placeholder emails/names only.

## 2. App-specific checks (the ones that actually matter here)
These are the project's real attack surface. Check them by name, every time:

**2a. Answer leak check.**
`answerIndex` legitimately appears in the exams route handlers in TWO places — the
finalize logic (`src/app/api/exams/route.ts`: accepting `NewQuestion[]`, shuffling
options, updating the index) and the stripping logic
(`src/app/api/exams/[token]/route.ts`). Neither is a finding. The violation is
`answerIndex` reaching a CANDIDATE-FACING output — an HTTP response OR a value
serialized to the client via RSC / a server action:
- `grep -rn "answerIndex" src/app/api/` — trace each hit: does it flow into the
  `GET /exams/:token` response construction? That, and only that, is a route finding.
- Confirm the GET response is built by **allowlisting** fields (`id, text, options, difficulty, marks` — exactly `CandidateQuestion`), not by deleting keys from the full object.
- **RSC / server-action boundary (Next.js — the new surface).** A full `Question`
  passed as a prop into a `'use client'` component, or returned from a `'use server'`
  action to client code, serializes `answerIndex` into the page payload even if the
  UI never renders it. Grep candidate-facing segments (`src/app/take-exam/`,
  `src/app/end/`) and any server action they call: every object crossing to a client
  component must already be `CandidateQuestion`, stripped server-side FIRST.
- Frontend/types: no candidate-page type or client-component prop includes
  `answerIndex`. (`marks` and `difficulty` in candidate types are intentional —
  ADR 0003; not findings.)

**2b. Token and path safety.**
- Every route reading `:token` (the `[token]` dynamic segment) validates it against the UUID v4 regex **before** any string reaches a path builder.
- No `path.join` / template literal builds a filesystem path from unvalidated request input anywhere.
- Tokens are generated with `crypto.randomUUID()` only — no `Math.random`, no shortened IDs.

**2c. Secrets hygiene.**
- `LLM_API_KEY` and `SMTP_*` read from `process.env` only.
- `.env` is gitignored; `.env.example` contains placeholders, never real values.
- No secret is ever written to logs, error messages, or the exam files.

## 3. Always-human-review list (identical to REVIEW_RULES.md)
If the diff touches ANY of the following, the review output MUST begin with
`⚠ REQUIRES HUMAN REVIEW` regardless of findings:
- `src/grading/grade.ts`
- `src/llm/prompt.ts`
- `src/shared/**` (the contracts)
- The answer-stripping logic in `src/app/api/exams/[token]/route.ts`
- `REVIEW_RULES.md`, `docs/WORKFLOW.md`, `CLAUDE.md`, `.claude/agents/fix-agent.md`,
  this file, or any SKILL.md

## 4. Output format
```
## Security review
### Generic: <clean | findings>
### Answer leak: <clean | findings>
### Token/path: <clean | findings>
### Secrets: <clean | findings>
### Human review required: <no | yes — files>
```
