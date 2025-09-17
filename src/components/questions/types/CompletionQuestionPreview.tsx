/**
 * Completion Question Preview Component
 * Optimized for previewing questions with inline answers
 */

import React from 'react'
import { ExplanationWithTimeframes } from '@/components/groups/quiz/ExplanationWithTimeframes'
import {
  CompletionQuestion as CompletionQuestionType
} from '@/lib/types/question-types'

interface CompletionQuestionPreviewProps {
  question: CompletionQuestionType
  showAnswers?: boolean
  videoUrl?: string
}

/**
 * Preview Completion Question Component - Optimized for displaying questions
 */
export function CompletionQuestionPreview({
  question,
  showAnswers = true,
  videoUrl
}: CompletionQuestionPreviewProps) {
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

  const renderInlineTemplate = () => {
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

    // Replace each blank with styled inline element
    blanks.forEach((blank) => {
      const colorClass = blankColors[blankIndex % blankColors.length]
      const acceptedAnswers = getAcceptedAnswers(blank)
      const answerText = acceptedAnswers[0]

      const blankElement = showAnswers
        ? `<span class="inline-flex items-center px-3 py-1 mx-1 rounded-md border font-semibold ${colorClass}">
             ${answerText}
           </span>`
        : `<span class="inline-flex items-center px-3 py-1 mx-1 rounded-md border-2 border-dashed border-gray-400 bg-gray-100 text-gray-600 font-medium">
             ___
           </span>`

      // Replace only the FIRST occurrence of ___
      processedTemplate = processedTemplate.replace('____', blankElement)
      blankIndex++
    })

    return processedTemplate
  }

  const renderAnswerReference = () => {
    if (!showAnswers) return null

    const blanks = question.content.blanks.sort((a, b) => a.position - b.position)

    // Same colors as used in template
    const blankColors = [
      { bg: 'bg-blue-50', text: 'text-blue-800', accent: 'text-blue-600' },
      { bg: 'bg-green-50', text: 'text-green-800', accent: 'text-green-600' },
      { bg: 'bg-purple-50', text: 'text-purple-800', accent: 'text-purple-600' },
      { bg: 'bg-orange-50', text: 'text-orange-800', accent: 'text-orange-600' },
      { bg: 'bg-pink-50', text: 'text-pink-800', accent: 'text-pink-600' }
    ]

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h5 className="font-semibold text-gray-700 text-sm mb-3">Answer Reference:</h5>
        <div className="flex flex-wrap gap-2">
          {blanks.map((blank, index) => {
            const acceptedAnswers = getAcceptedAnswers(blank)
            const colors = blankColors[index % blankColors.length]

            return (
              <div
                key={blank.id}
                className={`px-3 py-2 rounded-md ${colors.bg} border`}
              >
                <div className={`font-semibold ${colors.text} text-sm`}>
                  {acceptedAnswers[0]}
                </div>
                {acceptedAnswers.length > 1 && (
                  <div className="text-xs text-gray-600 mt-1">
                    Also: {acceptedAnswers.slice(1).join(', ')}
                  </div>
                )}
                {blank.hint && (
                  <div className={`text-xs ${colors.accent} mt-1 italic`}>
                    💡 {blank.hint}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Template Display */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div
          className="text-lg leading-relaxed text-gray-800"
          dangerouslySetInnerHTML={{ __html: renderInlineTemplate() }}
        />
      </div>

      {/* Answer Reference */}
      {renderAnswerReference()}

      {/* Explanation */}
      {showAnswers && question.explanation && (
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <h5 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            Explanation
          </h5>
          <div className="text-blue-700">
            {videoUrl ? (
              <ExplanationWithTimeframes
                explanation={question.explanation}
                videoUrl={videoUrl}
                className="text-sm text-blue-700"
              />
            ) : (
              <p className="text-sm">{question.explanation}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}