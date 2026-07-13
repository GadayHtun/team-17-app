"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { generateQuestions, GenerationError } from "@/api/client";
import { useExamDraft } from "../exam-draft-context";
import { TESTID } from "@/shared/testids";
import type { Difficulty } from "@/shared/types";
import styles from "./page.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_COUNT = 1;
const MAX_COUNT = 20;
const DEFAULT_COUNT = 10;

interface FormState {
  jobTitle: string;
  jobDescription: string;
  candidateEmail: string;
  easy: string;
  medium: string;
  hard: string;
}

interface FieldErrors {
  jobTitle?: string;
  jobDescription?: string;
  candidateEmail?: string;
  easy?: string;
  medium?: string;
  hard?: string;
}

const INITIAL_STATE: FormState = {
  jobTitle: "",
  jobDescription: "",
  candidateEmail: "",
  easy: String(DEFAULT_COUNT),
  medium: String(DEFAULT_COUNT),
  hard: String(DEFAULT_COUNT),
};

function validateCount(value: string): string | undefined {
  if (value.trim() === "") return "Enter a whole number";
  const n = Number(value);
  if (!Number.isInteger(n)) return "Enter a whole number";
  if (n < MIN_COUNT || n > MAX_COUNT) return `Must be ${MIN_COUNT}-${MAX_COUNT}`;
  return undefined;
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.jobTitle.trim() === "") errors.jobTitle = "Job title is required";
  if (form.jobDescription.trim() === "")
    errors.jobDescription = "Job description is required";
  if (!EMAIL_RE.test(form.candidateEmail.trim()))
    errors.candidateEmail = "Enter a valid email address";

  const easyError = validateCount(form.easy);
  if (easyError) errors.easy = easyError;
  const mediumError = validateCount(form.medium);
  if (mediumError) errors.medium = mediumError;
  const hardError = validateCount(form.hard);
  if (hardError) errors.hard = hardError;

  return errors;
}

export default function CreateExamPage() {
  const router = useRouter();
  const { setDraft } = useExamDraft();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const fieldErrors = validate(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return; // invalid input never reaches the backend
    }

    setSubmitError(null);
    setIsLoading(true);
    try {
      const counts: Record<Difficulty, number> = {
        easy: Number(form.easy),
        medium: Number(form.medium),
        hard: Number(form.hard),
      };
      const questions = await generateQuestions({
        jobTitle: form.jobTitle.trim(),
        jobDescription: form.jobDescription.trim(),
        counts,
      });
      setDraft({
        jobTitle: form.jobTitle.trim(),
        candidateEmail: form.candidateEmail.trim(),
        questions,
      });
      router.push("/review");
    } catch (err) {
      setSubmitError(
        err instanceof GenerationError
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Create job exam</h1>
        <p className={styles.subtitle}>
          Paste a job description and questions will be generated for you.
        </p>

        <label className={styles.label} htmlFor="job-title">
          Job title
        </label>
        <input
          id="job-title"
          data-testid={TESTID.jobTitleInput}
          className={styles.input}
          type="text"
          value={form.jobTitle}
          onChange={(e) => updateField("jobTitle", e.target.value)}
          disabled={isLoading}
        />
        {errors.jobTitle && <p className={styles.error}>{errors.jobTitle}</p>}

        <label className={styles.label} htmlFor="job-description">
          Job description
        </label>
        <textarea
          id="job-description"
          data-testid={TESTID.jdInput}
          className={styles.textarea}
          rows={5}
          value={form.jobDescription}
          onChange={(e) => updateField("jobDescription", e.target.value)}
          disabled={isLoading}
        />
        {errors.jobDescription && (
          <p className={styles.error}>{errors.jobDescription}</p>
        )}

        <label className={styles.label} htmlFor="candidate-email">
          Candidate email
        </label>
        <input
          id="candidate-email"
          data-testid={TESTID.candidateEmailInput}
          className={styles.input}
          type="email"
          value={form.candidateEmail}
          onChange={(e) => updateField("candidateEmail", e.target.value)}
          disabled={isLoading}
        />
        {errors.candidateEmail && (
          <p className={styles.error}>{errors.candidateEmail}</p>
        )}

        <div className={styles.counts}>
          <div className={styles.countField}>
            <label className={styles.label} htmlFor="count-easy">
              Easy · 1 mark
            </label>
            <input
              id="count-easy"
              data-testid={TESTID.countEasy}
              className={styles.input}
              type="number"
              min={MIN_COUNT}
              max={MAX_COUNT}
              value={form.easy}
              onChange={(e) => updateField("easy", e.target.value)}
              disabled={isLoading}
            />
            {errors.easy && <p className={styles.error}>{errors.easy}</p>}
          </div>
          <div className={styles.countField}>
            <label className={styles.label} htmlFor="count-medium">
              Medium · 2 marks
            </label>
            <input
              id="count-medium"
              data-testid={TESTID.countMedium}
              className={styles.input}
              type="number"
              min={MIN_COUNT}
              max={MAX_COUNT}
              value={form.medium}
              onChange={(e) => updateField("medium", e.target.value)}
              disabled={isLoading}
            />
            {errors.medium && <p className={styles.error}>{errors.medium}</p>}
          </div>
          <div className={styles.countField}>
            <label className={styles.label} htmlFor="count-hard">
              Hard · 3 marks
            </label>
            <input
              id="count-hard"
              data-testid={TESTID.countHard}
              className={styles.input}
              type="number"
              min={MIN_COUNT}
              max={MAX_COUNT}
              value={form.hard}
              onChange={(e) => updateField("hard", e.target.value)}
              disabled={isLoading}
            />
            {errors.hard && <p className={styles.error}>{errors.hard}</p>}
          </div>
        </div>

        {submitError && (
          <p className={styles.submitError} role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          data-testid={TESTID.generateBtn}
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Generating questions…
            </>
          ) : submitError ? (
            "Retry"
          ) : (
            "Generate questions"
          )}
        </button>
      </form>
    </div>
  );
}
