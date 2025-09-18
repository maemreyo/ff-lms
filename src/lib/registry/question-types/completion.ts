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
import { CompletionQuestionActive } from '@/components/questions/types/CompletionQuestionActive'
import { CompletionQuestionPreview } from '@/components/questions/types/CompletionQuestionPreview'
import {
  completionQuestionsPrompt,
  singleDifficultyCompletionPrompt
} from '@/lib/services/ai/prompts/completion-prompts'
import { ResultDisplayRegistry } from '../ResultDisplayRegistry'
import { completionFormatter } from '../result-formatters/completion-formatter'

/**
 * Validate completion response format
 */
function validateCompletionResponse(response: any): boolean {
  return (
    response &&
    typeof response === 'object' &&
    (response.questionType === 'completion' || response.questionType === 'fill-blank') &&
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

  // Handle different response formats - optimized for new clean format
  let userAnswers: Array<{ blankId: string; value: string }> = []
  
  if (response.response && response.response.answers && Array.isArray(response.response.answers)) {
    // Standard format: response.response.answers
    userAnswers = response.response.answers
  } else if ((response as any).answers && Array.isArray((response as any).answers)) {
    // Alternative format: response.answers directly
    userAnswers = (response as any).answers
  } else if ((response as any).answer && typeof (response as any).answer === 'string') {
    // Clean JSON format: response.answer contains optimized JSON string
    try {
      const parsedAnswer = JSON.parse((response as any).answer)
      if (parsedAnswer.answers && Array.isArray(parsedAnswer.answers)) {
        userAnswers = parsedAnswer.answers
      } else {
        // Legacy full object format fallback
        console.warn('🔄 [Completion Score] Using legacy format fallback')
        userAnswers = parsedAnswer
      }
    } catch (error) {
      console.warn('🚨 [Completion Score] Failed to parse JSON from response.answer:', error)
    }
  } else if (response.response && Array.isArray(response.response)) {
    // Array format: response.response is the answers array
    userAnswers = response.response
  } else {
    // Try to extract from any possible nested structure
    let foundAnswers = false
    
    // Check if response has any property that contains answers
    for (const [key, value] of Object.entries(response)) {
      if (key !== 'questionIndex' && key !== 'questionType' && key !== 'timestamp') {
        if (Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === 'object' && 
            ('blankId' in value[0] || 'value' in value[0])) {
          userAnswers = value
          foundAnswers = true
          break
        } else if (value && typeof value === 'object' && 'answers' in value && Array.isArray(value.answers)) {
          userAnswers = value.answers
          foundAnswers = true
          break
        }
      }
    }
    
    if (!foundAnswers) {
      // Return zero score for unhandled formats
      const totalBlanks = blanks.length
      return {
        questionIndex: response.questionIndex,
        questionType: 'completion',
        isCorrect: false,
        score: 0,
        maxScore: 1,
        feedback: 'No answers provided - unable to evaluate response.',
        partialCredit: {
          earned: 0,
          possible: totalBlanks,
          details: blanks.map((blank, index) => `blank-${blank.id || `blank-${index}`}-incorrect`)
        }
      }
    }
  }

  const totalBlanks = blanks.length
  let correctBlanks = 0
  const details: string[] = []

  // Check each blank
  blanks.forEach((blank, index) => {
    // Handle different blank ID formats
    const blankId = blank.id || `blank-${index}`
    let userAnswer = userAnswers.find(answer => 
      answer.blankId === blankId || 
      answer.blankId === blank.id ||
      answer.blankId === `blank-${index}`
    )
    
    // Fallback: try by index if no ID match found
    if (!userAnswer && userAnswers[index]) {
      userAnswer = userAnswers[index]
    }
    
    const userValue = userAnswer?.value?.trim() || ''

    // Handle different acceptable answer formats
    let acceptedAnswers: string[] = []
    if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers)) {
      acceptedAnswers = blank.acceptedAnswers
    } else if ((blank as any).answer) {
      // AI-generated format with single answer
      acceptedAnswers = [(blank as any).answer]
      if ((blank as any).alternatives && Array.isArray((blank as any).alternatives)) {
        acceptedAnswers.push(...(blank as any).alternatives)
      }
    }

    // Check if user's answer matches any accepted answer
    const isCorrect = acceptedAnswers.some(acceptedAnswer => {
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
      details.push(`blank-${blankId}-correct`)
    } else {
      details.push(`blank-${blankId}-incorrect`)
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
  component: CompletionQuestionActive,
  previewComponent: CompletionQuestionPreview,

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

/**
 * Register 'fill-blank' as an alias for compatibility with database questions
 */
QuestionTypeRegistry.register('fill-blank', completionConfig)

/**
 * Register result formatter for completion questions
 */
ResultDisplayRegistry.register('completion', completionFormatter)
ResultDisplayRegistry.register('fill-blank', completionFormatter)

// Export for testing and utilities
export {
  validateCompletionResponse,
  calculateCompletionScore,
  completionConfig
}