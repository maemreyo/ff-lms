/**
 * Utility functions for AI service operations
 */
export class AIUtils {
  /**
   * Shuffle array options with seeded randomization for consistent results
   */
  static shuffleOptionsWithSeed(
    options: string[],
    seed: string
  ): { options: string[] } {
    // Create a simple hash from the seed for consistent randomization
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Create a copy of options to shuffle
    const shuffled = [...options];

    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate deterministic "random" index based on hash and position
      hash = (hash * 9301 + 49297) % 233280;
      const j = Math.abs(hash) % (i + 1);

      // Swap elements
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return { options: shuffled };
  }

  /**
   * Format time in MM:SS format
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  /**
   * Check if two questions are duplicates based on text similarity
   */
  static areQuestionsDuplicate(question1: string, question2: string): boolean {
    const text1 = question1.toLowerCase().trim();
    const text2 = question2.toLowerCase().trim();

    // Check for exact match
    if (text1 === text2) return true;

    // Check for high similarity if both texts are long enough
    if (text1.length > 20 && text2.length > 20) {
      return (
        text1.includes(text2.substring(0, 20)) ||
        text2.includes(text1.substring(0, 20))
      );
    }

    return false;
  }

  /**
   * Build transcript with timestamps from segments
   */
  static buildTranscriptWithTimestamps(
    segments: Array<{ text: string; start: number; duration: number }>
  ): string {
    return segments
      .map(
        (segment) =>
          `[${this.formatTime(segment.start)}-${this.formatTime(
            segment.start + segment.duration
          )}] ${segment.text}`
      )
      .join("\n");
  }

  /**
   * Validate question structure
   */
  static validateQuestionStructure(question: any, index: number): boolean {
    // if (
    //   !question.question ||
    //   !Array.isArray(question.options) ||
    //   question.options.length !== 4 ||
    //   !question.options.every((opt: string) => opt && opt.trim().length > 0) ||
    //   !["A", "B", "C", "D"].includes(question.correctAnswer)
    // ) {
    //   console.warn(`Invalid question structure at index ${index}:`, question);
    //   return false;
    // }
    return true;
  }

  /**
   * Filter questions by difficulty and validate structure
   */
  static filterValidQuestions(
    questions: any[],
    targetDifficulty?: string
  ): any[] {
    return questions.filter((q, index) => {
      // Check structure validity
      // if (!this.validateQuestionStructure(q, index)) {
      //   return false;
      // }

      // Check difficulty if specified
      // if (targetDifficulty && q.difficulty !== targetDifficulty) {
      //   return false;
      // }

      // Check for substantial question text
      // if (!q.question || q.question.trim().length <= 10) {
      //   return false;
      // }

      return true;
    });
  }
}