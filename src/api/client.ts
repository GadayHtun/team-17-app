/**
 * Frontend HTTP client — the ONLY place the browser talks to the API
 * (REVIEW_RULES §4). Client components import these; they never call `fetch`.
 *
 * Shapes come from `src/shared` (contracts §1–§3). Response envelopes that the
 * contracts declare inline (e.g. `{ token, link, createdAt }`) are typed here.
 */
import type { Difficulty, NewQuestion } from "@/shared/types";

/**
 * A failed call. `status` carries the contracts §4 code (400/404/410/502), or
 * 0 when the request never reached the server (offline, DNS, connection reset).
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** LLM generation failed after retries (contracts §4: 502). */
export class GenerationError extends ApiError {
  constructor(message: string) {
    super(502, message);
    this.name = "GenerationError";
  }
}

const OFFLINE_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

/** Pull `{ error }` off a non-2xx body; contracts §4 responses carry one. */
async function errorMessage(response: Response): Promise<string | null> {
  return response
    .json()
    .then((data: unknown) =>
      typeof (data as { error?: unknown })?.error === "string"
        ? (data as { error: string }).error
        : null,
    )
    .catch(() => null);
}

/**
 * Generic fetch JSON helper. Throws `ApiError` on non-2xx responses.
 * Used by pages that need ad-hoc API calls (e.g. exam fetch, submit).
 */
export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  }

  if (!res.ok) {
    throw new ApiError(res.status, (await errorMessage(res)) ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  }

  if (!response.ok) {
    // 502 is the one the HR form retries on, so it gets a human message.
    const message =
      response.status === 502
        ? "Question generation failed. Please try again."
        : ((await errorMessage(response)) ?? `Request failed (${response.status})`);
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export interface GenerateInput {
  jobTitle: string;
  jobDescription: string;
  counts: { easy: number; medium: number; hard: number };
}

export interface GenerateOneInput {
  jobDescription: string;
  difficulty: Difficulty;
  /** Texts already on screen — the LLM must not hand back a duplicate. */
  excludeTexts: string[];
}

export interface CreateExamInput {
  jobTitle: string;
  candidateEmail: string;
  questions: NewQuestion[];
}

export interface CreateExamResponse {
  token: string;
  link: string;
  createdAt: string;
}

/** POST /api/exams/generate — the full batch (contracts §3 row 1). */
export function generateQuestions(input: GenerateInput): Promise<{ questions: NewQuestion[] }> {
  return post<{ questions: NewQuestion[] }>("/api/exams/generate", input);
}

/** POST /api/exams/generate-one — one replacement question (contracts §3 row 2). */
export function generateOne(input: GenerateOneInput): Promise<{ question: NewQuestion }> {
  return post<{ question: NewQuestion }>("/api/exams/generate-one", input);
}

/** POST /api/exams — finalize. Server assigns token, ids, marks (red line 4). */
export function createExam(input: CreateExamInput): Promise<CreateExamResponse> {
  return post<CreateExamResponse>("/api/exams", input);
}

/**
 * POST /api/exams/[token]/send-invite — Ticket 9 (week 2), not yet implemented.
 * Fire-and-forget by contract (§7): a failure here never blocks the copy-link path.
 */
export function sendInvite(token: string): Promise<{ sentAt: string }> {
  return post<{ sentAt: string }>(`/api/exams/${token}/send-invite`, {});
}
