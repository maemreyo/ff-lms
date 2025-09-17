/**
 * Result formatter for completion/fill-blank questions
 */

import type {
  GeneratedQuestion,
  QuestionResponse,
  QuestionEvaluationResult,
  CompletionQuestion,
  CompletionResponse
} from '@/lib/types/question-types'
import type { ResultFormatter } from '../ResultDisplayRegistry'

export const completionFormatter: ResultFormatter = {
  formatUserAnswer: (question: GeneratedQuestion, response: QuestionResponse): string => {
    const completionQuestion = question as CompletionQuestion
    const completionResponse = response as CompletionResponse

    // Handle different response formats - same logic as score calculator
    let answers: Array<{ blankId: string; value: string }> = []

    if (completionResponse.response && completionResponse.response.answers && Array.isArray(completionResponse.response.answers)) {
      // Standard format: response.response.answers
      answers = completionResponse.response.answers
    } else if ((completionResponse as any).answers && Array.isArray((completionResponse as any).answers)) {
      // Alternative format: response.answers directly
      answers = (completionResponse as any).answers
    } else if ((completionResponse as any).answer && typeof (completionResponse as any).answer === 'string') {
      // JSON string format: response.answer contains stringified JSON
      try {
        const parsedAnswer = JSON.parse((completionResponse as any).answer)
        if (parsedAnswer.answers && Array.isArray(parsedAnswer.answers)) {
          answers = parsedAnswer.answers
        }
      } catch (error) {
        console.warn('🚨 [Completion Formatter] Failed to parse JSON from response.answer:', error)
      }
    } else if (completionResponse.response && Array.isArray(completionResponse.response)) {
      // Array format: response.response is the answers array
      answers = completionResponse.response
    }

    // Return "No answer provided" if no valid answers found
    if (answers.length === 0) {
      return "No answer provided"
    }

    const blanks = completionQuestion.content.blanks.sort((a, b) => a.position - b.position)

    // Create a clean display format
    return blanks
      .map((blank, index) => {
        const blankId = blank.id || `blank-${index}`
        let answer = answers.find(a => a.blankId === blankId || a.blankId === blank.id || a.blankId === `blank-${index}`)
        
        // Fallback: try by index if no ID match found
        if (!answer && answers[index]) {
          answer = answers[index]
        }
        
        const value = answer?.value?.trim() || '(empty)'
        return `Blank ${index + 1}: "${value}"`
      })
      .join(' • ')
  },

  formatCorrectAnswer: (question: GeneratedQuestion): string => {
    const completionQuestion = question as CompletionQuestion
    const blanks = completionQuestion.content.blanks.sort((a, b) => a.position - b.position)
    
    return blanks
      .map((blank, index) => {
        // Handle different acceptable answer formats
        let correctAnswer = ''
        if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers) && blank.acceptedAnswers.length > 0) {
          correctAnswer = blank.acceptedAnswers[0]
          const additionalCount = blank.acceptedAnswers.length - 1
          if (additionalCount > 0) {
            correctAnswer += ` (+ ${additionalCount} more)`
          }
        } else if ((blank as any).answer) {
          // AI-generated format
          correctAnswer = (blank as any).answer
          if ((blank as any).alternatives && Array.isArray((blank as any).alternatives) && (blank as any).alternatives.length > 0) {
            correctAnswer += ` (+ ${(blank as any).alternatives.length} more)`
          }
        } else {
          correctAnswer = '???'
        }
        
        return `Blank ${index + 1}: "${correctAnswer}"`
      })
      .join(' • ')
  },

  formatExplanation: (question: GeneratedQuestion, evaluation: QuestionEvaluationResult): string => {
    return evaluation.feedback || question.explanation || 'No explanation available'
  }
}