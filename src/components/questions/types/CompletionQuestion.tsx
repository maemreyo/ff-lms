/**
 * Completion Question Component
 * For fill-in-the-blank style questions where users complete missing words/phrases
 */

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
    } else {
      // Clear answers when moving to a new question (issue #5)
      setAnswers({})
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

  // Render separate input fields for each blank
  const renderSeparateInputs = () => {
    const blanks = question.content.blanks.sort((a, b) => a.position - b.position)

    return blanks.map((blank, index) => {
      const isCorrect = showResults && evaluationResult?.partialCredit?.details?.includes(`blank-${blank.id}-correct`)
      const isIncorrect = showResults && evaluationResult?.partialCredit?.details?.includes(`blank-${blank.id}-incorrect`)

      return (
        <div key={blank.id} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Blank {index + 1}
          </label>
          <input
            type="text"
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
                {/* Expected answer will be shown in results section */}
              </span>
            </div>
          )}
        </div>
      )
    })
  }

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

        {/* Template Display */}
        <div
          id={`question-text-${questionIndex}`}
          ref={questionRef}
          className={`
            mb-8 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-6
            text-lg leading-relaxed
            ${enableWordSelection ? 'select-text cursor-text' : ''}
          `}
        >
          <div className="text-gray-800 mb-6">
            {/* Show template with blanks marked */}
            {question.content.template.split('___').map((part, index) => (
              <span key={index}>
                {part}
                {index < question.content.blanks.length && (
                  <span className="inline-flex items-center px-2 py-1 mx-1 bg-yellow-100 border-2 border-dashed border-yellow-400 rounded text-yellow-800 font-medium">
                    Blank {index + 1}
                  </span>
                )}
              </span>
            ))}
          </div>
          
          {/* Separate Input Fields */}
          {renderSeparateInputs()}
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
                  ({evaluationResult.partialCredit?.earned || 0}/{evaluationResult.partialCredit?.possible || question.content.blanks.length} correct)
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
                    <div className="flex flex-wrap gap-2">
                      {question.content.blanks.map(blank => {
                        const isIncorrect = evaluationResult.partialCredit?.details?.includes(`blank-${blank.id}-incorrect`)
                        if (isIncorrect) {
                          return (
                            <span key={blank.id} className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                              Blank {blank.position}: <span className="font-medium ml-1">
                                {(() => {
                                  // Handle both expected format (acceptedAnswers) and AI-generated format (answer)
                                  if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers)) {
                                    return blank.acceptedAnswers[0]
                                  } else if ((blank as any).answer) {
                                    return (blank as any).answer
                                  }
                                  return '???'
                                })()}
                              </span>
                            </span>
                          )
                        }
                        return null
                      })}
                    </div>
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
  const getAcceptedAnswers = (blank: any): string[] => {
    // Handle expected format
    if (blank.acceptedAnswers && Array.isArray(blank.acceptedAnswers)) {
      return blank.acceptedAnswers
    }

    // Handle AI-generated format
    if (blank.answer) {
      // If alternatives exist, combine with main answer
      if (blank.alternatives && Array.isArray(blank.alternatives)) {
        return [blank.answer, ...blank.alternatives]
      }
      return [blank.answer]
    }

    return ['???']
  }

  const renderInteractiveTemplate = () => {
    const template = question.content.template
    const blanks = question.content.blanks.sort((a, b) => a.position - b.position)

    // Colors for visual mapping
    const blankColors = [
      'bg-blue-100 text-blue-800 border-blue-300',
      'bg-green-100 text-green-800 border-green-300',
      'bg-purple-100 text-purple-800 border-purple-300',
      'bg-orange-100 text-orange-800 border-orange-300',
      'bg-pink-100 text-pink-800 border-pink-300'
    ]

    let processedTemplate = template
    let blankIndex = 0

    // Replace each blank with a styled component one by one
    blanks.forEach((blank) => {
      const colorClass = blankColors[blankIndex % blankColors.length]
      const acceptedAnswers = getAcceptedAnswers(blank)
      const answerText = acceptedAnswers[0]

      const blankElement = showAnswers
        ? `<span class="inline-flex items-center px-3 py-1 rounded-md border font-medium ${colorClass}">
             <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs font-bold mr-2">${blankIndex + 1}</span>
             ${answerText}
           </span>`
        : `<span class="inline-flex items-center px-3 py-1 rounded-md border-2 border-dashed border-gray-400 bg-gray-50 text-gray-600 font-medium">
             <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-xs font-bold mr-2">${blankIndex + 1}</span>
             ___
           </span>`

      // Replace only the FIRST occurrence of ___ (not all)
      processedTemplate = processedTemplate.replace('___', blankElement)
      blankIndex++
    })

    return processedTemplate
  }

  const renderAnswerKey = () => {
    if (!showAnswers) return null

    const blanks = question.content.blanks.sort((a, b) => a.position - b.position)

    // Same colors as used in template
    const blankColors = [
      { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100' },
      { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100' },
      { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100' },
      { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100' },
      { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', badge: 'bg-pink-100' }
    ]

    return (
      <div className="space-y-3">
        <h5 className="font-semibold text-gray-700 text-sm flex items-center">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-xs font-bold mr-2">✓</span>
          Answer Key
        </h5>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blanks.map((blank, index) => {
            const acceptedAnswers = getAcceptedAnswers(blank)
            const colors = blankColors[index % blankColors.length]

            return (
              <div
                key={blank.id}
                className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-center mb-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${colors.badge} text-sm font-bold mr-2`}>
                    {index + 1}
                  </span>
                  <span className={`font-medium text-sm ${colors.text}`}>
                    Blank {index + 1}
                  </span>
                </div>

                <div className="ml-8">
                  <div className={`font-semibold ${colors.text} mb-1`}>
                    {acceptedAnswers.slice(0, 1).join(', ')}
                  </div>

                  {acceptedAnswers.length > 1 && (
                    <div className="text-xs text-gray-600">
                      Also accepts: {acceptedAnswers.slice(1).join(', ')}
                    </div>
                  )}

                  {blank.caseSensitive && (
                    <div className="text-xs text-gray-500 mt-1">
                      ⚠️ Case sensitive
                    </div>
                  )}

                  {blank.hint && (
                    <div className="text-xs text-gray-600 mt-1 italic">
                      💡 {blank.hint}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Interactive Template - Main Content (removed badge and instruction text) */}
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div
          className="text-lg leading-relaxed text-gray-800"
          dangerouslySetInnerHTML={{ __html: renderInteractiveTemplate() }}
        />
      </div>

      {/* Answer Key */}
      {renderAnswerKey()}

      {/* Explanation */}
      {showAnswers && question.explanation && (
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <h5 className="font-semibold text-blue-800 text-sm mb-2 flex items-center">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-xs font-bold mr-2">💡</span>
            Explanation
          </h5>
          <div className="ml-7">
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