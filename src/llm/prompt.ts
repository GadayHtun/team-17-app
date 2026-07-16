import type { Difficulty, NewQuestion } from "@/shared/types";

/**
 * Build prompt for batch generation.
 * ALWAYS-HUMAN-REVIEW: every change needs human approval.
 */
export function buildPrompt(
  jobDescription: string,
  counts: { easy: number; medium: number; hard: number }
): string {
  return `You are an expert technical interviewer. Generate MCQ screening questions for the following job description.

## Job Description
${jobDescription}

## Requirements
- Generate exactly ${counts.easy} easy, ${counts.medium} medium, and ${counts.hard} hard questions.
- Questions must be relevant to the skills and technologies mentioned in the JD.
- Each question has exactly 4 options, with exactly 1 correct answer.
- Randomly distribute the correct answer across positions 0-3.

## Difficulty Definitions (EXPLICIT)
- **easy = Recall**: Testing basic knowledge, definitions, syntax, concepts. What is X? Which of these is Y?
- **medium = Application**: Testing ability to use knowledge in practical scenarios, interpret code, compare approaches, solve problems.
- **hard = Edge Cases / Trade-offs**: Testing debugging complex issues, architectural decisions, performance trade-offs, race conditions, failure modes.

## Output Format (JSON Mode)
- Output ONLY valid JSON, no markdown fences, no explanation text.
- Response format is set to JSON mode — respond with valid JSON only.
- Use this exact structure:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answerIndex": 0,
      "difficulty": "easy"
    }
  ]
}
- answerIndex must be 0, 1, 2, or 3 indicating the correct option position.
- difficulty must be "easy", "medium", or "hard".

## Quality Rules (STRICT)
- Exactly 4 options per question — no more, no less.
- Exactly 1 correct answer — the rest must be plausible distractors.
- Distractors must be believable wrong answers that someone might choose.
- Questions must test skills from the JD — not obscure trivia.
- Avoid "all of the above" or "none of the above" options.
- No duplicate questions or duplicate options within a question.
- Distribute correct answers across positions 0-3 randomly — don't cluster.`;
}

/**
 * Build prompt for single question generation.
 * ALWAYS-HUMAN-REVIEW: every change needs human approval.
 */
export function buildOnePrompt(
  jobDescription: string,
  difficulty: Difficulty,
  excludeTexts: string[]
): string {
  const excludeSection =
    excludeTexts.length > 0
      ? `\n\n## Questions to Avoid (do not duplicate these)
${excludeTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "";

  return `You are an expert technical interviewer. Generate a single MCQ screening question for the following job description.

## Job Description
${jobDescription}

## Requirements
- Generate exactly 1 question at difficulty level: ${difficulty}.
- The question must be relevant to the skills mentioned in the JD.
- The question has exactly 4 options, with exactly 1 correct answer.
- Randomly place the correct answer at position 0-3.
${excludeSection}

## Difficulty Definition (EXPLICIT)
- **easy = Recall**: Testing basic knowledge, definitions, syntax, concepts. What is X? Which of these is Y?
- **medium = Application**: Testing ability to use knowledge in practical scenarios, interpret code, compare approaches, solve problems.
- **hard = Edge Cases / Trade-offs**: Testing debugging complex issues, architectural decisions, performance trade-offs, race conditions, failure modes.

## Output Format (JSON Mode)
- Output ONLY valid JSON, no markdown fences, no explanation text.
- Response format is set to JSON mode — respond with valid JSON only.
- Use this exact structure:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answerIndex": 0,
      "difficulty": "${difficulty}"
    }
  ]
}
- answerIndex must be 0, 1, 2, or 3 indicating the correct option position.

## Quality Rules (STRICT)
- Exactly 4 options — no more, no less.
- Exactly 1 correct answer — the rest must be plausible distractors.
- Distractors must be believable wrong answers.
- Avoid "all of the above" or "none of the above" options.
- The question should test understanding, not memorization of obscure facts.`;
}
