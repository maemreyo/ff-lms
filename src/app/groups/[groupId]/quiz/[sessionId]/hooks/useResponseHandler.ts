/**
 * Custom hook for handling QuestionResponse objects
 * Provides clean interface for passing responses to quiz hook
 */

import { useCallback } from 'react'
import type { QuestionResponse } from '@/lib/types/question-types'

interface UseResponseHandlerProps {
  onAnswerSelect: (questionIndex: number, response: QuestionResponse) => void
}

export function useResponseHandler({ onAnswerSelect }: UseResponseHandlerProps) {
  /**
   * Handles QuestionResponse objects directly
   * No conversion needed - passes native response objects
   */
  const handleQuestionResponse = useCallback(
    (questionIndex: number, response: QuestionResponse) => {
      // No conversion needed - pass QuestionResponse directly
      onAnswerSelect(questionIndex, response)
    },
    [onAnswerSelect]
  )

  return {
    handleQuestionResponse
  }
}