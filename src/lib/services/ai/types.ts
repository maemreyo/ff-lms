import { z } from "zod";

// Core Types
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
  model: string;
  provider: "openai" | "anthropic" | "google" | "custom";
  finishReason: string;
  stream?: any;
}

export type AIProvider = "openai" | "anthropic" | "google" | "custom";
export type AICapability =
  | "text-generation"
  | "text-analysis"
  | "summarization"
  | "translation"
  | "code-generation"
  | "function-calling"
  | "long-context"
  | "reasoning"
  | "multimodal"
  | "fast-generation";

// Configuration Schema
export const aiConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "custom"]),
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  maxTokens: z.number().min(1).max(100000).default(4000),
  temperature: z.number().min(0).max(2).default(0.7),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;

// Loop and generation types
export interface SavedLoop {
  id: string;
  videoTitle?: string;
  startTime: number;
  endTime: number;
}

export interface DifficultyPreset {
  easy: number;
  medium: number;
  hard: number;
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  type:
    | "main_idea"
    | "specific_detail"
    | "vocabulary_in_context"
    | "inference"
    | "speaker_tone"
    | "language_function";
  timestamp?: number;
}

export interface GeneratedQuestions {
  questions: GeneratedQuestion[];
  preset: DifficultyPreset;
  actualDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  sequentialResults?: {
    easy: GeneratedQuestions | null;
    medium: GeneratedQuestions | null;
    hard: GeneratedQuestions | null;
    allQuestions: GeneratedQuestion[];
  };
}

export interface CustomPrompt {
  system_prompt: string;
  user_template: string;
  config?: {
    maxTokens?: number;
    temperature?: number;
  };
}

export interface QuestionGenerationOptions {
  segments?: Array<{ text: string; start: number; duration: number }>;
  customPrompt?: CustomPrompt;
  questionCount?: number;
  previousQuestions?: GeneratedQuestion[];
}

// Provider base interface
export interface AIProviderInterface {
  chat(
    messages: ChatMessage[],
    options?: {
      stream?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIResponse>;

  getCapabilities(): AICapability[];
}