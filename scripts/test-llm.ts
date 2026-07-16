#!/usr/bin/env node

/**
 * Quick test script to verify LLM pipeline is working.
 *
 * Usage:
 *   npx tsx scripts/test-llm.ts
 *
 * Requires:
 *   - OPENROUTER_API_KEY in .env
 *   - MOCK_LLM=false (or not set)
 */

import { config } from "dotenv";
import path from "path";

// Load .env file
config({ path: path.resolve(process.cwd(), ".env") });

async function testLlmPipeline() {
  console.log("=== LLM Pipeline Test ===\n");

  // Check environment variables
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.LLM_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
  const mockLlm = process.env.MOCK_LLM;

  console.log("Configuration:");
  console.log(`  - OPENROUTER_API_KEY: ${apiKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`  - LLM_MODEL: ${model}`);
  console.log(`  - MOCK_LLM: ${mockLlm || "false"}`);
  console.log("");

  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY is not set!");
    console.log("\nTo fix:");
    console.log("  1. Get API key from https://openrouter.ai/keys");
    console.log("  2. Add to .env: OPENROUTER_API_KEY=sk-or-v1-...");
    process.exit(1);
  }

  if (mockLlm === "true") {
    console.log("⚠️  MOCK_LLM is true. Tests will use fixtures, not real LLM.");
    console.log("   Set MOCK_LLM=false to test real LLM calls.\n");
  }

  // Test 1: Direct OpenRouter API call
  console.log("Test 1: Direct OpenRouter API call");
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Exam Platform Test",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say 'Hello from OpenRouter!' in JSON format: {\"message\": \"your message\"}" }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    console.log(`  ✅ Success! Response: ${content}`);
    console.log(`  - Model used: ${data.model}`);
    console.log(`  - Tokens used: ${data.usage?.total_tokens || "N/A"}`);
  } catch (error) {
    console.error(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
  }
  console.log("");

  // Test 2: Import and use OpenRouter SDK
  console.log("Test 2: OpenRouter SDK client");
  try {
    const { default: openrouter } = await import("../src/llm/openrouter");

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [{ role: "user", content: 'Return a JSON object: {"status": "ok", "test": "sdk"}' }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    console.log(`  ✅ Success! Response: ${content}`);
    console.log(`  - Model used: ${completion.model}`);
  } catch (error) {
    console.error(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
  }
  console.log("");

  // Test 3: Full generateQuestions pipeline
  console.log("Test 3: Full generateQuestions pipeline");
  try {
    const { generateQuestions } = await import("../src/llm/generate");

    const result = await generateQuestions({
      jobDescription: "Software Engineer with 3+ years experience in JavaScript and React",
      counts: { easy: 1, medium: 1, hard: 1 },
    });

    if (result.ok) {
      console.log(`  ✅ Success! Generated ${result.questions.length} questions:`);
      result.questions.forEach((q, i) => {
        console.log(`    ${i + 1}. [${q.difficulty}] ${q.text.substring(0, 60)}...`);
      });
    } else {
      console.error(`  ❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.error(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
  }
  console.log("");

  console.log("=== Test Complete ===");
}

testLlmPipeline().catch(console.error);
