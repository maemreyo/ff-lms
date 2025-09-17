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

    // Optimized clean display format
    if (blanks.length === 1) {
      // Single blank: just show the answer directly
      const blankId = blanks[0].id || `blank-0`
      let answer = answers.find(a => a.blankId === blankId || a.blankId === blanks[0].id || a.blankId === `blank-0`)
      
      if (!answer && answers[0]) {
        answer = answers[0]
      }
      
      const value = answer?.value?.trim() || '(empty)'
      return `"${value}"`
    } else {
      // Multiple blanks: use concise numbered format
      return blanks
        .map((blank, index) => {
          const blankId = blank.id || `blank-${index}`
          let answer = answers.find(a => a.blankId === blankId || a.blankId === blank.id || a.blankId === `blank-${index}`)
          
          // Fallback: try by index if no ID match found
          if (!answer && answers[index]) {
            answer = answers[index]
          }
          
          const value = answer?.value?.trim() || '(empty)'
          return `${index + 1}:"${value}"`
        })
        .join(' • ')
    }
  },

  formatCorrectAnswer: (question: GeneratedQuestion): string => {
    const completionQuestion = question as CompletionQuestion
    const blanks = completionQuestion.content.blanks.sort((a, b) => a.position - b.position)
    
    if (blanks.length === 1) {
      // Single blank: show main answer with alternatives count
      const blank = blanks[0]
      let correctAnswer = ''
      let alternativesCount = 0
      
      if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers) && blank.acceptedAnswers.length > 0) {
        correctAnswer = blank.acceptedAnswers[0]
        alternativesCount = blank.acceptedAnswers.length - 1
      } else if ((blank as any).answer) {
        // AI-generated format
        correctAnswer = (blank as any).answer
        if ((blank as any).alternatives && Array.isArray((blank as any).alternatives)) {
          alternativesCount = (blank as any).alternatives.length
        }
      } else {
        correctAnswer = '???'
      }
      
      return alternativesCount > 0 
        ? `"${correctAnswer}" (+${alternativesCount} more)`
        : `"${correctAnswer}"`
    } else {
      // Multiple blanks: use concise numbered format
      return blanks
        .map((blank, index) => {
          let correctAnswer = ''
          if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers) && blank.acceptedAnswers.length > 0) {
            correctAnswer = blank.acceptedAnswers[0]
          } else if ((blank as any).answer) {
            correctAnswer = (blank as any).answer
          } else {
            correctAnswer = '???'
          }
          
          return `${index + 1}:"${correctAnswer}"`
        })
        .join(' • ')
    }
  },

  formatExplanation: (question: GeneratedQuestion, evaluation: QuestionEvaluationResult): string => {
    return evaluation.feedback || question.explanation || 'No explanation available'
  }
}