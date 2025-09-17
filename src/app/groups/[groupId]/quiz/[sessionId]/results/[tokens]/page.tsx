'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GroupQuizResults } from '../../components/GroupQuizResults'
import { useQuizFlow } from '../../shared/hooks/useQuizFlow'
import { QuestionTypeRegistry } from '@/lib/registry/QuestionTypeRegistry'
import { ResultDisplayRegistry } from '@/lib/registry/ResultDisplayRegistry'
import type {
  GeneratedQuestion,
  QuestionResponse as NewQuestionResponse
} from '@/lib/types/question-types'

// Import question type registrations to ensure they're loaded
import '@/lib/registry/question-types/multiple-choice'
import '@/lib/registry/question-types/completion'

interface ResultsWithTokensPageProps {
  params: Promise<{
    groupId: string
    sessionId: string
    tokens: string
  }>
}

export default function ResultsWithTokensPage({ params }: ResultsWithTokensPageProps) {
  const { groupId, sessionId, tokens } = use(params)
  const router = useRouter()
  const [calculatedResults, setCalculatedResults] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState(true)
  const {
    user,
    participants,
  } = useQuizFlow({ groupId, sessionId })

  // Decode shareTokens from route parameters (same logic as active page)
  const decodeShareTokensFromRoute = () => {
    console.log('🔍 [Results/Tokens] Raw tokens from route:', tokens)

    if (!tokens) {
      console.log('❌ [Results/Tokens] No tokens in route params')
      return {}
    }

    try {
      // Decode from base64
      const decodedString = atob(tokens)
      console.log('🔍 [Results/Tokens] Decoded JSON string:', decodedString)

      // Parse JSON
      const parsedTokens = JSON.parse(decodedString)
      console.log('✅ [Results/Tokens] Parsed shareTokens:', parsedTokens)

      const shareTokens: Record<string, string> = {}
      const validDifficulties = ['easy', 'medium', 'hard']
      Object.entries(parsedTokens).forEach(([difficulty, token]) => {
        if (validDifficulties.includes(difficulty) && typeof token === 'string') {
          shareTokens[difficulty] = token
          console.log(`✅ [Results/Tokens] Valid ${difficulty}Token:`, token.substring(0, 10) + '...')
        }
      })

      return shareTokens
    } catch (error) {
      console.error('❌ [Results/Tokens] Failed to decode tokens:', error)
      return {}
    }
  }

  const shareTokens = decodeShareTokensFromRoute()

  // Load questions from shareTokens using same logic as useGroupQuiz
  const loadQuestionsFromShareTokens = useCallback(
    async (shareTokens: Record<string, string>) => {
      const availableTokens = Object.entries(shareTokens).filter(
        ([, token]) => token
      )
      if (availableTokens.length === 0) {
        throw new Error("No questions available")
      }

      const questionPromises = availableTokens.map(
        async ([difficulty, shareToken]) => {
          const response = await fetch(
            `/api/questions/${shareToken}?groupId=${groupId}&sessionId=${sessionId}`
          )

          if (!response.ok) {
            throw new Error(`Failed to load ${difficulty} questions`)
          }

          const questionData = await response.json()
          return {
            difficulty,
            questions: questionData.questions || [],
            shareToken,
            questionSet: questionData,
          }
        }
      )

      const loadedQuestions = await Promise.all(questionPromises)

      // Sort by difficulty to ensure easy -> medium -> hard order
      const difficultyOrder = { easy: 0, medium: 1, hard: 2 }
      const formattedGroups = loadedQuestions
        .sort((a: any, b: any) => {
          const aDifficulty = a.difficulty as "easy" | "medium" | "hard"
          const bDifficulty = b.difficulty as "easy" | "medium" | "hard"
          return difficultyOrder[aDifficulty] - difficultyOrder[bDifficulty]
        })
        .map((loadedQuestion: any) => ({
          difficulty: loadedQuestion.difficulty as "easy" | "medium" | "hard",
          questions: loadedQuestion.questions,
          shareToken: loadedQuestion.shareToken,
          questionsData: loadedQuestion.questions,
          questionSet: { 
            questions: loadedQuestion.questions,
            videoUrl: loadedQuestion.questionSet.videoUrl 
          },
          completed: false,
        }))

      return { loadedQuestions, formattedGroups }
    },
    [groupId, sessionId]
  )

  // Calculate results when shareTokens are available
  useEffect(() => {
    if (Object.keys(shareTokens).length === 0) return
    if (calculatedResults && !isCalculating) return

    const calculateResults = async () => {
      setIsCalculating(true)

      try {
        // Load questions from shareTokens
        const { loadedQuestions, formattedGroups } = await loadQuestionsFromShareTokens(shareTokens)

        // Get responses from sessionStorage (same key as used in active quiz)
        const storageKey = `group-quiz-responses-${groupId}-${sessionId}`
        const storedResponses = sessionStorage.getItem(storageKey)

        if (!storedResponses) {
          console.warn('No stored responses found, redirecting to setup')
          router.push(`/groups/${groupId}/quiz/${sessionId}/setup`)
          return
        }

        const responses = JSON.parse(storedResponses)

        // Calculate results using the same logic as useGroupQuiz
        let totalQuestions = 0
        let totalCorrect = 0
        const allResults: any[] = []
        let resultStartIndex = 0

        // Get videoUrl from first question set that has it
        const videoUrl = loadedQuestions.find((q: any) => q.questionSet?.videoUrl)?.questionSet?.videoUrl

        for (let i = 0; i < formattedGroups.length; i++) {
          const setQuestions = formattedGroups[i].questions.length
          const setEndIndex = resultStartIndex + setQuestions - 1
          const currentSetResponses = responses.filter(
            (r: any) => r.questionIndex >= resultStartIndex && r.questionIndex <= setEndIndex
          )

          totalQuestions += setQuestions

          const setResults = currentSetResponses.map((response: any) => {
            const question = formattedGroups[i].questions.find(
              (_: any, idx: number) => resultStartIndex + idx === response.questionIndex
            )

            if (!question) {
              return {
                questionId: `q_${response.questionIndex}`,
                question: "Unknown question",
                userAnswer: "No answer",
                correctAnswer: "Unknown",
                isCorrect: false,
                explanation: "Question not found.",
                points: 0,
                videoUrl: videoUrl,
              }
            }

            try {
              // Use the registry system to calculate score for any question type
              const evaluation = QuestionTypeRegistry.calculateScore(
                question as GeneratedQuestion,
                response as unknown as NewQuestionResponse
              )

              if (evaluation.isCorrect || evaluation.score > 0) {
                totalCorrect++
              }

              // Use the result display registry to format answers cleanly
              const resultDisplay = ResultDisplayRegistry.formatResult(
                question as GeneratedQuestion,
                response as unknown as NewQuestionResponse,
                evaluation
              )

              return {
                questionId: question.id || `q_${response.questionIndex}`,
                question: question.question || "Unknown question",
                userAnswer: resultDisplay.userAnswer,
                correctAnswer: resultDisplay.correctAnswer,
                isCorrect: resultDisplay.isCorrect,
                explanation: resultDisplay.explanation,
                points: resultDisplay.score,
                videoUrl: videoUrl,
              }
            } catch (error) {
              console.error('Error evaluating question:', error, { question, response })

              // Fallback for unregistered question types or errors
              const isCorrect = question.correctAnswer === response.answer
              if (isCorrect) totalCorrect++

              return {
                questionId: question.id || `q_${response.questionIndex}`,
                question: question.question || "Unknown question",
                userAnswer: response.answer || JSON.stringify(response.response || response),
                correctAnswer: question.correctAnswer || "Unknown",
                isCorrect,
                explanation: question.explanation || "No explanation available.",
                points: isCorrect ? 1 : 0,
                videoUrl: videoUrl,
              }
            }
          })

          allResults.push(...setResults)
          resultStartIndex += setQuestions
        }

        const finalScore = Math.round((totalCorrect / totalQuestions) * 100)

        const finalResults = {
          sessionId: `group_${sessionId}_${Date.now()}`,
          score: finalScore,
          totalQuestions,
          correctAnswers: totalCorrect,
          results: allResults,
          submittedAt: new Date().toISOString(),
          setIndex: formattedGroups.length - 1,
          difficulty: "mixed",
          userData: user ? { userId: user?.id, email: user?.email } : undefined,
          groupId,
          groupSessionId: sessionId,
          isGroupQuiz: true,
        }

        setCalculatedResults(finalResults)
        console.log('✅ [Results/Tokens] Calculated results:', finalResults)
      } catch (error) {
        console.error('❌ [Results/Tokens] Error calculating results:', error)
        router.push(`/groups/${groupId}/quiz/${sessionId}/setup`)
      } finally {
        setIsCalculating(false)
      }
    }

    calculateResults()
  }, [shareTokens, groupId, sessionId, router, user, loadQuestionsFromShareTokens, calculatedResults, isCalculating])

  // Enhanced restart handler that combines state reset with navigation
  const handleRestartWithNavigation = () => {
    // Clear stored responses
    const storageKey = `group-quiz-responses-${groupId}-${sessionId}`
    sessionStorage.removeItem(storageKey)

    // Navigate to setup page
    router.push(`/groups/${groupId}/quiz/${sessionId}/setup`)
  }

  // Loading state
  if (isCalculating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Calculating your results...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (!calculatedResults) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load results</p>
          <button
            onClick={handleRestartWithNavigation}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Setup
          </button>
        </div>
      </div>
    )
  }

  return (
    <GroupQuizResults
      results={calculatedResults}
      groupId={groupId}
      sessionId={sessionId}
      onRestart={handleRestartWithNavigation}
      participants={participants || []}
      showCorrectAnswers={true}
      canRetakeQuiz={true}
    />
  )
}