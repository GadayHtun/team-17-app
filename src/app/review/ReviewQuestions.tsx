"use client";

/**
 * ReviewQuestions — Ticket 3 (P2), mockup screen 2.
 *
 * HR-FACING ONLY. This component renders `answerIndex` (the correct option is
 * marked). It must never be rendered on, or imported into, a candidate page —
 * the candidate path uses `CandidateQuestion`, which has no `answerIndex`
 * (ADR 0003, red line 1).
 *
 * The draft batch lives in frontend state and is handed in as props (contracts
 * §7: no server-side drafts; nextjs skill hard rule 3: no browser storage).
 * Ticket 1's create-exam page owns the state and renders this after generation.
 */
import { useMemo, useRef, useState } from "react";

import { ApiError, createExam, generateOne, sendInvite } from "@/api/client";
import { MARKS } from "@/shared/constants";
import { TESTID } from "@/shared/testids";
import type { Difficulty, NewQuestion } from "@/shared/types";

import styles from "./review.module.css";

const TIERS: readonly Difficulty[] = ["easy", "medium", "hard"];
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

const TIER_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** One row of the draft. `key` is client-only React identity — never sent. */
interface DraftItem {
  key: string;
  question: NewQuestion;
  selected: boolean;
  regenerating: boolean;
  error: string | null;
}

export interface ReviewQuestionsProps {
  jobTitle: string;
  /** Needed by regenerate — POST /api/exams/generate-one takes the JD. */
  jobDescription: string;
  candidateEmail: string;
  questions: NewQuestion[];
  /** Back to the form (Ticket 1 wires this). */
  onBack?: () => void;
  /** Ticket 9 slot — the button renders disabled until send-invite ships. */
  enableSendInvite?: boolean;
}

export default function ReviewQuestions({
  jobTitle,
  jobDescription,
  candidateEmail,
  questions,
  onBack,
  enableSendInvite = false,
}: ReviewQuestionsProps) {
  const nextKey = useRef(questions.length);
  const [items, setItems] = useState<DraftItem[]>(() =>
    questions.map((question, i) => ({
      key: String(i),
      question,
      selected: true,
      regenerating: false,
      error: null,
    })),
  );

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; link: string } | null>(null);

  const selectedCount = items.filter((item) => item.selected).length;

  /** Tiers present in the batch but with nothing selected — warn, never block. */
  const emptyTiers = useMemo(
    () =>
      TIERS.filter(
        (tier) =>
          items.some((item) => item.question.difficulty === tier) &&
          !items.some((item) => item.question.difficulty === tier && item.selected),
      ),
    [items],
  );

  function toggle(key: string) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item)),
    );
  }

  async function regenerate(key: string) {
    const target = items.find((item) => item.key === key);
    if (!target || target.regenerating) return;

    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, regenerating: true, error: null } : item,
      ),
    );

    try {
      const { question } = await generateOne({
        jobDescription,
        difficulty: target.question.difficulty,
        // Every text on screen, so the replacement can't duplicate one.
        excludeTexts: items.map((item) => item.question.text),
      });

      // Swap in place: same position, same selected state, fresh React key.
      const replacementKey = String(nextKey.current++);
      setItems((prev) =>
        prev.map((item) =>
          item.key === key
            ? { ...item, key: replacementKey, question, regenerating: false, error: null }
            : item,
        ),
      );
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 502
          ? "Couldn't generate a replacement. Try again."
          : "Something went wrong. Try again.";
      setItems((prev) =>
        prev.map((item) =>
          item.key === key ? { ...item, regenerating: false, error: message } : item,
        ),
      );
    }
  }

  async function handleCreateExam() {
    if (creating) return;

    if (selectedCount === 0) {
      setCreateError("Select at least one question to create an exam.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      // Allowlist the four NewQuestion fields — never spread the draft item, or
      // client-only bookkeeping (key, selected) rides along into the request.
      const selected: NewQuestion[] = items
        .filter((item) => item.selected)
        .map(({ question }) => ({
          text: question.text,
          options: question.options,
          answerIndex: question.answerIndex,
          difficulty: question.difficulty,
        }));

      const { token, link } = await createExam({
        jobTitle,
        candidateEmail,
        questions: selected,
      });
      setCreated({ token, link });
    } catch {
      setCreateError("Couldn't create the exam. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Review generated questions</h1>
            <p className={styles.subtitle}>
              {jobTitle} · {candidateEmail}
            </p>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.totalCount}>
              {selectedCount} of {items.length} selected
            </span>
            {onBack && (
              <button type="button" className={styles.linkBtn} onClick={onBack}>
                Back
              </button>
            )}
          </div>
        </header>

        {TIERS.map((tier) => {
          const tierItems = items.filter((item) => item.question.difficulty === tier);
          if (tierItems.length === 0) return null;
          const tierSelected = tierItems.filter((item) => item.selected).length;

          return (
            <section key={tier} className={styles.tier} aria-labelledby={`tier-${tier}`}>
              <div className={styles.tierHeader}>
                <h2 id={`tier-${tier}`} className={`${styles.badge} ${styles[tier]}`}>
                  {TIER_LABEL[tier]} · {MARKS[tier]} {MARKS[tier] === 1 ? "mark" : "marks"}
                </h2>
                <span className={styles.counter}>
                  {tierSelected} of {tierItems.length} selected
                </span>
              </div>

              <ul className={styles.list}>
                {tierItems.map((item) => (
                  <QuestionRow
                    key={item.key}
                    item={item}
                    onToggle={() => toggle(item.key)}
                    onRegenerate={() => regenerate(item.key)}
                  />
                ))}
              </ul>
            </section>
          );
        })}

        <footer className={styles.footer}>
          {emptyTiers.length > 0 && (
            <p className={styles.warning} role="status">
              No {emptyTiers.map((t) => TIER_LABEL[t].toLowerCase()).join(" or ")} question
              {emptyTiers.length > 1 ? "s" : ""} selected. You can still create the exam.
            </p>
          )}
          {createError && (
            <p className={styles.error} role="alert">
              {createError}
            </p>
          )}

          {created ? (
            <ExamLinkBar
              link={created.link}
              token={created.token}
              enableSendInvite={enableSendInvite}
            />
          ) : (
            <button
              type="button"
              className={styles.primaryBtn}
              data-testid={TESTID.createExamBtn}
              onClick={handleCreateExam}
              disabled={creating}
            >
              {creating ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" /> Creating exam…
                </>
              ) : (
                "Create exam"
              )}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}

function QuestionRow({
  item,
  onToggle,
  onRegenerate,
}: {
  item: DraftItem;
  onToggle: () => void;
  onRegenerate: () => void;
}) {
  const { question, selected, regenerating, error } = item;

  return (
    <li
      className={`${styles.item} ${selected ? styles.itemSelected : ""}`}
      data-testid={TESTID.questionItem}
    >
      <input
        type="checkbox"
        className={styles.checkbox}
        data-testid={TESTID.questionCheckbox}
        checked={selected}
        onChange={onToggle}
        aria-label={`Include question: ${question.text}`}
      />

      <div className={styles.itemBody}>
        <p className={styles.questionText}>{question.text}</p>

        {/* HR-facing: the correct option is marked. Never rendered to candidates. */}
        <ol className={styles.options}>
          {question.options.map((option, i) => {
            const isAnswer = i === question.answerIndex;
            return (
              <li
                key={`${item.key}-${i}`}
                className={`${styles.option} ${isAnswer ? styles.correct : ""}`}
              >
                <span className={styles.optionLabel}>{OPTION_LABELS[i]}.</span>
                {option}
                {isAnswer && (
                  <span className={styles.tick} title="Correct answer">
                    <span aria-hidden="true">✓</span>
                    <span className={styles.srOnly}>correct answer</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        className={styles.iconBtn}
        onClick={onRegenerate}
        disabled={regenerating}
        aria-label={`Regenerate question: ${question.text}`}
        title="Regenerate this question"
      >
        <RefreshIcon spinning={regenerating} />
      </button>
    </li>
  );
}

function ExamLinkBar({
  link,
  token,
  enableSendInvite,
}: {
  link: string;
  token: string;
  enableSendInvite: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [invite, setInvite] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  }

  // Fire-and-forget (contracts §7): a send failure never blocks the copy-link path.
  async function handleSendInvite() {
    setInvite("sending");
    try {
      await sendInvite(token);
      setInvite("sent");
    } catch {
      setInvite("failed");
    }
  }

  return (
    <div className={styles.linkSection}>
      <div className={styles.linkRow}>
        <input
          className={styles.linkInput}
          data-testid={TESTID.examLink}
          value={link}
          readOnly
          aria-label="Exam link"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className={styles.ghostBtn} onClick={copy}>
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleSendInvite}
          disabled={!enableSendInvite || invite === "sending" || invite === "sent"}
          title={enableSendInvite ? "Email the link to the candidate" : "Available in week 2"}
        >
          <MailIcon />
          {invite === "sending" ? "Sending…" : invite === "sent" ? "Invite sent" : "Send invite"}
        </button>
      </div>

      <p className={styles.linkHint}>
        One-time link — it stops working once the candidate submits.
      </p>

      {copyFailed && (
        <p className={styles.warning} role="status">
          Couldn&apos;t copy automatically — select the link and copy it.
        </p>
      )}
      {invite === "failed" && (
        <p className={styles.warning} role="status">
          Couldn&apos;t send the email — copy the link instead.
        </p>
      )}
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={spinning ? styles.spinIcon : undefined}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}
