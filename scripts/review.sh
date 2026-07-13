#!/usr/bin/env bash
# scripts/review.sh — pre-PR gate wrapper (docs/WORKFLOW.md §2, REVIEW_RULES.md)
#
# Bundles the diff vs main + REVIEW_RULES.md + the current ticket's "Done when"
# criteria, and hands them to OpenCode for the two-axes review (Standards | Spec).
#
# Usage:
#   npm run review -- <ticket-number>
#   TICKET=4 npm run review
#
# Requires the OpenCode CLI to be installed and authenticated (docs/WORKFLOW.md §1).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TICKET="${1:-${TICKET:-}}"
BASE_REF="${BASE_REF:-main}"

if [[ -z "$TICKET" ]]; then
  echo "error: no ticket number given." >&2
  echo "usage: npm run review -- <ticket-number>   (or TICKET=<n> npm run review)" >&2
  exit 1
fi

if ! command -v opencode >/dev/null 2>&1; then
  echo "error: 'opencode' CLI not found on PATH." >&2
  echo "Install it per docs/WORKFLOW.md §1 (toolchain checklist) — it's a GATE tool," >&2
  echo "identical version required on every machine." >&2
  exit 1
fi

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "error: base ref '$BASE_REF' not found. Set BASE_REF=<branch> if your default branch isn't 'main'." >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

DIFF_FILE="$WORKDIR/diff.patch"
DONE_WHEN_FILE="$WORKDIR/done-when.md"
PROMPT_FILE="$WORKDIR/review-prompt.md"

git diff "$BASE_REF"...HEAD -- . ':!data' > "$DIFF_FILE"

if [[ ! -s "$DIFF_FILE" ]]; then
  echo "error: empty diff against $BASE_REF — nothing to review. Commit your changes first." >&2
  exit 1
fi

# Pull just this ticket's section out of docs/tasks.md (from its "## Ticket N —"
# heading to the next "---"). Falls back to the whole file if the heading isn't found,
# so the script still runs — but flag it, since scope matters for axis 2.
if grep -q "^## Ticket $TICKET " docs/tasks.md; then
  awk "/^## Ticket $TICKET /{flag=1} flag; /^---\$/{if(flag) exit}" docs/tasks.md > "$DONE_WHEN_FILE"
else
  echo "warning: no '## Ticket $TICKET' heading in docs/tasks.md — passing the full file." >&2
  cp docs/tasks.md "$DONE_WHEN_FILE"
fi

{
  echo "# Pre-PR review — Ticket $TICKET"
  echo
  echo "Review the diff below against REVIEW_RULES.md. Report the two axes"
  echo "(Standards, Spec) SEPARATELY per the output format in that file — do not merge them."
  echo
  echo "## REVIEW_RULES.md"
  echo '```markdown'
  cat REVIEW_RULES.md
  echo '```'
  echo
  echo "## Ticket $TICKET — scope and \"Done when\""
  echo '```markdown'
  cat "$DONE_WHEN_FILE"
  echo '```'
  echo
  echo "## Diff vs $BASE_REF"
  echo '```diff'
  cat "$DIFF_FILE"
  echo '```'
} > "$PROMPT_FILE"

echo "Running OpenCode review for Ticket $TICKET (diff vs $BASE_REF, $(wc -l < "$DIFF_FILE") lines)..."
opencode review --file "$PROMPT_FILE"
