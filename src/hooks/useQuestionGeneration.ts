import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAuthHeaders } from '../lib/supabase/auth-utils'

// Types
interface LoopData {
  id: string
  transcript: string
  videoTitle?: string
  title?: string
  startTime?: number
  start_time?: number
  endTime?: number
  end_time?: number
  segments: any[]
}

interface GenerateQuestionParams {
  difficulty: 'easy' | 'medium' | 'hard'
  loop: LoopData
  groupId: string
  sessionId: string
  customCount?: number // Optional custom count for preset-based generation
  customPromptId?: string // Optional custom prompt ID
}

interface GenerateAllQuestionsParams {
  loop: LoopData
  groupId: string
  sessionId: string
  presetCounts?: {
    easy: number
    medium: number
    hard: number
  } // Optional preset counts for intelligent generation
}

interface QuestionGenerationResult {
  difficulty: string
  questions: any[]
  count: number
  shareToken?: string
}

// Custom hooks
interface UseQuestionGenerationOptions {
  onSuccess?: (data: QuestionGenerationResult) => void
  onError?: (error: Error, difficulty: string) => void
}

export function useQuestionGeneration(options?: UseQuestionGenerationOptions) {
  return useMutation({
    mutationFn: async ({ difficulty, loop, groupId, sessionId, customCount, customPromptId }: GenerateQuestionParams) => {
      console.log(`Generating ${difficulty} questions for loop:`, loop, customCount ? `(${customCount} questions)` : '')

      if (!loop) {
        throw new Error('No loop data available')
      }

      const headers = await getAuthHeaders()
      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: loop.transcript,
          loop: {
            id: loop.id,
            videoTitle: loop.videoTitle || loop.title,
            startTime: loop.startTime || 0,
            endTime: loop.endTime || 0
          },
          segments: loop.segments,
          difficulty: difficulty,
          saveToDatabase: true,
          groupId: groupId,
          sessionId: sessionId,
          customCount: customCount, // Pass custom count to API for preset-based generation
          customPromptId: customPromptId // Pass custom prompt ID for specialized generation
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to generate ${difficulty} questions`)
      }

      const result = await response.json()
      return {
        difficulty,
        questions: result.data.questions,
        count: result.data.questions.length,
        shareToken: result.shareToken
      }
    },
    onSuccess: (data) => {
      toast.success(`Successfully generated ${data.count} ${data.difficulty} questions!`)
      options?.onSuccess?.(data)
    },
    onError: (error: any, variables) => {
      console.error(`Failed to generate ${variables.difficulty} questions:`, error)
      toast.error(`Failed to generate ${variables.difficulty} questions: ${error.message}`)
      options?.onError?.(error, variables.difficulty)
    }
  })
}

interface GenerateAllResult {
  difficulty: string
  count: number
  shareToken?: string
}

interface UseGenerateAllQuestionsOptions {
  onSuccess?: (data: GenerateAllResult[]) => void
  onError?: (error: Error) => void
}

export function useGenerateAllQuestions(options?: UseGenerateAllQuestionsOptions) {
  return useMutation({
    mutationFn: async ({ loop, groupId, sessionId, presetCounts }: GenerateAllQuestionsParams) => {
      console.log('Generating all questions for loop:', loop?.id, presetCounts ? 'with preset counts' : '')

      if (!loop) {
        throw new Error('No loop data available')
      }

      // Use sequential generation with deduplication - single API call with preset
      const headers = await getAuthHeaders()

      // Build preset object from presetCounts or use defaults
      const preset = {
        easy: presetCounts?.easy || 3,
        medium: presetCounts?.medium || 2,
        hard: presetCounts?.hard || 1
      }

      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: loop.transcript,
          loop: {
            id: loop.id,
            videoTitle: loop.videoTitle || loop.title,
            startTime: loop.startTime || loop.start_time || 0,
            endTime: loop.endTime || loop.end_time || 300
          },
          segments: loop.segments,
          preset: preset, // Use preset instead of difficulty
          saveToDatabase: true,
          groupId: groupId,
          sessionId: sessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate questions with sequential deduplication')
      }

      const result = await response.json()

      // Transform result to match expected format
      const transformedResults: Array<{ difficulty: string; count: number; shareToken: string }> = []
      if (result.data.actualDistribution) {
        const distribution = result.data.actualDistribution
        Object.entries(distribution).forEach(([difficulty, count]) => {
          if (typeof count === 'number' && count > 0) {
            transformedResults.push({
              difficulty,
              count,
              shareToken: result.shareToken // Same token for all difficulties from sequential generation
            })
          }
        })
      }

      return transformedResults
    },
    onSuccess: (results) => {
      const totalQuestions = results.reduce((sum, result) => sum + result.count, 0)
      toast.success(`Successfully generated ${totalQuestions} questions across all difficulties!`)
      options?.onSuccess?.(results)
    },
    onError: (error: any) => {
      console.error('Failed to generate all questions:', error)
      toast.error(`Failed to generate all questions: ${error.message}`)
      options?.onError?.(error)
    }
  })
}