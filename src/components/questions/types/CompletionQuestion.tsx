/**
 * Completion Question Component
 * For fill-in-the-blank style questions where users complete missing words/phrases
 */

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  totalQuestions,
  currentSetIndex,
  totalSets,
  responses,
  onAnswerSelect,
  showResults = false,
  evaluationResult,
  enableWordSelection = true
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

  // Render template with interactive blanks
  const renderTemplateWithBlanks = () => {
    const template = question.content.template
    const blanks = question.content.blanks.sort((a, b) => a.position - b.position)

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    blanks.forEach((blank, index) => {
      // Add text before this blank
      if (blank.position > lastIndex) {
        const textBefore = template.substring(lastIndex, blank.position)
        parts.push(
          <span key={`text-${index}`} className="text-gray-800">
            {textBefore}
          </span>
        )
      }

      // Add the blank input
      const isCorrect = showResults && evaluationResult?.partialCredit?.details?.includes(`blank-${blank.id}-correct`)
      const isIncorrect = showResults && evaluationResult?.partialCredit?.details?.includes(`blank-${blank.id}-incorrect`)

      parts.push(
        <span key={`blank-${blank.id}`} className="inline-block mx-1">
          <Input
            value={answers[blank.id] || ''}
            onChange={(e) => updateAnswer(blank.id, e.target.value)}
            disabled={showResults}
            placeholder={blank.hint || '___'}
            className={`
              inline-block w-auto min-w-20 h-8 px-2 py-1 text-center border-2 rounded
              ${isCorrect ? 'border-green-500 bg-green-50 text-green-800' : ''}
              ${isIncorrect ? 'border-red-500 bg-red-50 text-red-800' : ''}
              ${!showResults ? 'border-blue-300 focus:border-blue-500' : ''}
            `}
            style={{
              width: `${Math.max(3, (answers[blank.id] || blank.hint || '___').length + 1)}ch`
            }}
          />
          {showResults && isCorrect && (
            <span className="ml-1 text-green-600">✓</span>
          )}
          {showResults && isIncorrect && (
            <span className="ml-1 text-red-600">✗</span>
          )}
        </span>
      )

      // Find the end of the blank placeholder in template
      const blankPlaceholder = '___'
      const blankStart = template.indexOf(blankPlaceholder, blank.position)
      lastIndex = blankStart + blankPlaceholder.length
    })

    // Add remaining text after last blank
    if (lastIndex < template.length) {
      parts.push(
        <span key="text-end" className="text-gray-800">
          {template.substring(lastIndex)}
        </span>
      )
    }

    return parts
  }

  // Calculate completion status
  const totalBlanks = question.content.blanks.length
  const filledBlanks = Object.values(answers).filter(answer => answer.trim().length > 0).length
  const progressPercentage = totalBlanks > 0 ? (filledBlanks / totalBlanks) * 100 : 0

  return (
    <Card className="border-2 border-purple-100 shadow-xl shadow-purple-500/5">
      <CardContent className="p-8">
        {/* Question Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 text-sm font-bold">
              Set {currentSetIndex + 1} of {totalSets} • Question {questionIndex + 1} of{' '}
              {totalQuestions}
            </Badge>
            <Badge variant="outline" className="text-purple-700 border-purple-300">
              Fill in the Blanks
            </Badge>
          </div>
          {!showResults && (
            <div className="text-sm text-gray-600">
              {filledBlanks}/{totalBlanks} completed
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!showResults && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

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
          {renderTemplateWithBlanks()}
        </div>

        {/* Hints Section */}
        {question.content.blanks.some(blank => blank.hint) && !showResults && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Hints:</h4>
            <div className="space-y-1">
              {question.content.blanks
                .filter(blank => blank.hint)
                .map(blank => (
                  <div key={blank.id} className="text-sm text-blue-700">
                    • {blank.hint}
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
                <p className="text-gray-700 leading-relaxed mb-3">
                  {question.explanation}
                </p>

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
export function CompletionPreview({ question }: { question: CompletionQuestionType }) {
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
    <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
      <h4 className="font-semibold mb-2 text-purple-800">{question.question}</h4>
      <div className="mb-3 p-3 bg-white rounded border">
        <p className="text-gray-800 leading-relaxed">
          {renderPreviewTemplate()}
        </p>
      </div>

      <div className="space-y-2">
        <h5 className="font-medium text-purple-700 text-sm">Expected Answers:</h5>
        {question.content.blanks.map((blank, index) => (
          <div key={blank.id} className="text-sm">
            <span className="text-purple-600">Blank {index + 1}:</span>
            <span className="font-medium text-purple-800 ml-2">
              {blank.acceptedAnswers.join(', ')}
            </span>
            {blank.caseSensitive && (
              <span className="text-xs text-purple-500 ml-2">(case sensitive)</span>
            )}
          </div>
        ))}
      </div>

      {question.explanation && (
        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Explanation:</strong> {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}