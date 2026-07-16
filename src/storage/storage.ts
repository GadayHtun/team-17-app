/**
 * Storage module — the ONLY place in the codebase that touches persistence
 * (CLAUDE.md hard rule 1). Everything persists through the functions here.
 *
 * backed by MongoDB Atlas:
 *   exams collection    — one document per ExamFile (source of truth)
 *   results collection  — one document per ResultRow (append-only report)
 *   examDrafts collection — LLM-generated question drafts
 *
 * MONGODB_URI overrides the connection (tests point it at a test db);
 * defaults to env var.
 */
import "server-only";

import { getDb } from "./mongodb";
import type { ExamFile, ResultRow, NewQuestion } from "@/shared/types";

// UUID v4 — the only token shape we ever accept.
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidToken(token: string): boolean {
  return typeof token === "string" && UUID_V4.test(token);
}

export async function examExists(token: string): Promise<boolean> {
  if (!isValidToken(token)) return false;
  const db = await getDb();
  const doc = await db.collection("exams").findOne({ token }, { projection: { _id: 1 } });
  return doc !== null;
}

/** Persist a brand-new exam. Refuses to clobber an existing token. */
export async function createExam(exam: ExamFile): Promise<void> {
  if (await examExists(exam.token)) {
    throw new Error(`exam already exists: ${exam.token}`);
  }
  const db = await getDb();
  await db.collection("exams").insertOne(exam);
}

/** Load an exam, or null if the token is invalid or no document exists. */
export async function loadExam(token: string): Promise<ExamFile | null> {
  if (!isValidToken(token)) return null;
  const db = await getDb();
  const doc = await db.collection<ExamFile>("exams").findOne({ token });
  return doc ?? null;
}

/** Overwrite an existing exam (e.g. after submit). */
export async function saveExam(exam: ExamFile): Promise<void> {
  const db = await getDb();
  await db.collection("exams").updateOne({ token: exam.token }, { $set: exam });
}

/** Append one graded result. */
export async function appendResult(row: ResultRow): Promise<void> {
  const db = await getDb();
  await db.collection("results").insertOne(row);
}

// ── Exam Drafts (LLM-generated questions before HR review) ──────────────

export interface ExamDraft {
  _id?: import("mongodb").ObjectId;
  jobTitle: string;
  jobDescription: string;
  candidateEmail: string;
  questions: NewQuestion[];
  counts: { easy: number; medium: number; hard: number };
  model: string;
  createdAt: Date;
}

/** Save an LLM-generated question draft to MongoDB. */
export async function saveExamDraft(draft: ExamDraft): Promise<string> {
  const db = await getDb();
  const result = await db.collection("examDrafts").insertOne(draft);
  return result.insertedId.toHexString();
}

/** Load an exam draft by its ObjectId. */
export async function loadExamDraft(id: string): Promise<ExamDraft | null> {
  const db = await getDb();
  const { ObjectId } = await import("mongodb");
  const doc = await db.collection<ExamDraft>("examDrafts").findOne({ _id: new ObjectId(id) });
  return doc ?? null;
}
