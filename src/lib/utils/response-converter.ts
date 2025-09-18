/**
 * Response Converter Utilities
 * Clean utilities for converting QuestionResponse objects to legacy string format
 */

import type { QuestionResponse } from '@/lib/types/question-types'

/**
 * Converts a QuestionResponse object to legacy string format
 * Used for compatibility with useGroupQuiz.handleAnswerSelect
 */
export function convertResponseToLegacyFormat(response: QuestionResponse): string {
  switch (response.questionType) {
    case 'multiple-choice':
      return response.response.selectedOption

    case 'completion':
    case 'fill-blank':
      return convertCompletionResponse(response)

    default:
      // Other question types: fallback to full stringify
      return JSON.stringify(response.response)
  }
}

/**
 * Converts completion question response to clean JSON format
 * Only includes the essential answers data
 */
function convertCompletionResponse(response: QuestionResponse): string {
  const completionResponse = response as any

  if (completionResponse.response?.answers) {
    // Clean format: only store answers array
    return JSON.stringify({
      answers: completionResponse.response.answers
    })
  } else {
    // Fallback to original format if structure is unexpected
    return JSON.stringify(response.response)
  }
}

/**
 * Type guard to check if response is a completion type
 */
export function isCompletionResponse(response: QuestionResponse): boolean {
  return response.questionType === 'completion' || response.questionType === 'fill-blank'
}

/**
 * Type guard to check if response is a multiple choice type
 */
export function isMultipleChoiceResponse(response: QuestionResponse): boolean {
  return response.questionType === 'multiple-choice'
}