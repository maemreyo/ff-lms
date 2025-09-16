import { CustomPrompt } from "./types";

/**
 * Database service for AI-related database operations
 */
export class AIDatabaseService {
  /**
   * Fetch custom prompt from database by ID
   */
  static async fetchCustomPrompt(
    customPromptId: string,
    supabaseClient?: any
  ): Promise<CustomPrompt | null> {
    if (!customPromptId) return null;

    try {
      if (!supabaseClient) {
        console.warn("No Supabase client provided for custom prompt fetch");
        return null;
      }

      // Remove 'custom-' prefix if present
      const cleanId = customPromptId.replace("custom-", "");

      const { data: promptData, error: promptError } = await supabaseClient
        .from("custom_prompts")
        .select("system_prompt, user_template, config")
        .eq("id", cleanId)
        .eq("is_active", true)
        .single();

      if (promptError) {
        console.warn("Failed to fetch custom prompt:", promptError);
        return null;
      }

      if (!promptData) {
        console.warn("Custom prompt not found:", customPromptId);
        return null;
      }

      console.log("✅ Custom prompt loaded:", customPromptId);
      return {
        system_prompt: promptData.system_prompt,
        user_template: promptData.user_template,
        config: promptData.config || { maxTokens: 16000, temperature: 0.3 },
      };
    } catch (error) {
      console.error("Error fetching custom prompt:", error);
      return null;
    }
  }
}