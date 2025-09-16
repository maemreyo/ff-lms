/**
 * Debug component for testing the Question Type Registry system
 * Shows registration status and allows testing of different question types
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuestionTypeRegistry } from '@/lib/registry/QuestionTypeRegistry'
import { QuestionFactory, QuestionPreviewFactory } from '@/components/questions/QuestionFactory'
import {
  MultipleChoiceQuestion,
  CompletionQuestion,
  QuestionType,
  QuestionResponse
} from '@/lib/types/question-types'
import { generateSampleCompletionQuestion } from '@/lib/registry/question-types/completion'

/**
 * Registry status display
 */
function RegistryStatus() {
  const status = QuestionTypeRegistry.getStatus()
  const enabledTypes = QuestionTypeRegistry.getEnabledTypes()
  const allMetadata = QuestionTypeRegistry.getAllMetadata()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Question Type Registry Status
          <Badge variant={status.initialized ? "default" : "destructive"}>
            {status.initialized ? "Initialized" : "Not Initialized"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{status.totalTypes}</div>
            <div className="text-sm text-gray-600">Total Types</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{status.enabledTypes}</div>
            <div className="text-sm text-gray-600">Enabled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{status.productionTypes}</div>
            <div className="text-sm text-gray-600">Production</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{status.developmentTypes}</div>
            <div className="text-sm text-gray-600">Development</div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Registered Question Types:</h4>
          {enabledTypes.map(type => {
            const metadata = allMetadata[type]
            const config = QuestionTypeRegistry.getConfig(type)

            return (
              <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={config.isProduction ? "default" : "secondary"}>
                    {type}
                  </Badge>
                  <span className="font-medium">{metadata.displayName}</span>
                  <Badge variant="outline" className="text-xs">
                    {metadata.complexity}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Badge variant={config.isEnabled ? "default" : "destructive"}>
                    {config.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant={config.isProduction ? "default" : "secondary"}>
                    {config.isProduction ? "Production" : "Development"}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <Button
            onClick={() => QuestionTypeRegistry.debug()}
            variant="outline"
            size="sm"
          >
            🔍 Debug to Console
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Sample question for testing
 */
const sampleMultipleChoiceQuestion: MultipleChoiceQuestion = {
  id: 'test-mc-1',
  type: 'multiple-choice',
  question: 'What is the capital of France?',
  difficulty: 'easy',
  explanation: 'Paris is the capital and largest city of France, located on the River Seine.',
  context: {
    startTime: 10,
    endTime: 15,
    text: 'In this segment, we discuss European capitals...'
  },
  content: {
    options: [
      'London',
      'Paris',
      'Berlin',
      'Madrid'
    ],
    correctAnswer: 'B'
  }
}

/**
 * Interactive question tester
 */
function QuestionTester() {
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('multiple-choice')

  // Sample questions
  const sampleQuestions: Record<string, any> = {
    'multiple-choice': sampleMultipleChoiceQuestion,
    'completion': generateSampleCompletionQuestion()
  }

  const currentQuestion = sampleQuestions[selectedQuestionType] || sampleMultipleChoiceQuestion

  const handleAnswerSelect = (questionIndex: number, response: QuestionResponse) => {
    setResponses(prev => {
      const newResponses = prev.filter(r => r.questionIndex !== questionIndex)
      return [...newResponses, response]
    })
  }

  const handleShowResults = () => {
    setShowResults(true)

    // Calculate evaluation result
    const response = responses.find(r => r.questionIndex === 0)
    if (response) {
      const evaluation = QuestionTypeRegistry.calculateScore(currentQuestion, response)
      console.log('Evaluation Result:', evaluation)
    }
  }

  const handleReset = () => {
    setResponses([])
    setShowResults(false)
  }

  const handleQuestionTypeChange = (type: QuestionType) => {
    setSelectedQuestionType(type)
    setResponses([])
    setShowResults(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🧪 Question Tester
          <div className="flex gap-2">
            <Button onClick={handleShowResults} variant="default" size="sm">
              Show Results
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Question Type Selector */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Select Question Type:</h4>
          <div className="flex gap-2">
            {QuestionTypeRegistry.getEnabledTypes().map(type => (
              <Button
                key={type}
                onClick={() => handleQuestionTypeChange(type)}
                variant={selectedQuestionType === type ? "default" : "outline"}
                size="sm"
              >
                {QuestionTypeRegistry.getConfig(type).metadata.displayName}
              </Button>
            ))}
          </div>
        </div>

        <QuestionFactory
          question={currentQuestion}
          questionIndex={0}
          totalQuestions={1}
          currentSetIndex={0}
          totalSets={1}
          responses={responses}
          onAnswerSelect={handleAnswerSelect}
          showResults={showResults}
          evaluationResult={showResults && responses.length > 0 ?
            QuestionTypeRegistry.calculateScore(currentQuestion, responses[0]) :
            undefined
          }
          enableWordSelection={true}
        />
      </CardContent>
    </Card>
  )
}

/**
 * Question preview tester
 */
function PreviewTester() {
  const [selectedType, setSelectedType] = useState<QuestionType>('multiple-choice')

  const sampleQuestions: Record<string, any> = {
    'multiple-choice': sampleMultipleChoiceQuestion,
    'completion': generateSampleCompletionQuestion()
  }

  const currentQuestion = sampleQuestions[selectedType] || sampleMultipleChoiceQuestion

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          🔍 Question Preview
          <div className="flex gap-2">
            {QuestionTypeRegistry.getEnabledTypes().map(type => (
              <Button
                key={type}
                onClick={() => setSelectedType(type)}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
              >
                {QuestionTypeRegistry.getConfig(type).metadata.displayName}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QuestionPreviewFactory question={currentQuestion} />
      </CardContent>
    </Card>
  )
}

/**
 * Main debug component
 */
export function QuestionTypeDebug() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Question Type Registry Debug</h1>
        <Badge variant="outline">Development Tool</Badge>
      </div>

      <RegistryStatus />
      <QuestionTester />
      <PreviewTester />
    </div>
  )
}

export default QuestionTypeDebug