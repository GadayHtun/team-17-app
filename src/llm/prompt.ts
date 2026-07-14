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

## Difficulty Definitions
- **easy**: Recall and recognition. Testing basic knowledge of concepts, syntax, definitions.
- **medium**: Application. Testing ability to use knowledge in practical scenarios, interpret code, compare approaches.
- **hard**: Edge cases, trade-offs, debugging complex issues, architectural decisions.

## Output Rules
- Output ONLY valid JSON, no markdown fences, no explanation text.
- Use this exact structure:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "difficulty": "easy"
    }
  ]
}
- answerIndex must be 0, 1, 2, or 3 indicating the correct option.
- difficulty must be "easy", "medium", or "hard".

## Quality Rules
- Questions should have plausible distractors (wrong answers that seem reasonable).
- Avoid "all of the above" or "none of the above" options.
- Questions should test understanding, not just memorization of obscure facts.
- Distribute correct answers across different positions (0-3), don't cluster them.
- No duplicate questions or duplicate options within a question.`;
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
${excludeSection}

## Difficulty Definition
- **easy**: Recall and recognition. Testing basic knowledge of concepts, syntax, definitions.
- **medium**: Application. Testing ability to use knowledge in practical scenarios, interpret code, compare approaches.
- **hard**: Edge cases, trade-offs, debugging complex issues, architectural decisions.

## Output Rules
- Output ONLY valid JSON, no markdown fences, no explanation text.
- Use this exact structure:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "difficulty": "${difficulty}"
    }
  ]
}
- answerIndex must be 0, 1, 2, or 3 indicating the correct option.

## Quality Rules
- The question should have plausible distractors (wrong answers that seem reasonable).
- Avoid "all of the above" or "none of the above" options.
- The question should test understanding, not just memorization of obscure facts.`;
}
