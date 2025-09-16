/**
 * Multiple Choice Question Component
 * Migrated from original QuestionCard.tsx to use registry system
 */

import { useEffect, useRef } from 'react'
import { useWordSelection } from '@/lib/hooks/use-word-selection'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuestionComponentProps } from '@/lib/registry/QuestionTypeRegistry'
import {
  MultipleChoiceQuestion as MultipleChoiceQuestionType,
  MultipleChoiceResponse,
  QuestionEvaluationResult
} from '@/lib/types/question-types'

/**
 * Multiple Choice Question Component
 */
export function MultipleChoiceQuestion({
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
}: QuestionComponentProps<MultipleChoiceQuestionType>) {
  const selectedAnswer = responses.find(r => r.questionIndex === questionIndex)?.response
  const questionRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const { enableSelection, disableSelection } = useWordSelection()

  // Enable word selection on mount
  useEffect(() => {
    if (enableWordSelection && questionRef.current) {
      enableSelection(
        `question-text-${questionIndex}`,
        'quiz',
        `${questionIndex}-question`
      )
    }

    if (enableWordSelection && optionsRef.current) {
      enableSelection(
        `question-options-${questionIndex}`,
        'quiz',
        `${questionIndex}-options`
      )
    }

    return () => {
      // Cleanup on unmount
      disableSelection(`question-text-${questionIndex}`)
      disableSelection(`question-options-${questionIndex}`)
    }
  }, [enableWordSelection, questionIndex, enableSelection, disableSelection])

  const getOptionStatus = (optionLetter: string) => {
    if (!showResults) return 'default'
    if (!evaluationResult) return 'default'

    if (optionLetter === question.content.correctAnswer) return 'correct'
    if (selectedAnswer && 'selectedOption' in selectedAnswer && selectedAnswer.selectedOption === optionLetter && !evaluationResult.isCorrect) return 'incorrect'
    return 'default'
  }

  const getOptionClasses = (optionLetter: string, isSelected: boolean) => {
    const status = getOptionStatus(optionLetter)
    const baseClasses =
      'block w-full text-left p-5 rounded-2xl border-2 transition-all duration-200'

    if (showResults) {
      switch (status) {
        case 'correct':
          return `${baseClasses} bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-800 shadow-lg`
        case 'incorrect':
          return `${baseClasses} bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-800 shadow-lg`
        default:
          return `${baseClasses} bg-gray-50 border-gray-200 text-gray-600`
      }
    }

    if (isSelected) {
      return `${baseClasses} bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 text-blue-900 shadow-lg`
    }

    return `${baseClasses} bg-white border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-md`
  }

  const handleAnswerSelect = (optionLetter: 'A' | 'B' | 'C' | 'D') => {
    const response: MultipleChoiceResponse = {
      questionIndex,
      questionType: 'multiple-choice',
      timestamp: new Date(),
      response: {
        selectedOption: optionLetter
      }
    }
    onAnswerSelect(questionIndex, response)
  }

  const selectedOption = selectedAnswer && 'selectedOption' in selectedAnswer ? selectedAnswer.selectedOption : null

  return (
    <Card className="border-2 border-blue-100 shadow-xl shadow-blue-500/5">
      <CardContent className="p-8">
        {/* Question Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-sm font-bold">
              Set {currentSetIndex + 1} of {totalSets} • Question {questionIndex + 1} of{' '}
              {totalQuestions}
            </Badge>
          </div>
        </div>

        {/* Question Text */}
        <div
          id={`question-text-${questionIndex}`}
          ref={questionRef}
          className={`mb-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-gray-50 to-blue-50 p-6 ${
            enableWordSelection ? 'select-text cursor-text' : ''
          }`}
        >
          <h3 className="text-xl font-bold leading-relaxed text-gray-800">
            {question.question}
          </h3>
        </div>

        {/* Answer Options */}
        <div
          id={`question-options-${questionIndex}`}
          ref={optionsRef}
          className={`space-y-4 ${enableWordSelection ? 'select-text cursor-text' : ''}`}
        >
          {question.content.options.map((option, index) => {
            const optionLetter = ['A', 'B', 'C', 'D'][index] as 'A' | 'B' | 'C' | 'D'
            const isSelected = selectedOption === optionLetter

            return (
              <button
                key={optionLetter}
                onClick={() => handleAnswerSelect(optionLetter)}
                disabled={showResults}
                className={getOptionClasses(optionLetter, isSelected)}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current font-bold">
                    {optionLetter}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg leading-relaxed">{option}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Results Section */}
        {showResults && evaluationResult && (
          <div className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex items-start space-x-4">
              <div className={`h-8 w-8 rounded-full ${evaluationResult.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                <div className="flex h-full w-full items-center justify-center text-white text-lg font-bold">
                  {evaluationResult.isCorrect ? '✓' : '✗'}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 mb-2">
                  {evaluationResult.isCorrect ? 'Correct!' : 'Incorrect'}
                </h4>
                <p className="text-gray-700 leading-relaxed">
                  {question.explanation}
                </p>
                {!evaluationResult.isCorrect && (
                  <p className="mt-2 text-sm text-red-700">
                    The correct answer is <strong>{question.content.correctAnswer}</strong>.
                  </p>
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
 * Preview component for multiple choice questions
 */
export function MultipleChoicePreview({ question }: { question: MultipleChoiceQuestionType }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h4 className="font-semibold mb-2">{question.question}</h4>
      <div className="space-y-2">
        {question.content.options.map((option, index) => {
          const letter = ['A', 'B', 'C', 'D'][index]
          const isCorrect = letter === question.content.correctAnswer

          return (
            <div
              key={letter}
              className={`flex items-center space-x-2 p-2 rounded ${
                isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
              }`}
            >
              <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-600'}`}>
                {letter}.
              </span>
              <span className={isCorrect ? 'text-green-700' : 'text-gray-700'}>
                {option}
              </span>
              {isCorrect && <span className="text-green-600 text-sm">✓</span>}
            </div>
          )
        })}
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