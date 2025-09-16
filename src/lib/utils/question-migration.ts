/**
 * Migration utilities for converting between old and new question formats
 * Ensures backward compatibility during the transition
 */

import {
  GeneratedQuestion,
  MultipleChoiceQuestion,
  QuestionResponse,
  MultipleChoiceResponse
} from '@/lib/types/question-types'

/**
 * Legacy question interface (from existing codebase)
 */
export interface LegacyQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: string
  explanation?: string
  context?: {
    startTime: number
    endTime: number
    text: string
  }
}

/**
 * Legacy response interface (from existing codebase)
 */
export interface LegacyQuestionResponse {
  questionIndex: number
  answer: string
}

/**
 * Convert legacy question to new typed question format
 */
export function migrateLegacyQuestion(legacyQuestion: LegacyQuestion): GeneratedQuestion {
  // For now, assume all legacy questions are multiple choice
  // In the future, we can add type detection logic based on the question structure

  const multipleChoiceQuestion: MultipleChoiceQuestion = {
    id: legacyQuestion.id,
    type: 'multiple-choice',
    question: legacyQuestion.question,
    difficulty: legacyQuestion.difficulty,
    explanation: legacyQuestion.explanation || '',
    context: legacyQuestion.context,
    content: {
      options: legacyQuestion.options,
      correctAnswer: legacyQuestion.correctAnswer as 'A' | 'B' | 'C' | 'D'
    }
  }

  return multipleChoiceQuestion
}

/**
 * Convert legacy response to new typed response format
 */
export function migrateLegacyResponse(
  legacyResponse: LegacyQuestionResponse,
  questionType: 'multiple-choice' = 'multiple-choice'
): QuestionResponse {
  if (questionType === 'multiple-choice') {
    const multipleChoiceResponse: MultipleChoiceResponse = {
      questionIndex: legacyResponse.questionIndex,
      questionType: 'multiple-choice',
      timestamp: new Date(),
      response: {
        selectedOption: legacyResponse.answer as 'A' | 'B' | 'C' | 'D'
      }
    }
    return multipleChoiceResponse
  }

  // For other types, we'll implement as needed
  throw new Error(`Migration not implemented for question type: ${questionType}`)
}

/**
 * Convert new typed response back to legacy format (for backward compatibility)
 */
export function convertToLegacyResponse(response: QuestionResponse): LegacyQuestionResponse {
  if (response.questionType === 'multiple-choice') {
    const mcResponse = response as MultipleChoiceResponse
    return {
      questionIndex: response.questionIndex,
      answer: mcResponse.response.selectedOption
    }
  }

  // For other types, we'll need to serialize the response appropriately
  throw new Error(`Legacy conversion not implemented for question type: ${response.questionType}`)
}

/**
 * Batch migrate an array of legacy questions
 */
export function migrateLegacyQuestions(legacyQuestions: LegacyQuestion[]): GeneratedQuestion[] {
  return legacyQuestions.map(migrateLegacyQuestion)
}

/**
 * Batch migrate an array of legacy responses
 */
export function migrateLegacyResponses(
  legacyResponses: LegacyQuestionResponse[],
  questionType: 'multiple-choice' = 'multiple-choice'
): QuestionResponse[] {
  return legacyResponses.map(response => migrateLegacyResponse(response, questionType))
}

/**
 * Check if a question object is in legacy format
 */
export function isLegacyQuestion(question: any): question is LegacyQuestion {
  return (
    question &&
    typeof question.id === 'string' &&
    typeof question.question === 'string' &&
    Array.isArray(question.options) &&
    typeof question.correctAnswer === 'string' &&
    (!question.type || typeof question.type === 'string') &&
    !question.content // New format has content property
  )
}

/**
 * Check if a response object is in legacy format
 */
export function isLegacyResponse(response: any): response is LegacyQuestionResponse {
  return (
    response &&
    typeof response.questionIndex === 'number' &&
    typeof response.answer === 'string' &&
    !response.questionType // New format has questionType property
  )
}

/**
 * Auto-migrate a question if it's in legacy format
 */
export function autoMigrateQuestion(question: any): GeneratedQuestion {
  if (isLegacyQuestion(question)) {
    return migrateLegacyQuestion(question)
  }
  return question as GeneratedQuestion
}

/**
 * Auto-migrate a response if it's in legacy format
 */
export function autoMigrateResponse(response: any): QuestionResponse {
  if (isLegacyResponse(response)) {
    return migrateLegacyResponse(response)
  }
  return response as QuestionResponse
}