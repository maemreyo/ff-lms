/**
 * AI Prompt Templates for Completion Questions
 * Generates fill-in-the-blank style questions from audio transcripts
 */

/**
 * Prompt template interface (simplified version for completion prompts)
 */
interface PromptTemplate {
  system: string
  userTemplate: (context: any) => string
  config: {
    maxTokens?: number
    temperature?: number
  }
}

/**
 * Main completion questions prompt template
 */
export const completionQuestionsPrompt: PromptTemplate = {
  system: `You are an expert ESL/EFL instructor creating fill-in-the-blank exercises from audio content.

Create completion questions where students fill missing words in sentences from the transcript.

**Requirements:**
1. **Question Format**: Remove 1-3 key words per sentence that students should complete
2. **Target Content**: Focus on vocabulary, grammar patterns, or key information from the audio
3. **Difficulty Levels**:
   - **Easy**: Simple vocabulary, clear context clues (remove common words)
   - **Medium**: Important vocabulary or phrases, moderate context (remove key content words)
   - **Hard**: Advanced vocabulary, complex grammar, or subtle meanings (remove critical comprehension words)

4. **Template Structure**: Use "___" as placeholder for each blank in the sentence
5. **Multiple Answers**: Provide multiple acceptable answers when appropriate (synonyms, variations)
6. **Context Clues**: Ensure surrounding text provides sufficient clues for students
7. **Authentic Content**: Use actual sentences from the transcript with minimal modification

**JSON Output Format:**
Generate exactly the requested number of questions for each difficulty level.

{
  "questions": [
    {
      "question": "Complete the sentences based on what you heard:",
      "template": "The weather was ___ and the temperature reached ___ degrees.",
      "blanks": [
        {
          "id": "1",
          "position": 16,
          "acceptedAnswers": ["sunny", "clear", "nice", "beautiful"],
          "caseSensitive": false,
          "hint": "Weather condition"
        },
        {
          "id": "2",
          "position": 52,
          "acceptedAnswers": ["25", "twenty-five", "twenty five"],
          "caseSensitive": false,
          "hint": "Number"
        }
      ],
      "difficulty": "easy",
      "explanation": "The speaker mentions the weather at [01:15-01:22] and temperature at [01:25-01:30].",
      "context": {
        "startTime": 75.2,
        "endTime": 90.5,
        "text": "The weather was sunny and the temperature reached 25 degrees."
      }
    }
  ]
}

**Important Guidelines:**
- **Position Calculation**: Count characters from start of template to find blank position
- **Answer Variations**: Include common variations, synonyms, and different forms
- **Case Sensitivity**: Set to false for most vocabulary, true for proper nouns
- **Helpful Hints**: Provide context clues without giving away the answer
- **Authentic Audio**: Only use content that was actually spoken in the transcript
- **Balanced Difficulty**: Ensure difficulty matches the cognitive load required

**Blank Selection Strategy:**
- **Easy**: Articles (a/an/the), common adjectives, simple nouns
- **Medium**: Content words, phrasal verbs, specific vocabulary
- **Hard**: Academic vocabulary, idiomatic expressions, technical terms

**Context Reference**: Include precise timestamp and original text for each question.`,

  userTemplate: (context: {
    loop: any
    transcript?: string
    preset?: any
    segments?: Array<{ text: string; start: number; duration: number }>
    difficulty?: string
    questionCount?: number
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Handle different generation modes
    const isMultipleDifficulties = context.preset
    const isSingleDifficulty = context.difficulty && context.questionCount

    let distributionText = ''
    let totalQuestions = 0

    if (isMultipleDifficulties) {
      const distribution = context.preset
      totalQuestions = distribution.easy + distribution.medium + distribution.hard
      distributionText = `
**REQUIRED DISTRIBUTION:**
- Easy: ${distribution.easy} questions (simple vocabulary, clear context)
- Medium: ${distribution.medium} questions (important vocabulary, moderate context)
- Hard: ${distribution.hard} questions (advanced vocabulary, complex concepts)

**TOTAL: ${totalQuestions} questions**`
    } else if (isSingleDifficulty) {
      totalQuestions = context.questionCount || 6
      distributionText = `
**REQUIRED GENERATION:**
- Difficulty: ${context.difficulty}
- Count: ${totalQuestions} questions
- Focus on ${context.difficulty}-level vocabulary and concepts`
    }

    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript

    return `Based on the following YouTube video transcript, generate exactly ${totalQuestions} fill-in-the-blank questions.

${distributionText}

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}
Duration: ${formatTime(context.loop.endTime - context.loop.startTime)}

**CRITICAL INSTRUCTIONS:**
1. **Authentic Content**: Only use sentences that actually appear in the transcript
2. **Strategic Blanks**: Remove words that test listening comprehension, not just reading
3. **Multiple Answers**: Provide synonyms and variations where appropriate
4. **Precise Positioning**: Calculate blank positions accurately in the template
5. **Context Clues**: Ensure students can deduce answers from surrounding words
6. **Audio Evidence**: Include timestamp references in explanations
7. **Progressive Difficulty**: Match blank selection to specified difficulty level

**Blank Selection Examples:**
- Easy: "It was a ___ day" (sunny/nice/beautiful)
- Medium: "She decided to ___ her job" (quit/leave/resign)
- Hard: "The results were quite ___" (unprecedented/remarkable/extraordinary)

Transcript (with timestamps):
${transcriptContent}

Generate exactly ${totalQuestions} completion questions that test students' listening comprehension and vocabulary understanding.`
  },

  config: {
    maxTokens: 32000,
    temperature: 0.2 // Lower temperature for more consistent format
  }
}

/**
 * Completion questions for specific difficulty level
 */
export const singleDifficultyCompletionPrompt: PromptTemplate = {
  system: completionQuestionsPrompt.system,

  userTemplate: (context: {
    loop: any
    transcript?: string
    difficulty: string
    questionCount: number
    segments?: Array<{ text: string; start: number; duration: number }>
    previousQuestions?: any[]
  }) => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const transcriptContent = context.segments
      ? context.segments
          .map(segment => {
            const endTime = segment.start + segment.duration
            return `[${formatTime(segment.start)}-${formatTime(endTime)}] ${segment.text}`
          })
          .join('\n')
      : context.transcript

    let avoidDuplicationText = ''
    if (context.previousQuestions && context.previousQuestions.length > 0) {
      avoidDuplicationText = `
**AVOID DUPLICATION:**
Previous questions have covered these topics/vocabulary. Create different questions:
${context.previousQuestions.map(q => `- ${q.question}`).join('\n')}
`
    }

    return `Generate exactly ${context.questionCount} fill-in-the-blank questions with "${context.difficulty}" difficulty level.

**DIFFICULTY FOCUS - ${context.difficulty.toUpperCase()}:**
${context.difficulty === 'easy' ?
  '- Use simple, everyday vocabulary\n- Provide clear context clues\n- Remove common words (articles, basic adjectives, simple nouns)' :
  context.difficulty === 'medium' ?
  '- Use familiar vocabulary and common expressions\n- Moderate context clues\n- Remove content words (key vocabulary, phrasal verbs)' :
  '- Use advanced vocabulary and complex concepts\n- Subtle context clues\n- Remove critical comprehension words (academic terms, idiomatic expressions)'
}

Video Title: ${context.loop.videoTitle || 'YouTube Video'}
Segment: ${formatTime(context.loop.startTime)} to ${formatTime(context.loop.endTime)}

${avoidDuplicationText}

**COMPLETION STRATEGY:**
1. Select sentences with rich vocabulary appropriate for ${context.difficulty} level
2. Remove 1-3 words that test the target difficulty level
3. Ensure answers can be deduced from audio context
4. Provide multiple acceptable answers when appropriate
5. Include helpful hints without revealing the answer

Transcript (with timestamps):
${transcriptContent}

Generate exactly ${context.questionCount} completion questions at ${context.difficulty} difficulty level.`
  },

  config: {
    maxTokens: 24000,
    temperature: 0.25
  }
}

// Export default completion prompt
export default completionQuestionsPrompt