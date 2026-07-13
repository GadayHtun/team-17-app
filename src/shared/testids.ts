/**
 * DRAFT for P7 review — canonical selector registry (testing skill).
 * `src/shared/**` is P7-owned and always-human-review: treat this as a proposal,
 * not a merged decision. The E2E (e2e/golden-path.spec.ts) is the only consumer
 * today; every id here is referenced there. Keys are stable contracts — rename
 * via P7 only, in lockstep with the spec and the `data-testid` attributes in the
 * page components.
 *
 * Usage:
 *   test:  page.getByTestId(TESTID.generateBtn)
 *   page:  <button data-testid={TESTID.generateBtn}>Generate</button>
 */
export const TESTID = {
  // CreateExam — HR form (P1, src/app/create-exam/)
  jobTitleInput: "job-title-input",
  jdInput: "jd-input",
  candidateEmailInput: "candidate-email-input",
  countEasy: "count-easy",
  countMedium: "count-medium",
  countHard: "count-hard",
  generateBtn: "generate-btn",

  // ReviewQuestions — batch review + finalize (P2, src/app/review/)
  questionItem: "question-item",
  questionCheckbox: "question-checkbox",
  createExamBtn: "create-exam-btn",
  examLink: "exam-link",

  // TakeExam — candidate flow (P3, src/app/exam/[token]/)
  tierBadge: "tier-badge",
  submitBtn: "submit-btn",
  prevBtn: "prev-btn",
  nextBtn: "next-btn",
  reviewBtn: "review-btn",
  questionText: "question-text",
  examOption: "exam-option",
  questionNavItem: "question-nav-item",
  refreshNotice: "refresh-notice",

  // End pages (P3, src/app/exam/[token]/)
  successPage: "success-page",
  expiredPage: "expired-page",
  errorPage: "error-page",
} as const;

export type TestId = (typeof TESTID)[keyof typeof TESTID];
