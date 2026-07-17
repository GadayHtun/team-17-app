# ADR 0004: No authentication on the generation endpoints in v1
Status: accepted (v1) — pending P7 sign-off

## Decision
`POST /api/exams/generate`, `POST /api/exams/generate-one`, and `POST /api/exams`
ship in v1 with no authentication. Any anonymous caller who can reach the
deployment can invoke the LLM at the project's expense.

This is an accepted risk, not an oversight. It is bounded by a hard spend cap at
the LLM provider (see Compensating controls) — not by anything in this codebase.

## Context
The generate endpoints are HR-facing: no candidate flow touches them. The natural
control is an auth gate, and v1 has no auth system of any kind — no login, no
session, no middleware, no shared secret. Building one is out of scope for the
2-week timeline, and the deployment is expected to be shared by link with a small
known group rather than exposed to real traffic.

The exposure is real and worth naming plainly:
- **Denial-of-wallet.** Spamming `generate` runs up an unbounded OpenRouter bill.
- **Free LLM proxy.** `jobDescription` is an attacker-controlled string forwarded
  to the model. Anyone can generate arbitrary content on our account.
- **Resource exhaustion.** Unbounded concurrent requests against the deployment.

## Alternatives considered
- **Auth gate (middleware + shared secret in env).** The correct fix; removes the
  anonymous attack surface entirely and costs roughly an afternoon. Deferred to
  week 2 only because no auth story exists yet and the endpoints predate this
  decision. If v1 is ever exposed beyond the known group, this ADR is void and
  the gate ships first.
- **Per-IP rate limiting as the primary control.** Rejected as a *primary*
  control — it does not bound spend. See Consequences.
- **Removing the endpoints from the public deployment.** Not viable; the HR flow
  needs them and there is no separate origin to move them to.

## Compensating controls
These are what "accepted risk" rests on. Without them the risk is not accepted,
it is merely undocumented.

1. **Hard spend cap at OpenRouter (REQUIRED, owner: P7).** Account credit limit
   or per-key budget, set in the provider dashboard. This is the only control
   that holds when every in-app control is bypassed, and the only one that
   actually bounds the loss. It is a dashboard setting, not code — no PR, no
   contract change. **v1 must not ship without it.**
2. **Global daily call ceiling (in-app, keyed on nothing).** Caps total LLM calls
   per day across all callers. Unlike per-IP limits, it is not defeated by
   rotating source addresses. See Consequences for the serverless caveat.
3. **Per-IP rate limiting.** Defense in depth. Stops double-clicks and lazy
   scripts. Explicitly NOT a denial-of-wallet control.

## Consequences
- **Per-IP rate limiting cannot be sold as the fix for this risk, in review or in
  a PR description.** `x-forwarded-for` is attacker-supplied unless a trusted
  proxy overwrites it; a proxy pool costs about a dollar per GB; 5 req/min across
  unlimited addresses is still unbounded. It is a speed bump. Ship it, but do not
  count it.
- **The deployment is serverless (Vercel or similar), so in-memory limiter state
  is per-instance and resets on cold start.** Any `Map`-based counter fragments
  across warm lambdas and undercounts by the instance multiplier. Both the global
  ceiling and the per-IP limit are therefore *advisory* in v1 — real enforcement
  needs shared state (Redis/Upstash) or must live at the provider cap. Do not
  read a green rate-limit test as evidence the limit holds in production.
- **This contradicts ADR 0001's premise.** ADR 0001 assumed "single-server
  deployment" and said to revisit "if multi-instance deployment ever happens."
  Serverless *is* multi-instance, and the same property that breaks the in-memory
  limiter breaks file-based storage (ephemeral, per-instance filesystem). ADR 0001
  needs its own revisit — tracked separately, not resolved here.
- **Returning 429 requires a contracts amendment.** `docs/contracts.md` freezes
  400/404/410/502. A fifth status is P7's call and must land in contracts.md
  before any route returns it.
- **Rate-limit quota must be charged after a successful LLM call, not before**, or
  a provider outage locks users out of retrying a request that never cost money.
- Revisit this ADR the moment the deployment URL is shared outside the known
  group, or if the OpenRouter cap is ever raised above a tolerable write-off.
