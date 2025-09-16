/**
 * Question Type Registry Entry Point
 * Imports and registers all available question types
 */

// Import the registry
import { QuestionTypeRegistry } from './QuestionTypeRegistry'
export { QuestionTypeRegistry }
export type { QuestionComponentProps, QuestionTypeConfig } from './QuestionTypeRegistry'

// Import all question type definitions to trigger registration
import './question-types/multiple-choice'
import './question-types/completion'

// Additional question types will be imported here as they are implemented:
// import './question-types/matching'
// import './question-types/short-answer'
// import './question-types/diagram-labelling'

/**
 * Initialize all question types
 * This function ensures all question types are registered before use
 */
export function initializeQuestionTypes() {
  // The imports above will automatically register the question types
  // This function can be called to ensure everything is loaded

  console.log('🚀 Question Types initialized:', {
    registered: QuestionTypeRegistry.getAllTypes(),
    enabled: QuestionTypeRegistry.getEnabledTypes(),
    production: QuestionTypeRegistry.getProductionTypes()
  })
}

/**
 * Get status of question type system
 */
export function getQuestionTypeStatus() {
  return QuestionTypeRegistry.getStatus()
}

/**
 * Debug question type registry
 */
export function debugQuestionTypes() {
  QuestionTypeRegistry.debug()
}

// Auto-initialize when module is imported
initializeQuestionTypes()