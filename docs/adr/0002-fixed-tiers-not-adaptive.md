# ADR 0002: Fixed 3-tier MCQ, no adaptive engine
Status: accepted (day 1)

## Decision
The exam is three fixed sections (easy/medium/hard) with weighted marks
(1/2/3, `MARKS` in `src/shared`). The original proposal's CAT (adaptive
difficulty) engine is dropped.

## Alternatives considered
The proposal specified a 40-question Computer Adaptive Testing cycle: difficulty
shifts up on correct answers, down on incorrect. Rejected for v1: per-answer
routing requires live session state (the reason Redis existed — see ADR 0001),
multiplies backend complexity and the testing surface, and weighted fixed tiers
differentiate skill levels sufficiently for screening.

## Consequences
- Grading is a pure function over a static question list, graded in one pass
  at submit time.
- No live session state: the whole exam is served by one GET and completed by
  one POST. Any future "send answers to the server per page" idea consciously
  reopens this decision.
- "Choose next question based on previous" must NOT reappear in any ticket.
