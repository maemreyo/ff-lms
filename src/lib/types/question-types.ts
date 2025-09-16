/**
 * Base types and interfaces for all question types
 * Each question type extends these base interfaces
 */

export type QuestionType =
  | 'multiple-choice'
  | 'matching'
  | 'completion'
  | 'short-answer'
  | 'diagram-labelling'

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

/**
 * Base interface that all question types must extend
 */
export interface BaseGeneratedQuestion {
  id: string
  type: QuestionType
  question: string
  difficulty: QuestionDifficulty
  explanation: string
  context?: {
    startTime: number
    endTime: number
    text: string
  }
}

/**
 * Multiple Choice Question (existing implementation)
 */
export interface MultipleChoiceQuestion extends BaseGeneratedQuestion {
  type: 'multiple-choice'
  content: {
    options: string[]
    correctAnswer: 'A' | 'B' | 'C' | 'D'
  }
}

/**
 * Matching Question - Connect items between two columns
 */
export interface MatchingQuestion extends BaseGeneratedQuestion {
  type: 'matching'
  content: {
    leftItems: Array<{
      id: string
      text: string
    }>
    rightItems: Array<{
      id: string
      text: string
    }>
    correctPairs: Array<{
      left: string
      right: string
    }>
    maxPairs?: number
    shuffleItems?: boolean
  }
}

/**
 * Completion Question - Fill in blanks in text
 */
export interface CompletionQuestion extends BaseGeneratedQuestion {
  type: 'completion'
  content: {
    template: string // "The weather was ___ and temperature reached ___ degrees"
    blanks: Array<{
      id: string
      position: number
      acceptedAnswers: string[]
      caseSensitive: boolean
      hint?: string
    }>
  }
}

/**
 * Short Answer Question - Free text response
 */
export interface ShortAnswerQuestion extends BaseGeneratedQuestion {
  type: 'short-answer'
  content: {
    sampleAnswers: string[]
    maxLength: number
    evaluationCriteria: string[]
    keywords?: string[]
  }
}

/**
 * Diagram Labelling Question - Label points on images
 */
export interface DiagramLabellingQuestion extends BaseGeneratedQuestion {
  type: 'diagram-labelling'
  content: {
    diagramUrl: string
    diagramType: 'map' | 'chart' | 'flowchart' | 'diagram'
    labelPoints: Array<{
      id: string
      x: number // Percentage from left
      y: number // Percentage from top
      correctLabel: string
      alternatives?: string[]
      hint?: string
    }>
  }
}

/**
 * Union type for all question types
 */
export type GeneratedQuestion =
  | MultipleChoiceQuestion
  | MatchingQuestion
  | CompletionQuestion
  | ShortAnswerQuestion
  | DiagramLabellingQuestion

/**
 * Response types for each question type
 */
export interface BaseQuestionResponse {
  questionIndex: number
  questionType: QuestionType
  timestamp: Date
}

export interface MultipleChoiceResponse extends BaseQuestionResponse {
  questionType: 'multiple-choice'
  response: {
    selectedOption: 'A' | 'B' | 'C' | 'D'
  }
}

export interface MatchingResponse extends BaseQuestionResponse {
  questionType: 'matching'
  response: {
    pairs: Array<{
      left: string
      right: string
    }>
  }
}

export interface CompletionResponse extends BaseQuestionResponse {
  questionType: 'completion'
  response: {
    answers: Array<{
      blankId: string
      value: string
    }>
  }
}

export interface ShortAnswerResponse extends BaseQuestionResponse {
  questionType: 'short-answer'
  response: {
    text: string
  }
}

export interface DiagramLabellingResponse extends BaseQuestionResponse {
  questionType: 'diagram-labelling'
  response: {
    labels: Array<{
      pointId: string
      label: string
    }>
  }
}

/**
 * Union type for all response types
 */
export type QuestionResponse =
  | MultipleChoiceResponse
  | MatchingResponse
  | CompletionResponse
  | ShortAnswerResponse
  | DiagramLabellingResponse

/**
 * Evaluation result for any question type
 */
export interface QuestionEvaluationResult {
  questionIndex: number
  questionType: QuestionType
  isCorrect: boolean
  score: number // 0-1
  maxScore: number
  feedback?: string
  correctAnswer?: any
  partialCredit?: {
    earned: number
    possible: number
    details: string[]
  }
}

/**
 * Question type metadata for registry
 */
export interface QuestionTypeMetadata {
  type: QuestionType
  displayName: string
  description: string
  complexity: 'low' | 'medium' | 'high'
  icon: string
  estimatedImplementationTime: string
  dependencies: string[]
  features: string[]
}