'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useGenerateAllQuestions,
  useQuestionGeneration
} from '../../../../../../hooks/useQuestionGeneration'
import { getAuthHeaders } from '../../../../../../lib/supabase/auth-utils'
import { useSharedQuestions } from './useSharedQuestions'
import { quizQueryKeys } from '../lib/query-keys'

interface GeneratingState {
  easy: boolean
  medium: boolean
  hard: boolean
  all: boolean
}

interface GeneratedCounts {
  easy: number
  medium: number
  hard: number
}

export function useGroupQuestionGeneration(groupId: string, sessionId: string) {
  const queryClient = useQueryClient()
  
  // Use shared questions hook for cross-page caching instead of local state
  const { 
    shareTokens: cachedShareTokens, 
    generatedCounts: cachedCounts,
    isLoading: questionsLoading,
    hasQuestions
  } = useSharedQuestions({ groupId, sessionId })

  const [generatingState, setGeneratingState] = useState<GeneratingState>({
    easy: false,
    medium: false,
    hard: false,
    all: false
  })

  // FIXED: Always use cached data instead of separate local state
  // Remove local state and always use cached values directly

  // New: Track current preset state
  const [currentPreset, setCurrentPreset] = useState<{
    id: string
    name: string
    distribution: GeneratedCounts
    createdAt: Date
  } | null>(null)

  // Load current preset from database on mount (preset is separate from questions)
  useEffect(() => {
    const loadExistingPreset = async () => {
      try {
        const headers = await getAuthHeaders()
        
        // Load preset (this doesn't change as frequently as questions)
        const presetResponse = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/preset`, {
          headers,
          credentials: 'include'
        })
        if (presetResponse.ok) {
          const presetData = await presetResponse.json()
          if (presetData.currentPreset) {
            setCurrentPreset({
              ...presetData.currentPreset,
              createdAt: new Date(presetData.currentPreset.createdAt)
            })
            console.log('📦 Loaded current preset from database:', presetData.currentPreset.name)
          }
        }
      } catch (error) {
        console.warn('Failed to load existing preset:', error)
      }
    }

    loadExistingPreset()
  }, [groupId, sessionId])

  // Function to save current preset to database
  const saveCurrentPreset = async (preset: {
    id: string
    name: string
    distribution: GeneratedCounts
    createdAt: Date
  } | null) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/preset`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ preset }),
      })
      
      if (response.ok) {
        console.log('Saved current preset to database')
      } else {
        console.warn('Failed to save preset to database')
      }
    } catch (error) {
      console.warn('Error saving preset to database:', error)
    }
  }

  // Single difficulty question generation mutation with custom count support
  const generateQuestionsMutation = useQuestionGeneration({
    onSuccess: data => {
      console.log(`Successfully generated ${data.count} ${data.difficulty} questions`)

      // 🔥 CRITICAL FIX: Invalidate cache when new questions generated
      queryClient.invalidateQueries({
        queryKey: quizQueryKeys.sessionQuestions(groupId, sessionId)
      })
      console.log('🔄 [useQuestionGeneration] Invalidated questions cache for new tokens')

      setGeneratingState(prev => ({ ...prev, [data.difficulty]: false }))
    },
    onError: (error, difficulty) => {
      setGeneratingState(prev => ({ ...prev, [difficulty]: false }))
    }
  })

  // Generate all questions mutation with preset support
  const generateAllQuestionsMutation = useGenerateAllQuestions({
    onSuccess: results => {
      console.log('Successfully generated all questions:', results)

      // 🔥 CRITICAL FIX: Invalidate cache when new questions generated  
      queryClient.invalidateQueries({
        queryKey: quizQueryKeys.sessionQuestions(groupId, sessionId)
      })
      console.log('🔄 [useQuestionGeneration] Invalidated questions cache for new preset tokens')

      setGeneratingState(prev => ({ ...prev, all: false }))
    },
    onError: () => {
      setGeneratingState(prev => ({ ...prev, all: false }))
    }
  })

  // New: Clear existing questions and reset state
  const clearExistingQuestions = async () => {
    console.log('Clearing existing questions from database')

    // Clear database questions only (preset will be updated after successful generation)
    const promises = []

    // Clear questions from database
    promises.push(
      (async () => {
        const headers = await getAuthHeaders()
        return fetch(`/api/groups/${groupId}/sessions/${sessionId}/questions`, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        })
      })().then(response => {
        if (response.ok) {
          return response.json().then(result => {
            console.log(`Successfully deleted ${result.deletedCount} question set(s) from database`)
          })
        } else {
          console.warn('Failed to delete questions from database:', response.statusText)
        }
      }).catch(error => {
        console.warn('Error deleting questions from database:', error)
      })
    )

    // Wait for delete operation but don't throw on error
    try {
      await Promise.all(promises)
      
      // Invalidate cache after deletion
      queryClient.invalidateQueries({
        queryKey: quizQueryKeys.sessionQuestions(groupId, sessionId)
      })
      console.log('🔄 [useQuestionGeneration] Invalidated questions cache after deletion')
    } catch (error) {
      console.warn('Question deletion failed:', error)
      // Don't throw - we don't want to break the UI flow
    }
  }

  // New: Check if preset replacement is needed
  const needsPresetReplacement = (presetId: string): boolean => {
    return currentPreset ? currentPreset.id !== presetId : false
  }

  const handleGenerateQuestions = async (
    difficulty: 'easy' | 'medium' | 'hard', 
    loopData: any, 
    customCount?: number,
    customPromptId?: string
  ) => {
    if (!loopData) {
      toast.error('No loop data available for question generation')
      return
    }

    const loop = {
      id: loopData.id,
      videoTitle: loopData.videoTitle || 'Practice Session',
      startTime: loopData.startTime || 0,
      endTime: loopData.endTime || 300,
      transcript: loopData.transcript || '',
      segments: loopData.segments || []
    }

    setGeneratingState(prev => ({ ...prev, [difficulty]: true }))
    
    // Use custom count and prompt if provided, otherwise default generation
    const generationParams = { 
      difficulty, 
      loop, 
      groupId, 
      sessionId,
      ...(customCount && { customCount }),
      ...(customPromptId && { customPromptId })
    }
      
    await generateQuestionsMutation.mutateAsync(generationParams)
  }

  const handleGenerateAllQuestions = async (loopData: any, presetCounts?: GeneratedCounts, customPromptId?: string) => {
    if (!loopData) {
      toast.error('No loop data available for question generation')
      return
    }

    const loop = {
      id: loopData.id,
      videoTitle: loopData.videoTitle || 'Practice Session',
      startTime: loopData.startTime || 0,
      endTime: loopData.endTime || 300,
      transcript: loopData.transcript || '',
      segments: loopData.segments || []
    }

    setGeneratingState(prev => ({ ...prev, all: true }))

    // Use preset counts if provided, and include customPromptId
    const generationParams = presetCounts
      ? { loop, groupId, sessionId, presetCounts, customPromptId }
      : { loop, groupId, sessionId, customPromptId }

    await generateAllQuestionsMutation.mutateAsync(generationParams)
  }

  // Enhanced method for generating questions based on preset distribution with cleanup
  const handleGenerateFromPreset = async (
    loopData: any,
    distribution: { easy: number; medium: number; hard: number },
    presetInfo: { id: string; name: string; isCustom?: boolean }
  ) => {
    console.log('🎯 handleGenerateFromPreset called with:', {
      loopData: loopData ? `Loop ID: ${loopData.id}, hasTranscript: ${!!loopData.transcript}` : 'NULL/UNDEFINED',
      distribution,
      presetInfo
    })

    if (!loopData) {
      console.error('❌ No loop data available for question generation')
      toast.error('No loop data available for question generation')
      return
    }

    // Fixed logic: Check if preset is already selected AND has actual questions loaded
    const hasActualQuestions = (cachedCounts.easy + cachedCounts.medium + cachedCounts.hard) > 0
    const isPresetAlreadyActive = currentPreset && currentPreset.id === presetInfo.id && hasActualQuestions

    if (isPresetAlreadyActive) {
      console.log(`Preset ${presetInfo.name} is already selected and has questions loaded`)
      toast.info(`${presetInfo.name} preset is already active with questions loaded`)
      return
    }

    // If preset matches but no questions loaded, allow regeneration
    if (currentPreset && currentPreset.id === presetInfo.id && !hasActualQuestions) {
      console.log(`Preset ${presetInfo.name} matches but no questions loaded - regenerating`)
    }

    // Prevent duplicate generation while in progress
    if (generatingState.all) {
      console.log('Generation already in progress, skipping duplicate request')
      toast.info('Question generation is already in progress')
      return
    }

    // Clear existing questions before generating new ones
    console.log(`Generating questions for preset: ${presetInfo.name}`)
    await clearExistingQuestions()

    try {
      setGeneratingState(prev => ({ ...prev, all: true }))

      // Use sequential generation with deduplication instead of separate API calls
      console.log('🔄 Using handleGenerateAllQuestions for sequential generation with deduplication')
      // Pass the preset ID as customPromptId for custom question generation
      // Remove the 'custom-' prefix if present to get the actual database ID
      const customPromptId = presetInfo.isCustom
        ? presetInfo.id.startsWith('custom-')
          ? presetInfo.id.replace('custom-', '')
          : presetInfo.id
        : undefined
      console.log('🎯 Using customPromptId:', customPromptId, 'from presetInfo.id:', presetInfo.id)
      await handleGenerateAllQuestions(loopData, distribution, customPromptId)

      // Set current preset after successful generation
      const newPreset = {
        id: presetInfo.id,
        name: presetInfo.name,
        distribution,
        createdAt: new Date()
      }
      setCurrentPreset(newPreset)

      // Save to database
      await saveCurrentPreset(newPreset)

      setGeneratingState(prev => ({ ...prev, all: false }))

      toast.success(`Successfully generated ${distribution.easy + distribution.medium + distribution.hard} questions from ${presetInfo.name} preset!`)
    } catch (error) {
      console.error('Failed to generate questions from preset:', error)
      setGeneratingState(prev => ({ ...prev, all: false }))
      toast.error('Failed to generate questions from preset')
      // Reset state on failure
      await clearExistingQuestions()
    }
  }

  return {
    generatingState,
    generatedCounts: cachedCounts, // FIXED: Use cached data directly
    shareTokens: cachedShareTokens, // FIXED: Use cached data directly
    currentPreset,
    // Remove setters for cached data since they're managed by the cache
    handleGenerateQuestions,
    handleGenerateAllQuestions,
    handleGenerateFromPreset,
    clearExistingQuestions,
    needsPresetReplacement,
    // Add loading state from shared hook
    questionsLoading
  }
}
