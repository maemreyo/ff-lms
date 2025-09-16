'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, PenTool } from 'lucide-react'

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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Question Type</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questionTypes.map((type) => {
          const isSelected = selectedType === type.id
          const Icon = type.icon

          return (
            <Card
              key={type.id}
              className={`
                cursor-pointer transition-all duration-200 hover:shadow-md
                ${isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => !disabled && onTypeChange(type.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-lg
                      ${isSelected
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{type.name}</h4>
                      {type.badge && (
                        <Badge
                          variant="outline"
                          className={`
                            text-xs mt-1
                            ${isSelected
                              ? 'border-blue-300 text-blue-700'
                              : 'border-gray-300 text-gray-600'
                            }
                          `}
                        >
                          {type.badge}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">{type.description}</p>

                <div className="space-y-2">
                  {type.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}