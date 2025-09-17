/**
 * Result formatter for multiple-choice questions
 */

import type {
  GeneratedQuestion,
  QuestionResponse,
  QuestionEvaluationResult,
  MultipleChoiceQuestion,
  MultipleChoiceResponse
} from '@/lib/types/question-types'
import type { ResultFormatter } from '../ResultDisplayRegistry'

export const multipleChoiceFormatter: ResultFormatter = {
  formatUserAnswer: (question: GeneratedQuestion, response: QuestionResponse): string => {
    const mcQuestion = question as MultipleChoiceQuestion
    const mcResponse = response as MultipleChoiceResponse

    const selectedOption = mcResponse.response?.selectedOption
    if (!selectedOption) {
      return "No answer selected"
    }

    const optionIndex = selectedOption.charCodeAt(0) - 65 // Convert A,B,C,D to 0,1,2,3
    const optionText = mcQuestion.content.options?.[optionIndex]

    if (optionText) {
      return `${selectedOption}. ${optionText}`
    }

    return selectedOption
  },

  formatCorrectAnswer: (question: GeneratedQuestion): string => {
    const mcQuestion = question as MultipleChoiceQuestion

    const correctAnswer = mcQuestion.content.correctAnswer
    if (!correctAnswer) {
      return "Unknown"
    }

    const optionIndex = correctAnswer.charCodeAt(0) - 65 // Convert A,B,C,D to 0,1,2,3
    const optionText = mcQuestion.content.options?.[optionIndex]

    if (optionText) {
      return `${correctAnswer}. ${optionText}`
    }

    return correctAnswer
  },

  formatExplanation: (question: GeneratedQuestion, evaluation: QuestionEvaluationResult): string => {
    return question.explanation || evaluation.feedback || "Select the best answer from the options provided."
  }
}