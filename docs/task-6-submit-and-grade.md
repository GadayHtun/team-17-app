# Task 6 - Submit And Grade

Owner: P6

## Scope

- Build `src/grading/grade.ts` as a pure function with no file or HTTP access.
- Build `POST /api/exams/[token]/submit`.
- Return `{ ok: true }` only. Do not return the candidate's score.

## Rules

- Unknown or malformed token: `404`.
- Already-used exam: `410`.
- Unknown question id or option index outside `0..3`: `400`.
- Skipped questions are legal and score zero.
- Grade in memory first, then save the exam as `used`, then append `results.csv`.

## Verification

Run:

```bash
npm run test:grade
npm run lint
npm run build
```
