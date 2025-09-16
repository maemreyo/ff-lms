
# Question Types Analysis & Implementation Recommendations

## Current State Analysis

### Supported Question Types
Currently, the codebase only supports **Multiple Choice** questions with the following characteristics:
- Exactly 4 options (A, B, C, D)
- Single correct answer selection
- Fixed question-answer format

### Required New Question Types
Based on logs/check.txt requirements for listening skill practice:

1. **Nối thông tin (Matching)**: Connect numbered items with lettered choices
2. **Điền nhãn cho Sơ đồ, Bản đồ, Biểu đồ (Diagram/Map/Chart Labelling)**: Complete labels on visual elements
3. **Hoàn thành Biểu mẫu, Ghi chú, Bảng, Lưu đồ, Tóm tắt (Form/Note/Table/Flowchart/Summary Completion)**: Fill blanks in structured content
4. **Hoàn thành câu (Sentence Completion)**: Fill blanks in sentences
5. **Câu hỏi trả lời ngắn (Short-Answer Questions)**: Free text responses

## Architecture Limitations

### 1. Data Model Constraints
**File**: `src/lib/services/ai/types.ts:60-75`
```typescript
export interface GeneratedQuestion {
  options: string[]                    // Fixed array of 4 strings
  correctAnswer: "A" | "B" | "C" | "D" // Hardcoded to multiple choice
  // ... other fields
}
```

**Issues**:
- `options` assumes array of text choices, incompatible with matching pairs or fill-in-blanks
- `correctAnswer` only supports single letter selection
- No support for multiple correct answers, drag-drop data, or text input validation

### 2. UI Component Limitations
**File**: `src/components/questions/QuestionCard.tsx`

**Issues**:
- Hardcoded to render exactly 4 option buttons with A-D letters
- Single selection logic only
- No support for:
  - Drag-and-drop interfaces (matching)
  - Text input fields (completion/short-answer)
  - Image/diagram interaction (labelling)
  - Complex form layouts (form completion)

### 3. AI Generation Constraints
**File**: `src/lib/services/ai/question-generator.ts`

**Issues**:
- Prompts specifically request "4 options A-D" format
- Validation logic expects multiple choice structure
- No prompt templates for other question types
- Answer shuffling assumes 4-option arrays

### 4. Response & Evaluation System
**File**: `src/components/questions/QuestionCard.tsx:15-18`
```typescript
interface QuestionResponse {
  questionIndex: number
  answer: string  // Single letter A/B/C/D only
}
```

**Issues**:
- Can only store single letter responses
- No support for:
  - Multiple selections (matching)
  - Text input storage (completion/short-answer)
  - Complex answer formats (JSON for matching pairs)

## Implementation Recommendations

### 1. Independent Development Architecture

**Modular Question Type System** - Each question type developed as independent module:

```typescript
// Base interface for all question types
export interface BaseGeneratedQuestion {
  id: string
  type: QuestionType
  question: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  context?: {
    startTime: number
    endTime: number
    text: string
  }
}

export type QuestionType =
  | 'multiple-choice'
  | 'matching'
  | 'diagram-labelling'
  | 'completion'
  | 'short-answer'

// Type-specific content interfaces (independent development)
export interface MultipleChoiceQuestion extends BaseGeneratedQuestion {
  type: 'multiple-choice'
  content: {
    options: string[]
    correctAnswer: 'A' | 'B' | 'C' | 'D'
  }
}

export interface MatchingQuestion extends BaseGeneratedQuestion {
  type: 'matching'
  content: {
    leftItems: Array<{id: string, text: string}>
    rightItems: Array<{id: string, text: string}>
    correctPairs: Array<{left: string, right: string}>
    maxPairs?: number
  }
}

export interface CompletionQuestion extends BaseGeneratedQuestion {
  type: 'completion'
  content: {
    template: string  // "The capital of France is ___"
    blanks: Array<{
      id: string
      position: number
      acceptedAnswers: string[]
      caseSensitive: boolean
      hint?: string
    }>
  }
}

export interface ShortAnswerQuestion extends BaseGeneratedQuestion {
  type: 'short-answer'
  content: {
    sampleAnswers: string[]
    maxLength: number
    evaluationCriteria: string[]
    keywords?: string[]
  }
}

export interface DiagramLabellingQuestion extends BaseGeneratedQuestion {
  type: 'diagram-labelling'
  content: {
    diagramUrl: string
    diagramType: 'map' | 'chart' | 'flowchart' | 'diagram'
    labelPoints: Array<{
      id: string
      x: number
      y: number
      correctLabel: string
      alternatives?: string[]
      hint?: string
    }>
  }
}

// Union type for all question types
export type GeneratedQuestion =
  | MultipleChoiceQuestion
  | MatchingQuestion
  | CompletionQuestion
  | ShortAnswerQuestion
  | DiagramLabellingQuestion
```

### 2. Independent UI Component Architecture

**Question Type Registry System** - Each component registers independently:
```typescript
// src/components/questions/QuestionTypeRegistry.ts
export type QuestionComponentProps<T extends GeneratedQuestion> = {
  question: T
  questionIndex: number
  totalQuestions: number
  responses: QuestionResponse[]
  onAnswerSelect: (questionIndex: number, answer: any) => void
  showResults?: boolean
  evaluationResult?: any
  enableWordSelection?: boolean
}

export interface QuestionTypeConfig {
  component: React.ComponentType<any>
  responseValidator: (response: any) => boolean
  scoreCalculator: (question: GeneratedQuestion, response: any) => number
  previewComponent: React.ComponentType<any>
  generatorComponent: React.ComponentType<any>
}

class QuestionTypeRegistry {
  private static types = new Map<QuestionType, QuestionTypeConfig>()

  static register<T extends GeneratedQuestion>(
    type: QuestionType,
    config: QuestionTypeConfig
  ) {
    this.types.set(type, config)
  }

  static getComponent(type: QuestionType) {
    const config = this.types.get(type)
    if (!config) throw new Error(`Question type ${type} not registered`)
    return config.component
  }

  static getConfig(type: QuestionType): QuestionTypeConfig {
    const config = this.types.get(type)
    if (!config) throw new Error(`Question type ${type} not registered`)
    return config
  }
}

// src/components/questions/QuestionFactory.tsx
export function QuestionFactory({ question, ...props }: any) {
  const QuestionComponent = QuestionTypeRegistry.getComponent(question.type)
  return <QuestionComponent question={question} {...props} />
}
```

**Independent Question Components** - Each developed separately:

**1. Multiple Choice (existing)**:
```typescript
// src/components/questions/types/MultipleChoiceQuestion.tsx
export function MultipleChoiceQuestion({
  question,
  onAnswerSelect,
  ...props
}: QuestionComponentProps<MultipleChoiceQuestion>) {
  // Current implementation (no changes needed)
}

// Register the component
QuestionTypeRegistry.register('multiple-choice', {
  component: MultipleChoiceQuestion,
  responseValidator: (response) => ['A','B','C','D'].includes(response),
  scoreCalculator: (q, r) => q.content.correctAnswer === r ? 1 : 0,
  previewComponent: MultipleChoicePreview,
  generatorComponent: MultipleChoiceGenerator
})
```

**2. Matching Questions (new)**:
```typescript
// src/components/questions/types/MatchingQuestion.tsx
export function MatchingQuestion({
  question,
  onAnswerSelect,
  ...props
}: QuestionComponentProps<MatchingQuestion>) {
  const [pairs, setPairs] = useState<Array<{left: string, right: string}>>([])

  return (
    <div className="matching-question">
      <h3>{question.question}</h3>
      <div className="matching-container">
        <LeftColumn items={question.content.leftItems} />
        <RightColumn items={question.content.rightItems} />
        <MatchingLines pairs={pairs} />
      </div>
      <DragDropProvider onMatch={(left, right) => updatePairs(left, right)} />
    </div>
  )
}

// Independent registration
QuestionTypeRegistry.register('matching', {
  component: MatchingQuestion,
  responseValidator: (response) => Array.isArray(response.pairs),
  scoreCalculator: (q, r) => calculateMatchingScore(q.content.correctPairs, r.pairs),
  previewComponent: MatchingPreview,
  generatorComponent: MatchingGenerator
})
```

**3. Completion Questions (new)**:
```typescript
// src/components/questions/types/CompletionQuestion.tsx
export function CompletionQuestion({
  question,
  onAnswerSelect,
  ...props
}: QuestionComponentProps<CompletionQuestion>) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  return (
    <div className="completion-question">
      <h3>{question.question}</h3>
      <CompletionTemplate
        template={question.content.template}
        blanks={question.content.blanks}
        answers={answers}
        onAnswerChange={setAnswers}
      />
    </div>
  )
}

// Independent registration
QuestionTypeRegistry.register('completion', {
  component: CompletionQuestion,
  responseValidator: (response) => typeof response.answers === 'object',
  scoreCalculator: (q, r) => calculateCompletionScore(q.content.blanks, r.answers),
  previewComponent: CompletionPreview,
  generatorComponent: CompletionGenerator
})
```

### 3. Response System Redesign

**Flexible Response Interface**:
```typescript
interface QuestionResponse {
  questionIndex: number
  questionType: QuestionType
  response: ResponseData
  timestamp: Date
}

type ResponseData =
  | MultipleChoiceResponse
  | MatchingResponse
  | CompletionResponse
  | ShortAnswerResponse
  | DiagramLabellingResponse

interface MultipleChoiceResponse {
  selectedOptions: string[]
}

interface MatchingResponse {
  pairs: Array<{left: string, right: string}>
}

interface CompletionResponse {
  answers: Array<{blankId: string, value: string}>
}

interface ShortAnswerResponse {
  text: string
}

interface DiagramLabellingResponse {
  labels: Array<{pointId: string, label: string}>
}
```

### 4. AI Generation Enhancement

**Type-Specific Prompt Templates**:
```typescript
// src/lib/services/ai/prompts/
export const questionTypePrompts = {
  'multiple-choice': multipleChoicePrompt,
  'matching': matchingPrompt,
  'completion': completionPrompt,
  'short-answer': shortAnswerPrompt,
  'diagram-labelling': diagramLabellingPrompt
}
```

**Enhanced Generation Method**:
```typescript
async generateQuestionsByType(
  type: QuestionType,
  difficulty: string,
  count: number,
  content: string,
  options: GenerationOptions
): Promise<GeneratedQuestion[]>
```

### 5. Evaluation System

**Type-Specific Evaluation**:
```typescript
// src/lib/services/evaluation/
export class QuestionEvaluator {
  static evaluate(question: GeneratedQuestion, response: QuestionResponse): EvaluationResult {
    switch (question.type) {
      case 'multiple-choice':
        return this.evaluateMultipleChoice(question, response)
      case 'matching':
        return this.evaluateMatching(question, response)
      case 'completion':
        return this.evaluateCompletion(question, response)
      case 'short-answer':
        return this.evaluateShortAnswer(question, response)
      case 'diagram-labelling':
        return this.evaluateDiagramLabelling(question, response)
    }
  }
}
```

## Independent Development Strategy

### Core Principle: Plugin Architecture
Each question type functions as an independent plugin that can be developed, tested, and deployed separately without affecting other types.

### Development Phases per Question Type

**Phase A: Type Foundation (1 week per type)**
1. **Data interface definition** - TypeScript interfaces for the specific type
2. **Response format specification** - How answers are stored and validated
3. **Basic component shell** - Minimal functional UI component
4. **Registration with registry** - Plugin registration for discovery

**Phase B: Core Implementation (2 weeks per type)**
1. **Full UI component development** - Complete user interaction
2. **Response validation logic** - Input validation and sanitization
3. **Scoring algorithm** - How correctness is calculated
4. **Preview component** - For question review before generation

**Phase C: AI Integration (1 week per type)**
1. **Custom prompt template** - AI generation prompts for this type
2. **Response parsing** - Parse AI output into type-specific format
3. **Validation and retry logic** - Handle generation failures
4. **Quality assurance** - Ensure generated questions meet standards

**Phase D: Polish & Testing (1 week per type)**
1. **Accessibility features** - Screen reader support, keyboard navigation
2. **Mobile responsiveness** - Touch interactions, responsive design
3. **Unit and integration tests** - Comprehensive test coverage
4. **Documentation** - Usage docs and integration guides

### Independent Question Type Roadmap

**Multiple Choice (Already Complete)**
- ✅ Fully implemented and tested
- ✅ Custom prompts system integrated
- ✅ UI components mature
- 🔄 Migrate to registry system for consistency

**Completion Questions (Recommended First New Type)**
- **Week 1**: Foundation - Text input interfaces, blank detection
- **Week 2**: Implementation - Template rendering, answer validation
- **Week 3**: AI Integration - Blank generation prompts, parsing
- **Week 4**: Polish - Accessibility, mobile, testing
- **Complexity**: Low (text inputs only)
- **Dependencies**: None (standalone)

**Matching Questions (Second Priority)**
- **Week 5**: Foundation - Drag-drop interfaces, pair management
- **Week 6**: Implementation - Visual pairing, touch interactions
- **Week 7**: AI Integration - Item generation, relationship prompts
- **Week 8**: Polish - Accessibility, animations, testing
- **Complexity**: Medium (drag-drop interactions)
- **Dependencies**: Drag-drop library selection

**Short Answer Questions (Third Priority)**
- **Week 9**: Foundation - Text area interfaces, length validation
- **Week 10**: Implementation - Auto-expand, word counting, suggestions
- **Week 11**: AI Integration - Open-ended prompts, sample answers
- **Week 12**: Polish - Advanced validation, testing
- **Complexity**: Medium (text processing, validation)
- **Dependencies**: Text analysis utilities

**Diagram Labelling (Advanced)**
- **Week 13**: Foundation - Image overlay, coordinate systems
- **Week 14**: Implementation - Click/touch interactions, label positioning
- **Week 15**: AI Integration - Visual analysis prompts, coordinate generation
- **Week 16**: Polish - Image optimization, accessibility
- **Complexity**: High (image processing, coordinates)
- **Dependencies**: Image handling, coordinate mapping

### Development Team Structure

**Option 1: Sequential Development (1 developer)**
- Complete one question type fully before starting next
- 4 weeks per type × 4 new types = 16 weeks total
- Lower risk, easier debugging, consistent patterns

**Option 2: Parallel Development (2+ developers)**
- Each developer owns 1-2 question types completely
- All types developed simultaneously
- 4 weeks total with proper coordination
- Higher coordination overhead, potential inconsistencies

**Option 3: Hybrid Approach (Recommended)**
- Week 1-4: Complete first type (Completion) to establish patterns
- Week 5-8: Two developers work on Matching and Short Answer in parallel
- Week 9-12: Add Diagram Labelling while polishing first three
- Balances speed with pattern establishment

## Migration Strategy

### 1. Backward Compatibility
- Keep existing `GeneratedQuestion` interface working
- Add migration utilities to convert old format to new
- Gradual rollout of new question types

### 2. Database Schema
- Add `question_type` column to questions table
- Add `response_data` JSON column for flexible response storage
- Migrate existing data to new format

### 3. Testing Strategy
- Unit tests for each question type component
- Integration tests for evaluation logic
- User acceptance testing for each question type

## Technical Considerations

### 1. Performance
- Lazy load question type components
- Optimize drag-drop interactions
- Consider virtualization for large matching lists

### 2. Accessibility
- Ensure all question types support keyboard navigation
- Screen reader compatibility
- High contrast mode support

### 3. Mobile Responsiveness
- Touch-friendly drag-drop for matching
- Responsive text input sizing
- Mobile-optimized diagram interaction

## Summary: Independent Question Type Development

### Key Benefits of Plugin Architecture

1. **🔧 Independent Development**: Each question type can be developed, tested, and deployed separately
2. **🚀 Parallel Implementation**: Multiple developers can work on different types simultaneously
3. **📦 Modular Codebase**: Clean separation prevents cross-type dependencies and bugs
4. **🔄 Easy Maintenance**: Updates to one type don't affect others
5. **📈 Scalable Growth**: New question types can be added without architectural changes
6. **🎯 Focused Testing**: Each type has its own test suite and quality standards

### Development Timeline Summary

**Total Implementation Time**: 16 weeks (sequential) or 4-8 weeks (parallel)

**Phase-by-Phase Breakdown**:
- **Registry System Setup**: 1 week (foundation for all types)
- **Completion Questions**: 4 weeks (first new type, establish patterns)
- **Matching Questions**: 4 weeks (can be parallel with others)
- **Short Answer Questions**: 4 weeks (can be parallel with others)
- **Diagram Labelling**: 4 weeks (most complex, requires image handling)

### Custom Prompts Integration

Each question type includes:
- ✅ **Type-specific prompt templates** with appropriate variables
- ✅ **UI integration** for prompt selection per question type
- ✅ **Generation validation** for type-specific outputs
- ✅ **Template processing** with question type context

### Technical Architecture Highlights

1. **Registry System**: Central registration allows discovery and dynamic loading
2. **Type-Safe Interfaces**: TypeScript ensures each type has proper structure
3. **Component Composition**: Reusable sub-components (inputs, validations, scoring)
4. **Response Validation**: Each type validates its own response format
5. **Scoring Algorithms**: Type-specific scoring logic handles complex answer types

### Migration Strategy

- **Phase 1**: Setup registry system, migrate existing multiple choice
- **Phase 2**: Add new types one by one with feature flags
- **Phase 3**: Gradually enable new types for production use
- **Zero Downtime**: Existing functionality remains completely unaffected

**This architecture ensures each question type can evolve independently while maintaining system cohesion and user experience consistency.**