'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../../components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../../../../../../components/ui/tooltip'
import { QuestionNavigationBar } from './QuestionNavigationBar'
import { QuestionFactory } from '../../../../../../components/questions/QuestionFactory'
import { autoMigrateQuestion } from '../../../../../../lib/utils/question-migration'
import { QuestionResponse } from '../../../../../../lib/types/question-types'
import { useResponseHandler } from '../hooks/useResponseHandler'
import '../../../../../../lib/registry' // Initialize question type registry

interface GroupQuizActiveViewProps {
  currentQuestion: {
    question: any
    questionIndex: number
    groupData: any
  } | null
  responses: Array<{ questionIndex: number; answer: string }> | QuestionResponse[]
  onAnswerSelect: (questionIndex: number, response: QuestionResponse) => void
  onNextQuestion: () => void
  onSubmitSet: () => void
  onMoveToNextSet: () => void
  isLastQuestion: boolean
  allAnswered: boolean
  submitting: boolean
  currentSetIndex: number
  totalSets: number
  participants: Array<{ user_id: string; user_email: string; is_online: boolean }>
  onlineParticipants: Array<{ user_id: string; user_email: string; is_online: boolean }>
  timeLimit?: number | null
  allowQuestionSkipping?: boolean
  currentQuestionIndex: number // Add this prop for proper progress calculation
  quizSettings?: {
    shuffleQuestions?: boolean
    shuffleAnswers?: boolean
    showCorrectAnswers?: boolean
    defaultQuizTimeLimit?: number
    enforceQuizTimeLimit?: boolean
    allowSkippingQuestions?: boolean
  }
  onNavigateToQuestion?: (questionIndex: number) => void
  onNavigatePrevious?: () => void
  onNavigateNext?: () => void
  totalQuestionsInCurrentSet?: number
}

export function GroupQuizActiveView({
  currentQuestion,
  responses,
  onAnswerSelect,
  onNextQuestion,
  onSubmitSet,
  onMoveToNextSet,
  isLastQuestion,
  allAnswered,
  submitting,
  currentSetIndex,
  totalSets,
  participants,
  onlineParticipants,
  timeLimit,
  allowQuestionSkipping = false,
  currentQuestionIndex,
  quizSettings = {},
  onNavigateToQuestion,
  onNavigatePrevious,
  onNavigateNext,
  totalQuestionsInCurrentSet = 0
}: GroupQuizActiveViewProps) {
  // selectedAnswer state is now managed by QuestionFactory
  const [setSubmitted, setSetSubmitted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    timeLimit ? timeLimit * 60 : null
  )
  const [timerStarted, setTimerStarted] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Clean response handler - separated from UI logic
  const { handleQuestionResponse } = useResponseHandler({ onAnswerSelect })

  // Start timer when component mounts
  useEffect(() => {
    if (timeLimit && timeLimit > 0 && !timerStarted) {
      setTimeRemaining(timeLimit * 60) // Convert minutes to seconds
      setTimerStarted(true)
    }
  }, [timeLimit, timerStarted])

  // Reset setSubmitted when moving to a new set
  useEffect(() => {
    setSetSubmitted(false)
    setCountdownSeconds(3)
    // Reset timer for new set
    if (timeLimit && timeLimit > 0) {
      setTimeRemaining(timeLimit * 60)
      setTimerStarted(true)
    }
  }, [currentSetIndex, timeLimit])

  // Define handleNext before it's used
  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      onSubmitSet()
      setSetSubmitted(true)

      // Stop timer when submitting
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Don't auto-transition - let user manually continue
      // This prevents the bug where it auto-advances to next set completion screen
    } else {
      onNextQuestion()
    }
  }, [isLastQuestion, onSubmitSet, onNextQuestion])

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && timerStarted && !setSubmitted) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => (prev !== null ? prev - 1 : null))
      }, 1000)
    } else if (timeRemaining === 0 && !setSubmitted) {
      // Time's up - auto submit (use setTimeout to avoid setState during render)
      setTimeout(() => {
        handleNext()
      }, 0)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [timeRemaining, timerStarted, setSubmitted, handleNext])

  // Response management is now handled by QuestionFactory

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = (seconds: number): string => {
    if (seconds > 300) return 'text-green-600' // > 5 minutes
    if (seconds > 60) return 'text-yellow-600' // > 1 minute
    return 'text-red-600' // ≤ 1 minute
  }

  // Answer handling is now managed by QuestionFactory

  const handleSkip = () => {
    // Skip without selecting an answer - move to next question
    onNextQuestion()
  }

  const handleContinueToNextSet = () => {
    // Clear any existing countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }

    // Move to next set - this will trigger the useEffect to reset state
    onMoveToNextSet()
  }

  const handleGoBack = () => {
    if (
      window.confirm(
        'Are you sure you want to go back? You will lose your current progress in this quiz session.'
      )
    ) {
      window.history.back()
    }
  }

  if (!currentQuestion) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-800">Loading question...</h3>
        </div>
      </div>
    )
  }

  // Show set completion screen after submission
  if (setSubmitted) {
    const isLastSet = currentSetIndex >= totalSets - 1

    return (
      <div className="space-y-6">
        {/* Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Back to Group
          </button>
        </div>

        {/* Set Completion Card */}
        <Card className="border-green-200 bg-green-50/80 shadow-lg">
          <CardContent className="py-12 text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                  <span className="font-bold text-white">✓</span>
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                Set {currentSetIndex + 1} Complete!
              </h2>
              <p className="text-gray-600">
                {isLastSet
                  ? "Congratulations! You've completed all sets. Ready to view your results?"
                  : `Great job! Ready to continue to the next set?`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              {!isLastSet && (
                <Button
                  onClick={handleContinueToNextSet}
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700"
                >
                  Continue to Set {currentSetIndex + 2} →
                </Button>
              )}

              {isLastSet && (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm text-gray-500">
                    {submitting ? 'Processing your final results...' : 'All sets completed!'}
                  </div>
                  {!submitting && (
                    <Button
                      onClick={handleContinueToNextSet}
                      className="rounded-xl bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700"
                    >
                      View Results →
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Summary */}
        <div className="rounded-xl border border-white/40 bg-white/60 p-4">
          <h3 className="mb-2 font-semibold text-gray-800">Progress Summary</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-green-600">
              Set {currentSetIndex + 1} of {totalSets} completed
            </span>
            <div className="h-2 flex-1 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${((currentSetIndex + 1) / totalSets) * 100}%` }}
              />
            </div>
            <span className="text-gray-500">
              {Math.round(((currentSetIndex + 1) / totalSets) * 100)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  const { question, questionIndex, groupData } = currentQuestion
  const currentResponse = responses.find(r => r.questionIndex === questionIndex)

  // Calculate current question number within the set properly
  // currentQuestionIndex is 0-based within the current set, so add 1 for display
  const currentQuestionInSet = currentQuestionIndex + 1
  const totalQuestionsInSet = groupData?.questions?.length || 0

  // Calculate questions answered in current set for progress bar - FIXED
  const currentSetStartIndex = questionIndex - currentQuestionIndex
  const currentSetEndIndex = currentSetStartIndex + totalQuestionsInSet - 1
  const answeredQuestionsInSet = responses.filter(
    response =>
      response.questionIndex >= currentSetStartIndex &&
      response.questionIndex <= currentSetEndIndex &&
      ('answer' in response ? response.answer : response.response)
  ).length

  return (
    <div className="space-y-6">
      {/* Header with Timer */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ← Back to Group
        </button>

        {/* Timer Display */}
        {timeRemaining !== null && (
          <div
            className={`flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-sm ${
              timeRemaining <= 60
                ? 'border-red-200 bg-red-50'
                : timeRemaining <= 300
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-green-200 bg-green-50'
            }`}
          >
            <Clock className={`h-4 w-4 ${getTimerColor(timeRemaining)}`} />
            <span className={`font-mono font-semibold ${getTimerColor(timeRemaining)}`}>
              {formatTime(timeRemaining)}
            </span>
            {timeRemaining <= 60 && (
              <span className="text-xs font-medium text-red-600">Time's almost up!</span>
            )}
          </div>
        )}
      </div>

      {/* Progress indicator */}
      <div className="rounded-xl border border-white/40 bg-white/60 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Set {currentSetIndex + 1} of {totalSets}
          </span>
          <span className="text-gray-500">
            {answeredQuestionsInSet} of {totalQuestionsInSet} answered
          </span>
        </div>

        <div className="h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
            style={{
              width: `${totalQuestionsInSet > 0 ? (answeredQuestionsInSet / totalQuestionsInSet) * 100 : 0}%`
            }}
          />
        </div>

        {/* Current question indicator */}
        <div className="mt-2 text-xs text-gray-600">
          Current: Question {currentQuestionInSet} of {totalQuestionsInSet}
        </div>
      </div>

      {/* Compact Quiz Settings */}
      {/* <QuizSettingsPanel settings={quizSettings} compact /> */}

      {/* Question Navigation */}
      {onNavigateToQuestion && onNavigatePrevious && onNavigateNext && (
        <QuestionNavigationBar
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestionsInSet}
          responses={
            // CRITICAL FIX: Filter responses to only include current set and map global indices to local indices
            responses
              .filter(response => {
                // Calculate the global index range for current set
                const currentSetStartIndex = questionIndex - currentQuestionIndex
                const currentSetEndIndex = currentSetStartIndex + totalQuestionsInSet - 1
                return (
                  response.questionIndex >= currentSetStartIndex &&
                  response.questionIndex <= currentSetEndIndex
                )
              })
              .map(response => {
                // Convert legacy response format if needed
                const convertedResponse = 'answer' in response ? {
                  questionIndex: response.questionIndex,
                  questionType: 'multiple-choice' as const,
                  timestamp: new Date(),
                  response: { selectedOption: response.answer as 'A' | 'B' | 'C' | 'D' }
                } : response as QuestionResponse

                return {
                  // Convert global questionIndex to local index within current set
                  questionIndex: response.questionIndex - (questionIndex - currentQuestionIndex),
                  // Convert to legacy format for QuestionNavigationBar
                  answer: 'answer' in response ? response.answer : (
                    convertedResponse.questionType === 'multiple-choice'
                      ? convertedResponse.response.selectedOption
                      : JSON.stringify(convertedResponse.response)
                  )
                }
              })
          }
          onNavigateToQuestion={onNavigateToQuestion}
          onPrevious={onNavigatePrevious}
          onNext={onNavigateNext}
          allowNavigation={quizSettings.allowSkippingQuestions ?? false}
          disabled={submitting}
        />
      )}

      {/* Question Card */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Use QuestionFactory for registry-based rendering */}
            <QuestionFactory
              question={autoMigrateQuestion(question)}
              questionIndex={questionIndex}
              totalQuestions={totalQuestionsInSet}
              currentSetIndex={currentSetIndex}
              totalSets={totalSets}
              responses={Array.isArray(responses) ? responses.map(r => {
                // Convert legacy response to new format if needed
                if ('answer' in r) {
                  // Legacy format - convert to QuestionResponse
                  return {
                    questionIndex: r.questionIndex,
                    questionType: 'multiple-choice' as const,
                    timestamp: new Date(),
                    response: { selectedOption: r.answer as 'A' | 'B' | 'C' | 'D' }
                  }
                }
                return r as QuestionResponse
              }) : []}
              onAnswerSelect={handleQuestionResponse}
              showResults={false}
              enableWordSelection={true}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-gray-200 pt-6">
              {allowQuestionSkipping && !isLastQuestion && (
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-semibold"
                >
                  Skip Question
                </Button>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleNext}
                      disabled={(() => {
                        if (isLastQuestion) {
                          // For submit set button: require all questions to be answered
                          return answeredQuestionsInSet < totalQuestionsInSet
                        } else {
                          // For next question button: just require current question to be answered
                          return !currentResponse
                        }
                      })()}
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 font-semibold text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
                    >
                      {isLastQuestion ? 'Submit Set' : 'Next Question'} →
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isLastQuestion && answeredQuestionsInSet < totalQuestionsInSet
                      ? `Answer all questions to submit (${answeredQuestionsInSet}/${totalQuestionsInSet} answered)`
                      : !currentResponse && !isLastQuestion
                        ? 'Select an answer to continue'
                        : 'Ready to proceed'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
