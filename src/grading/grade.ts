export type Difficulty = "easy" | "medium" | "hard";

export type AnswerIndex = 0 | 1 | 2 | 3;

export type Answers = Record<string, number>;

export interface GradingQuestion {
  id: string;
  answerIndex: AnswerIndex;
  difficulty: Difficulty;
  marks: number;
}

export interface TierScore {
  score: number;
  max: number;
}

export interface Scores {
  easy: TierScore;
  medium: TierScore;
  hard: TierScore;
  total: TierScore;
  percentage: number;
}

export class GradingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradingValidationError";
  }
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function validateAnswers(
  questions: readonly GradingQuestion[],
  answers: Answers
) {
  const questionIds = new Set(questions.map((question) => question.id));

  for (const [questionId, answerIndex] of Object.entries(answers)) {
    if (!questionIds.has(questionId)) {
      throw new GradingValidationError(`Unknown question id: ${questionId}`);
    }

    if (
      !Number.isInteger(answerIndex) ||
      answerIndex < 0 ||
      answerIndex > 3
    ) {
      throw new GradingValidationError(
        `Invalid answer index for ${questionId}: ${answerIndex}`
      );
    }
  }
}

export function grade(
  questions: readonly GradingQuestion[],
  answers: Answers
): Scores {
  validateAnswers(questions, answers);

  const scores: Scores = {
    easy: { score: 0, max: 0 },
    medium: { score: 0, max: 0 },
    hard: { score: 0, max: 0 },
    total: { score: 0, max: 0 },
    percentage: 0,
  };

  for (const question of questions) {
    scores[question.difficulty].max += question.marks;
    scores.total.max += question.marks;

    if (answers[question.id] === question.answerIndex) {
      scores[question.difficulty].score += question.marks;
      scores.total.score += question.marks;
    }
  }

  scores.percentage =
    scores.total.max === 0
      ? 0
      : Math.round((scores.total.score / scores.total.max) * 1000) / 10;

  for (const difficulty of DIFFICULTIES) {
    scores[difficulty].score = roundScore(scores[difficulty].score);
    scores[difficulty].max = roundScore(scores[difficulty].max);
  }

  scores.total.score = roundScore(scores.total.score);
  scores.total.max = roundScore(scores.total.max);

  return scores;
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}
