/**
 * Storage module — the ONLY place in the codebase that touches persistence
 * (CLAUDE.md hard rule 1). Everything persists through the functions here.
 *

 * Layout (filesystem mode):
 *   data/exams/{token}.json   one ExamFile per exam (source of truth)
 *   data/results.csv          append-only report (regenerable)
 *
 * DATA_DIR overrides the root (tests point it at a temp dir); defaults to "data".
 *
 * When MONGODB_URI is set (Vercel production), uses MongoDB instead of filesystem.
*/
import "server-only";

import { mkdir, readFile, rename, writeFile, access, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { stringify } from "csv-stringify/sync";

import type { ExamFile, ResultRow, NewQuestion } from "@/shared/types";

// UUID v4 — the only token shape we ever accept.
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidToken(token: string): boolean {
  return typeof token === "string" && UUID_V4.test(token);
}

// Check if MongoDB is configured (Vercel production)
function useMongoDB(): boolean {
  return !!process.env.MONGODB_URI;
}

// Lazy-load MongoDB adapter only when needed
async function getMongoAdapter() {
  const mod = await import("./mongodb");
  return mod;
}

function dataRoot(): string {
  return process.env.DATA_DIR || "data";
}

function examsDir(): string {
  return path.join(dataRoot(), "exams");
}

// Never call without validating `token` via isValidToken first.
function examPath(token: string): string {
  return path.join(examsDir(), `${token}.json`);
}

function resultsPath(): string {
  return path.join(dataRoot(), "results.csv");
}

// Atomic write: serialize to a temp file, fsync-by-rename over the target. A
// crash mid-write leaves either the old file or nothing — never a partial JSON
// (CLAUDE.md hard rule 2).
async function atomicWriteJson(target: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${randomSuffix()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, target);
}

function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 8);
}

export async function examExists(token: string): Promise<boolean> {
  if (!isValidToken(token)) return false;
  if (useMongoDB()) {
    const { examExists: mongoExists } = await getMongoAdapter();
    return mongoExists(token);
  }
  try {
    await access(examPath(token));
    return true;
  } catch {
    return false;
  }

}

/** Persist a brand-new exam. Refuses to clobber an existing token. */
export async function createExam(exam: ExamFile): Promise<void> {
  if (useMongoDB()) {
    const { createExam: mongoCreate } = await getMongoAdapter();
    return mongoCreate(exam);
  }
  if (await examExists(exam.token)) {
    throw new Error(`exam already exists: ${exam.token}`);
  }
  await atomicWriteJson(examPath(exam.token), exam);
}

/** Load an exam, or null if the token is invalid or no document exists. */
export async function loadExam(token: string): Promise<ExamFile | null> {
  if (!isValidToken(token)) return null;
  if (useMongoDB()) {
    const { loadExam: mongoLoad } = await getMongoAdapter();
    return mongoLoad(token);
  }
  try {
    const raw = await readFile(examPath(token), "utf8");
    return JSON.parse(raw) as ExamFile;
  } catch {
    return null;
  }

}

/** Overwrite an existing exam (e.g. after submit). */
export async function saveExam(exam: ExamFile): Promise<void> {

  if (useMongoDB()) {
    const { saveExam: mongoSave } = await getMongoAdapter();
    return mongoSave(exam);
  }
  await atomicWriteJson(examPath(exam.token), exam);

}

const RESULT_COLUMNS: (keyof ResultRow)[] = [
  "submittedAt",
  "token",
  "candidateEmail",
  "jobTitle",
  "easyScore",
  "easyMax",
  "mediumScore",
  "mediumMax",
  "hardScore",
  "hardMax",
  "totalScore",
  "totalMax",
  "percentage",
];

/** Append one graded result. */
export async function appendResult(row: ResultRow): Promise<void> {

  if (useMongoDB()) {
    const { appendResult: mongoAppend } = await getMongoAdapter();
    return mongoAppend(row);
  }
  const target = resultsPath();
  await mkdir(path.dirname(target), { recursive: true });
  const header = !existsSync(target);
  const csv = stringify([row], { header, columns: RESULT_COLUMNS });
  await appendFile(target, csv, "utf8");
}
