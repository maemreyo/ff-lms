/**
 * Completion Question Type Registration
 * Registers the completion (fill-in-the-blank) question type with the registry system
 */

import {
  QuestionTypeRegistry,
  QuestionTypeConfig
} from '@/lib/registry/QuestionTypeRegistry'
import {
  CompletionQuestion as CompletionQuestionType,
  CompletionResponse,
  QuestionEvaluationResult
} from '@/lib/types/question-types'
import {
  CompletionQuestion,
  CompletionPreview
} from '@/components/questions/types/CompletionQuestion'
import {
  completionQuestionsPrompt,
  singleDifficultyCompletionPrompt
} from '@/lib/services/ai/prompts/completion-prompts'

/**
 * Validate completion response format
 */
function validateCompletionResponse(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    response.questionType === 'completion' &&
    response.response &&
    Array.isArray(response.response.answers) &&
    response.response.answers.every((answer: any) =>
      answer &&
      typeof answer.blankId === 'string' &&
      typeof answer.value === 'string'
    )
  )
}

/**
 * Calculate score for completion question
 * Supports partial credit - each blank is worth equal points
 */
function calculateCompletionScore(
  question: CompletionQuestionType,
  response: CompletionResponse
): QuestionEvaluationResult {
  const blanks = question.content.blanks
  const userAnswers = response.response.answers
  const totalBlanks = blanks.length

  let correctBlanks = 0
  const details: string[] = []

  // Check each blank
  blanks.forEach(blank => {
    const userAnswer = userAnswers.find(answer => answer.blankId === blank.id)
    const userValue = userAnswer?.value?.trim() || ''

    // Check if user's answer matches any accepted answer
    const isCorrect = blank.acceptedAnswers.some(acceptedAnswer => {
      const normalizedAccepted = blank.caseSensitive
        ? acceptedAnswer.trim()
        : acceptedAnswer.trim().toLowerCase()
      const normalizedUser = blank.caseSensitive
        ? userValue
        : userValue.toLowerCase()

      return normalizedAccepted === normalizedUser
    })

    if (isCorrect) {
      correctBlanks++
      details.push(`blank-${blank.id}-correct`)
    } else {
      details.push(`blank-${blank.id}-incorrect`)
    }
  })

  const score = totalBlanks > 0 ? correctBlanks / totalBlanks : 0
  const isFullyCorrect = correctBlanks === totalBlanks

  // Generate feedback
  let feedback = ''
  if (isFullyCorrect) {
    feedback = 'Excellent! All blanks filled correctly.'
  } else if (score >= 0.7) {
    feedback = `Good work! ${correctBlanks} out of ${totalBlanks} blanks correct.`
  } else if (score >= 0.4) {
    feedback = `Partial credit. ${correctBlanks} out of ${totalBlanks} blanks correct. Review the incorrect answers.`
  } else {
    feedback = `More practice needed. Only ${correctBlanks} out of ${totalBlanks} blanks correct.`
  }

  return {
    questionIndex: response.questionIndex,
    questionType: 'completion',
    isCorrect: isFullyCorrect,
    score,
    maxScore: 1,
    feedback,
    partialCredit: {
      earned: correctBlanks,
      possible: totalBlanks,
      details
    }
  }
}

/**
 * Generate sample completion question for testing
 */
export function generateSampleCompletionQuestion(): CompletionQuestionType {
  return {
    id: 'sample-completion-1',
    type: 'completion',
    question: 'Complete the sentences based on what you heard in the conversation.',
    difficulty: 'medium',
    explanation: 'The speaker mentioned the weather conditions and his plans for the day at [01:15-01:30].',
    context: {
      startTime: 75,
      endTime: 90,
      text: 'It was a beautiful sunny day, so I decided to go to the park with my friends.'
    },
    content: {
      template: 'It was a beautiful ___ day, so I decided to go to the ___ with my friends.',
      blanks: [
        {
          id: 'blank-1',
          position: 18, // Position of first ___
          acceptedAnswers: ['sunny', 'nice', 'lovely', 'clear'],
          caseSensitive: false,
          hint: 'Weather condition'
        },
        {
          id: 'blank-2',
          position: 65, // Position of second ___
          acceptedAnswers: ['park', 'garden'],
          caseSensitive: false,
          hint: 'Place to visit outdoors'
        }
      ]
    }
  }
}

/**
 * Completion question type configuration
 */
const completionConfig: QuestionTypeConfig = {
  // Components
  component: CompletionQuestion,
  previewComponent: CompletionPreview,

  // Validation and scoring
  responseValidator: validateCompletionResponse,
  scoreCalculator: calculateCompletionScore,

  // Metadata
  metadata: {
    type: 'completion',
    displayName: 'Fill in the Blanks',
    description: 'Complete missing words or phrases in sentences',
    complexity: 'low',
    icon: 'edit',
    estimatedImplementationTime: '4 weeks',
    dependencies: [],
    features: [
      'Text input fields',
      'Multiple accepted answers per blank',
      'Case sensitive/insensitive options',
      'Hints for each blank',
      'Partial credit scoring',
      'Progressive feedback',
      'Auto-sizing input fields'
    ]
  },

  // AI Integration
  promptTemplate: completionQuestionsPrompt,
  responseParser: (aiResponse: string) => {
    try {
      const parsed = JSON.parse(aiResponse)
      return parsed.questions || []
    } catch (error) {
      console.error('Failed to parse completion questions response:', error)
      return []
    }
  },

  // Feature flags - start in development mode
  isEnabled: true,
  isProduction: false // Will be set to true after testing
}

/**
 * Register the completion question type
 */
QuestionTypeRegistry.register('completion', completionConfig)

// Export for testing and utilities
export {
  validateCompletionResponse,
  calculateCompletionScore,
  completionConfig
}