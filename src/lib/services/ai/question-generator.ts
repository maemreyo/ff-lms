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
      targetQuestionCount
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
    targetQuestionCount: number
  ): Promise<any[]> {
    let attempts = 0;
    const maxAttempts = 3;
    let finalQuestions: any[] = [];
    let totalGenerated = 0;

    while (
      attempts < maxAttempts &&
      finalQuestions.length < targetQuestionCount
    ) {
      attempts++;

      try {
        // Calculate how many questions we still need
        const questionsNeeded = targetQuestionCount - finalQuestions.length;

        // For attempts 2+, be more explicit about what we need
        const adjustedMessages = [...messages];
        if (attempts > 1) {
          const systemPrompt = adjustedMessages[0].content;
          const userPrompt = adjustedMessages[1].content;

          adjustedMessages[1].content = `${userPrompt}\n\n🚨 CRITICAL: You MUST generate exactly ${questionsNeeded} questions with difficulty level "${difficulty}". Previous attempts generated insufficient questions. Ensure each question has proper structure with 4 options A-D and matches the requested difficulty level exactly.`;

          // Also enhance system prompt for clarity
          adjustedMessages[0].content = `${systemPrompt}\n\nIMPORTANT: Generate exactly the requested number of questions. Each question must have difficulty level "${difficulty}". Return valid JSON with questions array containing exactly ${questionsNeeded} questions.`;
        }

        const response = await this.provider.chat(adjustedMessages, {
          ...config,
          temperature: Math.max(
            0.1,
            (config.temperature || 0.3) - (attempts - 1) * 0.05
          ), // Reduce randomness with each attempt
        });

        const { PromptManager } = await import("../ai-prompts");
        const parsedResponse = PromptManager.parseJSONResponse(
          response.content
        );

        // Validate response structure
        if (
          !parsedResponse.questions ||
          !Array.isArray(parsedResponse.questions)
        ) {
          throw new Error("AI response missing questions array");
        }

        const questions = parsedResponse.questions;
        totalGenerated += questions.length;

        // Filter questions by the correct difficulty level and validate structure
        const correctDifficultyQuestions = AIUtils.filterValidQuestions(
          questions,
          difficulty
        );

        // Add new questions to our collection, avoiding duplicates
        for (const newQuestion of correctDifficultyQuestions) {
          if (finalQuestions.length >= targetQuestionCount) break;

          // Enhanced duplicate check based on question text similarity
          // Handle both multiple-choice and completion question formats
          const getQuestionText = (q: any) => {
            if (q.question) {
              return q.question.toLowerCase().trim();
            } else if (q.transcript) {
              // For completion questions, use transcript as the identifying text
              return q.transcript.toLowerCase().trim();
            }
            return '';
          };

          const questionText = getQuestionText(newQuestion);
          const isDuplicate = finalQuestions.some((existing) => {
            const existingText = getQuestionText(existing);
            return AIUtils.areQuestionsDuplicate(existingText, questionText);
          });

          if (!isDuplicate) {
            finalQuestions.push(newQuestion);
          }
        }

        console.log(
          `Attempt ${attempts}: Generated ${questions.length} total, ${correctDifficultyQuestions.length} valid ${difficulty} questions, collected: ${finalQuestions.length}/${targetQuestionCount}`
        );

        // If we have enough questions, break out of the loop
        if (finalQuestions.length >= targetQuestionCount) {
          break;
        }

        // If we're consistently getting wrong difficulty or poor quality, adjust approach
        if (attempts >= 2 && correctDifficultyQuestions.length === 0) {
          console.warn(
            `Attempt ${attempts}: No valid ${difficulty} questions generated. AI may be struggling with difficulty requirement.`
          );
        }
      } catch (error: any) {
        console.warn(`Attempt ${attempts} failed:`, error.message);
        if (attempts === maxAttempts) {
          // If we have some questions but not enough, use what we have
          if (finalQuestions.length > 0) {
            console.warn(
              `Using ${finalQuestions.length} questions instead of requested ${targetQuestionCount} after ${maxAttempts} attempts`
            );
            break;
          }
          throw new Error(
            `Question generation failed after ${maxAttempts} attempts: ${error.message}`
          );
        }
      }
    }

    // Take only the target number of questions
    finalQuestions = finalQuestions.slice(0, targetQuestionCount);

    if (finalQuestions.length === 0) {
      throw new Error(
        `Failed to generate any valid ${difficulty} questions after ${maxAttempts} attempts (total AI responses: ${totalGenerated})`
      );
    }

    if (finalQuestions.length < targetQuestionCount) {
      console.warn(
        `Generated ${finalQuestions.length} out of ${targetQuestionCount} requested ${difficulty} questions after ${attempts} attempts`
      );
    }

    console.log(
      `Generated ${finalQuestions.length} ${difficulty} questions (requested: ${targetQuestionCount})`
    );

    return finalQuestions;
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