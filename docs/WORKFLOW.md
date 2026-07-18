# WORKFLOW.md — toolchain and build loop

How we build. CLAUDE.md is the summary; this is the operating manual.
Owner: P7. Changes to this file are always-human-review.

## 1. Install checklist (every machine, day 1 — P7 verifies)

| Tool | Kind | How | Standardization |
|---|---|---|---|
| Claude Code | agent | per docs | same major version |
| aihero skills: grill-with-docs, to-tickets, implement (+ internal tdd, code-review) | skills | `npx skills add` per aihero.dev | GATE — identical everywhere, pin the same version |
| OpenCode | reviewer agent | per OpenCode docs | GATE — identical everywhere |
| Context7 | MCP server | committed `.mcp.json` — approve on first run | repo-pinned automatically |
| GSD | plugin | plugin install | helper — optional |
| caveman | plugin | plugin install | helper — optional, per-person |

Repo-side pieces (already committed, nothing to install): `.claude/skills/*`
(nextjs, security-review, testing), `.claude/agents/fix-agent.md`,
`REVIEW_RULES.md`, fixtures.

Note: verify `.mcp.json` behavior and skill-pinning options against current
Claude Code docs during setup — this area changes between versions.

**Do not run `vitest --ui`.** `vitest@2.1.9` carries a critical advisory
(GHSA — arbitrary file read + execute) that is only exploitable while the
Vitest UI server is listening. `npm test` (`vitest run`) never starts it, which
is why `npm audit`'s critical is accepted as unreachable rather than fixed —
see issue #26. Running `--ui` makes it live. Clearing it needs vitest 2 → 4
(two majors, all 8 machines, P7 call).

**Never run `npm audit fix --force` in this repo.** It proposes `next@9.3.3`,
downgrading from `next@16.2.10` (current latest) and breaking the app. `postcss`
is held at a safe version by an `overrides` entry in `package.json` because
`next` itself pins a vulnerable `8.4.31`; leave that override in place.

## 2. When to invoke what

| Moment | Tool | Notes |
|---|---|---|
| Day 1, once | `/grill-with-docs` | Short session seeded with docs/. Output: CONTEXT.md + ADRs. Timebox: 1 hour. |
| Day 1, once | `/to-tickets` | Publish docs/tasks.md as GitHub issues. MERGE-ORDER edges only — a blocker means "can't merge before", never "can't start". Every issue names its mock/fixture so work starts immediately. |
| Any fuzzy decision mid-project | `/grill-with-docs` | Grill the one decision; new one-way calls become ADRs. |
| Per ticket: build | `/implement` | Drives tdd (mandatory-test modules only — see testing SKILL) + self code-review + commit. For pure-UI tickets, plain building without forced test-first is fine. |
| Per ticket: pre-commit | security-review skill | Auto-applies; run explicitly before handoff. |
| Per ticket: pre-PR | OpenCode + `REVIEW_RULES.md` | `npm run review` (wraps: diff vs main + REVIEW_RULES.md + ticket done-when → two-axes findings). |
| On findings | fix-agent | Fixes only what findings name. Counts loops. |
| Optional, any time | caveman | Personal output style. `/caveman-compress` on CLAUDE.md only after ratification. |

## 3. The loop (per ticket, per branch)

```
ticket (GitHub issue, frontier = all blockers merged)
  → /implement on branch feat/<ticket>     [tdd where mandatory, self code-review]
  → security-review skill                  [clean or fix]
  → npm test && npm run e2e                [green]
  → OpenCode review (npm run review)       [two axes: standards | spec]
      ├─ PASS → open PR, verdict block pasted in description
      └─ ISSUES → fix-agent → re-run tests → back to OpenCode
           max 3 loops OR ~2h stuck on one finding → HUMAN EVAL
  → PR → CI (tests + golden-path e2e, MOCK_LLM=true) → merge
```

Rules that make it real:
- No PR without a review verdict in the description. No merge without green CI
  (branch protection on main enforces the second; team discipline enforces the first).
- Always-human list (grade.ts, prompt.ts, src/shared/, answer-stripping,
  REVIEW_RULES.md, SKILL.md files): human review on every touch, even all-green.
- Never weaken a failing test to pass a gate — dispute it for a human.
- One branch per ticket; agents don't touch files outside their ticket's lane.

## 4. Blockers vs starts (the parallelism rule)

Only true merge-order blockers get GitHub blocking links:
- contracts freeze blocks everything (why it's day 1)
- storage module blocks MERGING exams/submit endpoints — not starting them
- nothing blocks any frontend ticket: all four pages start against fixtures/

If a blocking edge would make someone wait to START, the edge is wrong — delete it.

## 5. Checkpoints
- End of day 1: repo cloned everywhere, toolchain verified, contracts + this file ratified and frozen.
- End of week 1: HR flow works end-to-end with real LLM output.
- Day 10: candidate flow end-to-end; feature freeze.
- Days 11–14: integration, edge cases, polish. Week-2 extras (email, results view) only if green.
