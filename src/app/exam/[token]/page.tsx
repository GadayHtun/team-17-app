"use client";

/**
 * Candidate exam page — Ticket 5 (P3).
 *
 * Route: /exam/[token]
 * Fetches exam via API client; 404 → error page, 410 → expired page.
 * MCQ UI: one question per page, radio options, Prev/Next, tier badge, progress.
 * Review mode before submit with jump-to-question.
 * Answers stored as Map<questionId, optionIndex> — never an ordered array.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ExamData {
  jobTitle: string;
  questions: CandidateQuestion[];
}

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: "#166534", text: "#FFFFFF" },
  medium: { bg: "#92400E", text: "#FFFFFF" },
  hard: { bg: "#7F1D1D", text: "#FFFFFF" },
};

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
  header: {
    marginBottom: 24,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    gap: 12,
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
  /* Review mode */
  reviewList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  reviewItem: (answered: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    marginBottom: 8,
    borderRadius: 8,
    background: answered ? "var(--easy-bg)" : "var(--hard-bg)",
    border: `1px solid ${answered ? "var(--easy-fg)" : "var(--hard-fg)"}`,
    cursor: "pointer",
    fontSize: 14,
    color: "var(--foreground)",
  }),
  reviewStatus: (answered: boolean) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: answered ? "var(--ok)" : "var(--err-fg)",
    flexShrink: 0,
  }),
  reviewText: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  reviewMeta: {
    fontSize: 12,
    color: "var(--muted)",
    flexShrink: 0,
  },
  submitRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: 24,
  },
} as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TakeExamPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<"exam" | "review">("exam");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "expired" | "server" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Refresh guard — warn before leaving if answers exist
  const hasAnswers = answers.size > 0;
  useEffect(() => {
    if (!hasAnswers) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasAnswers]);

  // Fetch exam on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchApi<ExamData>(`/api/exams/${token}`);
        if (!cancelled) {
          setExam(data);
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

  // Group questions by tier
  const sections = useMemo(
    () => (exam ? groupByTier(exam.questions) : []),
    [exam],
  );
  const flat = useMemo(() => flattenSections(sections), [sections]);

  // Current question
  const currentQuestion = flat[currentIndex] ?? null;
  const locate = currentQuestion ? locateQuestion(sections, currentQuestion.id) : null;

  // Navigation
  const goNext = useCallback(() => {
    if (currentIndex < flat.length - 1) {
      setCurrentIndex((i) => i + 1);
      setMode("exam");
    } else {
      // Last question → go to review
      setMode("review");
    }
  }, [currentIndex, flat.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setMode("exam");
    }
  }, [currentIndex]);

  const jumpTo = useCallback((idx: number) => {
    setCurrentIndex(idx);
    setMode("exam");
  }, []);

  // Answer selection
  const selectOption = useCallback((questionId: string, optionIndex: number) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, optionIndex);
      return next;
    });
  }, []);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!exam || submitting) return;
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(answers);
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
        // Stay on page — submit failed, user can retry
      }
    }
  }, [exam, answers, token, submitting, router]);

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

  if (!exam) return null;

  /* -------------------------------------------------------------- */
  /*  Render: review mode                                            */
  /* -------------------------------------------------------------- */

  if (mode === "review") {
    const answeredCount = flat.filter((q) => answers.has(q.id)).length;
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
            Review your answers
          </h2>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px" }}>
            {answeredCount} of {flat.length} answered — click a question to jump back
          </p>
          <ul style={S.reviewList}>
            {flat.map((q, idx) => {
              const answered = answers.has(q.id);
              const loc = locateQuestion(sections, q.id);
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    data-testid={TESTID.questionNavItem}
                    style={S.reviewItem(answered)}
                    onClick={() => jumpTo(idx)}
                  >
                    <span style={S.reviewStatus(answered)} />
                    <span style={S.reviewText}>{q.text}</span>
                    <span style={S.reviewMeta}>
                      {q.difficulty} · {q.marks}m
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div style={S.submitRow}>
            <button
              type="button"
              data-testid={TESTID.submitBtn}
              style={{
                ...S.btn,
                ...S.btnPrimary,
                padding: "12px 32px",
                fontSize: 15,
                ...(submitting ? S.btnDisabled : {}),
              }}
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

  const tierColor = TIER_COLORS[currentQuestion!.difficulty] ?? TIER_COLORS.easy;
  const isLast = currentIndex === flat.length - 1;

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Job title */}
        <p style={S.jobTitle}>{exam.jobTitle}</p>

        {/* Refresh notice — only on first question with no answers yet */}
        {currentIndex === 0 && answers.size === 0 && (
          <div style={S.refreshNotice} data-testid={TESTID.refreshNotice}>
            ⚠️ Don&apos;t refresh this page — your answers will be lost.
          </div>
        )}

        {/* Progress + tier badge */}
        <div style={S.progressRow}>
          <span style={S.progressText}>
            Question {currentIndex + 1} of {flat.length}
            {" · "}
            Section {locate!.sectionIdx + 1} of {sections.length}
          </span>
          <span
            data-testid={TESTID.tierBadge}
            style={{
              ...S.tierBadge,
              background: tierColor.bg,
              color: tierColor.text,
            }}
          >
            {currentQuestion!.difficulty} · {currentQuestion!.marks}m
          </span>
        </div>

        {/* Question text */}
        <p data-testid={TESTID.questionText} style={S.questionText}>
          {currentQuestion!.text}
        </p>

        {/* Options */}
        {currentQuestion!.options.map((opt, optIdx) => {
          const selected = answers.get(currentQuestion!.id) === optIdx;
          return (
            <button
              key={optIdx}
              type="button"
              data-testid={TESTID.examOption}
              style={{
                ...S.option,
                ...(selected ? S.optionSelected : {}),
              }}
              onClick={() => selectOption(currentQuestion!.id, optIdx)}
            >
              <span style={S.radio}>
                {selected && <span style={S.radioDot} />}
              </span>
              {opt}
            </button>
          );
        })}

        {/* Navigation */}
        <div style={S.navRow}>
          <button
            type="button"
            data-testid={TESTID.prevBtn}
            style={{
              ...S.btn,
              ...S.btnSecondary,
              ...(currentIndex === 0 ? S.btnDisabled : {}),
            }}
            disabled={currentIndex === 0}
            onClick={goPrev}
          >
            ← Previous
          </button>
          <button
            type="button"
            data-testid={isLast ? TESTID.reviewBtn : TESTID.nextBtn}
            style={{
              ...S.btn,
              ...S.btnPrimary,
            }}
            onClick={goNext}
          >
            {isLast ? "Review answers →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
