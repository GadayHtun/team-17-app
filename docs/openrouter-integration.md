# OpenRouter SDK Integration Plan

## Overview

This document outlines the implementation plan for integrating OpenRouter SDK into the exam platform's LLM pipeline. OpenRouter provides unified access to multiple LLM providers (OpenAI, Anthropic, Meta, etc.) through a single API, enabling cost optimization, model flexibility, and fallback chains.

---

## Current State

The LLM pipeline in `src/llm/generate.ts` uses a hand-rolled `fetch` call to an OpenAI-compatible endpoint:

- **Hardcoded model**: `"gpt-4o"`
- **No SDK dependencies**: Only raw HTTP calls
- **Environment variables**: `LLM_BASE_URL`, `LLM_API_KEY`, `MOCK_LLM`
- **Validation layer**: Independent three-layer validation in `validate.ts` (no changes needed)

### Key Files

| File | Purpose |
|------|---------|
| `src/llm/generate.ts` | Core LLM orchestration, retry logic, mock mode |
| `src/llm/prompt.ts` | Prompt construction for question generation |
| `src/llm/validate.ts` | Three-layer validation (parse, schema, quality) |
| `.env.example` | Environment variable template |

---

## Benefits of OpenRouter SDK

| Benefit | Description |
|---------|-------------|
| **Multi-provider access** | Use GPT-4o, Claude, Llama via one API key |
| **Cost optimization** | Route to cheapest model per request tier |
| **Fallback chains** | Auto-retry with alternative models on failure |
| **Better error handling** | SDK handles retries, rate limits, timeouts |
| **Model flexibility** | Easy to A/B test models for question quality |

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install openai
```

> OpenRouter exposes an OpenAI-compatible API, so the standard `openai` package works directly.

### Step 2: Create OpenRouter Client

Create `src/llm/openrouter.ts`:

```typescript
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'https://your-exam-app.com',
    'X-Title': 'Exam Platform',
  },
});

export default openrouter;
```

### Step 3: Update Environment Variables

Add to `.env.example`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...        # Your OpenRouter API key
LLM_MODEL=openai/gpt-4o                 # Model to use
APP_URL=https://your-exam-app.com       # Optional: for OpenRouter analytics
```

### Step 4: Replace `callLlm` Function

Update `src/llm/generate.ts`:

```typescript
import openrouter from './openrouter';

async function callLlm(prompt: string): Promise<string> {
  if (process.env.MOCK_LLM === 'true') {
    return getMockResponse();
  }

  const model = process.env.LLM_MODEL || 'openai/gpt-4o';

  const completion = await openrouter.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? '';
}
```

---

## Cost Optimization Strategy

Route different question difficulties to different models based on reasoning requirements:

| Difficulty | Recommended Model | Rationale |
|------------|-------------------|-----------|
| Easy | `meta-llama/llama-3-70b-instruct` | Cheaper, sufficient for recall-level |
| Medium | `openai/gpt-4o-mini` | Balance of cost/quality |
| Hard | `openai/gpt-4o` or `anthropic/claude-3-opus` | Need deep reasoning |

### Implementation

Create a model mapping in `src/llm/generate.ts`:

```typescript
const MODEL_MAP: Record<Difficulty, string> = {
  easy: 'meta-llama/llama-3-70b-instruct',
  medium: 'openai/gpt-4o-mini',
  hard: 'openai/gpt-4o',
};

async function callLlmForDifficulty(
  prompt: string,
  difficulty: Difficulty
): Promise<string> {
  const model = MODEL_MAP[difficulty] || process.env.LLM_MODEL || 'openai/gpt-4o';

  const completion = await openrouter.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? '';
}
```

---

## Fallback Chain Implementation

Add resilience by trying multiple models if the primary fails:

```typescript
async function callLlmWithFallback(prompt: string): Promise<string> {
  const models = [
    process.env.LLM_MODEL || 'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3-haiku',
  ];

  for (const model of models) {
    try {
      const completion = await openrouter.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content ?? '';
    } catch (error) {
      console.warn(`Model ${model} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All LLM models failed');
}
```

---

## What Stays Unchanged

- **Prompt structure** (`prompt.ts`) — no modifications needed
- **Validation pipeline** (`validate.ts`) — completely independent
- **Mock mode** — still works with `MOCK_LLM=true`
- **Retry/salvage logic** — still applies on top of SDK calls
- **API routes** — unchanged, still call `generateQuestions()`
- **Frontend** — no changes required

---

## Alternative: Minimal Migration (No SDK)

If you prefer to avoid new dependencies, simply update the existing `.env` to point to OpenRouter:

```bash
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-v1-your-key
```

This works with the current raw `fetch` implementation but lacks:
- Model routing per difficulty
- Automatic fallback chains
- Better error handling and retries

---

## Migration Checklist

- [x] Install `openai` package
- [x] Create `src/llm/openrouter.ts` client
- [x] Update `callLlm` in `generate.ts` to use SDK
- [x] Make model configurable via `LLM_MODEL` env var
- [x] Add `OPENROUTER_API_KEY` to `.env.example`
- [x] Test with `MOCK_LLM=true` (should still work)
- [ ] Test with real LLM calls (requires `OPENROUTER_API_KEY`)
- [ ] Update `docs/contracts.md` if needed
- [ ] Add fallback chain (optional)
- [ ] Add cost tracking/logging (optional)

---

## Testing

### Unit Tests

Existing tests in `validate.test.ts` should pass without changes since validation is independent.

### Integration Tests

1. **Mock mode**: Verify `MOCK_LLM=true` still serves fixtures
2. **Real calls**: Test with `MOCK_LLM=false` and valid `OPENROUTER_API_KEY`
3. **Fallback**: Simulate primary model failure, verify fallback works
4. **Cost tracking**: Monitor OpenRouter dashboard for token usage

---

## References

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenAI SDK Documentation](https://platform.openai.com/docs)
- Current LLM pipeline: `src/llm/generate.ts`
- Contracts: `docs/contracts.md`
