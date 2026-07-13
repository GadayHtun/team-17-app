/**
 * THE definition of "the project works" (testing skill). Owner: P7.
 *
 * DAY-1 STATE: both tests are test.fixme — bodies are real and compile, but
 * skip until the flows exist. Activation (tasks.md checkpoints):
 *   end of week 1  -> un-fixme "HR flow"        (steps 1–2)
 *   day 10          -> un-fixme "full golden path" (steps 1–6)
 * From activation these ENFORCE in CI; a red run is a real regression.
 *
 * Selector contract: src/shared/testids.ts (registry is canonical).
 * ANSWER BY OPTION TEXT, never by position — finalize shuffles options
 * (contracts §3); position-based answering is the "flaky E2E" trap.
 */
import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { TESTID } from "../src/shared/testids";
import batch from "../fixtures/question-batch.json";

/** Correct option TEXT per question text — position-independent. */
const correctText = new Map(
  batch.questions.map((q) => [q.text, q.options[q.answerIndex]])
);

const RESULTS_CSV = resolve(__dirname, "../data/results.csv");

async function fillCreateExamForm(page: Page) {
  await page.getByTestId(TESTID.jobTitleInput).fill("Frontend Developer (React)");
  await page.getByTestId(TESTID.jdInput).fill("React + TypeScript role. 3+ years. REST APIs.");
  await page.getByTestId(TESTID.candidateEmailInput).fill("candidate@mail.com");
  await page.getByTestId(TESTID.countEasy).fill("1");
  await page.getByTestId(TESTID.countMedium).fill("1");
  await page.getByTestId(TESTID.countHard).fill("1");
}

test.fixme("HR flow: form -> generate -> review -> link (steps 1-2)", async ({ page }) => {
  await test.step("1. HR fills the form and generates (mocked LLM)", async () => {
    await page.goto("/");
    await fillCreateExamForm(page);
    await page.getByTestId(TESTID.generateBtn).click();
    await expect(page.getByTestId(TESTID.questionItem).first()).toBeVisible();
  });

  await test.step("2. HR deselects one question and creates the exam", async () => {
    await page.getByTestId(TESTID.questionCheckbox).first().uncheck();
    await page.getByTestId(TESTID.createExamBtn).click();
    const link = await page.getByTestId(TESTID.examLink).inputValue();
    expect(link).toMatch(/\/exam\/[0-9a-f-]{36}$/i);
  });
});

test.fixme("full golden path: create -> take -> submit -> CSV -> expired (steps 1-6)", async ({ page }) => {
  if (existsSync(RESULTS_CSV)) rmSync(RESULTS_CSV); // clean slate for step 5

  let examLink = "";

  await test.step("1-2. HR creates the exam (as above)", async () => {
    await page.goto("/");
    await fillCreateExamForm(page);
    await page.getByTestId(TESTID.generateBtn).click();
    await expect(page.getByTestId(TESTID.questionItem).first()).toBeVisible();
    await page.getByTestId(TESTID.questionCheckbox).first().uncheck();
    await page.getByTestId(TESTID.createExamBtn).click();
    examLink = await page.getByTestId(TESTID.examLink).inputValue();
  });

  await test.step("3. candidate opens link; answers are stripped", async () => {
    const responsePromise = page.waitForResponse((r) => r.url().includes("/exams/"));
    await page.goto(examLink);
    const body = await (await responsePromise).text();
    expect(body).not.toContain("answerIndex"); // ADR 0003, raw response body
    await expect(page.getByTestId(TESTID.tierBadge)).toBeVisible();
  });

  await test.step("4. answer BY TEXT (skip one), review, submit", async () => {
    // Walk pages with Next; on each, click the option whose TEXT matches the
    // fixture's correct string for the rendered question — except skip the
    // final question deliberately (unanswered = 0 marks is legal).
    // Owners flesh out the loop against the real page structure; the
    // invariant that MUST hold: selection by getByText(correctText.get(q)),
    // never by option index.
    await page.getByTestId(TESTID.submitBtn).click();
    await expect(page.getByTestId(TESTID.successPage)).toBeVisible();
  });

  await test.step("5. results.csv has one row with the expected score", async () => {
    const csv = readFileSync(RESULTS_CSV, "utf8").trim().split("\n");
    expect(csv).toHaveLength(2); // header + one row
    expect(csv[1]).toContain("candidate@mail.com");
    // Expected score: computed from which questions were answered by text in
    // step 4 (owners wire the exact number when the loop is finalized).
  });

  await test.step("6. reopening the link shows the expired page (410)", async () => {
    await page.goto(examLink);
    await expect(page.getByTestId(TESTID.expiredPage)).toBeVisible();
  });
});
