"use client";

/**
 * Candidate exam page — adaptive flow.
 *
 * Route: /exam/[token]
 * Fetches exam via API client; 404 → error page, 410 → expired page.
 * Server-driven: one question at a time, submitted via POST /answer.
 * No back navigation — candidates answer sequentially.
 * Review mode is read-only.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ApiError, fetchApi } from "@/api/client";
import { TESTID } from "@/shared/testids";
import type { CandidateQuestion } from "@/shared/types";

import {
  type Section,
  flattenSections,
  groupByTier,
  locateQuestion,
} from "./helpers";
import styles from "./review.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ExamResponse {
  status: "exam";
  jobTitle: string;
  question: CandidateQuestion;
  questionNumber: number;
  totalQuestions: number;
}

interface ReviewQuestion extends CandidateQuestion {
  answer: number | null;
}

interface ReviewResponse {
  status: "review";
  jobTitle: string;
  questions: ReviewQuestion[];
}

type ExamData = ExamResponse | ReviewResponse;

/* ------------------------------------------------------------------ */
/*  Styles (inline, matching dark theme from end pages)                */
/* ------------------------------------------------------------------ */

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
    background: "var(--background)",
    padding: "32px 16px",
  },
  card: {
    maxWidth: 640,
    width: "100%",
    background: "var(--card)",
    borderRadius: 16,
    padding: "32px",
  },
  jobTitle: {
    fontSize: 14,
    color: "var(--muted)",
    margin: "0 0 8px",
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressText: {
    fontSize: 13,
    color: "var(--muted)",
  },
  tierBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  questionText: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--foreground)",
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    marginBottom: 10,
    borderRadius: 10,
    border: "1px solid var(--card-border)",
    background: "var(--row)",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    fontSize: 15,
    color: "var(--foreground)",
  },
  optionSelected: {
    border: "1px solid var(--accent)",
    background: "rgba(59, 130, 246, 0.12)",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "var(--accent)",
  },
  navRow: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 24,
  },
  btn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  btnPrimary: {
    background: "var(--accent)",
    color: "#FFFFFF",
  },
  btnSecondary: {
    background: "var(--row)",
    color: "var(--foreground)",
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  refreshNotice: {
    background: "var(--warn-bg)",
    border: "1px solid var(--warn-fg)",
    borderRadius: 8,
    padding: "10px 14px",
    marginBottom: 20,
    fontSize: 13,
    color: "var(--warn-fg)",
    lineHeight: 1.5,
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TakeExamPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "expired" | "server" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Track answered questions locally for the review screen
  const [answeredMap, setAnsweredMap] = useState<Map<string, { text: string; marks: number; answer: number }>>(new Map());

  // Refresh guard — warn before leaving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Fetch exam on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchApi<ExamData>(`/api/exams/${token}`);
        if (!cancelled) {
          setExamData(data);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.status === 410 ? "expired" : "not-found");
        } else {
          setError("server");
        }
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  // Redirect to end pages on error
  useEffect(() => {
    if (!error) return;
    if (error === "not-found") {
      router.replace(`/exam/${token}/error`);
    } else if (error === "expired") {
      router.replace(`/exam/${token}/expired`);
    }
  }, [error, token, router]);

  // Submit answer and get next question
  const goNext = useCallback(async () => {
    if (!examData || examData.status !== "exam" || selectedOption === null || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetchApi<ExamData>(`/api/exams/${token}/answer`, {
        method: "POST",
        body: JSON.stringify({
          questionId: examData.question.id,
          answerIndex: selectedOption,
        }),
      });

      // Track the answered question locally
      setAnsweredMap((prev) => {
        const next = new Map(prev);
        next.set(examData.question.id, {
          text: examData.question.text,
          marks: examData.question.marks,
          answer: selectedOption,
        });
        return next;
      });

      setExamData(response);
      setSelectedOption(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        router.push(`/exam/${token}/expired`);
      }
      // Stay on page — submit failed, user can retry
    } finally {
      setSubmitting(false);
    }
  }, [examData, selectedOption, token, submitting, router]);

  // Final submit
  const handleSubmit = useCallback(async () => {
    if (!examData || examData.status !== "review" || submitting) return;

    setSubmitting(true);
    try {
      const payload: Record<string, number> = {};
      for (const q of examData.questions) {
        if (q.answer !== null) {
          payload[q.id] = q.answer;
        }
      }
      await fetchApi(`/api/exams/${token}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: payload }),
      });
      router.push(`/exam/${token}/success`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        router.push(`/exam/${token}/expired`);
      } else {
        setSubmitting(false);
      }
    }
  }, [examData, token, submitting, router]);

  /* -------------------------------------------------------------- */
  /*  Render: loading                                                */
  /* -------------------------------------------------------------- */

  if (loading) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, textAlign: "center", color: "var(--muted)" }}>
          Loading exam…
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Render: error → redirect to end pages                          */
  /* -------------------------------------------------------------- */

  if (error) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, textAlign: "center", color: "var(--muted)" }}>
          Redirecting…
        </div>
      </div>
    );
  }

  if (!examData) return null;

  /* -------------------------------------------------------------- */
  /*  Render: review mode (read-only)                                */
  /* -------------------------------------------------------------- */

  if (examData.status === "review") {
    const answeredCount = examData.questions.filter((q) => q.answer !== null).length;
    return (
      <div style={S.page}>
        <div className={styles.card}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
            Review your answers
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px" }}>
            {answeredCount} of {examData.questions.length} answered
          </p>
          <ul className={styles.list}>
            {examData.questions.map((q) => {
              const answered = q.answer !== null;
              return (
                <li key={q.id}>
                  <div className={`${styles.item} ${answered ? styles.itemAnswered : styles.itemUnanswered}`}>
                    <span className={`${styles.status} ${answered ? styles.statusAnswered : styles.statusUnanswered}`} />
                    <span className={styles.text}>{q.text}</span>
                    <span className={styles.meta}>{q.marks}m</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className={styles.submitRow}>
            <button
              type="button"
              data-testid={TESTID.submitBtn}
              className={`${styles.submitBtn} ${submitting ? styles.submitBtnDisabled : ""}`.trim()}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting…" : "Submit exam"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Render: exam mode (one question at a time)                     */
  /* -------------------------------------------------------------- */

  const { question, questionNumber, totalQuestions } = examData;
  const hasSelection = selectedOption !== null;

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Job title */}
        <p style={S.jobTitle}>{examData.jobTitle}</p>

        {/* Refresh notice — only on first question */}
        {questionNumber === 1 && (
          <div style={S.refreshNotice} data-testid={TESTID.refreshNotice}>
            ⚠️ Don&apos;t refresh this page — your answers will be lost.
          </div>
        )}

        {/* Progress */}
        <div style={S.progressRow}>
          <span style={S.progressText}>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {question.marks}m
          </span>
        </div>

        {/* Question text */}
        <p data-testid={TESTID.questionText} style={S.questionText}>
          {question.text}
        </p>

        {/* Options */}
        {question.options.map((opt, optIdx) => {
          const selected = selectedOption === optIdx;
          return (
            <button
              key={optIdx}
              type="button"
              data-testid={TESTID.examOption}
              style={{
                ...S.option,
                ...(selected ? S.optionSelected : {}),
              }}
              onClick={() => setSelectedOption(optIdx)}
            >
              <span style={S.radio}>
                {selected && <span style={S.radioDot} />}
              </span>
              {opt}
            </button>
          );
        })}

        {/* Navigation — Next only, no Previous */}
        <div style={S.navRow}>
          <button
            type="button"
            data-testid={TESTID.nextBtn}
            style={{
              ...S.btn,
              ...S.btnPrimary,
              ...(!hasSelection || submitting ? S.btnDisabled : {}),
            }}
            disabled={!hasSelection || submitting}
            onClick={goNext}
          >
            {submitting ? "Submitting…" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
