'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Clock, Loader, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog'

interface GenerationStep {
  id: 'easy' | 'medium' | 'hard'
  label: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  count?: number
  icon: React.ReactNode
  color: string
  bgColor: string
}

interface GenerationProgressModalProps {
  isOpen: boolean
  generatingState: {
    easy: boolean
    medium: boolean
    hard: boolean
    all: boolean
  }
  generatedCounts: {
    easy: number
    medium: number
    hard: number
  }
  presetName?: string
  onClose?: () => void
}

export function GenerationProgressModal({
  isOpen,
  generatingState,
  generatedCounts,
  presetName,
  onClose
}: GenerationProgressModalProps) {
  const [steps, setSteps] = useState<GenerationStep[]>([
    {
      id: 'easy',
      label: 'Easy Questions',
      status: 'pending',
      icon: <Sparkles className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'medium',
      label: 'Medium Questions',
      status: 'pending',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'hard',
      label: 'Hard Questions',
      status: 'pending',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ])

  // Track if we've ever started generating to avoid false completion
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false)

  // Update step statuses based on generating state and counts
  useEffect(() => {
    const isGeneratingAny = Object.values(generatingState).some(Boolean)

    // Set flag when we first start generating
    if (isGeneratingAny && !hasStartedGenerating) {
      setHasStartedGenerating(true)
    }

    setSteps(prevSteps =>
      prevSteps.map(step => {
        const isIndividualGenerating = generatingState[step.id]
        const isAllGenerating = generatingState.all
        const count = generatedCounts[step.id]

        let status: GenerationStep['status'] = 'pending'

        // If we have completed questions for this difficulty
        if (count > 0) {
          status = 'completed'
        }
        // If we're generating all questions, show all as generating
        else if (isAllGenerating) {
          status = 'generating'
        }
        // If we're generating this specific difficulty
        else if (isIndividualGenerating) {
          status = 'generating'
        }

        return {
          ...step,
          status,
          count
        }
      })
    )
  }, [generatingState, generatedCounts, hasStartedGenerating])

  const getStepIcon = (step: GenerationStep) => {
    switch (step.status) {
      case 'generating':
        return <Loader className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <div className="h-4 w-4 rounded-full bg-red-500" />
      default:
        return step.icon
    }
  }

  const getStepStatusText = (step: GenerationStep) => {
    switch (step.status) {
      case 'generating':
        return 'Generating...'
      case 'completed':
        return `${step.count} questions generated`
      case 'failed':
        return 'Failed'
      default:
        return 'Waiting...'
    }
  }

  const totalGenerated = Object.values(generatedCounts).reduce((sum, count) => sum + count, 0)
  const isGeneratingAny = Object.values(generatingState).some(Boolean)

  // Only show as completed if we've generated something AND started generating before
  const allCompleted = hasStartedGenerating &&
                      totalGenerated > 0 &&
                      !isGeneratingAny &&
                      steps.every(step => step.status === 'completed')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGeneratingAny ? (
              <>
                <Loader className="h-5 w-5 animate-spin text-indigo-600" />
                Generating Questions
              </>
            ) : allCompleted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Generation Complete! ✨
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-indigo-600" />
                Question Generation
              </>
            )}
          </DialogTitle>
          {presetName && (
            <p className="text-sm text-gray-600">Using preset: {presetName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Overview */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Generated</span>
              <span className="text-lg font-bold text-indigo-600">{totalGenerated}</span>
            </div>
            {isGeneratingAny && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-sm text-indigo-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Processing all difficulties...</span>
                </div>
              </div>
            )}
          </div>

          {/* Generation Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  step.status === 'generating'
                    ? `border-indigo-200 ${step.bgColor} ring-2 ring-indigo-100`
                    : step.status === 'completed'
                      ? `border-green-200 bg-green-50`
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  step.status === 'generating'
                    ? 'text-indigo-600'
                    : step.status === 'completed'
                      ? 'text-green-600'
                      : step.color
                }`}>
                  {getStepIcon(step)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{step.label}</span>
                    <span className={`text-sm ${
                      step.status === 'generating'
                        ? 'text-indigo-600 font-medium'
                        : step.status === 'completed'
                          ? 'text-green-600 font-medium'
                          : 'text-gray-500'
                    }`}>
                      {getStepStatusText(step)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Completion Message */}
          {allCompleted && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Questions generated successfully!</span>
              </div>
              <p className="mt-1 text-sm text-green-600">
                You can now start the quiz or preview the questions.
              </p>
              <p className="mt-2 text-xs text-green-500">
                Click outside or press Escape to close this dialog.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}