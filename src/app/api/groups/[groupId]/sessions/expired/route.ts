import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getCurrentUserServer } from '../../../../../../lib/supabase/server'
import { corsResponse, corsHeaders } from '../../../../../../lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders()
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const supabase = getSupabaseServer(request)
  if (!supabase) {
    return corsResponse({ error: 'Database not configured' }, 500)
  }

  try {
    const user = await getCurrentUserServer(supabase)
    
    if (!user) {
      return corsResponse({ error: 'Unauthorized' }, 401)
    }

    const { groupId } = await params

    // Verify user is a member of the group
    const { data: membership, error: membershipError } = await supabase
      .from('study_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return corsResponse({ error: 'Access denied' }, 403)
    }
    
    // Check for expired sessions by trying to fetch their questions
    const { data: sessions, error: fetchError } = await supabase
      .from('group_quiz_sessions')
      .select('id, quiz_token, status, scheduled_at, created_at, session_type')
      .eq('group_id', groupId)
      .in('status', ['scheduled', 'active'])

    if (fetchError) {
      console.error('Error fetching sessions:', fetchError)
      return corsResponse({ error: 'Failed to fetch sessions' }, 500)
    }

    const expiredSessionIds: string[] = []
    
    // Helper function to check if session is expired based on 24h rule
    const isExpiredByTime = (session: any) => {
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))
      
      if (session.session_type === 'instant') {
        // For instant sessions: expired after 24h from creation time
        if (!session.created_at) return false
        const createdTime = new Date(session.created_at)
        return createdTime < twentyFourHoursAgo
      } else {
        // For scheduled sessions: expired after 24h from scheduled time
        if (!session.scheduled_at) return false
        const scheduledTime = new Date(session.scheduled_at)
        return scheduledTime < twentyFourHoursAgo
      }
    }
    
    // Check each session for expiration
    for (const session of sessions || []) {
      // First check if session is expired by time (24h rule)
      if (isExpiredByTime(session)) {
        expiredSessionIds.push(session.id)
      } else if (session.quiz_token) {
        // If not expired by time, check questions endpoint as fallback
        try {
          const questionsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3838'}/api/questions/${session.quiz_token}`,
            { method: 'GET' }
          )
          
          if (questionsResponse.status === 410) {
            // Session is expired
            expiredSessionIds.push(session.id)
          }
        } catch (error) {
          console.error(`Error checking session ${session.id}:`, error)
          // If we can't check, assume it might be expired
          expiredSessionIds.push(session.id)
        }
      }
    }

    // Update expired sessions to 'completed' status
    if (expiredSessionIds.length > 0) {
      const { error: updateError } = await supabase
        .from('group_quiz_sessions')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', expiredSessionIds)

      if (updateError) {
        console.error('Error updating expired sessions:', updateError)
        return corsResponse({ error: 'Failed to update expired sessions' }, 500)
      }
    }

    return corsResponse({
      message: `Updated ${expiredSessionIds.length} expired sessions`,
      expiredSessionIds
    })

  } catch (error) {
    console.error('Error in expired sessions check:', error)
    return corsResponse({ error: 'Internal server error' }, 500)
  }
}