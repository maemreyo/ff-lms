/**
 * Multiple Choice Question Type Registration
 * Registers the multiple choice question type with the registry system
 */

import {
  QuestionTypeRegistry,
  QuestionTypeConfig
} from '@/lib/registry/QuestionTypeRegistry'
import {
  MultipleChoiceQuestion as MultipleChoiceQuestionType,
  MultipleChoiceResponse,
  QuestionEvaluationResult
} from '@/lib/types/question-types'
import {
  MultipleChoiceQuestion,
  MultipleChoicePreview
} from '@/components/questions/types/MultipleChoiceQuestion'

/**
 * Validate multiple choice response format
 */
function validateMultipleChoiceResponse(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    response.questionType === 'multiple-choice' &&
    response.response &&
    typeof response.response.selectedOption === 'string' &&
    ['A', 'B', 'C', 'D'].includes(response.response.selectedOption)
  )
}

/**
 * Calculate score for multiple choice question
 */
function calculateMultipleChoiceScore(
  question: MultipleChoiceQuestionType,
  response: MultipleChoiceResponse
): QuestionEvaluationResult {
  const isCorrect = question.content.correctAnswer === response.response.selectedOption

  return {
    questionIndex: response.questionIndex,
    questionType: 'multiple-choice',
    isCorrect,
    score: isCorrect ? 1 : 0,
    maxScore: 1,
    correctAnswer: question.content.correctAnswer,
    feedback: isCorrect
      ? 'Correct! Well done.'
      : `Incorrect. The correct answer is ${question.content.correctAnswer}.`
  }
}

/**
 * Multiple choice question type configuration
 */
const multipleChoiceConfig: QuestionTypeConfig = {
  // Components
  component: MultipleChoiceQuestion,
  previewComponent: MultipleChoicePreview,

  // Validation and scoring
  responseValidator: validateMultipleChoiceResponse,
  scoreCalculator: calculateMultipleChoiceScore,

  // Metadata
  metadata: {
    type: 'multiple-choice',
    displayName: 'Multiple Choice',
    description: 'Select the correct answer from 4 options (A, B, C, D)',
    complexity: 'low',
    icon: 'check-square',
    estimatedImplementationTime: 'Already implemented',
    dependencies: [],
    features: [
      'Single correct answer selection',
      'Four option format (A-D)',
      'Immediate feedback',
      'Word selection support',
      'Accessibility compliant'
    ]
  },

  // Feature flags
  isEnabled: true,
  isProduction: true
}

/**
 * Register the multiple choice question type
 */
QuestionTypeRegistry.register('multiple-choice', multipleChoiceConfig)

// Export for testing and utilities
export {
  validateMultipleChoiceResponse,
  calculateMultipleChoiceScore,
  multipleChoiceConfig
}