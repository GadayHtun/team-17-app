#!/usr/bin/env node

/**
 * Generate 30 fixture questions using LLM and save to fixtures/question-batch.json.
 *
 * Usage:
 *   npx tsx scripts/generate-fixtures.ts
 *
 * Requires:
 *   - OPENROUTER_API_KEY in .env
 *   - MOCK_LLM=false (or not set)
 */

import { config } from "dotenv";
import path from "path";
import { writeFile } from "fs/promises";

// Load .env file
config({ path: path.resolve(process.cwd(), ".env") });

import { generateQuestions } from "../src/llm/generate";
import type { NewQuestion } from "../src/shared/types";

const TOTAL_QUESTIONS = 30;
const COUNTS = { easy: 10, medium: 10, hard: 10 };

async function generateFixtures() {
  console.log("=== Generate Fixtures ===\n");

  const apiKey = process.env.OPENROUTER_API_KEY;
  const mockLlm = process.env.MOCK_LLM;

  console.log("Configuration:");
  console.log(`  - OPENROUTER_API_KEY: ${apiKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`  - MOCK_LLM: ${mockLlm || "false"}`);
  console.log(`  - Target: ${TOTAL_QUESTIONS} questions (${COUNTS.easy} easy, ${COUNTS.medium} medium, ${COUNTS.hard} hard)`);
  console.log("");

  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY is required!");
    console.log("Get your key at: https://openrouter.ai/keys");
    process.exit(1);
  }

  if (mockLlm === "true") {
    console.error("❌ MOCK_LLM must be false to generate real questions!");
    process.exit(1);
  }

  console.log("Generating questions with LLM...\n");

  const allQuestions: NewQuestion[] = [];
  const seenTexts = new Set<string>();

  // Generate in batches to ensure diversity
  const batchSize = 10;
  const batches = [
    { difficulty: "easy" as const, count: COUNTS.easy },
    { difficulty: "medium" as const, count: COUNTS.medium },
    { difficulty: "hard" as const, count: COUNTS.hard },
  ];

  for (const batch of batches) {
    console.log(`Generating ${batch.count} ${batch.difficulty} questions...`);

    let attempts = 0;
    const maxAttempts = 5;

    while (allQuestions.filter(q => q.difficulty === batch.difficulty).length < batch.count && attempts < maxAttempts) {
      attempts++;
      console.log(`  Attempt ${attempts}...`);

      const result = await generateQuestions({
        jobDescription: "Software Engineer with expertise in JavaScript, TypeScript, React, Node.js, and modern web technologies. Experience with APIs, databases, testing, and deployment.",
        counts: {
          easy: batch.difficulty === "easy" ? batch.count : 0,
          medium: batch.difficulty === "medium" ? batch.count : 0,
          hard: batch.difficulty === "hard" ? batch.count : 0,
        },
      });

      if (result.ok) {
        // Filter duplicates
        for (const q of result.questions) {
          if (!seenTexts.has(q.text)) {
            seenTexts.add(q.text);
            allQuestions.push(q);
          }
        }
        console.log(`  ✅ Got ${result.questions.length} questions (${allQuestions.filter(q => q.difficulty === batch.difficulty).length}/${batch.count} total for ${batch.difficulty})`);
      } else {
        console.warn(`  ⚠️  Generation failed: ${result.error}`);
      }
    }

    const count = allQuestions.filter(q => q.difficulty === batch.difficulty).length;
    if (count < batch.count) {
      console.warn(`  ⚠️  Only got ${count}/${batch.count} ${batch.difficulty} questions`);
    }
  }

  console.log(`\nTotal questions generated: ${allQuestions.length}`);

  if (allQuestions.length === 0) {
    console.error("❌ No questions generated!");
    process.exit(1);
  }

  // Trim to exactly 30 questions
  const finalQuestions = allQuestions.slice(0, TOTAL_QUESTIONS);

  // Ensure we have the right distribution
  const easy = finalQuestions.filter(q => q.difficulty === "easy").slice(0, COUNTS.easy);
  const medium = finalQuestions.filter(q => q.difficulty === "medium").slice(0, COUNTS.medium);
  const hard = finalQuestions.filter(q => q.difficulty === "hard").slice(0, COUNTS.hard);

  const balanced = [...easy, ...medium, ...hard];

  console.log(`\nFinal distribution:`);
  console.log(`  - Easy: ${balanced.filter(q => q.difficulty === "easy").length}`);
  console.log(`  - Medium: ${balanced.filter(q => q.difficulty === "medium").length}`);
  console.log(`  - Hard: ${balanced.filter(q => q.difficulty === "hard").length}`);

  // Save to fixtures
  const fixturePath = path.resolve(process.cwd(), "fixtures/question-batch.json");
  const fixtureData = { questions: balanced };

  await writeFile(fixturePath, JSON.stringify(fixtureData, null, 2) + "\n");

  console.log(`\n✅ Saved ${balanced.length} questions to ${fixturePath}`);
  console.log("\n=== Done ===");
}

generateFixtures().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
