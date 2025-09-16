/**
 * Question Factory Component
 * Dynamically renders the appropriate question component based on question type
 * Uses the QuestionTypeRegistry for component discovery
 */

import React from 'react'
import { QuestionTypeRegistry, QuestionComponentProps } from '@/lib/registry/QuestionTypeRegistry'
import { GeneratedQuestion } from '@/lib/types/question-types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface QuestionFactoryProps extends Omit<QuestionComponentProps, 'question'> {
  question: GeneratedQuestion
}

/**
 * Main factory component that delegates to type-specific components
 */
export function QuestionFactory(props: QuestionFactoryProps) {
  const { question } = props

  try {
    // Check if question type is registered
    if (!QuestionTypeRegistry.isRegistered(question.type)) {
      return <UnsupportedQuestionType questionType={question.type} />
    }

    // Check if question type is enabled
    if (!QuestionTypeRegistry.isEnabled(question.type)) {
      return <DisabledQuestionType questionType={question.type} />
    }

    // Get the appropriate component from registry
    const QuestionComponent = QuestionTypeRegistry.getComponent(question.type)

    // Render the question component
    return <QuestionComponent {...props} />
  } catch (error) {
    console.error('QuestionFactory error:', error)
    return <QuestionFactoryError error={error as Error} question={question} />
  }
}

/**
 * Fallback component for unsupported question types
 */
function UnsupportedQuestionType({ questionType }: { questionType: string }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          <div>
            <h3 className="font-semibold text-orange-800">Unsupported Question Type</h3>
            <p className="text-sm text-orange-700">
              Question type <Badge variant="outline">{questionType}</Badge> is not registered in the system.
            </p>
            <p className="text-xs text-orange-600 mt-2">
              This question type may need to be implemented or enabled.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Fallback component for disabled question types
 */
function DisabledQuestionType({ questionType }: { questionType: string }) {
  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-gray-600" />
          <div>
            <h3 className="font-semibold text-gray-800">Disabled Question Type</h3>
            <p className="text-sm text-gray-700">
              Question type <Badge variant="outline">{questionType}</Badge> is currently disabled.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Contact your administrator to enable this question type.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Error boundary component for question factory errors
 */
function QuestionFactoryError({
  error,
  question
}: {
  error: Error
  question: GeneratedQuestion
}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">Question Rendering Error</h3>
            <p className="text-sm text-red-700">
              Failed to render question of type <Badge variant="destructive">{question.type}</Badge>
            </p>
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">Error Details</summary>
              <pre className="text-xs text-red-600 mt-1 p-2 bg-red-100 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Preview factory for question previews (used in generation/admin interfaces)
 */
export function QuestionPreviewFactory({ question }: { question: GeneratedQuestion }) {
  try {
    if (!QuestionTypeRegistry.isRegistered(question.type)) {
      return <UnsupportedQuestionType questionType={question.type} />
    }

    const PreviewComponent = QuestionTypeRegistry.getPreviewComponent(question.type)
    return <PreviewComponent question={question} />
  } catch (error) {
    console.error('QuestionPreviewFactory error:', error)
    return <QuestionFactoryError error={error as Error} question={question} />
  }
}

/**
 * Utility function to check if a question can be rendered
 */
export function canRenderQuestion(question: GeneratedQuestion): boolean {
  return (
    QuestionTypeRegistry.isRegistered(question.type) &&
    QuestionTypeRegistry.isEnabled(question.type)
  )
}

/**
 * Utility function to get available question types
 */
export function getAvailableQuestionTypes() {
  return QuestionTypeRegistry.getEnabledTypes().map(type => ({
    type,
    metadata: QuestionTypeRegistry.getConfig(type).metadata
  }))
}

/**
 * HOC for question components to provide common functionality
 */
export function withQuestionWrapper<T extends QuestionComponentProps>(
  Component: React.ComponentType<T>
) {
  return function WrappedQuestionComponent(props: T) {
    return (
      <div className="question-wrapper" data-question-type={props.question.type}>
        <Component {...props} />
      </div>
    )
  }
}