import OpenAI from "openai";
import { AIProviderInterface, ChatMessage, AIResponse, AICapability, AIConfig } from "../types";
import { AIErrorHandler } from "../error-handler";

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements AIProviderInterface {
  private client: OpenAI;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
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

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages.map((msg) => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content,
        })),
        max_tokens: mergedOptions.maxTokens,
        temperature: mergedOptions.temperature,
        stream: mergedOptions.stream,
      });

      if (mergedOptions.stream) {
        // Handle streaming response
        return {
          content: "", // Will be populated via streaming
          usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
          model: this.config.model,
          provider: "openai",
          finishReason: "length",
          stream: response as any,
        };
      }

      const completion = response as OpenAI.Chat.Completions.ChatCompletion;
      return {
        content: completion.choices[0]?.message?.content || "",
        usage: {
          totalTokens: completion.usage?.total_tokens || 0,
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
        },
        model: completion.model,
        provider: "openai",
        finishReason: completion.choices[0]?.finish_reason || "stop",
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
      "code-generation",
      "function-calling",
    ];
  }
}