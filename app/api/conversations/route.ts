import { AnyObject } from '@/lib/any';
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

/**
 * GET /api/conversations
 * Query: type = DIRECT | ANNOUNCEMENT
 *
 * POST /api/conversations
 * Body: { targetUserId: number } — create or return existing DIRECT conversation
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') ?? 'DIRECT'

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()
    const { data: participantRows, error: partErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.user_id)

    if (partErr) {
      console.error('[Conversations GET participants]', partErr)
      return NextResponse.json({ error: partErr.message }, { status: 500 })
    }

    const conversationIds = (participantRows ?? []).map((r) => r.conversation_id)

    if (conversationIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Step 2: fetch those conversations filtered by type + ordered by updated_at
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, type, title, created_by, created_at, updated_at,
        conversation_participants (
          user_id,
          ms_user!user_id ( full_name, username, role )
        )
      `)
      .in('id', conversationIds)
      .eq('type', type)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Conversations GET]', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }

    const formattedData = (data ?? []).map((conv: AnyObject) => {
      let otherUserName = null
      let otherUserRole = null

      if (conv.type === 'DIRECT') {
        const otherParticipant = conv.conversation_participants?.find(
          (p: AnyObject) => p.user_id !== user.user_id
        )
        if (otherParticipant?.ms_user) {
          otherUserName = otherParticipant.ms_user.full_name ?? otherParticipant.ms_user.username
          otherUserRole = otherParticipant.ms_user.role
        }
      }

      return {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        created_by: conv.created_by,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        otherUserName,
        otherUserRole,
      }
    })

    return NextResponse.json({ data: formattedData })
  } catch (err) {
    console.error('[Conversations GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { targetUserId: number }
    const targetUserId = Number(body.targetUserId)

    if (!targetUserId || isNaN(targetUserId)) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    // ── Find existing DIRECT conversation between these 2 users ──
    // Strategy: get conv_ids for user A, get conv_ids for user B,
    // find intersection that has type='DIRECT' and exactly 2 participants.

    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.user_id)

    const { data: theirConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', targetUserId)

    const myIds = new Set((myConvs ?? []).map((r) => r.conversation_id))
    const theirIds = new Set((theirConvs ?? []).map((r) => r.conversation_id))
    const shared = [...myIds].filter((id) => theirIds.has(id))

    if (shared.length > 0) {
      // Check that it's a DIRECT type conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .in('id', shared)
        .eq('type', 'DIRECT')
        .limit(1)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ data: { id: existing.id } })
      }
    }

    // ── Create new DIRECT conversation ──
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ type: 'DIRECT', created_by: user.user_id })
      .select('id')
      .single()

    if (convErr || !conv) {
      console.error('[Conversations POST create]', convErr)
      return NextResponse.json(
        { error: convErr?.message ?? 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Add both participants
    const { error: partErr } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conv.id, user_id: user.user_id },
        { conversation_id: conv.id, user_id: targetUserId },
      ])

    if (partErr) {
      console.error('[Conversations POST participants]', partErr)
      // Still return the conversation — participants might be partially added
    }

    return NextResponse.json({ data: { id: conv.id } }, { status: 201 })
  } catch (err) {
    console.error('[Conversations POST Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
