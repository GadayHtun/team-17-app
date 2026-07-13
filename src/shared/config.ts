/**
 * Shared config (docs/contracts.md §6).
 *
 * P7-OWNED / ALWAYS-HUMAN-REVIEW (CLAUDE.md red line 5). Marks are server-
 * assigned at finalize from this table — never from a request body.
 */
import type { Difficulty } from "@/shared/types";

export const MARKS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
