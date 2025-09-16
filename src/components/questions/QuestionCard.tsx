/**
 * QuestionCard Component (Legacy Wrapper)
 *
 * This component maintains backward compatibility while delegating to the new QuestionFactory system.
 * It migrates legacy question and response formats to the new typed system.
 */

import React from 'react'
import { QuestionFactory } from './QuestionFactory'
import {
  autoMigrateQuestion,
  migrateLegacyResponses,
  convertToLegacyResponse,
  LegacyQuestion,
  LegacyQuestionResponse
} from '@/lib/utils/question-migration'
import { QuestionResponse } from '@/lib/types/question-types'

// Import registry to ensure question types are loaded
import '@/lib/registry'

interface QuestionCardProps {
  question: LegacyQuestion
  questionIndex: number
  totalQuestions: number
  currentSetIndex: number
  totalSets: number
  responses: LegacyQuestionResponse[]
  onAnswerSelect: (questionIndex: number, answer: string) => void
  showResults?: boolean
  evaluationResult?: any
  enableWordSelection?: boolean
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  currentSetIndex,
  totalSets,
  responses,
  onAnswerSelect,
  showResults = false,
  evaluationResult,
  enableWordSelection = true
}: QuestionCardProps) {
  // Migrate legacy question to new format
  const migratedQuestion = autoMigrateQuestion(question)

  // Migrate legacy responses to new format
  const migratedResponses: QuestionResponse[] = migrateLegacyResponses(responses)

  // Create adapter for onAnswerSelect to convert back to legacy format
  const handleAnswerSelect = (questionIndex: number, response: QuestionResponse) => {
    const legacyResponse = convertToLegacyResponse(response)
    onAnswerSelect(questionIndex, legacyResponse.answer)
  }

  return (
    <QuestionFactory
      question={migratedQuestion}
      questionIndex={questionIndex}
      totalQuestions={totalQuestions}
      currentSetIndex={currentSetIndex}
      totalSets={totalSets}
      responses={migratedResponses}
      onAnswerSelect={handleAnswerSelect}
      showResults={showResults}
      evaluationResult={evaluationResult}
      enableWordSelection={enableWordSelection}
    />
  )
}

// Export legacy types for backward compatibility
export type { LegacyQuestion as Question, LegacyQuestionResponse as QuestionResponse } from '@/lib/utils/question-migration'
