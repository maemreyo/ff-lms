import {
  AIConfig,
  AIResponse,
  ChatMessage,
  AICapability,
  SavedLoop,
  DifficultyPreset,
  GeneratedQuestions,
  QuestionGenerationOptions,
  AIProviderInterface,
} from "./types";
import { AIConfigManager } from "./config";
import { AIProviderFactory } from "./providers";
import { QuestionGenerator } from "./question-generator";
import { AIDatabaseService } from "./database-service";

/**
 * Main AI Service - Server-side AI operations with modular architecture
 */
export class AIService {
  private provider: AIProviderInterface;
  private questionGenerator: QuestionGenerator;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = AIConfigManager.validateConfig(config);
    this.provider = AIProviderFactory.createProvider(this.config);
    this.questionGenerator = new QuestionGenerator(this.provider);
  }

  // Main chat completion method
  async chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIResponse> {
    return this.provider.chat(messages, options);
  }

  // Question generation methods
  async generateConversationQuestions(
    loop: SavedLoop,
    transcript: string,
    preset?: DifficultyPreset,
    options?: QuestionGenerationOptions
  ): Promise<GeneratedQuestions> {
    return this.questionGenerator.generateConversationQuestions(
      loop,
      transcript,
      preset,
      options
    );
  }

  async generateSingleDifficultyQuestions(
    loop: SavedLoop,
    transcript: string,
    difficulty: "easy" | "medium" | "hard",
    options?: QuestionGenerationOptions
  ): Promise<GeneratedQuestions> {
    return this.questionGenerator.generateSingleDifficultyQuestions(
      loop,
      transcript,
      difficulty,
      options
    );
  }

  async generateQuestionsWithCustomPrompt(
    loop: SavedLoop,
    transcript: string,
    difficulty: "easy" | "medium" | "hard",
    customPromptId?: string,
    questionCount?: number,
    segments?: Array<{ text: string; start: number; duration: number }>,
    supabaseClient?: any
  ): Promise<GeneratedQuestions> {
    return this.questionGenerator.generateQuestionsWithCustomPrompt(
      loop,
      transcript,
      difficulty,
      customPromptId,
      questionCount,
      segments,
      supabaseClient
    );
  }

  async generateQuestionsSequentiallyWithDeduplication(
    loop: SavedLoop,
    transcript: string,
    preset: DifficultyPreset,
    customPromptId?: string,
    segments?: Array<{ text: string; start: number; duration: number }>,
    supabaseClient?: any
  ): Promise<{
    easy: GeneratedQuestions | null;
    medium: GeneratedQuestions | null;
    hard: GeneratedQuestions | null;
    allQuestions: any[];
  }> {
    return this.questionGenerator.generateQuestionsSequentiallyWithDeduplication(
      loop,
      transcript,
      preset,
      customPromptId,
      segments,
      supabaseClient
    );
  }

  // Capability and configuration methods
  async getCapabilities(): Promise<AICapability[]> {
    return this.provider.getCapabilities();
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = AIConfigManager.mergeConfigs(this.config, newConfig);
    this.provider = AIProviderFactory.createProvider(this.config);
    this.questionGenerator = new QuestionGenerator(this.provider);
  }

  // Get current configuration (without sensitive data)
  getConfig(): Omit<AIConfig, "apiKey"> {
    return AIConfigManager.getSafeConfig(this.config);
  }

  // Static methods for database operations
  static async fetchCustomPrompt(
    customPromptId: string,
    supabaseClient?: any
  ) {
    return AIDatabaseService.fetchCustomPrompt(customPromptId, supabaseClient);
  }
}

/**
 * Factory function to create AI Service with environment configuration
 */
export function createAIService(overrides?: Partial<AIConfig>): AIService {
  const config = AIConfigManager.createFromEnv(overrides);
  return new AIService(config);
}

// Export all types and utilities
export * from "./types";
export * from "./config";
export * from "./providers";
export * from "./question-generator";
export * from "./database-service";
export * from "./utils";
export * from "./error-handler";