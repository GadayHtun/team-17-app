# Exam Platform — AI-Powered MCQ Screening

> An AI-powered multiple-choice screening tool. HR pastes a job description → LLM
> generates tiered questions (easy/medium/hard) → HR curates in a review step →
> one-time candidate link → server grades automatically → results exported as CSV.

Built by an 8-person team over 2 weeks. MongoDB database.

![CI](https://github.com/GadayHtun/team-17-app/actions/workflows/ci.yml/badge.svg)

---

## Quickstart

```bash
git clone <repo-url> && cd team-17-app
cp .env.example .env        # fill in real values locally — never commit .env
npm install && npm run dev   # → http://localhost:3000
```

**Requires:** Node.js ≥20, npm ≥10. (See [docs/WORKFLOW.md](docs/WORKFLOW.md) for the full toolchain checklist.)

### Commands

| Command | What it does |
|---------|-------------|
| `npm test` | Unit + contract tests (vitest) |
| `npm run e2e` | Playwright golden-path (set `MOCK_LLM=true`) |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run generate:fixtures` | Regenerate LLM mock fixtures |

## How it works

```
HR pastes JD ──▶ LLM generates questions ──▶ HR reviews & curates
                                                    │
                                          HR sends one-time link
                                                    │
                                          Candidate takes exam
                                                    │
                                          Server auto-grades
                                                    │
                                          Results.csv exported
```

### Pages

| Route | Who | What |
|-------|-----|------|
| `/` | Anyone | Landing page with "How it works" overview |
| `/create-exam` | HR | Paste a JD → configure difficulty → generate questions via LLM |
| `/review` | HR | Review generated questions — reorder, delete, edit, finalize |
| `/take-exam/[token]` | Candidate | Answer questions on a one-time exam link |
| `/end` | Candidate | Confirmation screen after submitting |
| `/api/exams` | — | Backend endpoints: create exam, get exam by token, submit answers |

### Key design decisions

- **MongoDB database** — exams and results live as JSON files in `data/`. Gitignored.
- **Candidate never sees their score** — submit returns `{ ok: true }`; results are HR-side only.
- **Unanswered questions = 0 marks** — no penalty, no error.
- **Server-only grading** — `answerIndex` never reaches the candidate; marks are server-assigned.
- **Mid-exam refresh loses answers** — acknowledged v1 limitation (noted on the exam page).
- **MOCK_LLM** — when enabled, serves fixture responses; all tests and CI use this mode (never call the real LLM API).

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | CSS Modules |
| AI / LLM | OpenAI API (via OpenRouter), tiered generation |
| Storage | File system (`data/` directory) |
| Grading | Custom server-side autograder |
| Testing | Vitest (unit) + Playwright (E2E) |
| CI/CD | GitHub Actions (lint, typecheck, test, build; security scanning) |

## Project structure

| Path | What lives here |
|------|----------------|
| `src/app/` | Next.js App Router pages (`/`, `/create-exam`, `/review`, `/take-exam`, `/end`) |
| `src/app/api/` | Backend API routes (exam CRUD, submit) |
| `src/shared/` | Contract types, config (marks for easy/medium/hard), constants |
| `src/llm/` | LLM prompt templates, question generation, validation |
| `src/storage/` | File-system read/write — only `storage.ts` touches the disk |
| `src/grading/` | Auto-grading engine (`grade.ts`) |
| `src/contracts/` | Shared type definitions and API types |
| `src/components/` | Shared UI components |
| `fixtures/` | Committed LLM mock fixtures (used when `MOCK_LLM=true`) |
| `data/` | Runtime exam files (gitignored — never committed) |
| `docs/` | Architecture docs, ADRs, contracts, workflow guide |
| `e2e/` | Playwright E2E tests (golden-path) |
| `.github/` | CI, security scanning, PR/issue templates |

## Team

| Person | Primary area |
|--------|-------------|
| P1 | CreateExam page (`src/app/create-exam/`) |
| P2 | ReviewQuestions page (`src/app/review/`) |
| P3 | TakeExam + End pages (`src/app/take-exam/`, `src/app/end/`) |
| P4 | LLM pipeline (`src/llm/` — prompt, generate, validate) |
| P5 | Storage + Exam API (`src/storage/`, `src/app/api/exams/`) |
| P6 | Grading + Submit API (`src/grading/`, `src/app/api/submit/`) |
| P7 | Shared code, contracts, integration lead (`src/shared/`, `src/contracts/`) |
| P8 | Results view, email invites (week 2), reinforcement |

## Branch strategy

One branch per ticket. No pushes to `main`, no self-merges.

```
feature/your-ticket → PR → 1 teammate review → merge to main
```

## Red lines

1. `answerIndex` never reaches a candidate-facing response.
2. Exam tokens are `crypto.randomUUID()`, regex-validated before any file operation.
3. Error conventions: `404` (unknown), `410` (used link), `400` (tampered), `502` (generation failed).
4. Marks, IDs, grading are server-assigned — never from a request body.
5. Never weaken or delete a failing test to make it pass — flag it for human review.

---

*Built with the [Vibe Code Tours project starter](https://github.com/vibecode-tours/project-starter).*
