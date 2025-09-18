/**
 * Result Display Registry System
 * Handles formatting and display of quiz results for different question types
 */

import type {
  QuestionType,
  GeneratedQuestion,
  QuestionResponse,
  QuestionEvaluationResult
} from '@/lib/types/question-types'

/**
 * Structured answer format for database storage
 */
export interface StructuredAnswer {
  type: string // question type
  raw: any // original response data
  displayText: string // formatted display text for UI
  metadata?: any // type-specific metadata
}

export interface ResultDisplayData {
  userAnswer: string | StructuredAnswer
  correctAnswer: string | StructuredAnswer
  explanation: string
  isCorrect: boolean
  score: number
  details?: any // For additional type-specific data
}

export interface ResultFormatter {
  formatUserAnswer: (question: GeneratedQuestion, response: QuestionResponse) => string
  formatCorrectAnswer: (question: GeneratedQuestion) => string
  formatExplanation: (question: GeneratedQuestion, evaluation: QuestionEvaluationResult) => string
  // New methods for structured format
  formatUserAnswerStructured?: (question: GeneratedQuestion, response: QuestionResponse) => StructuredAnswer
  formatCorrectAnswerStructured?: (question: GeneratedQuestion) => StructuredAnswer
}

/**
 * Registry for question type result formatters
 */
export class ResultDisplayRegistry {
  private static formatters = new Map<QuestionType, ResultFormatter>()

  /**
   * Register a result formatter for a question type
   */
  static register(type: QuestionType, formatter: ResultFormatter): void {
    this.formatters.set(type, formatter)
    console.log(`📊 Registered result formatter for: ${type}`)
  }

  /**
   * Format results for a specific question type
   */
  static formatResult(
    question: GeneratedQuestion,
    response: QuestionResponse,
    evaluation: QuestionEvaluationResult
  ): ResultDisplayData {
    const formatter = this.formatters.get(question.type)

    if (formatter) {
      return {
        userAnswer: formatter.formatUserAnswer(question, response),
        correctAnswer: formatter.formatCorrectAnswer(question),
        explanation: formatter.formatExplanation(question, evaluation),
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        details: evaluation.partialCredit
      }
    }

    // Fallback for unregistered types
    return {
      userAnswer: JSON.stringify(response.response || response),
      correctAnswer: evaluation.correctAnswer || "See explanation",
      explanation: evaluation.feedback || question.explanation || "No explanation available",
      isCorrect: evaluation.isCorrect,
      score: evaluation.score
    }
  }

  /**
   * Format results with structured answers for database storage
   */
  static formatResultStructured(
    question: GeneratedQuestion,
    response: QuestionResponse,
    evaluation: QuestionEvaluationResult
  ): ResultDisplayData {
    const formatter = this.formatters.get(question.type)

    if (formatter && formatter.formatUserAnswerStructured && formatter.formatCorrectAnswerStructured) {
      return {
        userAnswer: formatter.formatUserAnswerStructured(question, response),
        correctAnswer: formatter.formatCorrectAnswerStructured(question),
        explanation: formatter.formatExplanation(question, evaluation),
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        details: evaluation.partialCredit
      }
    }

    // Fallback to regular formatting if structured not available
    return this.formatResult(question, response, evaluation)
  }

  /**
   * Check if a formatter is registered
   */
  static hasFormatter(type: QuestionType): boolean {
    return this.formatters.has(type)
  }

  /**
   * Get all registered types
   */
  static getRegisteredTypes(): QuestionType[] {
    return Array.from(this.formatters.keys())
  }
}