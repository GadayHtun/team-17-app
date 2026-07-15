"use client";

/**
 * /review — Ticket 3 host page (P2).
 *
 * Renders the LLM-generated batch from the in-memory draft (ExamDraftProvider),
 * written by /create-exam (P1). No server-side draft, no browser storage
 * (contracts §7; nextjs skill rule 3). The draft is lost on refresh/deep-link,
 * so when it's absent we send the user back to /create-exam to regenerate (v1
 * policy — mid-flow refresh loses progress).
 *
 * HR-facing: the draft carries `answerIndex` and that's allowed to cross here
 * (ADR 0003). The candidate path uses CandidateQuestion and never touches this.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useExamDraft } from "../exam-draft-context";
import ReviewQuestions from "./ReviewQuestions";

export default function ReviewPage() {
  const router = useRouter();
  const { draft } = useExamDraft();

  useEffect(() => {
    if (!draft) router.replace("/create-exam");
  }, [draft, router]);

  if (!draft) return null;

  return (
    <ReviewQuestions
      jobTitle={draft.jobTitle}
      jobDescription={draft.jobDescription}
      candidateEmail={draft.candidateEmail}
      questions={draft.questions}
    />
  );
}
