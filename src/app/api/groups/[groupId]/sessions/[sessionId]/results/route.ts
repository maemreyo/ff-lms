import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '@/lib/supabase/server'
import { corsResponse, corsHeaders } from '@/lib/cors'
import { QuestionTypeRegistry } from '@/lib/registry/QuestionTypeRegistry'
import { ResultDisplayRegistry } from '@/lib/registry/ResultDisplayRegistry'
import type {
  GeneratedQuestion,
  QuestionResponse as NewQuestionResponse
} from '@/lib/types/question-types'

// Import question type registrations to ensure they're loaded
import '@/lib/registry/question-types/multiple-choice'
import '@/lib/registry/question-types/completion'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }
  const { groupId, sessionId } = await params
  const { searchParams } = new URL(request.url)
  const userQuery = searchParams.get('user')

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('group_quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .single()

    // console.log('🔍 [Results API] Session debug:', {
    //   sessionId,
    //   groupId,
    //   sessionError,
    //   hasSession: !!session,
    //   sessionKeys: session ? Object.keys(session) : [],
    //   video_url: session?.video_url,
    //   video_title: session?.video_title,
    //   loop_data: session?.loop_data
    // })

    if (sessionError || !session) {
      return corsResponse({ error: 'Session not found' }, 404)
    }

    // If user=me query parameter is provided, return only current user's results
    if (userQuery === 'me') {
      const { data: userResult, error: userResultError } = await supabase
        .from('group_quiz_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (userResultError) {
        console.error('Error fetching user result:', userResultError)
        return corsResponse({ userResult: null })
      }

      // Transform the database result back to the frontend format
      if (userResult && userResult.result_data) {
        // Extract video URL from session loop_data (actual location from logs)
        const videoUrl = session.loop_data?.videoUrl || session.video_url || null
        // console.log('🎥 [Results API] Debug video URL:', {
        //   sessionId,
        //   sessionVideoUrl: session.video_url,
        //   loopDataVideoUrl: session.loop_data?.videoUrl,
        //   finalVideoUrl: videoUrl,
        //   hasLoopData: !!session.loop_data
        // })

        // Transform results using the new formatting system
        const rawResults = userResult.result_data.allResults || []
        const formattedResults = rawResults.map((rawResult: any) => {
          // Try to reconstruct the question and response for proper formatting
          try {
            const question = rawResult.question || rawResult.originalQuestion
            const responses = userResult.result_data.responses || []
            const matchingResponse = responses.find((r: any) =>
              r.questionIndex === rawResult.questionIndex ||
              r.questionIndex === rawResult.index
            )

            if (question && matchingResponse) {
              // Use the registry system to properly evaluate and format
              const evaluation = QuestionTypeRegistry.calculateScore(
                question as GeneratedQuestion,
                matchingResponse as unknown as NewQuestionResponse
              )

              const resultDisplay = ResultDisplayRegistry.formatResult(
                question as GeneratedQuestion,
                matchingResponse as unknown as NewQuestionResponse,
                evaluation
              )

              return {
                questionId: rawResult.questionId || `q_${rawResult.questionIndex}`,
                question: question.question || rawResult.question,
                userAnswer: resultDisplay.userAnswer,
                correctAnswer: resultDisplay.correctAnswer,
                isCorrect: resultDisplay.isCorrect,
                explanation: resultDisplay.explanation,
                points: resultDisplay.score,
                videoUrl: videoUrl
              }
            }
          } catch (error) {
            console.warn('Failed to format result using registry, falling back:', error)
          }

          // Fallback to original formatting if registry fails
          return {
            ...rawResult,
            videoUrl: videoUrl
          }
        })

        const transformedResult = {
          sessionId: `group_${sessionId}_${userResult.id}`,
          score: userResult.score,
          totalQuestions: userResult.total_questions,
          correctAnswers: userResult.correct_answers,
          results: formattedResults,
          submittedAt: userResult.completed_at,
          setIndex: 0, // Could be derived from result_data if needed
          difficulty: 'mixed',
          userData: { userId: user.id, email: user.email },
          groupId,
          groupSessionId: sessionId,
          isGroupQuiz: true,
          videoUrl: videoUrl // Also add videoUrl at the top level
        }

        return corsResponse({ userResult: transformedResult })
      } else {
        return corsResponse({ userResult: null })
      }
    }

    // Default behavior: return all results (leaderboard)
    const { data: results, error: resultsError } = await supabase
      .from('group_quiz_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })

    if (resultsError) {
      console.error('Error fetching results:', resultsError)
      return corsResponse({ error: resultsError.message }, 500)
    }

    // Get user emails from group members for the results
    let transformedResults = results || []
    
    if (results && results.length > 0) {
      const userIds = results.map(r => r.user_id)
      
      // Get user data from study_group_members table
      const { data: members } = await supabase
        .from('study_group_members')
        .select('user_id, username, user_email')
        .eq('group_id', groupId)
        .in('user_id', userIds)
      
      const memberDataMap = new Map(
        members?.map(member => [member.user_id, member]) || []
      )
      
      // Transform results to match frontend expectations
      transformedResults = results.map(result => ({
        ...result,
        user_email: memberDataMap.get(result.user_id)?.user_email || null,
        username: memberDataMap.get(result.user_id)?.username || result.user_name || null
      }))
    }

    // Calculate session statistics
    const stats = {
      total_participants: transformedResults.length,
      average_score: transformedResults.length > 0 
        ? Math.round(transformedResults.reduce((sum, r) => sum + r.score, 0) / transformedResults.length)
        : 0,
      highest_score: transformedResults.length > 0 ? Math.max(...transformedResults.map(r => r.score)) : 0,
      completion_rate: transformedResults.length > 0 
        ? Math.round((transformedResults.filter(r => r.completed_at).length / transformedResults.length) * 100)
        : 0
    }

    return corsResponse({ 
      session,
      results: transformedResults,
      stats
    })
  } catch (error) {
    console.error('Error in session results GET:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; sessionId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }
  const { groupId, sessionId } = await params

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from('study_group_members')
      .select('username')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }

    const body = await request.json()
    const { 
      score, 
      total_questions, 
      correct_answers, 
      time_taken_seconds, 
      result_data 
    } = body

    // Validation
    if (typeof score !== 'number' || typeof total_questions !== 'number' || typeof correct_answers !== 'number') {
      return corsResponse({ error: 'Invalid result data' }, 400)
    }

    // Insert or update result
    const { data: result, error: resultError } = await supabase
      .from('group_quiz_results')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        user_name: membership.username,
        score,
        total_questions,
        correct_answers,
        time_taken_seconds: time_taken_seconds || null,
        result_data: result_data || {},
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      })
      .select()
      .single()

    if (resultError) {
      console.error('Error saving result:', resultError)
      return corsResponse({ error: resultError.message }, 500)
    }

    return corsResponse({ 
      message: 'Result saved successfully', 
      result 
    })
  } catch (error) {
    console.error('Error in session results POST:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}