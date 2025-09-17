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

    if (!completionResponse.response?.answers) {
      return "No answer provided"
    }

    const answers = completionResponse.response.answers
    const blanks = completionQuestion.content.blanks.sort((a, b) => a.position - b.position)

    // Create a clean display format
    return blanks
      .map((blank, index) => {
        const answer = answers.find(a => a.blankId === blank.id || a.blankId === `blank-${index}`)
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
        // Handle both expected format (acceptedAnswers) and AI-generated format (answer)
        let acceptedAnswers: string[] = []

        if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers)) {
          acceptedAnswers = blank.acceptedAnswers
        } else if ((blank as any).answer) {
          acceptedAnswers = [(blank as any).answer]
          // Include alternatives if they exist
          if ((blank as any).alternatives && Array.isArray((blank as any).alternatives)) {
            acceptedAnswers.push(...(blank as any).alternatives)
          }
        }

        const primaryAnswer = acceptedAnswers[0] || '???'
        const alternatives = acceptedAnswers.slice(1)

        let result = `Blank ${index + 1}: "${primaryAnswer}"`
        if (alternatives.length > 0 && alternatives.length <= 2) {
          result += ` (or: ${alternatives.map(alt => `"${alt}"`).join(', ')})`
        } else if (alternatives.length > 2) {
          result += ` (+ ${alternatives.length} more)`
        }

        return result
      })
      .join(' • ')
  },

  formatExplanation: (question: GeneratedQuestion, evaluation: QuestionEvaluationResult): string => {
    // Start with the main explanation
    let explanation = question.explanation || evaluation.feedback || ""

    // Add partial credit details if available
    if (evaluation.partialCredit?.details && evaluation.partialCredit.details.length > 0) {
      const correctCount = evaluation.partialCredit.details.filter(detail =>
        detail.includes('-correct')
      ).length
      const totalCount = evaluation.partialCredit.possible || (question as CompletionQuestion).content.blanks.length

      if (correctCount < totalCount) {
        explanation += `\n\nScore: ${correctCount}/${totalCount} blanks correct.`
      }
    }

    return explanation || "Fill in the blanks based on what you heard in the audio."
  }
}