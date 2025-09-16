import { AIConfig, AIProviderInterface } from "../types";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { GoogleProvider } from "./google-provider";
import { CustomProvider } from "./custom-provider";

/**
 * Provider factory for creating AI provider instances
 */
export class AIProviderFactory {
  /**
   * Create a provider instance based on configuration
   */
  static createProvider(config: AIConfig): AIProviderInterface {
    switch (config.provider) {
      case "openai":
        return new OpenAIProvider(config);
      case "anthropic":
        return new AnthropicProvider(config);
      case "google":
        return new GoogleProvider(config);
      case "custom":
        return new CustomProvider(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}

// Export all providers
export { OpenAIProvider } from "./openai-provider";
export { AnthropicProvider } from "./anthropic-provider";
export { GoogleProvider } from "./google-provider";
export { CustomProvider } from "./custom-provider";