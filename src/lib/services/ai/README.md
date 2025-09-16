# AI Service - Modular Architecture

This directory contains the modularized AI service with clean separation of concerns for future scalability.

## Architecture Overview

```
ai/
├── index.ts                 # Main AI service and exports
├── types.ts                # Core types and interfaces
├── config.ts               # Configuration management
├── error-handler.ts        # Error handling utilities
├── utils.ts                # Utility functions
├── database-service.ts     # Database operations
├── question-generator.ts   # Question generation logic
└── providers/             # AI provider implementations
    ├── index.ts           # Provider factory
    ├── openai-provider.ts # OpenAI implementation
    ├── anthropic-provider.ts # Anthropic implementation
    ├── google-provider.ts # Google Gemini implementation
    └── custom-provider.ts # Custom provider template
```

## Modules

### Core Service (`index.ts`)
Main AI service that orchestrates all modules:
- Unified interface for all AI operations
- Configuration management
- Provider abstraction
- Question generation coordination

### Types (`types.ts`)
All TypeScript interfaces and types:
- `ChatMessage`, `AIResponse`, `AIConfig`
- Question generation types
- Provider interfaces
- Configuration schemas

### Configuration (`config.ts`)
Configuration management and validation:
- Environment variable loading
- Configuration validation with Zod
- Safe configuration access (without sensitive data)
- Configuration merging utilities

### Error Handler (`error-handler.ts`)
Centralized error handling:
- AI-specific error transformation
- Retry logic utilities
- User-friendly error messages
- Error classification (retryable vs non-retryable)

### Utilities (`utils.ts`)
Reusable utility functions:
- Option shuffling with seeded randomization
- Time formatting
- Question validation
- Duplicate detection
- Transcript processing

### Database Service (`database-service.ts`)
Database operations for AI features:
- Custom prompt fetching
- Supabase integration
- Error handling for database operations

### Question Generator (`question-generator.ts`)
Advanced question generation with:
- Multiple generation strategies
- Retry mechanisms with progressive prompting
- Deduplication across difficulty levels
- Custom prompt support
- Batch generation coordination

### Providers (`providers/`)
Modular AI provider implementations:
- **OpenAI Provider**: GPT models integration
- **Anthropic Provider**: Claude models integration
- **Google Provider**: Gemini models integration
- **Custom Provider**: Template for custom HTTP APIs
- **Provider Factory**: Dynamic provider instantiation

## Usage Examples

### Basic Chat
```typescript
import { createAIService } from "@/lib/services/ai";

const aiService = createAIService();

const response = await aiService.chat([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello!" }
]);
```

### Question Generation
```typescript
const questions = await aiService.generateSingleDifficultyQuestions(
  loop,
  transcript,
  "medium",
  {
    questionCount: 6,
    segments: transcriptSegments,
    customPrompt: customPromptData
  }
);
```

### Sequential Generation with Deduplication
```typescript
const result = await aiService.generateQuestionsSequentiallyWithDeduplication(
  loop,
  transcript,
  { easy: 2, medium: 3, hard: 1 },
  customPromptId,
  segments,
  supabaseClient
);
```

### Provider Switching
```typescript
// Change provider dynamically
aiService.updateConfig({
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022"
});
```

## Configuration

### Environment Variables
```env
AI_PROVIDER=openai              # openai | anthropic | google | custom
AI_API_KEY=your-api-key
AI_BASE_URL=optional-base-url   # For custom providers
AI_MODEL=gpt-4o-mini           # Model name
AI_MAX_TOKENS=4000             # Token limit
AI_TEMPERATURE=0.3             # Randomness (0-2)
```

### Custom Configuration
```typescript
const aiService = createAIService({
  provider: "anthropic",
  apiKey: "custom-key",
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 8000,
  temperature: 0.7
});
```

## Backward Compatibility

The original `ai-service.ts` now re-exports all components from the modular structure, ensuring existing code continues to work without changes:

```typescript
// This still works
import { AIService, createAIService } from "@/lib/services/ai-service";
```

## Benefits of Modular Architecture

1. **Separation of Concerns**: Each module has a single responsibility
2. **Testability**: Individual modules can be tested in isolation
3. **Maintainability**: Changes to one provider don't affect others
4. **Extensibility**: Easy to add new providers or features
5. **Reusability**: Utilities and types can be shared across modules
6. **Type Safety**: Strong TypeScript typing throughout
7. **Error Handling**: Centralized and consistent error management
8. **Configuration**: Flexible and validated configuration system

## Adding New Providers

To add a new AI provider:

1. Create `providers/new-provider.ts` implementing `AIProviderInterface`
2. Add provider to the factory in `providers/index.ts`
3. Update `AIProvider` type in `types.ts`
4. Add provider-specific capabilities in the implementation

Example:
```typescript
// providers/new-provider.ts
export class NewProvider implements AIProviderInterface {
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    // Implementation
  }

  getCapabilities(): AICapability[] {
    return ["text-generation", "custom-feature"];
  }
}
```

## Testing

Each module can be tested independently:
- Mock providers for testing question generation
- Mock database service for testing custom prompts
- Test configuration validation separately
- Test error handling with various scenarios

This modular architecture ensures the AI service can scale efficiently as the application grows while maintaining clean, maintainable code.