import { AIProviderInterface, ChatMessage, AIResponse, AICapability, AIConfig } from "../types";
import { AIErrorHandler } from "../error-handler";

/**
 * Custom HTTP provider implementation for future extensibility
 */
export class CustomProvider implements AIProviderInterface {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIResponse> {
    try {
      const mergedOptions = { ...this.config, ...options };

      // Simple HTTP client implementation for custom providers
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: mergedOptions.maxTokens,
          temperature: mergedOptions.temperature,
          stream: mergedOptions.stream,
        }),
      });

      if (!response.ok) {
        throw new Error(`Custom provider error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || "",
        usage: {
          totalTokens: data.usage?.total_tokens || 0,
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
        },
        model: data.model,
        provider: "custom",
        finishReason: data.choices[0]?.finish_reason || "stop",
      };
    } catch (error) {
      throw AIErrorHandler.handleAIError(error);
    }
  }

  getCapabilities(): AICapability[] {
    return [
      "text-generation",
      "text-analysis",
      "summarization",
      "translation",
    ];
  }
}