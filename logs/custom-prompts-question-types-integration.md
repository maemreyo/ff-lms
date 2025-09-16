# Custom Prompts & Question Types Integration Analysis

## Current Custom Prompts System Analysis

### 1. Existing Architecture Overview

**Custom Prompt Data Model** (`src/hooks/use-custom-prompts.ts`):
```typescript
export interface CustomPrompt {
  id: string
  name: string
  description?: string
  category: 'listening_comprehension' | 'detail_focused' | 'inference_implication' | 'tone_analysis' | 'vocabulary_context' | 'language_function' | 'general'
  system_prompt: string
  user_template: string
  config: {
    maxTokens?: number
    temperature?: number
  }
  is_active: boolean
  is_default: boolean
  created_at: string
  created_by: string
}
```

**Template Processing** (`src/lib/services/custom-prompt-service.ts`):
- Supports variable substitution with `{{variable}}` syntax
- Current variables: `totalQuestions`, `easyCount`, `mediumCount`, `hardCount`, `videoTitle`, `transcript`
- Template validation for required variables
- Category-based organization with Vietnamese/English display names

**UI Integration Points**:
- `GroupPresetSelectionView.tsx` - Shows custom prompts as preset options
- Prompts are displayed with category-specific icons and styling
- Integration with existing question generation flow

### 2. Current Limitations for New Question Types

**Template System Constraints**:
- Templates only support multiple choice format variables
- No question type-specific template variables
- No support for type-specific validation rules
- Single template per prompt (no type-specific templates)

**Category System Issues**:
- Categories focus on comprehension skills, not question formats
- No categories for structural question types (matching, completion, etc.)
- Category system doesn't map to UI interaction patterns

**Generation Flow Limitations**:
- Single generation path for all question types
- No type-specific validation or processing
- UI assumes multiple choice output format

## Recommended Integration Strategy for New Question Types

### 1. Enhanced Custom Prompt Data Model

**Extended CustomPrompt Interface**:
```typescript
export interface CustomPrompt {
  id: string
  name: string
  description?: string
  category: PromptCategory
  question_type: QuestionType // NEW: Specify which question type this prompt generates
  system_prompt: string
  user_template: string
  validation_template?: string // NEW: Template for answer validation
  ui_config?: QuestionTypeUIConfig // NEW: Type-specific UI configuration
  config: {
    maxTokens?: number
    temperature?: number
    // NEW: Type-specific AI parameters
    response_format?: 'json' | 'structured'
    validation_strictness?: 'strict' | 'flexible'
  }
  is_active: boolean
  is_default: boolean
  created_at: string
  created_by: string
}

export type QuestionType =
  | 'multiple-choice'
  | 'matching'
  | 'completion'
  | 'short-answer'
  | 'diagram-labelling'

export type PromptCategory =
  | 'listening_comprehension'
  | 'detail_focused'
  | 'inference_implication'
  | 'tone_analysis'
  | 'vocabulary_context'
  | 'language_function'
  | 'general'
  // NEW: Structure-based categories
  | 'matching_exercises'
  | 'completion_tasks'
  | 'open_ended'
  | 'visual_labelling'

interface QuestionTypeUIConfig {
  // Matching-specific
  maxPairs?: number
  shuffleItems?: boolean

  // Completion-specific
  maxBlanks?: number
  blankLength?: 'auto' | 'fixed'
  caseSensitive?: boolean

  // Short answer-specific
  maxLength?: number
  suggestionCount?: number

  // Diagram labelling-specific
  imageRequired?: boolean
  maxLabels?: number
}
```

### 2. Question Type-Specific Prompt Templates

**Template Variable Extensions**:
```typescript
// Current variables (keep for backward compatibility)
const currentVariables = {
  totalQuestions: number,
  easyCount: number,
  mediumCount: number,
  hardCount: number,
  videoTitle: string,
  transcript: string
}

// NEW: Question type-specific variables
const typeSpecificVariables = {
  // Matching questions
  maxPairs?: number,
  leftColumnItems?: string[],
  rightColumnItems?: string[],

  // Completion questions
  sentenceTemplates?: string[],
  targetVocabulary?: string[],
  blankPositions?: 'beginning' | 'middle' | 'end' | 'mixed',

  // Short answer questions
  expectedAnswerLength?: 'short' | 'medium' | 'long',
  keywordList?: string[],
  evaluationCriteria?: string[],

  // Diagram labelling
  diagramType?: 'map' | 'chart' | 'flowchart' | 'diagram',
  labelPoints?: Array<{x: number, y: number, hint?: string}>
}
```

**Example Template for Matching Questions**:
```handlebars
Based on the following transcript, create {{totalQuestions}} matching questions where students connect items from two columns.

Instructions:
- Create {{maxPairs}} pairs for each question
- Left column: Key concepts, people, or events from the transcript
- Right column: Definitions, descriptions, or related information
- Ensure each pair has clear connection from the audio content
- Include {{easyCount}} easy, {{mediumCount}} medium, {{hardCount}} hard questions

Video: {{videoTitle}}
Transcript: {{transcript}}

Output format:
{
  "questions": [
    {
      "question": "Match the speakers with their opinions:",
      "leftItems": [
        {"id": "1", "text": "John"},
        {"id": "2", "text": "Sarah"}
      ],
      "rightItems": [
        {"id": "a", "text": "Prefers coffee"},
        {"id": "b", "text": "Likes tea better"}
      ],
      "correctPairs": [
        {"left": "1", "right": "a"},
        {"left": "2", "right": "b"}
      ],
      "difficulty": "easy",
      "explanation": "John mentions coffee at [01:15-01:22]..."
    }
  ]
}
```

### 3. UI Integration Architecture

**Question Type Selector Component**:
```typescript
// src/components/prompts/QuestionTypeSelector.tsx
interface QuestionTypeSelectorProps {
  selectedType: QuestionType
  onTypeChange: (type: QuestionType) => void
  availableTypes: QuestionType[]
}

export function QuestionTypeSelector({ selectedType, onTypeChange, availableTypes }: QuestionTypeSelectorProps) {
  const typeConfig = {
    'multiple-choice': {
      icon: CheckSquare,
      label: 'Multiple Choice',
      description: 'Select from 4 options (A, B, C, D)',
      badge: 'Current'
    },
    'matching': {
      icon: Link,
      label: 'Matching',
      description: 'Connect related items between columns',
      badge: 'New'
    },
    'completion': {
      icon: Edit,
      label: 'Fill in Blanks',
      description: 'Complete sentences or forms',
      badge: 'New'
    },
    'short-answer': {
      icon: FileText,
      label: 'Short Answer',
      description: 'Write brief text responses',
      badge: 'New'
    },
    'diagram-labelling': {
      icon: Map,
      label: 'Label Diagram',
      description: 'Add labels to images or charts',
      badge: 'New'
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {availableTypes.map(type => (
        <TypeCard
          key={type}
          type={type}
          config={typeConfig[type]}
          isSelected={selectedType === type}
          onClick={() => onTypeChange(type)}
        />
      ))}
    </div>
  )
}
```

**Enhanced Prompt Selection with Type Filtering**:
```typescript
// src/components/prompts/PromptSelectorWithTypes.tsx
export function PromptSelectorWithTypes() {
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('multiple-choice')
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null)

  // Filter prompts by question type
  const filteredPrompts = useQuery({
    queryKey: ['custom-prompts', selectedQuestionType],
    queryFn: () => fetchPromptsByType(selectedQuestionType)
  })

  return (
    <div className="space-y-6">
      <QuestionTypeSelector
        selectedType={selectedQuestionType}
        onTypeChange={setSelectedQuestionType}
        availableTypes={AVAILABLE_QUESTION_TYPES}
      />

      <PromptGrid
        prompts={filteredPrompts.data || []}
        selectedPrompt={selectedPrompt}
        onPromptSelect={setSelectedPrompt}
        questionType={selectedQuestionType}
      />

      <PromptPreview
        prompt={selectedPrompt}
        questionType={selectedQuestionType}
      />
    </div>
  )
}
```

### 4. Generation Flow Integration

**Type-Aware Generation Service**:
```typescript
// src/lib/services/ai/question-generator-v2.ts
export class QuestionGeneratorV2 {
  async generateQuestionsByType(
    questionType: QuestionType,
    loop: SavedLoop,
    transcript: string,
    difficulty: string,
    options: GenerationOptions & { customPrompt?: CustomPrompt }
  ): Promise<TypedGeneratedQuestions> {

    // Validate prompt matches question type
    if (options.customPrompt && options.customPrompt.question_type !== questionType) {
      throw new Error(`Prompt type mismatch: prompt is for ${options.customPrompt.question_type}, requested ${questionType}`)
    }

    // Get type-specific prompt template
    const promptTemplate = this.getPromptTemplateForType(questionType, options.customPrompt)

    // Build type-specific context
    const context = this.buildTypeSpecificContext(questionType, loop, transcript, options)

    // Generate questions
    const response = await this.provider.chat(
      PromptManager.buildMessages(promptTemplate, context),
      promptTemplate.config
    )

    // Type-specific validation and processing
    return this.processTypeSpecificResponse(questionType, response, options)
  }

  private getPromptTemplateForType(
    type: QuestionType,
    customPrompt?: CustomPrompt
  ): PromptTemplate {
    if (customPrompt) {
      return CustomPromptService.convertToPromptTemplate(customPrompt)
    }

    // Fallback to default templates
    return DEFAULT_TEMPLATES_BY_TYPE[type]
  }
}
```

**UI Generation Progress with Type Awareness**:
```typescript
// Enhanced GenerationProgressModal
interface TypedGenerationState {
  questionType: QuestionType
  difficulty: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  count: number
  prompt?: CustomPrompt
}

export function TypedGenerationProgressModal() {
  const [generationSteps, setGenerationSteps] = useState<TypedGenerationState[]>([])

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generating {getQuestionTypeDisplayName(questionType)} Questions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {generationSteps.map(step => (
            <GenerationStepCard
              key={`${step.questionType}-${step.difficulty}`}
              step={step}
              onRetry={() => retryGeneration(step)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 5. Default Prompt Templates for Each Question Type

**Multiple Choice (existing)**:
- Current template in `ai-prompts.ts`
- No changes needed for backward compatibility

**Matching Questions Template**:
```typescript
export const matchingQuestionsPrompt: PromptTemplate = {
  system: `You are an expert ESL instructor creating matching exercises from audio content.

Generate matching questions where students connect items from two columns based on the transcript.

Requirements:
- Left column: Key concepts, speakers, events, or vocabulary from the audio
- Right column: Definitions, descriptions, outcomes, or related information
- Each question should have 4-6 pairs to match
- Include clear audio evidence for each connection
- Use simple, accessible language for entry-level learners

Output as JSON with this structure:
{
  "questions": [{
    "question": "Match the items based on the conversation:",
    "leftItems": [{"id": "1", "text": "Item"}],
    "rightItems": [{"id": "a", "text": "Description"}],
    "correctPairs": [{"left": "1", "right": "a"}],
    "difficulty": "easy|medium|hard",
    "explanation": "Evidence found at [MM:SS-MM:SS]..."
  }]
}`,

  userTemplate: (context) => `
Generate {{totalQuestions}} matching questions from this transcript:
- Easy: {{easyCount}} (direct connections from transcript)
- Medium: {{mediumCount}} (requires understanding context)
- Hard: {{hardCount}} (requires inference or interpretation)

Video: {{videoTitle}}
Transcript: {{transcript}}
  `,

  config: {
    maxTokens: 32000,
    temperature: 0.3
  }
}
```

**Completion Questions Template**:
```typescript
export const completionQuestionsPrompt: PromptTemplate = {
  system: `You are an expert ESL instructor creating fill-in-the-blank exercises from audio content.

Create completion questions where students fill missing words in sentences from the transcript.

Requirements:
- Remove 1-3 key words per sentence that students should complete
- Focus on vocabulary, grammar patterns, or key information
- Provide multiple acceptable answers when appropriate
- Include context clues to help students
- Use authentic sentences from the transcript

Output as JSON:
{
  "questions": [{
    "question": "Complete the sentences based on what you heard:",
    "template": "The weather was ___ and the temperature reached ___ degrees.",
    "blanks": [
      {"id": "1", "position": 1, "acceptedAnswers": ["sunny", "clear", "nice"], "caseSensitive": false},
      {"id": "2", "position": 2, "acceptedAnswers": ["25", "twenty-five"], "caseSensitive": false}
    ],
    "difficulty": "easy|medium|hard",
    "explanation": "Evidence at [MM:SS-MM:SS]..."
  }]
}`,

  userTemplate: (context) => `
Generate {{totalQuestions}} completion questions:
- Easy: {{easyCount}} (simple vocabulary and clear context)
- Medium: {{mediumCount}} (common expressions and moderate context)
- Hard: {{hardCount}} (advanced vocabulary or complex grammar)

Video: {{videoTitle}}
Transcript: {{transcript}}
  `,

  config: {
    maxTokens: 32000,
    temperature: 0.2
  }
}
```

### 6. Development Implementation Strategy

**Phase 1: Foundation (Weeks 1-2)**
1. **Extend CustomPrompt interface** with question_type field
2. **Create QuestionTypeSelector component** for UI type selection
3. **Build type-specific prompt templates** (matching, completion)
4. **Implement basic type validation** in generation flow

**Phase 2: UI Integration (Weeks 3-4)**
1. **Enhanced PromptSelectorWithTypes component** with filtering
2. **Type-aware GenerationProgressModal**
3. **Question type preview components**
4. **Integration with existing quiz creation flow**

**Phase 3: Advanced Features (Weeks 5-6)**
1. **Short answer and diagram labelling templates**
2. **Advanced UI configurations** per question type
3. **Type-specific validation and scoring**
4. **Migration tools** for existing prompts

### 7. Database Schema Changes

**Custom Prompts Table Extension**:
```sql
-- Add question_type column to existing custom_prompts table
ALTER TABLE custom_prompts
ADD COLUMN question_type VARCHAR(50) DEFAULT 'multiple-choice';

-- Add UI configuration JSON column
ALTER TABLE custom_prompts
ADD COLUMN ui_config JSONB DEFAULT '{}';

-- Update existing prompts to have question_type
UPDATE custom_prompts
SET question_type = 'multiple-choice'
WHERE question_type IS NULL;

-- Create index for efficient type-based queries
CREATE INDEX idx_custom_prompts_question_type ON custom_prompts(question_type);
CREATE INDEX idx_custom_prompts_category_type ON custom_prompts(category, question_type);
```

**New Question Types Support Table**:
```sql
-- Track which question types are enabled for the application
CREATE TABLE question_type_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  ui_config JSONB DEFAULT '{}',
  default_prompt_id UUID REFERENCES custom_prompts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert supported question types
INSERT INTO question_type_configs (question_type, is_enabled) VALUES
  ('multiple-choice', true),
  ('matching', false),
  ('completion', false),
  ('short-answer', false),
  ('diagram-labelling', false);
```

## Migration Strategy & Backward Compatibility

### 1. Gradual Rollout Approach
- Keep existing multiple choice system fully functional
- Add question type selection as optional feature
- Default to multiple choice for existing workflows
- Progressive enhancement without breaking changes

### 2. Data Migration Plan
- All existing custom prompts automatically get `question_type: 'multiple-choice'`
- Existing UI components continue to work unchanged
- New type-aware components are additive, not replacements

### 3. Feature Flags
```typescript
// Feature flag system for gradual rollout
const QUESTION_TYPE_FEATURES = {
  'multiple-choice': true,  // Always enabled
  'matching': process.env.ENABLE_MATCHING_QUESTIONS === 'true',
  'completion': process.env.ENABLE_COMPLETION_QUESTIONS === 'true',
  'short-answer': process.env.ENABLE_SHORT_ANSWER_QUESTIONS === 'true',
  'diagram-labelling': process.env.ENABLE_DIAGRAM_LABELLING === 'true'
}
```

## Conclusion

Việc tích hợp custom prompts với các dạng bài tập mới đòi hỏi:

1. **Mở rộng data model** - Thêm question_type và ui_config vào CustomPrompt
2. **Template system nâng cao** - Variables và validation cho từng loại câu hỏi
3. **UI components modular** - Type selector và prompt filtering
4. **Generation flow linh hoạt** - Type-aware processing và validation
5. **Backward compatibility** - Đảm bảo multiple choice hiện tại vẫn hoạt động

**Ưu điểm của approach này**:
- **Độc lập phát triển**: Mỗi question type có template và UI riêng
- **Tái sử dụng**: Custom prompt system có thể dùng cho tất cả các loại
- **Extensible**: Dễ dàng thêm loại câu hỏi mới trong tương lai
- **User-friendly**: UI rõ ràng phân biệt giữa các loại câu hỏi

**Thời gian ước tính**: 6 tuần cho implementation hoàn chỉnh với tất cả question types và UI integration.