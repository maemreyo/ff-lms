// Re-export modular AI service components for backward compatibility
export {
  AIService,
  createAIService,
  type ChatMessage,
  type AIResponse,
  type AIProvider,
  type AICapability,
  type AIConfig,
  type SavedLoop,
  type DifficultyPreset,
  type GeneratedQuestion,
  type GeneratedQuestions,
  type CustomPrompt,
  type QuestionGenerationOptions,
  aiConfigSchema,
} from "./ai";

