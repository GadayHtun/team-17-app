/**
 * /review — Ticket 3 host page (P2).
 *
 * TEMPORARY DATA SOURCE: renders the committed fixture batch so the review UI
 * can be driven before Ticket 1 (P1, create-exam) lands. The real flow keeps the
 * draft in frontend state and passes it to <ReviewQuestions> as props — no
 * server-side drafts (contracts §7), no browser storage (nextjs skill rule 3).
 * When Ticket 1 merges, P1 renders <ReviewQuestions> from its own state and this
 * page's fixture props go away.
 *
 * Server component: the fixture is read here and handed to the client component
 * as props. That is HR-facing, so `answerIndex` is allowed to cross (ADR 0003);
 * the candidate path uses CandidateQuestion and never touches this component.
 */
import type { NewQuestion } from "@/shared/types";

import batch from "../../../fixtures/question-batch.json";
import ReviewQuestions from "./ReviewQuestions";

// The fixture is committed JSON: TS widens `options` to string[] and
// `answerIndex` to number, so assert it back to the frozen contract type.
const questions = batch.questions as NewQuestion[];

export default function ReviewPage() {
  return (
    <ReviewQuestions
      jobTitle="Frontend Developer (React)"
      jobDescription="React + TypeScript role. 3+ years. REST APIs."
      candidateEmail="candidate@mail.com"
      questions={questions}
    />
  );
}
