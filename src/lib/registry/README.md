# Question Type Registry System

This is the plugin-based architecture for question types in the application. Each question type can be developed, tested, and deployed independently.

## Quick Start

### Using Existing Question Types

```typescript
// Import the registry (auto-registers all question types)
import '@/lib/registry'
import { QuestionFactory } from '@/components/questions/QuestionFactory'

// Use the factory to render any question type
<QuestionFactory
  question={question} // Any GeneratedQuestion type
  questionIndex={0}
  totalQuestions={1}
  // ... other props
/>
```

### Checking Available Types

```typescript
import { QuestionTypeRegistry } from '@/lib/registry/QuestionTypeRegistry'

// Get all enabled question types
const availableTypes = QuestionTypeRegistry.getEnabledTypes()
console.log('Available types:', availableTypes) // ['multiple-choice']

// Get registry status
const status = QuestionTypeRegistry.getStatus()
console.log('Registry status:', status)
```

### Debug the Registry

```typescript
import { QuestionTypeRegistry } from '@/lib/registry/QuestionTypeRegistry'

// Debug to console
QuestionTypeRegistry.debug()

// Or use the debug component
import QuestionTypeDebug from '@/components/debug/QuestionTypeDebug'
```

## Architecture Overview

### Core Components

1. **QuestionTypeRegistry** - Central registry for all question types
2. **QuestionFactory** - Component factory that renders the appropriate component
3. **Question Type Interfaces** - TypeScript definitions for each type
4. **Migration Utilities** - Backward compatibility with legacy format

### File Structure

```
src/lib/
├── types/
│   └── question-types.ts          # All question type interfaces
├── registry/
│   ├── QuestionTypeRegistry.ts    # Registry implementation
│   ├── question-types/            # Registration modules
│   │   ├── multiple-choice.ts     # Multiple choice registration
│   │   ├── matching.ts            # Matching registration (future)
│   │   └── ...
│   ├── index.ts                   # Main entry point
│   └── README.md                  # This file
├── utils/
│   └── question-migration.ts      # Legacy compatibility
src/components/questions/
├── QuestionFactory.tsx            # Main factory component
├── types/                         # Type-specific components
│   ├── MultipleChoiceQuestion.tsx # Multiple choice component
│   ├── MatchingQuestion.tsx       # Matching component (future)
│   └── ...
└── QuestionCard.tsx               # Legacy wrapper (backward compatibility)
```

## Adding New Question Types

### Step 1: Define the Question Type

Add your question type to `src/lib/types/question-types.ts`:

```typescript
export interface MatchingQuestion extends BaseGeneratedQuestion {
  type: 'matching'
  content: {
    leftItems: Array<{id: string, text: string}>
    rightItems: Array<{id: string, text: string}>
    correctPairs: Array<{left: string, right: string}>
  }
}

export interface MatchingResponse extends BaseQuestionResponse {
  questionType: 'matching'
  response: {
    pairs: Array<{left: string, right: string}>
  }
}
```

### Step 2: Create the Component

Create `src/components/questions/types/MatchingQuestion.tsx`:

```typescript
import { QuestionComponentProps } from '@/lib/registry/QuestionTypeRegistry'
import { MatchingQuestion as MatchingQuestionType } from '@/lib/types/question-types'

export function MatchingQuestion({
  question,
  onAnswerSelect,
  // ... other props
}: QuestionComponentProps<MatchingQuestionType>) {
  // Your component implementation
  return (
    <div>
      {/* Matching UI */}
    </div>
  )
}

export function MatchingPreview({ question }: { question: MatchingQuestionType }) {
  // Preview component for admin/generation interfaces
  return <div>{/* Preview UI */}</div>
}
```

### Step 3: Register the Question Type

Create `src/lib/registry/question-types/matching.ts`:

```typescript
import { QuestionTypeRegistry } from '@/lib/registry/QuestionTypeRegistry'
import { MatchingQuestion, MatchingPreview } from '@/components/questions/types/MatchingQuestion'

const matchingConfig: QuestionTypeConfig = {
  component: MatchingQuestion,
  previewComponent: MatchingPreview,
  responseValidator: (response) => {
    // Validate response format
    return response && Array.isArray(response.response.pairs)
  },
  scoreCalculator: (question, response) => {
    // Calculate score logic
    const correctPairs = question.content.correctPairs
    const userPairs = response.response.pairs
    // ... scoring logic
    return evaluationResult
  },
  metadata: {
    type: 'matching',
    displayName: 'Matching',
    description: 'Connect items between two columns',
    complexity: 'medium',
    icon: 'link',
    estimatedImplementationTime: '4 weeks',
    dependencies: ['drag-drop-library'],
    features: ['Drag and drop', 'Multiple pairs', 'Visual feedback']
  },
  isEnabled: true,
  isProduction: false // Set to true when ready
}

QuestionTypeRegistry.register('matching', matchingConfig)
```

### Step 4: Import in Registry

Add to `src/lib/registry/index.ts`:

```typescript
// Import all question type definitions to trigger registration
import './question-types/multiple-choice'
import './question-types/matching' // Add this line
```

### Step 5: Test Your Question Type

Use the debug component to test:

```typescript
import QuestionTypeDebug from '@/components/debug/QuestionTypeDebug'

// Render in a test page
<QuestionTypeDebug />
```

## Registry API Reference

### QuestionTypeRegistry Methods

#### Static Methods

- `register(type, config)` - Register a question type
- `getComponent(type)` - Get component for rendering
- `getPreviewComponent(type)` - Get preview component
- `getConfig(type)` - Get full configuration
- `validateResponse(type, response)` - Validate response format
- `calculateScore(question, response)` - Calculate evaluation result
- `getAllTypes()` - Get all registered types
- `getEnabledTypes()` - Get enabled types only
- `getProductionTypes()` - Get production-ready types
- `isRegistered(type)` - Check if type is registered
- `isEnabled(type)` - Check if type is enabled
- `setEnabled(type, enabled)` - Enable/disable type
- `setProductionReady(type, isProduction)` - Mark as production ready
- `getStatus()` - Get registration status
- `debug()` - Debug information to console

### Configuration Interface

```typescript
interface QuestionTypeConfig {
  // Components
  component: React.ComponentType<QuestionComponentProps>
  previewComponent: React.ComponentType<{ question: GeneratedQuestion }>

  // Validation and scoring
  responseValidator: (response: any) => boolean
  scoreCalculator: (question: GeneratedQuestion, response: QuestionResponse) => QuestionEvaluationResult

  // Metadata
  metadata: QuestionTypeMetadata

  // Feature flags
  isEnabled: boolean
  isProduction: boolean
}
```

## Migration Guide

### From Legacy Format

The system provides automatic migration for backward compatibility:

```typescript
import { autoMigrateQuestion, autoMigrateResponse } from '@/lib/utils/question-migration'

// Migrate legacy question
const newQuestion = autoMigrateQuestion(legacyQuestion)

// Migrate legacy response
const newResponse = autoMigrateResponse(legacyResponse)
```

### Existing Components

All existing components using `QuestionCard` will continue to work unchanged. The `QuestionCard` component now acts as a wrapper that migrates data and delegates to `QuestionFactory`.

## Testing

### Debug Component

Use the debug component to test the registry:

```typescript
import QuestionTypeDebug from '@/components/debug/QuestionTypeDebug'

// Shows:
// - Registry status
// - All registered types
// - Interactive question tester
// - Preview functionality
```

### Manual Testing

```typescript
// Test registration
console.log('Registered types:', QuestionTypeRegistry.getAllTypes())

// Test rendering
const TestComponent = () => (
  <QuestionFactory question={testQuestion} {...props} />
)

// Test validation
const isValid = QuestionTypeRegistry.validateResponse('multiple-choice', response)

// Test scoring
const result = QuestionTypeRegistry.calculateScore(question, response)
```

## Best Practices

### 1. Component Development

- **Single Responsibility**: Each component handles one question type only
- **Reusable Sub-components**: Create shared components for common UI patterns
- **Accessibility**: Ensure keyboard navigation and screen reader support
- **Mobile Responsive**: Design for touch interactions

### 2. Response Validation

- **Strict Validation**: Validate all response properties
- **Type Safety**: Use TypeScript for compile-time safety
- **Error Handling**: Provide meaningful error messages

### 3. Scoring Logic

- **Clear Algorithms**: Document scoring logic clearly
- **Partial Credit**: Support partial credit where appropriate
- **Consistent Scale**: Use 0-1 scale for scores

### 4. Feature Flags

- **Development First**: Start with `isProduction: false`
- **Gradual Rollout**: Enable production gradually
- **Feature Toggles**: Use environment variables for feature flags

### 5. Testing

- **Unit Tests**: Test components, validation, and scoring separately
- **Integration Tests**: Test full question flow
- **Visual Testing**: Test UI components across devices
- **Accessibility Testing**: Ensure WCAG compliance

## Troubleshooting

### Common Issues

1. **Question Type Not Found**
   - Check if type is registered: `QuestionTypeRegistry.isRegistered(type)`
   - Ensure import statement exists in registry index
   - Verify no registration errors in console

2. **Component Not Rendering**
   - Check if type is enabled: `QuestionTypeRegistry.isEnabled(type)`
   - Verify component export/import
   - Check for runtime errors in component

3. **Response Validation Failing**
   - Test validation: `QuestionTypeRegistry.validateResponse(type, response)`
   - Check response format matches expected interface
   - Verify timestamp and questionType properties

4. **Scoring Issues**
   - Test scoring: `QuestionTypeRegistry.calculateScore(question, response)`
   - Check question and response data
   - Verify scoring algorithm logic

### Debug Commands

```typescript
// Registry debug information
QuestionTypeRegistry.debug()

// Check specific type
const config = QuestionTypeRegistry.getConfig('multiple-choice')
console.log('Config:', config)

// Test validation
const isValid = QuestionTypeRegistry.validateResponse(type, response)
console.log('Valid response:', isValid)
```

## Performance Considerations

### Component Loading

- **Lazy Loading**: Components are loaded on-demand
- **Code Splitting**: Each question type can be split into separate bundles
- **Memory Usage**: Registry stores minimal metadata, full components loaded when needed

### Rendering Optimization

- **Memoization**: Use React.memo for expensive components
- **Virtual Scrolling**: Consider for long lists of questions
- **Image Optimization**: Optimize assets for diagram labelling

### Bundle Size

- **Tree Shaking**: Only import what you use
- **Dynamic Imports**: Load question types dynamically
- **Shared Dependencies**: Common utilities are shared across types

## Future Enhancements

### Planned Features

1. **Dynamic Registration** - Load question types from external modules
2. **Plugin System** - Full plugin architecture with isolation
3. **Custom Validation** - User-defined validation rules
4. **AI Integration** - Question type-specific AI generation
5. **Analytics** - Usage tracking and performance metrics

### API Evolution

The registry API is designed to be backward compatible. New features will be added as optional properties or separate methods to avoid breaking changes.

## Support

For questions or issues with the Question Type Registry:

1. Check this documentation
2. Use the debug component (`QuestionTypeDebug`)
3. Review console logs for registration errors
4. Test with minimal examples

The registry system is designed to be self-documenting and provide clear error messages for common issues.