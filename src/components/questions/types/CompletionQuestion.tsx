/**
 * Completion Question Component
 * For fill-in-the-blank style questions where users complete missing words/phrases
 */

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ExplanationWithTimeframes } from '@/components/groups/quiz/ExplanationWithTimeframes'
import { QuestionComponentProps } from '@/lib/registry/QuestionTypeRegistry'
import {
  CompletionQuestion as CompletionQuestionType,
  CompletionResponse
} from '@/lib/types/question-types'
import { useWordSelection } from '@/lib/hooks/use-word-selection'

/**
 * Completion Question Component
 */
export function CompletionQuestion({
  question,
  questionIndex,
  responses,
  onAnswerSelect,
  showResults = false,
  evaluationResult,
  enableWordSelection = true,
  videoUrl
}: QuestionComponentProps<CompletionQuestionType>) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const questionRef = useRef<HTMLDivElement>(null)
  const { enableSelection, disableSelection } = useWordSelection()

  // Initialize answers from existing response
  useEffect(() => {
    const existingResponse = responses.find(r => r.questionIndex === questionIndex)
    if (existingResponse && existingResponse.questionType === 'completion') {
      const completionResponse = existingResponse as CompletionResponse
      const answerMap: Record<string, string> = {}
      completionResponse.response.answers.forEach(answer => {
        answerMap[answer.blankId] = answer.value
      })
      setAnswers(answerMap)
    }
  }, [responses, questionIndex])

  // Enable word selection on mount
  useEffect(() => {
    if (enableWordSelection && questionRef.current) {
      enableSelection(
        `question-text-${questionIndex}`,
        'quiz',
        `${questionIndex}-question`
      )
    }

    return () => {
      disableSelection(`question-text-${questionIndex}`)
    }
  }, [enableWordSelection, questionIndex, enableSelection, disableSelection])

  // Update answer for a specific blank
  const updateAnswer = (blankId: string, value: string) => {
    const newAnswers = { ...answers, [blankId]: value }
    setAnswers(newAnswers)

    // Create response object
    const response: CompletionResponse = {
      questionIndex,
      questionType: 'completion',
      timestamp: new Date(),
      response: {
        answers: Object.entries(newAnswers).map(([blankId, value]) => ({
          blankId,
          value: value.trim()
        }))
      }
    }

    onAnswerSelect(questionIndex, response)
  }

  // Render simple input fields for each blank
  const renderSimpleInputs = () => {
    const blanks = question.content.blanks.sort((a, b) => a.position - b.position)

    return blanks.map((blank, index) => {
      const isCorrect = showResults && evaluationResult?.partialCredit?.details?.includes(`blank-${blank.id}-correct`)
      const isIncorrect = showResults && evaluationResult?.partialCredit?.details?.includes(`blank-${blank.id}-incorrect`)

      return (
        <div key={blank.id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Blank {index + 1}
          </label>
          <Input
            value={answers[blank.id] || ''}
            onChange={(e) => updateAnswer(blank.id, e.target.value)}
            disabled={showResults}
            placeholder="Type your answer..."
            className={`
              w-full max-w-md h-10 px-3 py-2 border-2 rounded-md
              ${isCorrect ? 'border-green-500 bg-green-50 text-green-800' : ''}
              ${isIncorrect ? 'border-red-500 bg-red-50 text-red-800' : ''}
              ${!showResults ? 'border-gray-300 focus:border-blue-500' : ''}
            `}
          />
          {showResults && isCorrect && (
            <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
          )}
          {showResults && isIncorrect && (
            <div className="mt-1">
              <span className="text-red-600 font-medium">✗ Incorrect</span>
              <span className="text-sm text-gray-600 ml-2">
                {/* Expected: {blank.acceptedAnswers[0]} */}
              </span>
            </div>
          )}
        </div>
      )
    })
  }

  // Calculate completion status
  const totalBlanks = question.content.blanks.length

  return (
    <Card className="border-2 border-purple-100 shadow-xl shadow-purple-500/5">
      <CardContent className="p-8">
        {/* Question Text */}
        <div className="mb-6">
          <h3 className="text-xl font-bold leading-relaxed text-gray-800 mb-4">
            {question.question}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Fill in the blanks with the appropriate words based on what you heard.
          </p>
        </div>

        {/* Template with Interactive Blanks */}
        <div
          id={`question-text-${questionIndex}`}
          ref={questionRef}
          className={`
            mb-8 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-6
            text-lg leading-relaxed
            ${enableWordSelection ? 'select-text cursor-text' : ''}
          `}
        >
          {renderSimpleInputs()}
        </div>

        {/* Hints Section */}
        {question.content.blanks.some(blank => blank.hint) && !showResults && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Hints:</h4>
            <div className="space-y-1">
              {question.content.blanks
                .filter(blank => blank.hint)
                .map((blank, index) => (
                  <div key={blank.id} className="text-sm text-blue-700">
                    <span className="font-medium">Blank {index + 1}:</span> {blank.hint}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Results Section */}
        {showResults && evaluationResult && (
          <div className="mt-8 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
            <div className="flex items-start space-x-4">
              <div className={`h-8 w-8 rounded-full ${
                evaluationResult.score >= 0.7 ? 'bg-green-500' :
                evaluationResult.score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                <div className="flex h-full w-full items-center justify-center text-white text-lg font-bold">
                  {evaluationResult.score >= 0.7 ? '✓' :
                   evaluationResult.score >= 0.4 ? '~' : '✗'}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 mb-2">
                  Score: {Math.round(evaluationResult.score * 100)}%
                  ({evaluationResult.partialCredit?.earned || 0}/{evaluationResult.partialCredit?.possible || totalBlanks} correct)
                </h4>
                <div className="text-gray-700 leading-relaxed mb-3">
                  {videoUrl ? (
                    <ExplanationWithTimeframes
                      explanation={question.explanation}
                      videoUrl={videoUrl}
                      className="text-gray-700"
                    />
                  ) : (
                    <p>{question.explanation}</p>
                  )}
                </div>

                {/* Show correct answers for incorrect blanks */}
                {evaluationResult.partialCredit?.details && (
                  <div className="mt-3 space-y-2">
                    <h5 className="font-semibold text-gray-800 text-sm">Correct Answers:</h5>
                    {question.content.blanks.map(blank => {
                      const isIncorrect = evaluationResult.partialCredit?.details?.includes(`blank-${blank.id}-incorrect`)
                      if (isIncorrect) {
                        return (
                          <div key={blank.id} className="text-sm">
                            <span className="text-gray-600">Blank {blank.position}:</span>
                            <span className="font-medium text-green-700 ml-2">
                              {blank.acceptedAnswers.join(' or ')}
                            </span>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Preview component for completion questions
 */
export function CompletionPreview({
  question,
  showAnswers = true,
  videoUrl
}: {
  question: CompletionQuestionType
  showAnswers?: boolean
  videoUrl?: string
}) {
  const renderPreviewTemplate = () => {
    const template = question.content.template
    const blanks = question.content.blanks.sort((a, b) => a.position - b.position)

    let result = template
    blanks.forEach(blank => {
      const placeholder = '___'
      const replacement = `[${blank.acceptedAnswers[0]}]`
      result = result.replace(placeholder, replacement)
    })

    return result
  }

  return (
    <div>
      {/* Question Text with Timeframe Support */}
      <div className="mb-4 text-base text-gray-800">
        {videoUrl ? (
          <ExplanationWithTimeframes
            explanation={question.question}
            videoUrl={videoUrl}
            className="text-base text-gray-800"
          />
        ) : (
          <p>{question.question}</p>
        )}
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
        <p className="text-gray-800 leading-relaxed font-mono">
          {renderPreviewTemplate()}
        </p>
      </div>

      {showAnswers && (
        <div className="space-y-2">
          <h5 className="font-medium text-gray-700 text-sm">Expected Answers:</h5>
          {question.content.blanks.map((blank, index) => (
            <div key={blank.id} className="text-sm p-2 bg-green-50 rounded border border-green-200">
              <span className="text-green-600 font-medium">Blank {index + 1}:</span>
              <span className="font-semibold text-green-800 ml-2">
                {blank.acceptedAnswers.join(', ')}
              </span>
              {blank.caseSensitive && (
                <span className="text-xs text-green-600 ml-2">(case sensitive)</span>
              )}
              {blank.hint && (
                <div className="text-xs text-green-600 mt-1">
                  Hint: {blank.hint}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAnswers && question.explanation && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-800">Explanation</p>
          <div className="mt-1">
            {videoUrl ? (
              <ExplanationWithTimeframes
                explanation={question.explanation}
                videoUrl={videoUrl}
                className="text-sm text-blue-700"
              />
            ) : (
              <p className="text-sm text-blue-700">{question.explanation}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}