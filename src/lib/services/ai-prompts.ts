import { ChatMessage, DifficultyPreset, SavedLoop } from './ai-service'

/**
 * AI Prompts for Question Generation and other AI operations
 */

export interface PromptTemplate {
  system: string
  userTemplate: (context: any) => string
  config: {
    maxTokens?: number
    temperature?: number
  }
}



// Conversation Questions Prompt (Main prompt for question generation)
export const conversationQuestionsPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL instructor designing a learning module for ambitious entry-level students aiming for advanced proficiency. The primary focus is on improving **active listening skills**, moving beyond literal comprehension to understand nuance, tone, and implied meaning.

Please generate multiple-choice questions with the following criteria:

**1. Difficulty Distribution (Flexible based on user's learning level):**
   - **Easy:** Questions that can be answered by finding explicitly stated information in the text. Use simple, everyday vocabulary that students encounter in daily life.
   - **Medium:** Questions that require connecting ideas or understanding vocabulary/idioms in context. Use familiar words and common expressions.
   - **Hard:** Questions that require deep inference, understanding the speaker's tone, or analyzing the function of their language.

**2. Language Simplification Requirements:**
   - Use simple, familiar vocabulary in questions and options
   - Avoid overly complex or academic words that might shock students
   - Choose everyday language that students encounter in daily conversation
   - Make questions accessible and approachable for entry-level learners
   - Prioritize clarity and comprehension over complexity

**3. Question Type Variety (Focus on Listening Sub-skills):**
   - **Main Idea/Gist:** What is the overall point of this segment?
   - **Specific Detail:** Who, what, when, where, why?
   - **Vocabulary in Context:** What does a specific word, phrasal verb, or idiom mean *in this situation*?
   - **Inference & Implication:** What is the speaker suggesting but not saying directly?
   - **Speaker's Attitude/Tone:** What is the speaker's emotion or opinion (e.g., sarcastic, enthusiastic, skeptical)?
   - **Function of Language:** *Why* did the speaker say something? (e.g., to persuade, to clarify, to express doubt).

**4. Quality of Options:**
   - Each question must have 4 options (A, B, C, D).
   - The correct answer must be clearly supported by the transcript.
   - Incorrect options (distractors) should be plausible and target common misunderstandings for English learners.
   - Use simple, everyday language in all options.

**5. Explanations for Learning:**
   - Provide a clear and concise explanation for why the correct answer is right.
   - Use simple language in explanations that entry-level students can understand.
   - Include clickable timeframe references in explanations using format: [MM:SS-MM:SS]
   - Example: "The answer is found at [01:15-01:22] where the speaker mentions..."
   - These timeframe references will become clickable links to jump to that moment in the video
   - Briefly explain why the other options are incorrect, if it adds learning value.

**6. JSON Output Format:**
   - Format your response as a valid JSON object with the exact structure below.
   - Generate the EXACT number of questions requested for each difficulty level.
   - **CRITICAL:** Options array should contain ONLY the answer text, NO letter prefixes like "A)", "B)", etc.

**7. Context Reference:**
   - For each question, include a 'context' object.
   - This object must contain 'startTime' and 'endTime' (in seconds) of the most relevant transcript segment.
   - It must also include the 'text' of that segment. This helps learners locate and review the exact context.

{
  "questions": [
    {
      "question": "What did the speaker say about the weather?",
      "options": ["It was sunny", "It was raining", "It was cold", "It was windy"],
      "correctAnswer": "A",
      "explanation": "The speaker mentions sunny weather at [01:15-01:22] when describing the day.",
      "difficulty": "easy",
      "type": "specific_detail",
      "context": {
        "startTime": 75.2,
        "endTime": 82.5,
        "text": "It was a beautiful sunny day when we went to the park."
      }
    }
  ]
}

**IMPORTANT FORMAT NOTES:**
- Options array: ["Answer text", "Answer text", "Answer text", "Answer text"]
- DO NOT use: ["A) Answer text", "B) Answer text", "C) Answer text", "D) Answer text"]
- The system will automatically assign A, B, C, D labels in the UI

**Types to use:** "main_idea", "specific_detail", "vocabulary_in_context", "inference", "speaker_tone", "language_function"
**Difficulties to use:** "easy", "medium", "hard"

**IMPORTANT:** You will receive specific instructions about how many questions of each difficulty level to generate. Follow these numbers exactly to ensure the user can complete their chosen learning preset successfully.`,

  userTemplate: (context: {
    loop: SavedLoop
    transcript?: string
    preset?: DifficultyPreset
    segments?: Array<{ text: string; start: number; duration: number }>
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Default to largest preset (15 questions) to ensure we generate enough for all presets
    const distribution = context.preset || { easy: 5, medium: 6, hard: 4 }
    const totalQuestions = distribution.easy + distribution.medium + distribution.hard

    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript

    return `Based on the following YouTube video transcript, generate exactly ${totalQuestions} comprehension questions with this specific difficulty distribution:

**REQUIRED DISTRIBUTION:**
- Easy: ${distribution.easy} questions (simple, everyday vocabulary)
- Medium: ${distribution.medium} questions (familiar words, common expressions)  
- Hard: ${distribution.hard} questions (advanced comprehension, inference)

**TOTAL: ${totalQuestions} questions**

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}
Duration: ${formatTime(context.loop.endTime - context.loop.startTime)}

**IMPORTANT REMINDERS:**
- Use simple, everyday vocabulary that entry-level students know
- Avoid complex or shocking words that make questions seem too difficult
- Make questions approachable and accessible
- Include context object with startTime, endTime, and text for each question
- Add timeframe references like [MM:SS-MM:SS] in explanations to show where evidence can be found
- Generate EXACTLY the number specified for each difficulty level
- **OPTIONS FORMAT:** Use ["Answer text", "Answer text", "Answer text", "Answer text"] NOT ["A) Answer", "B) Answer", etc.]

Transcript (with timestamps):
${transcriptContent}`
  },

  config: {
    maxTokens: 64000,
    temperature: 0.3
  }
}

// Prompt Manager - Helper class for managing prompts
export class PromptManager {
  /**
   * Build chat messages from a prompt template
   */
  static buildMessages(template: PromptTemplate, context: any): ChatMessage[] {
    return [
      {
        role: 'system',
        content: template.system
      },
      {
        role: 'user',
        content: template.userTemplate(context)
      }
    ]
  }

  /**
   * Get configuration for AI service from template
   */
  static getConfig(template: PromptTemplate) {
    return template.config
  }

  /**
   * Parse JSON response from AI with error handling
   */
  static parseJSONResponse(content: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const jsonStr = jsonMatch[0]
      return JSON.parse(jsonStr)
    } catch (error) {
      // If JSON parsing fails, try to extract from markdown code blocks
      try {
        const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (codeBlockMatch) {
          return JSON.parse(codeBlockMatch[1])
        }
      } catch (secondError) {
        console.error('Failed to parse JSON from AI response:', content)
        throw new Error('AI response is not valid JSON')
      }

      throw new Error('Could not parse AI response as JSON')
    }
  }

  /**
   * Validate question response structure
   */
  static validateQuestionResponse(response: any): boolean {
    if (!response || typeof response !== 'object') {
      return false
    }

    if (!Array.isArray(response.questions)) {
      return false
    }

    // Validate each question
    for (const question of response.questions) {
      if (!question.question || typeof question.question !== 'string') {
        return false
      }

      if (!Array.isArray(question.options) || question.options.length !== 4) {
        return false
      }

      if (!question.correctAnswer || !['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
        return false
      }

      if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
        return false
      }

      if (
        !question.type ||
        ![
          'main_idea',
          'specific_detail',
          'vocabulary_in_context',
          'inference',
          'speaker_tone',
          'language_function'
        ].includes(question.type)
      ) {
        return false
      }
    }

    return true
  }

  /**
   * Clean and validate AI response for question generation
   */
  static cleanAndValidateQuestionResponse(content: string): any {
    const parsed = this.parseJSONResponse(content)

    if (!this.validateQuestionResponse(parsed)) {
      throw new Error('AI response failed validation')
    }

    // Clean up questions
    parsed.questions = parsed.questions.map((q: any) => ({
      question: q.question?.trim(),
      options: q.options?.map((opt: string) => opt?.trim()),
      correctAnswer: q.correctAnswer?.trim(),
      explanation: q.explanation?.trim() || 'No explanation provided',
      difficulty: q.difficulty?.trim(),
      type: q.type?.trim()
    }))

    return parsed
  }
}

// Single Difficulty Question Generation Prompt
export const singleDifficultyQuestionsPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL instructor designing a learning module for ambitious entry-level students aiming for advanced proficiency. The primary focus is on improving **active listening skills**, moving beyond literal comprehension to understand nuance, tone, and implied meaning.

Please generate multiple-choice questions for a SINGLE DIFFICULTY LEVEL with the following criteria:

**1. Difficulty Levels:**
   - **Easy:** Questions that can be answered by finding explicitly stated information in the text. Use simple, everyday vocabulary that students encounter in daily life.
   - **Medium:** Questions that require connecting ideas or understanding vocabulary/idioms in context. Use familiar words and common expressions.
   - **Hard:** Questions that require deep inference, understanding the speaker's tone, or analyzing the function of their language.

**2. Language Simplification Requirements:**
   - Use simple, familiar vocabulary in questions and options
   - Avoid overly complex or academic words that might shock students
   - Choose everyday language that students encounter in daily conversation
   - Make questions accessible and approachable for entry-level learners
   - Prioritize clarity and comprehension over complexity

**3. Question Type Variety (Focus on Listening Sub-skills):**
   - **Main Idea/Gist:** What is the overall point of this segment?
   - **Specific Detail:** Who, what, when, where, why?
   - **Vocabulary in Context:** What does a specific word, phrasal verb, or idiom mean *in this situation*?
   - **Inference & Implication:** What is the speaker suggesting but not saying directly?
   - **Speaker's Attitude/Tone:** What is the speaker's emotion or opinion (e.g., sarcastic, enthusiastic, skeptical)?
   - **Function of Language:** *Why* did the speaker say something? (e.g., to persuade, to clarify, to express doubt).

**4. Quality of Options:**
   - Each question must have 4 options (A, B, C, D).
   - The correct answer must be clearly supported by the transcript.
   - Incorrect options (distractors) should be plausible and target common misunderstandings for English learners.
   - Use simple, everyday language in all options.

**5. Explanations for Learning:**
   - Provide a clear and concise explanation for why the correct answer is right.
   - Use simple language in explanations that entry-level students can understand.
   - Include clickable timeframe references in explanations using format: [MM:SS-MM:SS]
   - Example: "The answer is found at [01:15-01:22] where the speaker mentions..."
   - These timeframe references will become clickable links to jump to that moment in the video
   - Briefly explain why the other options are incorrect, if it adds learning value.

**6. JSON Output Format:**
   - Format your response as a valid JSON object with the exact structure below.
   - **CRITICAL:** Options array should contain ONLY the answer text, NO letter prefixes like "A)", "B)", etc.

**7. Context Reference:**
   - For each question, include a 'context' object.
   - This object must contain 'startTime' and 'endTime' (in seconds) of the most relevant transcript segment.
   - It must also include the 'text' of that segment. This helps learners locate and review the exact context.

**8. Question Uniqueness (if previous questions provided):**
   - If previous questions are provided, review them carefully to avoid duplicates
   - Generate completely different questions that cover NEW aspects of the transcript
   - Avoid similar topics, vocabulary, timeframes, or question patterns already covered
   - Focus on different parts of the transcript or different question types
   - Ensure your questions complement rather than repeat existing questions

{
  "questions": [
    {
      "question": "What did the speaker say about the weather?",
      "options": ["It was sunny", "It was raining", "It was cold", "It was windy"],
      "correctAnswer": "A",
      "explanation": "The speaker mentions sunny weather at [01:15-01:22] when describing the day.",
      "difficulty": "easy",
      "type": "specific_detail",
      "context": {
        "startTime": 15.2,
        "endTime": 20.5,
        "text": "The relevant segment of the transcript text goes here."
      }
    }
  ]
}

**IMPORTANT FORMAT NOTES:**
- Options array: ["Answer text", "Answer text", "Answer text", "Answer text"]
- DO NOT use: ["A) Answer text", "B) Answer text", "C) Answer text", "D) Answer text"]
- The system will automatically assign A, B, C, D labels in the UI

**Types to use:** "main_idea", "specific_detail", "vocabulary_in_context", "inference", "speaker_tone", "language_function"
**Difficulties to use:** "easy", "medium", "hard"

**IMPORTANT:** Generate questions ONLY for the specified difficulty level. Make sure each question includes proper context object and timeframe references in explanations.`,

  userTemplate: (context: {
    loop: SavedLoop
    transcript?: string
    difficulty: 'easy' | 'medium' | 'hard'
    questionCount?: number
    segments?: Array<{ text: string; start: number; duration: number }>
    previousQuestions?: Array<{
      question: string
      difficulty: string
      type: string
    }>
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const questionCount = context.questionCount || 6
    
    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript

    let prompt = `Generate exactly ${questionCount} ${context.difficulty} questions from this transcript (formatted with timestamps):

**DIFFICULTY TARGET:** ${context.difficulty}
**QUESTION COUNT:** ${questionCount}

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}
Duration: ${formatTime(context.loop.endTime - context.loop.startTime)}

**IMPORTANT REMINDERS:**
- Generate EXACTLY ${questionCount} questions with difficulty level "${context.difficulty}"
- Include context object with startTime, endTime, and text for each question
- Add timeframe references like [MM:SS-MM:SS] in explanations to show where evidence can be found
- Use simple, everyday vocabulary that entry-level students know
- Make questions approachable and accessible
- **OPTIONS FORMAT:** Use ["Answer text", "Answer text", "Answer text", "Answer text"] NOT ["A) Answer", "B) Answer", etc.]

Transcript (with timestamps):
${transcriptContent}`

    // Add deduplication instructions if previous questions exist
    if (context.previousQuestions && context.previousQuestions.length > 0) {
      const previousQuestionsText = context.previousQuestions.map((q, i) => 
        `${i + 1}. [${q.difficulty.toUpperCase()}] ${q.question}`
      ).join('\n')

      prompt += `

**🚨 CRITICAL DEDUPLICATION REQUIREMENT:**
The following questions have ALREADY been generated for this transcript. You MUST create completely different questions:

EXISTING QUESTIONS TO AVOID:
${previousQuestionsText}

**Deduplication Strategy:**
- Focus on DIFFERENT timeframes/segments of the transcript
- Ask about DIFFERENT topics, names, numbers, or details
- Use DIFFERENT question types (main_idea, inference, tone, etc.)
- Avoid similar vocabulary or concepts already covered
- Find NEW aspects or angles not yet explored
- Ensure your questions complement, not duplicate, existing ones`
    }

    return prompt
  },

  config: {
    maxTokens: 64000,
    temperature: 0.3
  }
}


// Export only used prompts
export const prompts = {
  conversationQuestions: conversationQuestionsPrompt,
  singleDifficultyQuestions: singleDifficultyQuestionsPrompt
}

// Export default
const aiPromptsModule = {
  prompts,
  PromptManager
}

export default aiPromptsModule
