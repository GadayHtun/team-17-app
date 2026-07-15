import OpenAI from "openai";

/**
 * OpenRouter client for LLM API calls.
 * Uses OpenAI-compatible SDK with OpenRouter's unified endpoint.
 *
 * Free models available for local development:
 * - google/gemma-4-26b-a4b-it:free (default, working)
 * - google/gemma-4-31b-it:free
 * - nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
 */

let _openrouter: OpenAI | null = null;

/**
 * Get OpenRouter client (lazy-loaded to pick up env vars at call time).
 */
export function getOpenRouter(): OpenAI {
  if (!_openrouter) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY must be set");
    }
    _openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "Exam Platform",
      },
    });
  }
  return _openrouter;
}

// Default export for backward compatibility
export default {
  get chat() {
    return getOpenRouter().chat;
  },
};
