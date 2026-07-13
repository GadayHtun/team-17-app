# ADR 0003: Correct answers and scores never reach the candidate
Status: accepted (day 1)

## Decision
`GET /api/exams/[token]` strips answerIndex via field allowlist (`CandidateQuestion`
in `src/shared`). Grading is server-side only. The candidate's submit response
is `{ ok: true }` — a confirmation, not a score.

## Alternatives considered
- Showing candidates their score after submit: rejected — invites disputes
  ("question 12 was ambiguous") and leaks question-bank signal. Common pattern,
  deliberately not ours.
- Grading in the browser ("simpler backend"): rejected outright — it requires
  shipping answerIndex to the client, which defeats the exam.

## Consequences
- The allowlist IS the definition of intentional: id, text, options, difficulty,
  and marks ARE sent to candidates on purpose (tier badge, marks display —
  mockup screen 3). Do not "fix" marks or difficulty out of the response.
  Anything beyond the allowlist is a violation.
- Security review greps candidate-facing responses for answerIndex; responses
  are built by allowlisting fields, never by deleting keys.
- HR sees scores via results.csv / the results view only.
- Revisit "show score" only as an explicit HR-facing feature decision through P7.
