import { AIConfig, aiConfigSchema, AIProvider } from "./types";

/**
 * Configuration and validation utilities for AI service
 */
export class AIConfigManager {
  /**
   * Validate and parse AI configuration
   */
  static validateConfig(config: AIConfig): AIConfig {
    return aiConfigSchema.parse(config);
  }

  /**
   * Create default configuration from environment variables
   */
  static createFromEnv(overrides?: Partial<AIConfig>): AIConfig {
    const config: AIConfig = {
      provider: (process.env.AI_PROVIDER as AIProvider) || "openai",
      apiKey: process.env.AI_API_KEY || "",
      baseUrl: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL || "gpt-4o-mini",
      maxTokens: Number(process.env.AI_MAX_TOKENS) || 4000,
      temperature: Number(process.env.AI_TEMPERATURE) || 0.3,
      ...overrides,
    };

    return this.validateConfig(config);
  }

  /**
   * Merge configurations safely
   */
  static mergeConfigs(base: AIConfig, overrides: Partial<AIConfig>): AIConfig {
    return this.validateConfig({ ...base, ...overrides });
  }

  /**
   * Get safe configuration (without sensitive data)
   */
  static getSafeConfig(config: AIConfig): Omit<AIConfig, "apiKey"> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey, ...safeConfig } = config;
    return safeConfig;
  }
}