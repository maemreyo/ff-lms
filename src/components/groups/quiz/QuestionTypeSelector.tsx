'use client'

import React from 'react'
import { CheckCircle, PenTool } from 'lucide-react'

export type QuestionType = 'multiple-choice' | 'completion'

interface QuestionTypeOption {
  id: QuestionType
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  badge?: string
}

interface QuestionTypeSelectorProps {
  selectedType: QuestionType
  onTypeChange: (type: QuestionType) => void
  disabled?: boolean
}

const questionTypes: QuestionTypeOption[] = [
  {
    id: 'multiple-choice',
    name: 'Multiple Choice',
    description: 'Traditional Q&A with 4 answer options',
    icon: CheckCircle,
    features: [
      'Easy to grade automatically',
      'Clear right/wrong answers',
      'Good for comprehension testing',
      'Supports different difficulty levels'
    ],
    badge: 'Classic'
  },
  {
    id: 'completion',
    name: 'Fill-in-the-Blank',
    description: 'Complete missing words and phrases',
    icon: PenTool,
    features: [
      'Active vocabulary practice',
      'Context-based learning',
      'Listening & transcription skills',
      'Multiple correct answers possible'
    ],
    badge: 'Interactive'
  }
]

export function QuestionTypeSelector({
  selectedType,
  onTypeChange,
  disabled = false
}: QuestionTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Question Type</h3>

      <div className="flex gap-3">
        {questionTypes.map((type) => {
          const isSelected = selectedType === type.id
          const Icon = type.icon

          return (
            <button
              key={type.id}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200
                ${isSelected
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => !disabled && onTypeChange(type.id)}
              disabled={disabled}
            >
              <div className={`
                p-1.5 rounded
                ${isSelected
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">{type.name}</span>
                <span className="text-xs text-gray-500">{type.description}</span>
              </div>

              {isSelected && (
                <div className="ml-auto">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}