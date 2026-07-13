# ADR 0001: File-based storage, no database
Status: accepted (day 1)

## Decision
Persist exams as one JSON file per token under data/exams/ (gitignored), results
as an append-only results.csv. No PostgreSQL, no Redis for v1.

## Context
2-week timeline, 8 people, single-server deployment, low write volume
(one candidate per link, one submit per exam). DB setup, migrations, and hosting
would consume days for no v1 benefit.

## Alternatives considered
The original proposal specified PostgreSQL (persistent records) + Redis (active
sessions). Rejected for v1: session state disappeared with the adaptive engine
(ADR 0002), and Postgres solves scale/concurrency problems this project does not
have yet. This ADR deliberately overrides that section of the proposal.

## Consequences
- All fs access isolated in the storage module → a later DB swap touches one file.
- Atomic writes (temp file + rename) stand in for transactions.
- Exam file is the source of truth; the CSV is a regenerable report.
- Trade-off accepted: no concurrent-writer safety beyond atomic single-file
  writes. The submit race (two simultaneous submits both reading `active`) is
  theoretical at one-candidate-per-link scale; an optional mutex around
  load-check-save may be added but is NOT required for v1. Revisit if
  multi-instance deployment ever happens.
