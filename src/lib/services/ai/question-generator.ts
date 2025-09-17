import {
  SavedLoop,
  DifficultyPreset,
  GeneratedQuestion,
  GeneratedQuestions,
  QuestionGenerationOptions,
  CustomPrompt,
  ChatMessage,
  AIProviderInterface,
} from "./types";
import { AIUtils } from "./utils";
import { AIDatabaseService } from "./database-service";

/**
 * Question generation service with enhanced retry logic and deduplication
 */
export class QuestionGenerator {
  private provider: AIProviderInterface;

  constructor(provider: AIProviderInterface) {
    this.provider = provider;
  }

  /**
   * Generate conversation questions from transcript text
   */
  async generateConversationQuestions(
    loop: SavedLoop,
    transcript: string,
    preset?: DifficultyPreset,
    options?: QuestionGenerationOptions
  ): Promise<GeneratedQuestions> {
    // Default to balanced preset for mixed difficulty questions
    const defaultPreset = { easy: 5, medium: 6, hard: 4 };
    const actualPreset = preset || defaultPreset;
    const totalQuestions =
      actualPreset.easy + actualPreset.medium + actualPreset.hard;

    let messages: ChatMessage[];
    let config: any;

    // Check if custom prompt is provided
    if (options?.customPrompt) {
      console.log(
        "🎯 Using custom prompt for conversation question generation"
      );

      const customPrompt = options.customPrompt;

      // Build transcript with timestamps if segments are available
      let transcriptWithTimestamps = transcript;
      if (options?.segments && options.segments.length > 0) {
        transcriptWithTimestamps = AIUtils.buildTranscriptWithTimestamps(
          options.segments
        );
      }

      // Substitute template variables in user_template
      const userPrompt = customPrompt.user_template
        .replace(/\{\{totalQuestions\}\}/g, totalQuestions.toString())
        .replace(/\{\{easyCount\}\}/g, actualPreset.easy.toString())
        .replace(/\{\{mediumCount\}\}/g, actualPreset.medium.toString())
        .replace(/\{\{hardCount\}\}/g, actualPreset.hard.toString())
        .replace(/\{\{videoTitle\}\}/g, loop.videoTitle || "YouTube Video")
        .replace(/\{\{transcriptWithTimestamps\}\}/g, transcriptWithTimestamps);

      messages = [
        { role: "system", content: customPrompt.system_prompt },
        { role: "user", content: userPrompt },
      ];

      config = {
        maxTokens: customPrompt.config?.maxTokens || 16000,
        temperature: customPrompt.config?.temperature || 0.3,
      };
    } else {
      // Use default prompt template
      const { prompts, PromptManager } = await import("../ai-prompts");
      const template = prompts.conversationQuestions;

      // Use segments if provided, otherwise fallback to transcript
      const promptData =
        options?.segments && options.segments.length > 0
          ? { loop, segments: options.segments, preset: actualPreset }
          : { loop, transcript, preset: actualPreset };

      messages = PromptManager.buildMessages(template, promptData);
      config = PromptManager.getConfig(template);
    }

    try {
      const response = await this.provider.chat(messages, config);
      const { PromptManager } = await import("../ai-prompts");
      const parsedResponse = PromptManager.parseJSONResponse(response.content);

      // Validate response structure
      if (
        !parsedResponse.questions ||
        !Array.isArray(parsedResponse.questions)
      ) {
        throw new Error("AI response missing questions array");
      }

      // Validate we have the correct number of questions
      const questions = parsedResponse.questions;
      if (questions.length !== totalQuestions) {
        console.warn(
          `Expected ${totalQuestions} questions but got ${questions.length}. Adjusting...`
        );
      }

      // Validate difficulty distribution
      const easyCount = questions.filter(
        (q: any) => q.difficulty === "easy"
      ).length;
      const mediumCount = questions.filter(
        (q: any) => q.difficulty === "medium"
      ).length;
      const hardCount = questions.filter(
        (q: any) => q.difficulty === "hard"
      ).length;

      console.log(
        `Question distribution - Easy: ${easyCount}, Medium: ${mediumCount}, Hard: ${hardCount}`
      );
      console.log(
        `Expected distribution - Easy: ${actualPreset.easy}, Medium: ${actualPreset.medium}, Hard: ${actualPreset.hard}`
      );

      return {
        questions: questions
          .slice(0, totalQuestions)
          .map((q: any, index: number) => {
            // Validate question structure
            if (!AIUtils.validateQuestionStructure(q, index)) {
              throw new Error(`Invalid question structure at index ${index}`);
            }

            return this.processGeneratedQuestion(q, loop, index, totalQuestions);
          }),
        preset: actualPreset,
        actualDistribution: {
          easy: easyCount,
          medium: mediumCount,
          hard: hardCount,
        },
      };
    } catch (error: any) {
      throw new Error(
        `Conversation questions generation failed: ${error.message}`
      );
    }
  }

  /**
   * Generate questions for a single difficulty level (max 6 questions)
   */
  async generateSingleDifficultyQuestions(
    loop: SavedLoop,
    transcript: string,
    difficulty: "easy" | "medium" | "hard",
    options?: QuestionGenerationOptions
  ): Promise<GeneratedQuestions> {
    // Use custom question count from options, default to 6 if not provided
    const targetQuestionCount = options?.questionCount || 6;

    let messages: ChatMessage[];
    let config: any;

    // Check if custom prompt is provided
    if (options?.customPrompt) {
      console.log("🎯 Using custom prompt for question generation");

      const customPrompt = options.customPrompt;

      // Build transcript with timestamps if segments are available
      let transcriptWithTimestamps = transcript;
      if (options?.segments && options.segments.length > 0) {
        transcriptWithTimestamps = AIUtils.buildTranscriptWithTimestamps(
          options.segments
        );
      }

      // Use our custom template processor instead of Handlebars
      const { TemplateProcessor } = await import("../../utils/template-processor");

      // Prepare template data
      const templateData = {
        totalQuestions: targetQuestionCount,
        easyCount: difficulty === "easy" ? targetQuestionCount : 0,
        mediumCount: difficulty === "medium" ? targetQuestionCount : 0,
        hardCount: difficulty === "hard" ? targetQuestionCount : 0,
        videoTitle: loop.videoTitle || "YouTube Video",
        transcriptWithTimestamps,
        previousQuestions: options?.previousQuestions || [],
      };

      // Generate user prompt using our template processor
      const userPrompt = TemplateProcessor.process(
        customPrompt.user_template,
        templateData
      );

      messages = [
        { role: "system", content: customPrompt.system_prompt },
        { role: "user", content: userPrompt },
      ];

      config = {
        maxTokens: customPrompt.config?.maxTokens || 32000,
        temperature: customPrompt.config?.temperature || 0.3,
      };
    } else {
      // Use default prompt template
      const { prompts, PromptManager } = await import("../ai-prompts");
      const template = prompts.singleDifficultyQuestions;

      // Use segments if provided, otherwise fallback to transcript
      const promptData =
        options?.segments && options.segments.length > 0
          ? {
              loop,
              segments: options.segments,
              difficulty,
              questionCount: targetQuestionCount,
              previousQuestions: options?.previousQuestions,
            }
          : {
              loop,
              transcript,
              difficulty,
              questionCount: targetQuestionCount,
              previousQuestions: options?.previousQuestions,
            };

      messages = PromptManager.buildMessages(template, promptData);
      config = PromptManager.getConfig(template);
    }

    // Console log the full prompt after processing
    console.log("\n=== FULL PROMPT AFTER CUSTOM TEMPLATE PROCESSING ===");
    console.log(
      "System Message:",
      messages.find((m) => m.role === "system")?.content
    );
    console.log(
      "\nUser Message:",
      messages.find((m) => m.role === "user")?.content
    );
    console.log("=== END PROMPT LOG ===\n");

    // Enhanced retry mechanism with progressive approach
    const finalQuestions = await this.generateQuestionsWithRetry(
      messages,
      config,
      difficulty,
      targetQuestionCount,
      options?.previousQuestions || []
    );

    return {
      questions: finalQuestions.map((q: any, index: number) =>
        this.processGeneratedQuestion(q, loop, index, finalQuestions.length, difficulty)
      ),
      preset: {
        easy: difficulty === "easy" ? finalQuestions.length : 0,
        medium: difficulty === "medium" ? finalQuestions.length : 0,
        hard: difficulty === "hard" ? finalQuestions.length : 0,
      },
      actualDistribution: {
        easy: difficulty === "easy" ? finalQuestions.length : 0,
        medium: difficulty === "medium" ? finalQuestions.length : 0,
        hard: difficulty === "hard" ? finalQuestions.length : 0,
      },
    };
  }

  /**
   * Enhanced question generation with automatic custom prompt resolution
   */
  async generateQuestionsWithCustomPrompt(
    loop: SavedLoop,
    transcript: string,
    difficulty: "easy" | "medium" | "hard",
    customPromptId?: string,
    questionCount?: number,
    segments?: Array<{ text: string; start: number; duration: number }>,
    supabaseClient?: any
  ): Promise<GeneratedQuestions> {
    let customPrompt: CustomPrompt | undefined = undefined;

    // Fetch custom prompt if ID is provided
    if (customPromptId) {
      const fetchedPrompt = await AIDatabaseService.fetchCustomPrompt(
        customPromptId,
        supabaseClient
      );
      customPrompt = fetchedPrompt || undefined;
      if (!customPrompt) {
        console.warn(
          `Custom prompt ${customPromptId} not found, falling back to default`
        );
      }
    }

    // Use the existing method with custom prompt
    return this.generateSingleDifficultyQuestions(
      loop,
      transcript,
      difficulty,
      {
        segments,
        customPrompt,
        questionCount: questionCount || 6,
      }
    );
  }

  /**
   * Sequential question generation with deduplication to avoid similar questions across difficulties
   */
  async generateQuestionsSequentiallyWithDeduplication(
    loop: SavedLoop,
    transcript: string,
    preset: DifficultyPreset,
    customPromptId?: string,
    segments?: Array<{ text: string; start: number; duration: number }>,
    supabaseClient?: any
  ): Promise<{
    easy: GeneratedQuestions | null;
    medium: GeneratedQuestions | null;
    hard: GeneratedQuestions | null;
    allQuestions: GeneratedQuestion[];
  }> {
    console.log(
      "🔄 Starting sequential question generation with deduplication..."
    );

    const allGeneratedQuestions: GeneratedQuestion[] = [];
    let easyQuestions: GeneratedQuestions | null = null;
    let mediumQuestions: GeneratedQuestions | null = null;
    let hardQuestions: GeneratedQuestions | null = null;

    // Step 1: Generate Easy Questions (if requested)
    if (preset.easy > 0) {
      console.log(`📝 Generating ${preset.easy} easy questions...`);
      try {
        easyQuestions = await this.generateSingleDifficultyQuestions(
          loop,
          transcript,
          "easy",
          {
            segments,
            questionCount: preset.easy,
            previousQuestions: [], // No previous questions for first generation
            customPrompt: customPromptId
              ? (await AIDatabaseService.fetchCustomPrompt(
                  customPromptId,
                  supabaseClient
                )) || undefined
              : undefined,
          }
        );
        allGeneratedQuestions.push(...easyQuestions.questions);
        console.log(
          `✅ Generated ${easyQuestions.questions.length} easy questions`
        );
      } catch (error) {
        console.error("❌ Failed to generate easy questions:", error);
      }
    }

    // Step 2: Generate Medium Questions (if requested) with easy questions as deduplication context
    if (preset.medium > 0) {
      console.log(
        `📝 Generating ${preset.medium} medium questions with deduplication context...`
      );
      try {
        mediumQuestions = await this.generateSingleDifficultyQuestions(
          loop,
          transcript,
          "medium",
          {
            segments,
            questionCount: preset.medium,
            previousQuestions: allGeneratedQuestions, // Pass easy questions to avoid duplicates
            customPrompt: customPromptId
              ? (await AIDatabaseService.fetchCustomPrompt(
                  customPromptId,
                  supabaseClient
                )) || undefined
              : undefined,
          }
        );
        allGeneratedQuestions.push(...mediumQuestions.questions);
        console.log(
          `✅ Generated ${mediumQuestions.questions.length} medium questions`
        );
      } catch (error) {
        console.error("❌ Failed to generate medium questions:", error);
      }
    }

    // Step 3: Generate Hard Questions (if requested) with easy+medium questions as deduplication context
    if (preset.hard > 0) {
      console.log(
        `📝 Generating ${preset.hard} hard questions with deduplication context...`
      );
      try {
        hardQuestions = await this.generateSingleDifficultyQuestions(
          loop,
          transcript,
          "hard",
          {
            segments,
            questionCount: preset.hard,
            previousQuestions: allGeneratedQuestions, // Pass easy+medium questions to avoid duplicates
            customPrompt: customPromptId
              ? (await AIDatabaseService.fetchCustomPrompt(
                  customPromptId,
                  supabaseClient
                )) || undefined
              : undefined,
          }
        );
        allGeneratedQuestions.push(...hardQuestions.questions);
        console.log(
          `✅ Generated ${hardQuestions.questions.length} hard questions`
        );
      } catch (error) {
        console.error("❌ Failed to generate hard questions:", error);
      }
    }

    console.log(
      `🎯 Sequential generation complete. Total: ${allGeneratedQuestions.length} questions`
    );

    return {
      easy: easyQuestions,
      medium: mediumQuestions,
      hard: hardQuestions,
      allQuestions: allGeneratedQuestions,
    };
  }

  /**
   * Enhanced retry mechanism with progressive approach
   */
  private async generateQuestionsWithRetry(
    messages: ChatMessage[],
    config: any,
    difficulty: string,
    targetQuestionCount: number,
    previousQuestions: GeneratedQuestion[] = []
  ): Promise<any[]> {
    const retryConfig = {
      maxAttempts: 5,
      baseDelay: 1000, // 1 second base delay
      delayMultiplier: 1.5, // Progressive delay multiplier
      minSuccessRate: 0.5 // Minimum 50% success rate to accept partial results
    };

    let attempts = 0;
    let finalQuestions: any[] = [];
    let totalGenerated = 0;

    while (
      attempts < retryConfig.maxAttempts &&
      finalQuestions.length < targetQuestionCount
    ) {
      attempts++;

      try {
        // Add progressive delay to avoid rate limits (skip delay on first attempt)
        if (attempts > 1) {
          const delay = this.calculateRetryDelay(attempts, retryConfig.baseDelay, retryConfig.delayMultiplier);
          console.log(`⏳ Waiting ${delay}ms before attempt ${attempts}...`);
          await this.sleep(delay);
        }

        // Calculate how many questions we still need
        const questionsNeeded = targetQuestionCount - finalQuestions.length;

        // Prepare enhanced messages for retry attempts
        const adjustedMessages = this.prepareRetryMessages(
          messages, 
          attempts, 
          questionsNeeded, 
          difficulty
        );

        // Make AI request with adjusted temperature
        const response = await this.makeAIRequest(adjustedMessages, config, attempts);
        
        const { PromptManager } = await import("../ai-prompts");
        const parsedResponse = PromptManager.parseJSONResponse(response.content);

        // Validate and process response
        const processedQuestions = await this.processAIResponse(
          parsedResponse,
          difficulty,
          finalQuestions,
          previousQuestions,
          questionsNeeded
        );

        finalQuestions.push(...processedQuestions.newQuestions);
        totalGenerated += processedQuestions.totalGenerated;

        console.log(
          `Attempt ${attempts}: Generated ${processedQuestions.totalGenerated} total, ${processedQuestions.validQuestions} valid ${difficulty} questions, collected: ${finalQuestions.length}/${targetQuestionCount}`
        );

        // If we have enough questions, break out of the loop
        if (finalQuestions.length >= targetQuestionCount) {
          break;
        }

        // Check for consistent failures and provide warnings
        if (attempts >= 3 && processedQuestions.validQuestions === 0) {
          console.warn(
            `Attempt ${attempts}: No valid ${difficulty} questions generated. AI may be struggling with difficulty requirement.`
          );
        }

      } catch (error: any) {
        console.warn(`Attempt ${attempts} failed:`, error.message);
        
        if (attempts === retryConfig.maxAttempts) {
          return this.handleFinalFailure(
            finalQuestions, 
            targetQuestionCount, 
            difficulty, 
            previousQuestions, 
            retryConfig.maxAttempts, 
            error
          );
        }
      }
    }

    return this.finalizeFinalQuestions(finalQuestions, targetQuestionCount, difficulty, retryConfig.minSuccessRate);
  }

  /**
   * Calculate progressive delay for retry attempts
   */
  private calculateRetryDelay(attempt: number, baseDelay: number, multiplier: number): number {
    return Math.floor(baseDelay * Math.pow(multiplier, attempt - 2));
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Prepare enhanced messages for retry attempts with creative prompting
   */
  private prepareRetryMessages(
    originalMessages: ChatMessage[], 
    attempt: number, 
    questionsNeeded: number, 
    difficulty: string
  ): ChatMessage[] {
    if (attempt === 1) {
      return [...originalMessages];
    }

    const adjustedMessages = [...originalMessages];
    const systemPrompt = adjustedMessages[0].content;
    const userPrompt = adjustedMessages[1].content;

    // Progressive creativity enhancement for each attempt
    const creativityPrompts = this.getCreativityPrompts(attempt, questionsNeeded, difficulty);
    
    adjustedMessages[1].content = `${userPrompt}\n\n${creativityPrompts.userEnhancement}`;
    adjustedMessages[0].content = `${systemPrompt}\n\n${creativityPrompts.systemEnhancement}`;

    return adjustedMessages;
  }

  /**
   * Get creativity prompts based on attempt number
   */
  private getCreativityPrompts(attempt: number, questionsNeeded: number, difficulty: string) {
    const attemptStrategies = {
      2: {
        userEnhancement: `🚨 CRITICAL: Previous attempt had too many duplicate questions. You MUST be MORE CREATIVE and find COMPLETELY DIFFERENT aspects of the content to ask about. Generate exactly ${questionsNeeded} questions with difficulty level "${difficulty}". Try different question types (vocabulary, tone, inference, main idea) and different parts of the transcript.`,
        systemEnhancement: `IMPORTANT: Generate exactly the requested number of questions. Each question must have difficulty level "${difficulty}". Be creative to avoid duplicates - explore different aspects, question types, and content angles.`
      },
      3: {
        userEnhancement: `🚨 ATTEMPT 3: Previous attempts failed due to duplicates. BE EXTREMELY CREATIVE and ask about:\n- Different speaker emotions/attitudes\n- Vocabulary meanings in context\n- Song structure/repetition patterns\n- Metaphorical interpretations\n- Different timeframes/verses\n- Literary devices used\n\nGenerate exactly ${questionsNeeded} questions with difficulty level "${difficulty}". Focus on COMPLETELY UNEXPLORED aspects of the content.`,
        systemEnhancement: `CRITICAL: This is attempt 3. Generate exactly ${questionsNeeded} questions with maximum creativity. Each question must be unique and explore different content angles. Use diverse question types and focus on unexplored aspects.`
      },
      4: {
        userEnhancement: `🚨 ATTEMPT 4: Maximum creativity required. Explore these ADVANCED angles:\n- Implicit meanings and subtext\n- Cultural or contextual references\n- Emotional progression throughout the content\n- Symbolic interpretations\n- Comparative analysis within the content\n- Stylistic choices and their effects\n\nGenerate exactly ${questionsNeeded} questions with difficulty level "${difficulty}". Think outside the box!`,
        systemEnhancement: `MAXIMUM CREATIVITY REQUIRED: This is attempt 4. Generate exactly ${questionsNeeded} highly creative questions. Focus on advanced analysis, implicit meanings, and unique perspectives. Each question must be distinctly different.`
      },
      5: {
        userEnhancement: `🚨 FINAL ATTEMPT: Use ANY creative approach necessary:\n- Abstract interpretations\n- Cross-referential analysis\n- Philosophical implications\n- Artistic techniques\n- Personal response questions\n- Hypothetical scenarios based on content\n\nGenerate exactly ${questionsNeeded} questions with difficulty level "${difficulty}". This is the last chance - be maximally creative and unique!`,
        systemEnhancement: `FINAL ATTEMPT: Generate exactly ${questionsNeeded} questions using maximum creativity. Accept any valid interpretation or angle. Each question must be unique. Prioritize uniqueness over perfection.`
      }
    };

    return attemptStrategies[attempt as keyof typeof attemptStrategies] || attemptStrategies[5];
  }

  /**
   * Make AI request with adjusted temperature based on attempt
   */
  private async makeAIRequest(messages: ChatMessage[], config: any, attempt: number) {
    const adjustedTemperature = Math.max(
      0.1,
      (config.temperature || 0.3) + (attempt - 1) * 0.1 // Increase creativity with each attempt
    );

    return await this.provider.chat(messages, {
      ...config,
      temperature: adjustedTemperature,
    });
  }

  /**
   * Process AI response and filter for valid, non-duplicate questions
   */
  private async processAIResponse(
    parsedResponse: any,
    difficulty: string,
    finalQuestions: any[],
    previousQuestions: GeneratedQuestion[],
    questionsNeeded: number
  ) {
    // Validate response structure
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error("AI response missing questions array");
    }

    const questions = parsedResponse.questions;
    const correctDifficultyQuestions = AIUtils.filterValidQuestions(questions, difficulty);
    const newQuestions: any[] = [];

    // Add new questions to our collection, avoiding duplicates
    for (const newQuestion of correctDifficultyQuestions) {
      if (newQuestions.length >= questionsNeeded) break;

      const questionText = this.extractQuestionText(newQuestion);
      
      if (this.isQuestionUnique(questionText, finalQuestions, previousQuestions)) {
        newQuestions.push(newQuestion);
      } else {
        console.log(`🚫 Skipping duplicate question (matches previous): "${questionText.substring(0, 60)}..."`);
      }
    }

    return {
      newQuestions,
      totalGenerated: questions.length,
      validQuestions: correctDifficultyQuestions.length
    };
  }

  /**
   * Extract question text for comparison (handles both multiple-choice and completion formats)
   */
  private extractQuestionText(question: any): string {
    if (question.question) {
      return question.question.toLowerCase().trim();
    } else if (question.transcript) {
      // For completion questions, use transcript as the identifying text
      return question.transcript.toLowerCase().trim();
    }
    return '';
  }

  /**
   * Check if question is unique compared to existing questions
   */
  private isQuestionUnique(
    questionText: string, 
    finalQuestions: any[], 
    previousQuestions: GeneratedQuestion[]
  ): boolean {
    // Check for duplicates against current generation
    const isDuplicateInCurrent = finalQuestions.some((existing) => {
      const existingText = this.extractQuestionText(existing);
      return AIUtils.areQuestionsDuplicate(existingText, questionText);
    });

    // Check for duplicates against previous questions from earlier difficulty levels
    const isDuplicateInPrevious = previousQuestions.some((existing) => {
      const existingText = this.extractQuestionText(existing);
      return AIUtils.areQuestionsDuplicate(existingText, questionText);
    });

    return !isDuplicateInCurrent && !isDuplicateInPrevious;
  }

  /**
   * Handle final failure cases with appropriate error messages
   */
  private handleFinalFailure(
    finalQuestions: any[],
    targetQuestionCount: number,
    difficulty: string,
    previousQuestions: GeneratedQuestion[],
    maxAttempts: number,
    error: any
  ): any[] {
    // If we have some questions but not enough, use what we have
    if (finalQuestions.length > 0) {
      console.warn(
        `Using ${finalQuestions.length} questions instead of requested ${targetQuestionCount} after ${maxAttempts} attempts`
      );
      return finalQuestions;
    }

    // If we have previous questions and this is a hard difficulty, it might be acceptable to skip
    if (previousQuestions.length > 0 && difficulty === 'hard') {
      console.warn(
        `⚠️ Could not generate any new ${difficulty} questions due to extensive duplicates. This may be acceptable if there's limited content diversity for this difficulty level.`
      );
      throw new Error(
        `No unique ${difficulty} questions available - content may be too limited for this difficulty level`
      );
    }

    throw new Error(
      `Question generation failed after ${maxAttempts} attempts: ${error.message}`
    );
  }

  /**
   * Finalize and validate the final questions collection
   */
  private finalizeFinalQuestions(
    finalQuestions: any[], 
    targetQuestionCount: number, 
    difficulty: string, 
    minSuccessRate: number
  ): any[] {
    // Take only the target number of questions
    const trimmedQuestions = finalQuestions.slice(0, targetQuestionCount);

    if (trimmedQuestions.length === 0) {
      throw new Error(
        `Failed to generate any valid ${difficulty} questions after maximum attempts`
      );
    }

    if (trimmedQuestions.length < targetQuestionCount) {
      const successRate = trimmedQuestions.length / targetQuestionCount;
      
      if (successRate >= minSuccessRate) {
        console.warn(
          `✅ Partial success: Generated ${trimmedQuestions.length} out of ${targetQuestionCount} requested ${difficulty} questions (${Math.round(successRate * 100)}%)`
        );
      } else {
        console.warn(
          `⚠️ Low success rate: Generated only ${trimmedQuestions.length} out of ${targetQuestionCount} requested ${difficulty} questions (${Math.round(successRate * 100)}%)`
        );
      }
    }

    console.log(
      `Generated ${trimmedQuestions.length} ${difficulty} questions (requested: ${targetQuestionCount})`
    );

    return trimmedQuestions;
  }

  /**
   * Process and format a generated question
   */
  private processGeneratedQuestion(
    q: any,
    loop: SavedLoop,
    index: number,
    totalQuestions: number,
    forceDifficulty?: string
  ): GeneratedQuestion {
    // Determine question type based on structure
    const questionType = this.detectQuestionType(q);

    // Common fields for all question types
    const baseQuestion = {
      id: q.id || `q_${loop.id}_${forceDifficulty || q.difficulty}_${index + 1}`,
      difficulty: forceDifficulty || q.difficulty || 'medium',
      explanation: q.explanation || "No explanation provided",
      timestamp: q.timestamp || q.audioSegment?.start || loop.startTime + (index * (loop.endTime - loop.startTime)) / totalQuestions,
    };

    // Process based on question type
    switch (questionType) {
      case 'multiple-choice':
        return this.processMultipleChoiceQuestion(q, loop, baseQuestion);

      case 'completion':
        return this.processCompletionQuestion(q, baseQuestion);

      default:
        // For any other question type, preserve original structure with minimal processing
        return {
          ...baseQuestion,
          type: q.type || questionType,
          ...q // Preserve all original fields
        } as GeneratedQuestion;
    }
  }

  /**
   * Detect question type based on structure
   */
  private detectQuestionType(q: any): string {
    // Multiple choice: has options array and correctAnswer
    if (q.options && Array.isArray(q.options) && q.correctAnswer && q.question) {
      return 'multiple-choice';
    }

    // Completion: has blanks, transcript, or exerciseSubType
    if (q.type === 'fill-blank' || q.exerciseSubType || q.blanks || q.transcript) {
      return 'completion';
    }

    // Future question types can be added here:
    // if (q.pairs && q.type === 'matching') return 'matching';
    // if (q.items && q.type === 'drag-drop') return 'drag-drop';
    // if (q.statement && q.type === 'true-false') return 'true-false';

    // Default fallback
    return q.type || 'unknown';
  }

  /**
   * Process multiple-choice question with shuffling
   */
  private processMultipleChoiceQuestion(q: any, loop: SavedLoop, baseQuestion: any): GeneratedQuestion {
    const correctAnswerIndex = ["A", "B", "C", "D"].indexOf(q.correctAnswer || "A");
    const correctOption = q.options[correctAnswerIndex] || q.options[0];

    // Create shuffled array with seeded randomization for consistency
    const seed = loop.id + baseQuestion.difficulty + baseQuestion.id;
    const shuffledData = AIUtils.shuffleOptionsWithSeed(q.options, seed);
    const newCorrectIndex = shuffledData.options.indexOf(correctOption);
    const newCorrectAnswer = ["A", "B", "C", "D"][newCorrectIndex] as "A" | "B" | "C" | "D";

    return {
      ...baseQuestion,
      question: q.question,
      options: shuffledData.options,
      correctAnswer: newCorrectAnswer,
      type: [
        "main_idea",
        "specific_detail",
        "vocabulary_in_context",
        "inference",
        "speaker_tone",
        "language_function",
      ].includes(q.type) ? q.type : "specific_detail",
    } as GeneratedQuestion;
  }

  /**
   * Process completion question with minimal changes
   */
  private processCompletionQuestion(q: any, baseQuestion: any): GeneratedQuestion {
    return {
      ...baseQuestion,
      type: q.type || 'completion',
      content: {
        template: q.transcript || '',
        blanks: q.blanks || [],
      },
      question: q.transcript || '',
      ...q // Preserve all original fields
    } as GeneratedQuestion;
  }
}