/**
 * Enhanced error handling for AI operations
 */
export class AIErrorHandler {
  /**
   * Handle and transform AI service errors into user-friendly messages
   */
  static handleAIError(error: any): Error {
    if (error.status === 401) {
      return new Error("AI API key is invalid or expired");
    }

    if (error.status === 429) {
      return new Error(
        "AI service rate limit exceeded. Please try again later."
      );
    }

    if (error.status === 500) {
      return new Error("AI service is temporarily unavailable");
    }

    if (error.message?.includes("context_length_exceeded")) {
      return new Error(
        "Text is too long for AI processing. Please try with shorter text."
      );
    }

    return new Error(
      `AI processing failed: ${error.message || "Unknown error"}`
    );
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  /**
   * Get retry delay based on attempt number
   */
  static getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }
}