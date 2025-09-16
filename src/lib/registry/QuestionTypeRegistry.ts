/**
 * Question Type Registry System
 * Central registry for all question type implementations
 * Enables independent development and plugin-style architecture
 */

import {
  QuestionType,
  GeneratedQuestion,
  QuestionResponse,
  QuestionEvaluationResult,
  QuestionTypeMetadata
} from '@/lib/types/question-types'
import React from 'react'

/**
 * Props interface for question components
 */
export interface QuestionComponentProps<T extends GeneratedQuestion = GeneratedQuestion> {
  question: T
  questionIndex: number
  totalQuestions: number
  currentSetIndex: number
  totalSets: number
  responses: QuestionResponse[]
  onAnswerSelect: (questionIndex: number, answer: any) => void
  showResults?: boolean
  evaluationResult?: QuestionEvaluationResult
  enableWordSelection?: boolean
}

/**
 * Configuration for each question type
 */
export interface QuestionTypeConfig {
  // Core components (using any for now to avoid complex type constraints)
  component: React.ComponentType<any>
  previewComponent: React.ComponentType<any>

  // Validation and scoring
  responseValidator: (response: any) => boolean
  scoreCalculator: (question: any, response: any) => QuestionEvaluationResult

  // Metadata
  metadata: QuestionTypeMetadata

  // AI Integration
  promptTemplate?: any
  responseParser?: (aiResponse: string) => GeneratedQuestion[]

  // Feature flags
  isEnabled: boolean
  isProduction: boolean
}

/**
 * Central registry for question types
 */
export class QuestionTypeRegistry {
  private static types = new Map<QuestionType, QuestionTypeConfig>()
  private static initialized = false

  /**
   * Register a question type with its configuration
   */
  static register(type: QuestionType, config: QuestionTypeConfig): void {
    if (this.types.has(type)) {
      console.warn(`Question type '${type}' is already registered. Overwriting...`)
    }

    this.types.set(type, config)
    console.log(`✅ Registered question type: ${type}`)
  }

  /**
   * Get component for a question type
   */
  static getComponent(type: QuestionType): React.ComponentType<QuestionComponentProps> {
    const config = this.types.get(type)
    if (!config) {
      throw new Error(`Question type '${type}' is not registered`)
    }
    return config.component
  }

  /**
   * Get preview component for a question type
   */
  static getPreviewComponent(type: QuestionType): React.ComponentType<any> {
    const config = this.types.get(type)
    if (!config) {
      throw new Error(`Question type '${type}' is not registered`)
    }
    return config.previewComponent
  }

  /**
   * Get full configuration for a question type
   */
  static getConfig(type: QuestionType): QuestionTypeConfig {
    const config = this.types.get(type)
    if (!config) {
      throw new Error(`Question type '${type}' is not registered`)
    }
    return config
  }

  /**
   * Validate a response for a question type
   */
  static validateResponse(type: QuestionType, response: any): boolean {
    const config = this.types.get(type)
    if (!config) {
      return false
    }
    return config.responseValidator(response)
  }

  /**
   * Calculate score for a question response
   */
  static calculateScore(
    question: GeneratedQuestion,
    response: QuestionResponse
  ): QuestionEvaluationResult {
    const config = this.types.get(question.type)
    if (!config) {
      throw new Error(`Question type '${question.type}' is not registered`)
    }
    return config.scoreCalculator(question, response)
  }

  /**
   * Get all registered question types
   */
  static getAllTypes(): QuestionType[] {
    return Array.from(this.types.keys())
  }

  /**
   * Get enabled question types only
   */
  static getEnabledTypes(): QuestionType[] {
    return Array.from(this.types.entries())
      .filter(([_, config]) => config.isEnabled)
      .map(([type, _]) => type)
  }

  /**
   * Get production-ready question types only
   */
  static getProductionTypes(): QuestionType[] {
    return Array.from(this.types.entries())
      .filter(([_, config]) => config.isEnabled && config.isProduction)
      .map(([type, _]) => type)
  }

  /**
   * Get metadata for all registered types
   */
  static getAllMetadata(): Record<QuestionType, QuestionTypeMetadata> {
    const metadata: Record<string, QuestionTypeMetadata> = {}
    for (const [type, config] of this.types.entries()) {
      metadata[type] = config.metadata
    }
    return metadata as Record<QuestionType, QuestionTypeMetadata>
  }

  /**
   * Check if a question type is registered
   */
  static isRegistered(type: QuestionType): boolean {
    return this.types.has(type)
  }

  /**
   * Check if a question type is enabled
   */
  static isEnabled(type: QuestionType): boolean {
    const config = this.types.get(type)
    return config ? config.isEnabled : false
  }

  /**
   * Enable/disable a question type
   */
  static setEnabled(type: QuestionType, enabled: boolean): void {
    const config = this.types.get(type)
    if (config) {
      config.isEnabled = enabled
      console.log(`${enabled ? '✅ Enabled' : '❌ Disabled'} question type: ${type}`)
    }
  }

  /**
   * Mark a question type as production ready
   */
  static setProductionReady(type: QuestionType, isProduction: boolean): void {
    const config = this.types.get(type)
    if (config) {
      config.isProduction = isProduction
      console.log(`${isProduction ? '🚀 Production' : '🚧 Development'} mode for: ${type}`)
    }
  }

  /**
   * Initialize the registry with default configurations
   */
  static initialize(): void {
    if (this.initialized) {
      return
    }

    console.log('🔧 Initializing Question Type Registry...')

    // Initialize will be called by individual question type modules
    // This ensures clean separation and independent registration

    this.initialized = true
    console.log('✅ Question Type Registry initialized')
  }

  /**
   * Get registration status
   */
  static getStatus(): {
    initialized: boolean
    totalTypes: number
    enabledTypes: number
    productionTypes: number
    developmentTypes: number
  } {
    const allTypes = this.getAllTypes()
    const enabledTypes = this.getEnabledTypes()
    const productionTypes = this.getProductionTypes()

    return {
      initialized: this.initialized,
      totalTypes: allTypes.length,
      enabledTypes: enabledTypes.length,
      productionTypes: productionTypes.length,
      developmentTypes: enabledTypes.length - productionTypes.length
    }
  }

  /**
   * Debug information
   */
  static debug(): void {
    console.group('🔍 Question Type Registry Debug')
    console.log('Status:', this.getStatus())
    console.log('All Types:', this.getAllTypes())
    console.log('Enabled Types:', this.getEnabledTypes())
    console.log('Production Types:', this.getProductionTypes())

    console.group('📋 Type Details:')
    for (const [type, config] of this.types.entries()) {
      console.log(`${type}:`, {
        enabled: config.isEnabled,
        production: config.isProduction,
        complexity: config.metadata.complexity,
        features: config.metadata.features
      })
    }
    console.groupEnd()
    console.groupEnd()
  }
}

/**
 * Decorator for easy question type registration
 * Note: TypeScript decorators are experimental, using manual registration for now
 */
export function registerQuestionType(type: QuestionType, config: QuestionTypeConfig) {
  QuestionTypeRegistry.register(type, config)
}

// Initialize the registry
QuestionTypeRegistry.initialize()