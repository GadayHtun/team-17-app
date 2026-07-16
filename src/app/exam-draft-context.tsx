"use client";

/**
 * Hand-off point between CreateExam (P1) and ReviewQuestions (P2). Holds the
 * generated batch in-memory only (contracts §7: "draft question batches live
 * in frontend state; no server-side drafts"; nextjs skill: no browser
 * storage). Living in this shared client Provider — not a route segment —
 * means the draft survives the client-side navigation from /create-exam to
 * /review but is lost on refresh, matching v1 policy.
 *
 * Shared file per CLAUDE.md ("Two owners may touch src/app/ — coordinate on
 * shared files"): P1 writes the draft, P2 reads it. Confirm this shape with
 * P2 before building src/app/review/page.tsx against it.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { NewQuestion } from "@/shared/types";

export interface ExamDraft {
  jobTitle: string;
  jobDescription: string;
  candidateEmail: string;
  questions: NewQuestion[];
}

interface ExamDraftContextValue {
  draft: ExamDraft | null;
  setDraft: (draft: ExamDraft) => void;
  clearDraft: () => void;
}

const ExamDraftContext = createContext<ExamDraftContextValue | null>(null);

export function ExamDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<ExamDraft | null>(null);

  const value = useMemo<ExamDraftContextValue>(
    () => ({ draft, setDraft, clearDraft: () => setDraft(null) }),
    [draft]
  );

  return (
    <ExamDraftContext.Provider value={value}>
      {children}
    </ExamDraftContext.Provider>
  );
}

export function useExamDraft(): ExamDraftContextValue {
  const ctx = useContext(ExamDraftContext);
  if (!ctx) {
    throw new Error("useExamDraft must be used within ExamDraftProvider");
  }
  return ctx;
}
