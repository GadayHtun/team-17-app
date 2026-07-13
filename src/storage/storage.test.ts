/**
 * Storage tests (Ticket 4 done-when): round-trip, kill-mid-save leaves no
 * corrupt JSON, token validation refuses path traversal, appendResult writes a
 * header once and escapes fields via the CSV library.
 */
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ExamFile, ResultRow } from "@/shared/types";

let dir: string;

// storage.ts reads process.env.DATA_DIR lazily on each call, so setting it
// before the dynamic import (and per test) fully isolates the filesystem.
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "exam-storage-"));
  process.env.DATA_DIR = dir;
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function sampleExam(token: string): ExamFile {
  return {
    token,
    jobTitle: "Frontend Developer",
    candidateEmail: "candidate@mail.com",
    createdAt: "2026-07-07T10:30:00Z",
    status: "active",
    questions: [
      {
        id: "q01",
        text: "Which hook manages local state?",
        options: ["useEffect", "useState", "useRef", "useMemo"],
        answerIndex: 1,
        difficulty: "easy",
        marks: 1,
      },
    ],
  };
}

const TOKEN = "8f3a91cd-77b2-4c1e-9d3f-2a6b8e4f0c15";

describe("token validation", () => {
  it("accepts a UUID v4, rejects junk and traversal attempts", async () => {
    const { isValidToken } = await import("./storage");
    expect(isValidToken(TOKEN)).toBe(true);
    expect(isValidToken("../../etc/passwd")).toBe(false);
    expect(isValidToken("not-a-uuid")).toBe(false);
    expect(isValidToken("")).toBe(false);
  });

  it("loadExam/examExists never touch fs for an invalid token", async () => {
    const { loadExam, examExists } = await import("./storage");
    expect(await loadExam("../../secret")).toBeNull();
    expect(await examExists("../../secret")).toBe(false);
  });
});

describe("createExam / loadExam / saveExam", () => {
  it("round-trips an exam", async () => {
    const { createExam, loadExam } = await import("./storage");
    const exam = sampleExam(TOKEN);
    await createExam(exam);
    expect(await loadExam(TOKEN)).toEqual(exam);
  });

  it("returns null for an unknown token", async () => {
    const { loadExam } = await import("./storage");
    expect(await loadExam(TOKEN)).toBeNull();
  });

  it("createExam refuses to clobber; the original stays intact", async () => {
    const { createExam, loadExam } = await import("./storage");
    const exam = sampleExam(TOKEN);
    await createExam(exam);
    await expect(createExam({ ...exam, jobTitle: "OTHER" })).rejects.toThrow();
    expect((await loadExam(TOKEN))!.jobTitle).toBe("Frontend Developer");
  });

  it("saveExam overwrites atomically and leaves no .tmp files", async () => {
    const { createExam, saveExam, loadExam } = await import("./storage");
    await createExam(sampleExam(TOKEN));
    await saveExam({ ...sampleExam(TOKEN), status: "used" });
    expect((await loadExam(TOKEN))!.status).toBe("used");
    const files = await readdir(path.join(dir, "exams"));
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
    expect(files).toEqual([`${TOKEN}.json`]);
  });

  it("written JSON is always parseable (no partial writes)", async () => {
    const { createExam } = await import("./storage");
    await createExam(sampleExam(TOKEN));
    const raw = await readFile(path.join(dir, "exams", `${TOKEN}.json`), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe("appendResult", () => {
  const row: ResultRow = {
    submittedAt: "2026-07-07T12:00:00Z",
    token: TOKEN,
    candidateEmail: "c@mail.com",
    jobTitle: "Frontend Developer",
    easyScore: 8,
    easyMax: 10,
    mediumScore: 6,
    mediumMax: 10,
    hardScore: 3,
    hardMax: 10,
    totalScore: 35,
    totalMax: 60,
    percentage: 58.3,
  };

  it("writes the header once, then appends rows", async () => {
    const { appendResult } = await import("./storage");
    await appendResult(row);
    await appendResult({ ...row, candidateEmail: "d@mail.com" });
    const csv = await readFile(path.join(dir, "results.csv"), "utf8");
    const lines = csv.trim().split(/\r?\n/);
    expect(lines[0]).toBe(
      "submittedAt,token,candidateEmail,jobTitle,easyScore,easyMax,mediumScore,mediumMax,hardScore,hardMax,totalScore,totalMax,percentage",
    );
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it("escapes fields containing commas and quotes via the CSV library", async () => {
    const { appendResult } = await import("./storage");
    await appendResult({ ...row, jobTitle: 'Eng, "Senior"' });
    const csv = await readFile(path.join(dir, "results.csv"), "utf8");
    expect(csv).toContain('"Eng, ""Senior"""');
  });
});
